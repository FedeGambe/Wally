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
  setIsCollapsed
}: SidebarProps) {
  const menuItems = [
    { id: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
    { id: 'entrate', label: 'Entrate', icon: ArrowUpRight },
    { id: 'uscite', label: 'Uscite', icon: ArrowDownLeft },
    { id: 'patrimonio', label: 'Patrimonio', icon: Coins },
    { id: 'investimenti', label: 'Investimenti', icon: TrendingUp },
    { id: 'consumi', label: 'Analisi Consumi', icon: Fuel },
    { id: 'impostazioni', label: 'Impostazioni', icon: Settings },
  ];

  const activeClassMap: { [key: string]: string } = {
    panoramica: 'bg-blue-600 text-white shadow-xs',
    entrate: 'bg-emerald-600 text-white shadow-xs',
    uscite: 'bg-orange-600 text-white shadow-xs',
    patrimonio: 'bg-yellow-400 text-slate-900 font-bold shadow-xs',
    investimenti: 'bg-sky-500 text-white shadow-xs',
    consumi: 'bg-rose-600 text-white shadow-xs',
    impostazioni: 'bg-indigo-600 text-white shadow-xs'
  };

  const getProfileInitials = (email: string) => {
    if (email === 'federico.gamberini.fg@gmail.com') return 'F';
    if (!email) return 'F';
    const namePart = email.split('@')[0];
    return namePart[0].toUpperCase();
  };

  const getDisplayName = (email: string) => {
    if (email === 'federico.gamberini.fg@gmail.com') return 'Federico';
    const namePart = email.split('@')[0];
    const firstWord = namePart.split('.')[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  };

  return (
    <aside className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-68'} bg-white border-r border-slate-100 flex-col h-screen sticky top-0 shrink-0 select-none transition-all duration-300`}>
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'} gap-2`}>
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/icon/icon.png"
            alt="Logo"
            className="w-9 h-9 rounded-xl object-cover shadow-sm shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold font-display text-slate-800 text-base leading-tight tracking-tight truncate">
                StarFinance
              </span>
              <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase truncate">
                Private Dashboard
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Espandi barra" : "Comprimi barra"}
          className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
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
              onClick={() => setActiveView(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-4 py-3'} rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? activeClassMap[item.id] || 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 transition-colors ${
                isActive
                  ? (item.id === 'patrimonio' ? 'text-slate-950' : 'text-white')
                  : 'text-slate-400 group-hover:text-slate-600'
              } shrink-0`} />
              {!isCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!isCollapsed && isActive && (
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${
                  item.id === 'patrimonio' ? 'bg-slate-950' : 'bg-white'
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
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3.5' : 'gap-3.5 px-4 py-3'} mt-6 text-xs text-slate-400 hover:text-slate-700 bg-slate-50/50 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 border-dashed cursor-pointer`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''} shrink-0`} />
            {!isCollapsed && <span className="text-left font-medium truncate">Aggiorna Google Sheets</span>}
          </button>
        )}
      </nav>

      {/* User Profile Card at Bottom */}
      <div className={`p-3 border-t border-slate-100 ${isCollapsed ? 'bg-transparent' : 'bg-slate-50/50'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            {userPhoto ? (
              <img
                src={userPhoto}
                referrerPolicy="no-referrer"
                alt={userDisplayName || getDisplayName(userEmail)}
                title={`${userDisplayName || getDisplayName(userEmail)} (${userEmail})`}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 uppercase shrink-0" title={`${getDisplayName(userEmail)} (${userEmail})`}>
                {getProfileInitials(userEmail)}
              </div>
            )}
            <button
              onClick={onLogout}
              title="Scollegati"
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            {userPhoto ? (
              <img
                src={userPhoto}
                referrerPolicy="no-referrer"
                alt={userDisplayName || getDisplayName(userEmail)}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 uppercase shrink-0">
                {getProfileInitials(userEmail)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-slate-800 truncate">
                {userDisplayName || getDisplayName(userEmail)}
              </h4>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {userEmail}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Scollegati"
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
