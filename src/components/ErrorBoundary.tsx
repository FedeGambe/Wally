import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Rete di sicurezza a livello di app: un errore di render in qualsiasi pagina
// mostra questo fallback invece di uno schermo bianco. I dati in localStorage
// non vengono toccati, quindi ricaricare la pagina recupera lo stato normale.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Errore non gestito nella UI:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a13] text-slate-800 dark:text-slate-100 p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-xl font-extrabold">Qualcosa è andato storto</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Si è verificato un errore imprevisto nell'interfaccia. I tuoi dati locali non sono stati modificati.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono break-words">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              Ricarica la pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
