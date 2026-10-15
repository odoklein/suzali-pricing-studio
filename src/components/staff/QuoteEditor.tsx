import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Account,
  ClientMetadata,
  PageModule,
  PricingSettings,
  PricingView,
  QuoteRecord,
  UserRole,
} from '../../types/quote';
import { initialMetadata, initialSettings } from '../../data/initialModules';
import { getQuote, saveQuote, errorMessage } from '../../lib/api';
import { buildClientLink } from '../../lib/session';
import { buildClientSnapshot, buildQuoteData, snapshotTotalHt, toListedPricing } from '../../utils/quoteData';
import { computeQuoteCalculations } from '../../utils/formatters';
import { QuoteSummary } from '../configurator/QuoteSummary';
import { ConfigControls } from '../configurator/ConfigControls';
import { PageTable } from '../configurator/PageTable';
import { DevisOfficialA4 } from '../pdf/DevisOfficialA4';
import { StatusBadge } from './Dashboard';
import { QuoteFollowUp } from './QuoteFollowUp';
import { Button, IconButton, Spinner } from '../ui/button';
import { Kbd, Notice } from '../ui/display';
import { ArrowLeft, Check, CircleAlert, Eye, Mail, Printer } from 'lucide-react';

interface QuoteEditorProps {
  token: string;
  account: Account;
  quoteId: string;
  onBack: () => void;
  /** Permet à l'application de forcer l'enregistrement avant une déconnexion */
  flushRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

const SAVE_LABELS: Record<SaveState, string> = {
  saved: 'Enregistré',
  dirty: 'Modifications en attente…',
  saving: 'Enregistrement…',
  error: "Échec de l'enregistrement",
  conflict: 'Conflit',
};

export const QuoteEditor: React.FC<QuoteEditorProps> = ({ token, account, quoteId, onBack, flushRef }) => {
  const [record, setRecord] = useState<QuoteRecord | null>(null);
  const [modules, setModules] = useState<PageModule[]>([]);
  const [settings, setSettings] = useState<PricingSettings>(initialSettings);
  const [metadata, setMetadata] = useState<ClientMetadata>(initialMetadata);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showA4, setShowA4] = useState(false);

  const isAdmin = account.role === 'admin';
  const uiRole: UserRole = isAdmin ? 'admin' : 'partner';
  const canEditRate = account.role === 'owner' || isAdmin;
  // Client du revendeur : une seule grille de prix, imposée par le revendeur (jamais de prix d'achat ni de prix à saisir)
  const isManagedClient = account.managed === true;

  const recordRef = useRef<QuoteRecord | null>(null);
  const latest = useRef({ modules, settings, metadata });
  useEffect(() => {
    latest.current = { modules, settings, metadata };
  }, [modules, settings, metadata]);
  const lastSaved = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const loaded = useRef(false);

  const load = useCallback(async () => {
    loaded.current = false;
    try {
      const rec = await getQuote(token, quoteId);
      const md: ClientMetadata = { ...initialMetadata, ...rec.data.metadata, quoteNumber: rec.reference };
      const st: PricingSettings = { ...initialSettings, ...rec.data.settings };
      let mods = rec.data.modules ?? [];
      // Devis d'un client du revendeur : un seul prix par ligne, quel que soit celui qui l'ouvre
      if (rec.accountManaged || isManagedClient) {
        const listed = toListedPricing(mods, st);
        mods = listed.modules;
        Object.assign(st, listed.settings);
      } else if (!canEditRate) {
        // Le tarif journalier d'un partenaire est fixé par la régie : le devis suit toujours celui du compte
        st.tjmSuzali = account.dailyRate;
      }
      recordRef.current = rec;
      lastSaved.current = JSON.stringify({ modules: mods, settings: st, metadata: md });
      setRecord(rec);
      setModules(mods);
      setSettings(st);
      setMetadata(md);
      setSaveState('saved');
      setSaveError(null);
      setLoadError(null);
      loaded.current = true;
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, [token, quoteId, canEditRate, isManagedClient, account.dailyRate]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (statusOverride?: 'sent'): Promise<boolean> => {
      const rec = recordRef.current;
      if (!rec || rec.status === 'signed') return true;
      const serial = JSON.stringify(latest.current);
      if (serial === lastSaved.current && !statusOverride) return true;
      const { modules: mods, settings: st, metadata: md } = latest.current;
      setSaveState('saving');
      try {
        const data = buildQuoteData(mods, st, md);
        const res = await saveQuote(token, {
          id: rec.id,
          title: md.projectName,
          clientName: md.clientCompany,
          clientEmail: md.clientEmail,
          status: statusOverride ?? (rec.status === 'sent' ? 'sent' : 'draft'),
          totalHt: snapshotTotalHt(data.clientSnapshot),
          data,
          expectedUpdatedAt: rec.updatedAt,
        });
        if (res.conflict || !res.quote) {
          setSaveState('conflict');
          return false;
        }
        recordRef.current = res.quote;
        lastSaved.current = serial;
        setRecord((prev) => (prev ? { ...prev, ...res.quote! } : res.quote!));
        setSaveState(JSON.stringify(latest.current) === serial ? 'saved' : 'dirty');
        setSaveError(null);
        return true;
      } catch (e) {
        setSaveState('error');
        setSaveError(errorMessage(e));
        return false;
      }
    },
    [token]
  );

  // Les enregistrements sont sérialisés pour ne jamais se chevaucher
  const save = useCallback(
    (statusOverride?: 'sent') => {
      const p = chain.current.then(() => persist(statusOverride));
      chain.current = p.catch(() => undefined);
      return p;
    },
    [persist]
  );

  useEffect(() => {
    flushRef.current = async () => {
      if (timer.current) clearTimeout(timer.current);
      return save();
    };
    return () => {
      flushRef.current = null;
    };
  }, [flushRef, save]);

  // Enregistrement automatique 1 s après la dernière modification
  useEffect(() => {
    if (!loaded.current || recordRef.current?.status === 'signed') return;
    const serial = JSON.stringify({ modules, settings, metadata });
    if (serial === lastSaved.current) return;
    setSaveState((s) => (s === 'conflict' ? s : 'dirty'));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [modules, settings, metadata, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving' || saveState === 'error') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  const calculations = useMemo(
    () => computeQuoteCalculations(modules, settings, metadata.depositPercentage),
    [modules, settings, metadata.depositPercentage]
  );

  // Ctrl/Cmd + S : enregistrement immédiat plutôt que le dialogue du navigateur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const handleBack = async () => {
    if (timer.current) clearTimeout(timer.current);
    const ok = await save();
    if (ok || window.confirm("Les dernières modifications n'ont pas pu être enregistrées. Quitter quand même ?")) {
      onBack();
    }
  };

  const handleShare = async (): Promise<string | null> => {
    const rec = recordRef.current;
    if (!rec) return null;
    if (timer.current) clearTimeout(timer.current);
    if (rec.status !== 'signed') {
      const ok = await save('sent');
      if (!ok) return null;
    }
    return buildClientLink(recordRef.current!.shareToken);
  };

  const handleMail = async () => {
    const url = await handleShare();
    if (!url) return;
    const subject = `Devis ${metadata.quoteNumber} — ${metadata.projectName}`;
    const body =
      `Bonjour ${metadata.clientContact.split(' ')[0] || ''},\n\n` +
      `Vous trouverez votre devis à l'adresse suivante, où vous pouvez ajuster les options et le signer en ligne :\n${url}\n\n` +
      `Cordialement,\n${account.name}`;
    window.location.href = `mailto:${encodeURIComponent(metadata.clientEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const updateModule = (id: string, patch: Partial<PageModule>) =>
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const handleAddCustomModule = (
    name: string,
    description: string,
    included: string,
    price: number,
    days: number
  ) => {
    setModules((prev) => [
      ...prev,
      {
        id: 'custom-' + Date.now(),
        name,
        category: 'interactive',
        description,
        includedDetails: included,
        basePrice: settings.mode === 'tjm' ? Math.round(days * settings.tjmSuzali) : price,
        days,
        quantity: 1,
        isCustom: true,
      },
    ]);
  };

  if (loadError) {
    return (
      <div className="py-24 text-center">
        <p className="mb-4 text-body text-muted">{loadError}</p>
        <Button onClick={onBack} icon={<ArrowLeft className="size-4" aria-hidden="true" />}>
          Retour aux devis
        </Button>
      </div>
    );
  }

  if (!record) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-ui text-muted">
        <Spinner />
        Chargement du devis…
      </p>
    );
  }

  const locked = record.status === 'signed';
  const pricing: PricingView = isManagedClient ? 'fixed' : record.accountManaged ? 'listed' : 'resale';
  const signedInfo =
    locked && record.signedBy && record.signedAt
      ? { by: record.signedBy, at: record.signedAt, signature: record.signature }
      : null;
  // Le devis imprimé est exactement celui du client : prix de vente, jamais le prix d'achat
  const clientView = buildClientSnapshot(modules, settings, metadata);
  const a4Props = {
    modules: clientView.modules,
    metadata,
    settings: clientView.settings,
    calculations: computeQuoteCalculations(clientView.modules, clientView.settings, metadata.depositPercentage),
    signed: signedInfo,
    logo: record.issuerLogo,
  };

  return (
    <>
      <div className="print-only">
        <DevisOfficialA4 {...a4Props} />
      </div>

      {showA4 ? (
        <div className="no-print fixed inset-0 z-50 overflow-y-auto bg-chrome">
          <DevisOfficialA4 {...a4Props} onClose={() => setShowA4(false)} />
        </div>
      ) : null}

      <div className="no-print">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <IconButton label="Retour aux devis" variant="secondary" onClick={handleBack} className="mt-0.5">
              <ArrowLeft className="size-4" />
            </IconButton>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-mono">{record.reference}</span>
                <StatusBadge status={record.status} />
                <span
                  aria-live="polite"
                  className={`inline-flex items-center gap-1 ${
                    saveState === 'error' || saveState === 'conflict' ? 'text-danger-text' : 'text-muted'
                  }`}
                >
                  {saveState === 'saving' && <Spinner className="size-3" />}
                  {saveState === 'saved' && <Check aria-hidden="true" className="size-3.5 text-done" />}
                  {(saveState === 'error' || saveState === 'conflict') && <CircleAlert aria-hidden="true" className="size-3.5" />}
                  {SAVE_LABELS[saveState]}
                  {saveState === 'dirty' && (
                    <span className="hidden items-center gap-1 sm:inline-flex">
                      · <Kbd>Ctrl S</Kbd>
                    </span>
                  )}
                </span>
              </p>
              <h1 className="mt-1 truncate text-h1 font-semibold tracking-tight">{metadata.projectName || 'Sans titre'}</h1>
              {metadata.clientCompany && <p className="text-body text-muted">{metadata.clientCompany}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<Eye className="size-4" aria-hidden="true" />} onClick={() => setShowA4(true)}>
              Aperçu A4
            </Button>
            <Button icon={<Printer className="size-4" aria-hidden="true" />} onClick={() => window.print()}>
              PDF
            </Button>
            <Button
              icon={<Mail className="size-4" aria-hidden="true" />}
              onClick={handleMail}
              disabled={!metadata.clientEmail}
              title={metadata.clientEmail ? undefined : "Renseignez l'e-mail du client dans les informations du devis"}
            >
              Envoyer par e-mail
            </Button>
          </div>
        </header>

        <div className="space-y-3 empty:hidden mb-6">
          {saveState === 'conflict' && (
            <Notice
              tone="waiting"
              role="alert"
              action={
                <Button size="sm" onClick={() => void load()}>
                  Recharger
                </Button>
              }
            >
              Ce devis a été modifié ailleurs (par votre client par exemple). Rechargez pour récupérer la dernière version.
            </Notice>
          )}
          {saveError && saveState === 'error' && (
            <Notice tone="danger" role="alert">
              {saveError}
            </Notice>
          )}
          {locked && (
            <Notice tone="done">Devis signé par {record.signedBy} : il est verrouillé et ne peut plus être modifié.</Notice>
          )}
        </div>

        {locked && (
          <div className="mb-6">
            <QuoteFollowUp
              token={token}
              quote={record}
              canEdit={account.role === 'owner' || isAdmin}
              onChange={(q) => {
                const next = { ...record, ...q };
                recordRef.current = next;
                setRecord(next);
              }}
            />
          </div>
        )}

        <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="order-2 min-w-0 space-y-6 lg:order-1">
              <ConfigControls
                metadata={metadata}
                onUpdateMetadata={(patch) => setMetadata((m) => ({ ...m, ...patch }))}
              />

              <PageTable
                modules={modules}
                currentRole={uiRole}
                pricing={pricing}
                settings={settings}
                onUpdateQuantity={(id, quantity) => updateModule(id, { quantity })}
                onUpdateIncluded={(id, includedDetails) => updateModule(id, { includedDetails })}
                onUpdateBasePrice={(id, basePrice) => updateModule(id, { basePrice })}
                onUpdateClientPrice={(id, clientPrice) => updateModule(id, { clientPrice })}
                onUpdateDays={(id, days) => updateModule(id, { days })}
                onAddCustomModule={handleAddCustomModule}
                onDeleteModule={(id) => setModules((prev) => prev.filter((m) => m.id !== id))}
              />
            </div>

            <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
              <QuoteSummary
                currentRole={uiRole}
                pricing={pricing}
                settings={settings}
                calculations={calculations}
                metadata={metadata}
                onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
                onShare={handleShare}
              />
            </aside>
          </div>
        </fieldset>
      </div>
    </>
  );
};
