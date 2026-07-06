import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, LogIn, Mail, Sparkles } from 'lucide-react';
import { googleSignIn } from '../lib/googleAuth';

interface LoginProps {
  onLogin: (email: string, token: string, photo?: string | null, name?: string | null) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [selectedUser, setSelectedUser] = useState<string>('federico.gamberini.fg@gmail.com');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errMessage, setErrMessage] = useState<string | null>(null);

  const handleLoginClick = async () => {
    setIsLoggingIn(true);
    setErrMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onLogin(
          res.user.email || 'federico.gamberini.fg@gmail.com',
          res.accessToken,
          res.user.photoURL,
          res.user.displayName
        );
      } else {
        setErrMessage('Autenticazione annullata.');
      }
    } catch (err: any) {
      console.error(err);
      setErrMessage(`Errore di login: ${err?.message || 'Sconosciuto'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Decorative colored glow bubbles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 mb-8"
      >
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 px-3.5 py-1.5 rounded-full text-blue-400 text-sm font-semibold mb-4">
          <ShieldCheck className="w-4 h-4" />
          <span>Accesso Riservato Privato</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display text-white tracking-tight leading-none">
          Dashboard <span className="text-blue-500">Finanze</span>
        </h1>
        <p className="text-slate-400 mt-3 text-base max-w-sm mx-auto">
          Monitoraggio e analisi in tempo reale del tuo patrimonio integrato con Google Sheets.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl z-10 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <img
              src="/icon/icon.jpg"
              alt="Logo"
              className="w-14 h-14 rounded-2xl object-cover shadow-md"
            />
          </div>

          <h2 className="text-xl font-bold text-slate-800 text-center mb-2">
            Identità e Autenticazione
          </h2>
          <p className="text-xs text-slate-500 text-center mb-6">
            Accesso autorizzato unicamente per l'amministratore del conto tramite autenticazione protetta.
          </p>

          {/* Utente Autorizzato Card */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-left">
              Utente di Riferimento
            </span>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold uppercase shrink-0">
                F
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">Federico</p>
                <p className="text-xs text-slate-400 truncate">federico.gamberini.fg@gmail.com</p>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <span className="text-[10px] font-black">✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Separation Line with Text */}
          <div className="relative my-6 flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Autenticazione Google API
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {errMessage && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 text-center mb-4">
              {errMessage}
            </div>
          )}

          {/* Opzione Ricorda Dispositivo */}
          <div className="flex items-center gap-2 px-1 mb-5 text-left">
            <input
              id="remember_me"
              type="checkbox"
              defaultChecked={true}
              onChange={(e) => {
                if (e.target.checked) {
                  localStorage.setItem('sf_device_remembered', 'true');
                } else {
                  localStorage.removeItem('sf_device_remembered');
                  localStorage.removeItem('sf_device_remembered_email');
                  localStorage.removeItem('sf_device_remembered_token');
                  localStorage.removeItem('sf_device_remember_time');
                }
              }}
              className="w-4.5 h-4.5 text-blue-600 bg-slate-100 border-slate-300 rounded-lg focus:ring-blue-500 focus:ring-2 cursor-pointer"
            />
            <label htmlFor="remember_me" className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
              Ricorda questo dispositivo (Accesso automatico per 7 giorni)
            </label>
          </div>

          <button
            onClick={handleLoginClick}
            disabled={isLoggingIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Autenticazione in corso...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current mr-1" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Accedi con Google</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Vercel Host Prerendered
          </span>
          <span>Google Sheets TLS 1.3</span>
        </div>
      </motion.div>

      <p className="text-slate-500 text-xs mt-6 z-10 flex items-center gap-1">
        <span>© 2026</span>
        <span>•</span>
        <span>Dashboard Finanze Personali</span>
      </p>
    </div>
  );
}
