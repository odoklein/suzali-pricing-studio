import React, { useRef, useState } from 'react';
import type { Account } from '../../types/quote';
import { Header, getInitials } from '../layout/Header';
import { Dashboard } from './Dashboard';
import { PartnersPanel } from './PartnersPanel';
import { QuoteEditor } from './QuoteEditor';
import { AccountModal } from './AccountModal';
import { ArchitectureModal } from '../architecture/ArchitectureModal';
import { Server } from 'lucide-react';

interface StaffAppProps {
  token: string;
  account: Account;
  onAccountUpdated: (account: Account) => void;
  onLogout: () => void;
}

type View = { name: 'quotes' } | { name: 'partners' } | { name: 'editor'; id: string };

export const StaffApp: React.FC<StaffAppProps> = ({ token, account, onAccountUpdated, onLogout }) => {
  const [view, setView] = useState<View>({ name: 'quotes' });
  const [showAccount, setShowAccount] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  const isAdmin = account.role === 'admin';
  const canManagePartners = account.role === 'owner' || isAdmin;

  const navItems = [
    { key: 'quotes', label: 'Devis' },
    ...(canManagePartners ? [{ key: 'partners', label: 'Partenaires' }] : []),
  ];

  const handleNavigate = async (key: string) => {
    if (view.name === 'editor') await flushRef.current?.();
    setView(key === 'partners' ? { name: 'partners' } : { name: 'quotes' });
  };

  const handleLogout = async () => {
    // on enregistre le travail en cours avant de révoquer la session
    await flushRef.current?.();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-200 font-sans">
      <Header
        brandName={isAdmin ? 'Suzali Conseil' : account.name}
        brandSub={isAdmin ? 'Régie technique' : account.tagline}
        initials={getInitials(isAdmin ? 'Suzali Conseil' : account.name)}
        navItems={navItems}
        activeNav={view.name === 'partners' ? 'partners' : 'quotes'}
        onNavigate={handleNavigate}
        accountName={account.name}
        onOpenAccount={() => setShowAccount(true)}
        onLogout={handleLogout}
        actions={
          isAdmin ? (
            <button
              type="button"
              onClick={() => setShowArchitecture(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Architecture</span>
            </button>
          ) : null
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {view.name === 'quotes' && (
          <Dashboard token={token} account={account} onOpen={(id) => setView({ name: 'editor', id })} />
        )}
        {view.name === 'partners' && canManagePartners && <PartnersPanel token={token} />}
        {view.name === 'editor' && (
          <QuoteEditor
            key={view.id}
            token={token}
            account={account}
            quoteId={view.id}
            flushRef={flushRef}
            onBack={() => setView({ name: 'quotes' })}
          />
        )}
      </main>

      <footer className="no-print border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        {isAdmin ? 'Suzali Conseil Pricing Studio' : account.name}
      </footer>

      {showAccount && (
        <AccountModal
          token={token}
          account={account}
          onUpdated={onAccountUpdated}
          onClose={() => setShowAccount(false)}
        />
      )}
      {showArchitecture && isAdmin && <ArchitectureModal onClose={() => setShowArchitecture(false)} />}
    </div>
  );
};
