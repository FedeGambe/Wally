import React from 'react';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  TrendingUp,
  Fuel,
  LogOut,
  User,
  RefreshCw,
  Wallet2,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

/**
 * Barra di navigazione laterale (usata in App.tsx, visibile solo da tablet in su:
 * su mobile la navigazione è gestita altrove). Elenca le pagine dell'app
 * (Panoramica, Entrate, Uscite, ecc.), mostra il profilo utente in basso col
 * pulsante di logout, e un pulsante per forzare il refresh dei dati da Google
 * Sheets. Gestisce anche lo stato "collassata/espansa" (icone soltanto vs icone
 * + testo) e, su tablet, il comportamento "a cassetto" (overlay) descritto sotto.
 */
interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  userEmail: string;
  userPhoto?: string | null;
  userDisplayName?: string | null;
  onLogout: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isTablet?: boolean;
}

export default function Sidebar({
  activeView,
  setActiveView,
  userEmail,
  userPhoto = null,
  userDisplayName = null,
  onLogout,
  onRefreshData,
  isRefreshing = false,
  isCollapsed,
  setIsCollapsed,
  isTablet = false
}: SidebarProps) {
  // On tablet, an expanded sidebar overlays the app (like a drawer) instead of
  // pushing the layout, and auto-collapses again once a destination is picked.
  const isOverlay = isTablet && !isCollapsed;

  const handleNavigate = (viewId: string) => {
    setActiveView(viewId);
    if (isTablet) setIsCollapsed(true);
  };

  const menuItems = [
    { id: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
    { id: 'entrate', label: 'Entrate', icon: ArrowUpRight },
    { id: 'uscite', label: 'Uscite', icon: ArrowDownLeft },
    { id: 'patrimonio', label: 'Patrimonio', icon: Coins },
    { id: 'investimenti', label: 'Investimenti', icon: TrendingUp },
    { id: 'consumi', label: 'Analisi Consumi', icon: Fuel },
    { id: 'impostazioni', label: 'Impostazioni', icon: Settings },
  ];

  // Colore di sfondo del pulsante quando la sua voce di menu è quella attiva
  // (un colore diverso per pagina, per riconoscerle a colpo d'occhio).
  const activeClassMap: { [key: string]: string } = {
    panoramica: 'bg-blue-600 text-white shadow-xs',
    entrate: 'bg-emerald-600 text-white shadow-xs',
    uscite: 'bg-orange-600 text-white shadow-xs',
    patrimonio: 'bg-yellow-400 text-ink font-bold shadow-xs',
    investimenti: 'bg-sky-500 text-white shadow-xs',
    consumi: 'bg-rose-600 text-white shadow-xs',
    impostazioni: 'bg-accent text-white shadow-xs'
  };

  // Ricava l'iniziale da mostrare nell'avatar quando l'utente non ha una foto profilo.
  const getProfileInitials = (email: string) => {
    if (!email) return '?';
    const namePart = email.split('@')[0];
    return namePart[0].toUpperCase();
  };

  // Ricava un nome "leggibile" dall'indirizzo email (prima parte prima del punto,
  // con iniziale maiuscola).
  const getDisplayName = (email: string) => {
    const namePart = email.split('@')[0];
    const firstWord = namePart.split('.')[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  };

  return (
    <>
      {/* Backdrop: dismisses the tablet drawer overlay when tapped outside it */}
      {isOverlay && (
        <div
          className="hidden md:block fixed inset-0 z-40 bg-slate-900/30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      <aside className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-68'} bg-white border-r border-hairline flex-col h-screen select-none transition-all duration-300 ${isOverlay ? 'fixed top-0 left-0 z-50 shadow-2xl' : 'sticky top-0 shrink-0'
        }`}>
        {/* Brand Header */}
        <div className={`h-16 flex items-center border-b border-hairline ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'} gap-2`}>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icon/app-icon-wordmark.png"
              alt="Logo"
              width={36}
              height={36}
              className="w-9 h-9 aspect-square rounded-xl object-cover shadow-sm shrink-0"
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold font-display text-ink text-base leading-tight tracking-tight truncate">
                  Wally
                </span>
                <span className="text-3xs text-ink-soft font-mono tracking-wider uppercase truncate">
                  Dashboard Finanze
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Espandi barra" : "Comprimi barra"}
            aria-label={isCollapsed ? "Espandi barra" : "Comprimi barra"}
            className="p-1.5 rounded-lg hover:bg-canvas text-ink-soft hover:text-ink-soft transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 space-y-1.5 overflow-y-auto`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-4 py-3'} rounded-xl text-sm font-medium transition-all group ${isActive
                  ? activeClassMap[item.id] || 'bg-blue-600 text-white shadow-xs'
                  : 'text-ink-soft hover:text-ink hover:bg-canvas'
                  }`}
              >
                <Icon className={`w-4.5 h-4.5 transition-colors ${isActive
                  ? (item.id === 'patrimonio' ? 'text-slate-950' : 'text-white')
                  : 'text-ink-soft group-hover:text-ink-soft'
                  } shrink-0`} />
                {!isCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                {!isCollapsed && isActive && (
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${item.id === 'patrimonio' ? 'bg-slate-950' : 'bg-white'
                    }`} />
                )}
              </button>
            );
          })}

          {/* Data Refresh Action */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              title="Aggiorna Google Sheets"
              aria-label="Aggiorna Google Sheets"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3.5' : 'gap-3.5 px-4 py-3'} mt-6 text-xs text-ink-soft hover:text-ink bg-canvas/50 hover:bg-canvas rounded-xl transition-all border border-hairline border-dashed cursor-pointer`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''} shrink-0`} />
              {!isCollapsed && <span className="text-left font-medium truncate">Aggiorna Google Sheets</span>}
            </button>
          )}
        </nav>

        {/* User Profile Card at Bottom */}
        <div className={`p-3 border-t border-hairline ${isCollapsed ? 'bg-transparent' : 'bg-canvas/50'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  referrerPolicy="no-referrer"
                  alt={userDisplayName || getDisplayName(userEmail)}
                  title={`${userDisplayName || getDisplayName(userEmail)} (${userEmail})`}
                  className="w-10 h-10 rounded-full object-cover border border-hairline shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-canvas border border-hairline flex items-center justify-center font-bold text-sm text-ink uppercase shrink-0" title={`${getDisplayName(userEmail)} (${userEmail})`}>
                  {getProfileInitials(userEmail)}
                </div>
              )}
              <button
                onClick={onLogout}
                title="Scollegati"
                aria-label="Scollegati"
                className="w-8 h-8 rounded-lg text-ink-soft hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-2.5 bg-white rounded-xl border border-hairline shadow-sm flex items-center gap-3">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  referrerPolicy="no-referrer"
                  alt={userDisplayName || getDisplayName(userEmail)}
                  className="w-10 h-10 rounded-full object-cover border border-hairline shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-canvas border border-hairline flex items-center justify-center font-bold text-sm text-ink uppercase shrink-0">
                  {getProfileInitials(userEmail)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-ink truncate">
                  {userDisplayName || getDisplayName(userEmail)}
                </h4>
                <p className="text-3xs text-ink-soft truncate font-mono">
                  {userEmail}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Scollegati"
                aria-label="Scollegati"
                className="w-8 h-8 rounded-lg text-ink-soft hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
