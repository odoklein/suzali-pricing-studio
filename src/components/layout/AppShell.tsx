import React, { useEffect, useState } from 'react';
import { LogOut, Menu, Monitor, Moon, Plus, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme, type ThemePreference } from '../../lib/theme';
import { Button, IconButton } from '../ui/button';
import { Kbd, Monogram } from '../ui/display';
import { getInitials } from '../../lib/initials';

export interface ShellNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  brandName: string;
  brandSub?: string;
  nav: ShellNavItem[];
  /** Liens secondaires (outils d’administration) : ouvrent un panneau, sans état actif */
  tools?: (ShellNavItem & { onSelect: () => void })[];
  active: string;
  onNavigate: (key: string) => void;
  accountName: string;
  accountEmail?: string;
  onOpenAccount: () => void;
  onLogout: () => void;
  onCreate: () => void;
  creating?: boolean;
  children: React.ReactNode;
}

/** Lien du menu : pilule blanche quand la page est ouverte, gris discret au survol sinon. */
const navItem =
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body outline-hidden transition-colors focus-visible:shadow-[var(--ring)] pointer-coarse:min-h-11';
const navActive = 'bg-surface font-medium text-ink shadow-card';
const navIdle = 'text-ink-2 hover:bg-surface/70 hover:text-ink';

const THEMES: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'Thème : système', icon: Monitor },
  { value: 'light', label: 'Thème : clair', icon: Sun },
  { value: 'dark', label: 'Thème : sombre', icon: Moon },
];

export const AppShell: React.FC<AppShellProps> = ({
  brandName,
  brandSub,
  nav,
  tools = [],
  active,
  onNavigate,
  accountName,
  accountEmail,
  onOpenAccount,
  onLogout,
  onCreate,
  creating = false,
  children,
}) => {
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const close = () => setNavOpen(false);
  const themeIndex = THEMES.findIndex((t) => t.value === theme);
  const nextTheme = THEMES[(themeIndex + 1) % THEMES.length];
  const ThemeIcon = THEMES[themeIndex].icon;

  // Téléphone : Échap ferme le tiroir, comme un toucher sur le voile.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setNavOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const initials = getInitials(brandName);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-chrome md:flex-row print:block print:h-auto print:overflow-visible print:bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-ui focus:font-medium focus:shadow-pop"
      >
        Aller au contenu
      </a>

      {/* Barre du haut sur téléphone : la barre latérale s’ouvre en tiroir. */}
      <header className="no-print flex shrink-0 items-center gap-1.5 border-b border-line bg-chrome px-2 py-2 md:hidden">
        <IconButton label="Ouvrir le menu" onClick={() => setNavOpen(true)}>
          <Menu className="size-4" />
        </IconButton>
        <Monogram label={initials} size={24} />
        <span className="truncate text-body font-semibold tracking-title">{brandName}</span>
        <IconButton label="Nouveau devis" variant="primary" className="ml-auto" onClick={onCreate} disabled={creating}>
          <Plus className="size-4" />
        </IconButton>
      </header>

      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          'no-print fixed inset-0 z-40 bg-[var(--scrim)] transition-opacity duration-[var(--dur-2)] md:hidden',
          navOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        aria-label="Menu"
        className={cn(
          'no-print flex h-full w-[280px] shrink-0 flex-col bg-chrome md:w-[var(--sidebar-w)]',
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:border-r max-md:border-line max-md:shadow-pop',
          navOpen
            ? 'max-md:translate-x-0 max-md:[transition:transform_var(--dur-3)_var(--ease-out),visibility_0s]'
            : 'max-md:invisible max-md:-translate-x-full max-md:[transition:transform_var(--dur-2)_var(--ease-in),visibility_0s_linear_var(--dur-2)]'
        )}
      >
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <Monogram label={initials} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-body font-semibold tracking-title">{brandName}</p>
            {brandSub && <p className="truncate text-xs text-muted">{brandSub}</p>}
          </div>
        </div>

        <p className="mt-2 px-5 text-xs font-medium text-muted">Menu principal</p>
        <nav className="mt-1.5 space-y-0.5 px-3" aria-label="Navigation principale">
          {nav.map(({ key, label, icon: Icon }) => {
            const current = active === key;
            return (
              <button
                key={key}
                type="button"
                aria-current={current ? 'page' : undefined}
                onClick={() => {
                  close();
                  onNavigate(key);
                }}
                className={cn(navItem, current ? navActive : navIdle)}
              >
                <Icon aria-hidden="true" className={cn('size-[18px]', current ? 'text-ink' : 'text-muted')} />
                {label}
              </button>
            );
          })}
        </nav>

        {tools.length > 0 && (
          <>
            <div aria-hidden="true" className="mx-5 mt-4 border-t border-line" />
            <p className="mt-3 px-5 text-xs font-medium text-muted">Outils</p>
            <div className="mt-1.5 space-y-0.5 px-3">
              {tools.map(({ key, label, icon: Icon, onSelect }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    close();
                    onSelect();
                  }}
                  className={cn(navItem, navIdle, 'py-1.5 text-ui')}
                >
                  <Icon aria-hidden="true" className="size-4 text-muted" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="min-h-0 flex-1" />

        {/* La création reste à portée, quelle que soit la page. */}
        <div className="px-3 pb-1">
          <Button
            variant="primary"
            icon={<Plus className="size-4" aria-hidden="true" />}
            loading={creating}
            onClick={() => {
              close();
              onCreate();
            }}
            className="w-full"
          >
            <span className="flex-1 text-left">Nouveau devis</span>
            <Kbd onInk>N</Kbd>
          </Button>
        </div>

        <div className="flex items-center gap-1 p-3">
          <button
            type="button"
            onClick={() => {
              close();
              onOpenAccount();
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-hidden transition-colors hover:bg-surface/70 focus-visible:shadow-[var(--ring)] pointer-coarse:min-h-11"
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
            >
              {getInitials(accountName)}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-ui font-medium">{accountName}</span>
              <span className="block truncate text-xs text-muted">{accountEmail || 'Mon compte'}</span>
            </span>
          </button>
          <IconButton label={`${THEMES[themeIndex].label} (changer)`} onClick={() => setTheme(nextTheme.value)}>
            <ThemeIcon className="size-4" />
          </IconButton>
          <IconButton label="Se déconnecter" onClick={onLogout}>
            <LogOut className="size-4" />
          </IconButton>
        </div>
      </aside>

      {/* Coque : le contenu repose dans un panneau arrondi et bordé. */}
      <main
        id="main"
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg outline-hidden md:my-2 md:mr-2 md:rounded-2xl md:border md:border-line md:shadow-card print:block print:overflow-visible print:border-0 print:bg-white print:shadow-none"
      >
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin print:overflow-visible">
          <div className="mx-auto max-w-[var(--page-wide)] px-4 pb-12 pt-6 sm:px-8 sm:pt-7 print:max-w-none print:p-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
