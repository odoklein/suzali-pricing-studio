import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Account } from '../../types/quote';
import { saveQuote, errorMessage } from '../../lib/api';
import { newQuoteData, snapshotTotalHt } from '../../utils/quoteData';
import { AppShell, type ShellNavItem } from '../layout/AppShell';
import { Dashboard } from './Dashboard';
import { PartnersPanel } from './PartnersPanel';
import { ProfilePanel } from './ProfilePanel';
import { NewQuoteDialog } from './NewQuoteDialog';
import { QuoteEditor } from './QuoteEditor';
import { ArchitectureModal } from '../architecture/ArchitectureModal';
import { Building2, FileText, Server, Users } from 'lucide-react';

interface StaffAppProps {
  token: string;
  account: Account;
  onAccountUpdated: (account: Account) => void;
  onLogout: () => void;
}

type View = { name: 'quotes' } | { name: 'partners' } | { name: 'profile' } | { name: 'editor'; id: string };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export const StaffApp: React.FC<StaffAppProps> = ({ token, account, onAccountUpdated, onLogout }) => {
  const [view, setView] = useState<View>({ name: 'quotes' });
  const [pickingClient, setPickingClient] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);

  const isAdmin = account.role === 'admin';
  const canManagePartners = account.role === 'owner' || isAdmin;

  const nav: ShellNavItem[] = [
    { key: 'quotes', label: 'Devis', icon: FileText },
    ...(canManagePartners ? [{ key: 'partners', label: account.role === 'owner' ? 'Clients' : 'Partenaires', icon: Users }] : []),
    { key: 'profile', label: 'Mes informations', icon: Building2 },
  ];

  const handleNavigate = async (key: string) => {
    if (view.name === 'editor') await flushRef.current?.();
    setView(key === 'partners' ? { name: 'partners' } : key === 'profile' ? { name: 'profile' } : { name: 'quotes' });
  };

  const handleLogout = async () => {
    // on enregistre le travail en cours avant de révoquer la session
    await flushRef.current?.();
    onLogout();
  };

  /** `client` : compte pour lequel le devis est créé (revendeur ou régie) ; null = devis du compte connecté */
  const handleCreate = useCallback(async (client: Account | null = null) => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      await flushRef.current?.();
      // la référence officielle est attribuée par le serveur et reportée dans le devis à l’ouverture
      const data = newQuoteData(account, client);
      const res = await saveQuote(token, {
        id: null,
        title: data.metadata.projectName,
        clientName: data.metadata.clientCompany,
        clientEmail: data.metadata.clientEmail,
        status: 'draft',
        totalHt: snapshotTotalHt(data.clientSnapshot),
        data,
        expectedUpdatedAt: null,
        accountId: client?.id ?? null,
      });
      if (res.quote) setView({ name: 'editor', id: res.quote.id });
    } catch (e) {
      setCreateError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }, [account, token, creating]);

  // Le revendeur et la régie choisissent d'abord le client ; un client crée directement son devis
  const requestCreate = useCallback(() => {
    if (canManagePartners) setPickingClient(true);
    else void handleCreate();
  }, [canManagePartners, handleCreate]);

  // N : nouveau devis, hors saisie et hors éditeur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (view.name === 'editor' || pickingClient || showArchitecture) return;
      e.preventDefault();
      requestCreate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestCreate, view.name, pickingClient, showArchitecture]);

  return (
    <>
      <AppShell
        brandName={isAdmin ? 'Suzali Conseil' : account.name}
        brandSub={isAdmin ? 'Pricing Studio' : account.tagline || 'Espace partenaire'}
        nav={nav}
        tools={isAdmin ? [{ key: 'architecture', label: 'Architecture', icon: Server, onSelect: () => setShowArchitecture(true) }] : []}
        active={view.name === 'partners' ? 'partners' : view.name === 'profile' ? 'profile' : 'quotes'}
        onNavigate={handleNavigate}
        accountName={account.contactName || account.name}
        accountEmail={account.email}
        onOpenAccount={() => void handleNavigate('profile')}
        onLogout={handleLogout}
        onCreate={requestCreate}
        creating={creating}
      >
        {view.name === 'quotes' && (
          <Dashboard
            token={token}
            account={account}
            onOpen={(id) => setView({ name: 'editor', id })}
            onCreate={requestCreate}
            creating={creating}
            createError={createError}
          />
        )}
        {view.name === 'partners' && canManagePartners && <PartnersPanel token={token} account={account} />}
        {view.name === 'profile' && <ProfilePanel token={token} account={account} onUpdated={onAccountUpdated} />}
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

      {pickingClient && (
        <NewQuoteDialog
          token={token}
          account={account}
          onClose={() => setPickingClient(false)}
          onPick={(client) => {
            setPickingClient(false);
            void handleCreate(client);
          }}
        />
      )}
      {showArchitecture && isAdmin && <ArchitectureModal onClose={() => setShowArchitecture(false)} />}
    </>
  );
};
