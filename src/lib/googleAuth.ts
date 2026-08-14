/**
 * Login con Google via Firebase Auth, e gestione del token OAuth usato per
 * chiamare l'API di Google Sheets (src/lib/sheetsService.tsx).
 *
 * Punti chiave da tenere a mente:
 *  - Firebase gestisce SOLO l'identità (chi sei); l'`accessToken` OAuth per
 *    Sheets/Drive è un dato separato ottenuto dallo stesso popup di login e
 *    tenuto in `cachedAccessToken` (variabile di modulo, si perde al reload).
 *  - Quel token OAuth scade sempre dopo ~1 ora (limite di Google, non
 *    aggirabile) e Firebase NON lo rinnova da solo: la sua identità
 *    (onAuthStateChanged) resta valida per giorni, ma il token per
 *    Sheets/Drive no.
 *  - Per evitare di dover riaprire il popup di login ogni ora, usiamo Google
 *    Identity Services (script caricato in index.html) per un rinnovo
 *    SILENZIOSO (silentTokenRefresh, prompt:'' — nessuna finestra visibile):
 *    funziona finché il browser ha ancora una sessione Google attiva e
 *    l'utente ha già dato il consenso in passato. "Ricorda questo
 *    dispositivo" salva token+email in localStorage; isWithinRememberPeriod
 *    (50 minuti, sotto il limite di 1 ora di Google) decide solo se il
 *    token salvato è ancora usabile SENZA nemmeno provare un rinnovo — se è
 *    scaduto, prima di arrendersi e forzare il login si tenta sempre un
 *    silentTokenRefresh.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

// Stessi scope richiesti dal provider Firebase qui sotto: servono identici
// anche al token client GIS, altrimenti il rinnovo silenzioso otterrebbe un
// token con permessi insufficienti per Sheets/Drive.
const OAUTH_SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
            error_callback?: (err: { type: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required Google Sheets and Drive scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

let gisTokenClient: ReturnType<NonNullable<Window['google']>['accounts']['oauth2']['initTokenClient']> | null = null;
let pendingRefreshResolvers: Array<(token: string | null) => void> = [];

// Aspetta che lo script GIS (caricato async in index.html) sia pronto, con
// un timeout: se non si carica (rete lenta, blocco ad-blocker) il chiamante
// deve poter ripiegare sul login interattivo invece di restare bloccato.
const waitForGis = (timeoutMs = 8000): Promise<boolean> => {
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  return new Promise(resolve => {
    const start = Date.now();
    const check = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        resolve(false);
      } else {
        setTimeout(check, 150);
      }
    };
    check();
  });
};

/**
 * Rinnova il token OAuth SENZA aprire alcun popup (prompt:''): richiede una
 * sessione Google ancora attiva nel browser e un consenso già dato in
 * passato per questo client_id+scope, altrimenti GIS fallisce in silenzio
 * (nessun errore visibile all'utente) e qui ritorniamo null — il chiamante
 * decide se a quel punto serve un login interattivo vero e proprio.
 */
export const silentTokenRefresh = async (): Promise<string | null> => {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) return null;

  const gisReady = await waitForGis();
  if (!gisReady) return null;

  if (!gisTokenClient) {
    gisTokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: OAUTH_SCOPES,
      callback: (resp) => {
        const resolvers = pendingRefreshResolvers;
        pendingRefreshResolvers = [];
        if (resp.access_token) {
          cachedAccessToken = resp.access_token;
          localStorage.setItem('sf_device_remembered_token', resp.access_token);
          localStorage.setItem('sf_device_remember_time', String(Date.now()));
          resolvers.forEach(r => r(resp.access_token!));
        } else {
          resolvers.forEach(r => r(null));
        }
      },
      error_callback: () => {
        const resolvers = pendingRefreshResolvers;
        pendingRefreshResolvers = [];
        resolvers.forEach(r => r(null));
      }
    });
  }

  return new Promise(resolve => {
    // Se la finestra che GIS apre per il rinnovo non riesce nemmeno ad
    // aprirsi (popup bloccato dal browser, verificato dal vivo: succede
    // sempre quando la richiesta non parte da un vero click utente), né
    // `callback` né `error_callback` vengono chiamati — senza questo
    // timeout la promise resterebbe in sospeso per sempre, e chi aspetta
    // questo risultato (initAuth, handleAuthError) resterebbe bloccato
    // anziché ripiegare sul login interattivo.
    let settled = false;
    const settle = (token: string | null) => {
      if (settled) return;
      settled = true;
      resolve(token);
    };
    const timeout = setTimeout(() => settle(null), 3000);

    const alreadyInFlight = pendingRefreshResolvers.length > 0;
    pendingRefreshResolvers.push((token) => {
      clearTimeout(timeout);
      settle(token);
    });
    if (!alreadyInFlight) {
      gisTokenClient!.requestAccessToken({ prompt: '' });
    }
  });
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check if there is a remembered session in localStorage
  const remembered = localStorage.getItem('sf_device_remembered') === 'true';
  const rememberedEmail = localStorage.getItem('sf_device_remembered_email');
  const rememberedToken = localStorage.getItem('sf_device_remembered_token');
  const rememberTimeStr = localStorage.getItem('sf_device_remember_time');
  const rememberTime = rememberTimeStr ? parseInt(rememberTimeStr, 10) : 0;
  
  // Google OAuth access tokens strictly expire after 1 hour (3600000 ms).
  // We check if it is within 50 minutes (3000000 ms) to avoid using expired tokens on reload.
  const isWithinRememberPeriod = Date.now() - rememberTime < 50 * 60 * 1000;

  if (remembered && rememberedEmail && rememberedToken && isWithinRememberPeriod) {
    cachedAccessToken = rememberedToken;
    const rememberedPhoto = localStorage.getItem('sf_device_remembered_photo');
    const rememberedName = localStorage.getItem('sf_device_remembered_name');
    // Call the success callback immediately to restore the logged-in state without prompting
    setTimeout(() => {
      if (onAuthSuccess) {
        onAuthSuccess({
          email: rememberedEmail,
          photoURL: rememberedPhoto,
          displayName: rememberedName
        } as any as User, rememberedToken);
      }
    }, 100);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    // If we are actively in the middle of a sign-in popup flow, DO NOT interfere
    if (isSigningIn) {
      return;
    }

    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we are logged in to Firebase but cachedAccessToken is null, let's restore from localStorage if possible
        const storedToken = localStorage.getItem('sf_device_remembered_token');
        const storedEmail = localStorage.getItem('sf_device_remembered_email');
        const storedTimeStr = localStorage.getItem('sf_device_remember_time');
        const storedTime = storedTimeStr ? parseInt(storedTimeStr, 10) : 0;
        const isStoredTokenValid = Date.now() - storedTime < 50 * 60 * 1000;

        if (storedToken && storedEmail && isStoredTokenValid) {
          cachedAccessToken = storedToken;
          if (onAuthSuccess) onAuthSuccess(user, storedToken);
        } else if (storedEmail) {
          // Token scaduto/mancante ma Firebase sa già chi sei (la sua sessione
          // dura ben più a lungo dei 50 minuti dell'OAuth token): prima di
          // sloggare tentiamo un rinnovo silenzioso via GIS, invece di forzare
          // subito un login interattivo.
          const freshToken = await silentTokenRefresh();
          if (freshToken) {
            if (onAuthSuccess) onAuthSuccess(user, freshToken);
          } else {
            cachedAccessToken = null;
            signOut(auth).catch(console.error);
            localStorage.removeItem('sf_device_remembered');
            localStorage.removeItem('sf_device_remembered_email');
            localStorage.removeItem('sf_device_remembered_token');
            localStorage.removeItem('sf_device_remember_time');
            if (onAuthFailure) onAuthFailure();
          }
        } else {
          // Nessuna sessione ricordata: mai stato loggato da questo dispositivo.
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      // Only clear if not explicitly remembered or if expired
      if (!remembered || !isWithinRememberPeriod) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    
    // Save to remember session for 7 days
    localStorage.setItem('sf_device_remembered', 'true');
    localStorage.setItem('sf_device_remembered_email', result.user.email || 'federico.gamberini.fg@gmail.com');
    localStorage.setItem('sf_device_remembered_token', cachedAccessToken);
    localStorage.setItem('sf_device_remember_time', String(Date.now()));
    if (result.user.photoURL) {
      localStorage.setItem('sf_device_remembered_photo', result.user.photoURL);
    } else {
      localStorage.removeItem('sf_device_remembered_photo');
    }
    if (result.user.displayName) {
      localStorage.setItem('sf_device_remembered_name', result.user.displayName);
    } else {
      localStorage.removeItem('sf_device_remembered_name');
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('sf_device_remembered');
  localStorage.removeItem('sf_device_remembered_email');
  localStorage.removeItem('sf_device_remembered_token');
  localStorage.removeItem('sf_device_remember_time');
  localStorage.removeItem('sf_device_remembered_photo');
  localStorage.removeItem('sf_device_remembered_name');
};
