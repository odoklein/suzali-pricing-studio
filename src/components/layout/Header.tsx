import React from 'react';
import { LogOut, UserRound } from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
}

interface HeaderProps {
  brandName: string;
  brandSub?: string;
  initials: string;
  navItems?: NavItem[];
  activeNav?: string;
  onNavigate?: (key: string) => void;
  /** Compte connecté (espace interne uniquement) */
  accountName?: string;
  onOpenAccount?: () => void;
  onLogout?: () => void;
  actions?: React.ReactNode;
}

export const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '··';

export const Header: React.FC<HeaderProps> = ({
  brandName,
  brandSub,
  initials,
  navItems,
  activeNav,
  onNavigate,
  accountName,
  onOpenAccount,
  onLogout,
  actions,
}) => (
  <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 no-print">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

      <div className="flex items-center gap-8 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <span className="text-xs font-mono font-semibold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 tracking-tight truncate">{brandName}</p>
            {brandSub && <p className="text-[11px] text-slate-400 truncate">{brandSub}</p>}
          </div>
        </div>

        {navItems && navItems.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate?.(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeNav === item.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {accountName && (
          <button
            type="button"
            onClick={onOpenAccount}
            title="Mon compte"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <UserRound className="w-3.5 h-3.5 text-slate-400" />
            <span>{accountName}</span>
          </button>
        )}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-100 shadow-sm hover:text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        )}
      </div>
    </div>

    {navItems && navItems.length > 0 && (
      <nav className="sm:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate?.(item.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeNav === item.key ? 'bg-slate-900 text-white' : 'text-slate-500'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    )}
  </header>
);
