import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Account } from '../../types/quote';
import { saveQuote, errorMessage } from '../../lib/api';
import { newQuoteData, snapshotTotalHt } from '../../utils/quoteData';
import { AppShell, type ShellNavItem } from '../layout/AppShell';
import { Dashboard } from './Dashboard';
import { PartnersPanel } from './PartnersPanel';
import { QuoteEditor } from './QuoteEditor';
import { AccountModal } from './AccountModal';
import { ArchitectureModal } from '../architecture/ArchitectureModal';
import { FileText, Server, Users } from 'lucide-react';

interface StaffAppProps {
  token: string;
  account: Account;
  onAccountUpdated: (account: Account) => void;
  onLogout: () => void;
}

type View = { name: 'quotes' } | { name: 'partners' } | { name: 'editor'; id: string };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export const StaffApp: React.FC<StaffAppProps> = ({ token, account, onAccountUpdated, onLogout }) => {
  const [view, setView] = useState<View>({ name: 'quotes' });
  const [showAccount, setShowAccount] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  const isAdmin = account.role === 'admin';
  const canManagePartners = account.role === 'owner' || isAdmin;

  const nav: ShellNavItem[] = [
    { key: 'quotes', label: 'Devis', icon: FileText },
    ...(canManagePartners ? [{ key: 'partners', label: 'Partenaires', icon: Users }] : []),
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

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      await flushRef.current?.();
      // la référence officielle est attribuée par le serveur et reportée dans le devis à l’ouverture
      const data = newQuoteData(account);
      const res = await saveQuote(token, {
        id: null,
        title: data.metadata.projectName,
        clientName: '',
        clientEmail: '',
        status: 'draft',
        totalHt: snapshotTotalHt(data.clientSnapshot),
        data,
        expectedUpdatedAt: null,
      });
      if (res.quote) setView({ name: 'editor', id: res.quote.id });
    } catch (e) {
      setCreateError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }, [account, token, creating]);

  // N : nouveau devis, hors saisie et hors éditeur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (view.name === 'editor' || showAccount || showArchitecture) return;
      e.preventDefault();
      void handleCreate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCreate, view.name, showAccount, showArchitecture]);

  return (
    <>
      <AppShell
        brandName={isAdmin ? 'Suzali Conseil' : account.name}
        brandSub={isAdmin ? 'Pricing Studio' : account.tagline || 'Espace partenaire'}
        nav={nav}
        tools={isAdmin ? [{ key: 'architecture', label: 'Architecture', icon: Server, onSelect: () => setShowArchitecture(true) }] : []}
        active={view.name === 'partners' ? 'partners' : 'quotes'}
        onNavigate={handleNavigate}
        accountName={account.contactName || account.name}
        accountEmail={account.email}
        onOpenAccount={() => setShowAccount(true)}
        onLogout={handleLogout}
        onCreate={() => void handleCreate()}
        creating={creating}
      >
        {view.name === 'quotes' && (
          <Dashboard
            token={token}
            account={account}
            onOpen={(id) => setView({ name: 'editor', id })}
            onCreate={() => void handleCreate()}
            creating={creating}
            createError={createError}
          />
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
      </AppShell>

      {showAccount && (
        <AccountModal token={token} account={account} onUpdated={onAccountUpdated} onClose={() => setShowAccount(false)} />
      )}
      {showArchitecture && isAdmin && <ArchitectureModal onClose={() => setShowArchitecture(false)} />}
    </>
  );
};
