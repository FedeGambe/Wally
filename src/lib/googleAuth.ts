/**
 * Login con Google via Firebase Auth, e gestione del token OAuth usato per
 * chiamare l'API di Google Sheets (src/lib/sheetsService.tsx).
 *
 * Punti chiave da tenere a mente:
 *  - Firebase gestisce SOLO l'identità (chi sei); l'`accessToken` OAuth per
 *    Sheets/Drive è un dato separato ottenuto dallo stesso popup di login e
 *    tenuto in `cachedAccessToken` (variabile di modulo, si perde al reload).
 *  - "Ricorda questo dispositivo" salva token+email in localStorage per 7
 *    giorni, MA il token Google scade comunque dopo ~1 ora: per questo ogni
 *    controllo qui usa una finestra di 50 minuti (isWithinRememberPeriod)
 *    per decidere se il token salvato è ancora considerato valido, forzando
 *    un nuovo login altrimenti.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

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
        } else {
          // Token is expired or missing. Sign out of Firebase and trigger failure.
          cachedAccessToken = null;
          signOut(auth).catch(console.error);
          localStorage.removeItem('sf_device_remembered');
          localStorage.removeItem('sf_device_remembered_email');
          localStorage.removeItem('sf_device_remembered_token');
          localStorage.removeItem('sf_device_remember_time');
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
