import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Account,
  ClientMetadata,
  PageModule,
  PricingSettings,
  QuoteRecord,
  UserRole,
} from '../../types/quote';
import { initialMetadata, initialModules, initialSettings } from '../../data/initialModules';
import { getQuote, saveQuote, errorMessage } from '../../lib/api';
import { buildClientLink } from '../../lib/session';
import { buildQuoteData, snapshotTotalHt } from '../../utils/quoteData';
import { computeQuoteCalculations } from '../../utils/formatters';
import { MetricCards } from '../configurator/MetricCards';
import { ConfigControls } from '../configurator/ConfigControls';
import { PageTable } from '../configurator/PageTable';
import { PartnerPricingPanel } from '../partner/PartnerPricingPanel';
import { DevisOfficialA4 } from '../pdf/DevisOfficialA4';
import { BieresGeorgesExplainerModal } from '../case-study/BieresGeorgesExplainerModal';
import { StatusBadge } from './Dashboard';
import { ArrowLeft, Printer, Mail, Eye, Sparkles } from 'lucide-react';

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

const secondaryBtn =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-100 shadow-sm hover:bg-slate-50 font-medium text-xs rounded-xl transition-all disabled:opacity-50';

export const QuoteEditor: React.FC<QuoteEditorProps> = ({ token, account, quoteId, onBack, flushRef }) => {
  const [record, setRecord] = useState<QuoteRecord | null>(null);
  const [modules, setModules] = useState<PageModule[]>([]);
  const [settings, setSettings] = useState<PricingSettings>(initialSettings);
  const [metadata, setMetadata] = useState<ClientMetadata>(initialMetadata);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showA4, setShowA4] = useState(false);
  const [showCaseStudy, setShowCaseStudy] = useState(false);

  const isAdmin = account.role === 'admin';
  const uiRole: UserRole = isAdmin ? 'admin' : 'partner';
  const canEditRate = account.role === 'owner' || isAdmin;

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
      const mods = rec.data.modules?.length ? rec.data.modules : initialModules;
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
  }, [token, quoteId]);

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

  const calculations = useMemo(() => computeQuoteCalculations(modules, settings), [modules, settings]);

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

  const handleApplyBase642 = () => {
    setModules(initialModules.map((m) => ({ ...m })));
    setSettings({ ...initialSettings });
  };

  if (loadError) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-slate-600 mb-4">{loadError}</p>
        <button type="button" onClick={onBack} className={secondaryBtn}>
          Retour aux devis
        </button>
      </div>
    );
  }

  if (!record) {
    return <p className="text-center py-24 text-sm text-slate-400">Chargement du devis…</p>;
  }

  const locked = record.status === 'signed';
  const signedInfo =
    locked && record.signedBy && record.signedAt
      ? { by: record.signedBy, at: record.signedAt, signature: record.signature }
      : null;
  const a4Props = { modules, metadata, settings, calculations, signed: signedInfo };

  return (
    <>
      <div className="print-only">
        <DevisOfficialA4 {...a4Props} />
      </div>

      {showA4 ? (
        <div className="no-print fixed inset-0 z-40 overflow-y-auto bg-white">
          <DevisOfficialA4 {...a4Props} onClose={() => setShowA4(false)} />
        </div>
      ) : null}

      <div className="no-print">
        {/* Top bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <button type="button" onClick={handleBack} className={secondaryBtn}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Devis</span>
            </button>
            <div className="min-w-0">
              <p className="font-mono text-xs text-slate-400">{record.reference}</p>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 truncate">
                {metadata.projectName || 'Sans titre'}
              </h1>
            </div>
            <StatusBadge status={record.status} />
            <span
              className={`text-xs ${
                saveState === 'error' || saveState === 'conflict' ? 'text-rose-600' : 'text-slate-400'
              }`}
              aria-live="polite"
            >
              {SAVE_LABELS[saveState]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button type="button" onClick={() => setShowCaseStudy(true)} className={secondaryBtn}>
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <span>Audit dérives</span>
              </button>
            )}
            <button type="button" onClick={() => setShowA4(true)} className={secondaryBtn}>
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Aperçu A4</span>
            </button>
            <button type="button" onClick={() => window.print()} className={secondaryBtn}>
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={handleMail}
              disabled={!metadata.clientEmail}
              title={metadata.clientEmail ? undefined : "Renseignez l'e-mail du client dans les informations du devis"}
              className={secondaryBtn}
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Envoyer par e-mail</span>
            </button>
          </div>
        </div>

        {saveState === 'conflict' && (
          <div className="mb-6 flex items-center justify-between gap-4 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <span>Ce devis a été modifié ailleurs (par votre client par exemple). Rechargez pour récupérer la dernière version.</span>
            <button type="button" onClick={() => void load()} className="font-semibold underline underline-offset-4">
              Recharger
            </button>
          </div>
        )}
        {saveError && saveState === 'error' && (
          <p className="mb-6 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{saveError}</p>
        )}
        {locked && (
          <p className="mb-6 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            Devis signé par {record.signedBy} : il est verrouillé et ne peut plus être modifié.
          </p>
        )}

        <fieldset disabled={locked} className="min-w-0 border-0 p-0 m-0">
          <PartnerPricingPanel
            settings={settings}
            calculations={calculations}
            metadata={metadata}
            onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
            onShare={handleShare}
          />

          <MetricCards currentRole={uiRole} calculations={calculations} settings={settings} />

          <ConfigControls
            currentRole={uiRole}
            canEditRate={canEditRate}
            settings={settings}
            metadata={metadata}
            onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
            onUpdateMetadata={(patch) => setMetadata((m) => ({ ...m, ...patch }))}
          />

          <PageTable
            modules={modules}
            currentRole={uiRole}
            settings={settings}
            onUpdateQuantity={(id, quantity) => updateModule(id, { quantity })}
            onUpdateIncluded={(id, includedDetails) => updateModule(id, { includedDetails })}
            onUpdateBasePrice={(id, basePrice) => updateModule(id, { basePrice })}
            onUpdateDays={(id, days) => updateModule(id, { days })}
            onAddCustomModule={handleAddCustomModule}
            onDeleteModule={(id) => setModules((prev) => prev.filter((m) => m.id !== id))}
          />
        </fieldset>
      </div>

      {showCaseStudy && isAdmin && (
        <BieresGeorgesExplainerModal
          onClose={() => setShowCaseStudy(false)}
          onApplyBase642={handleApplyBase642}
        />
      )}
    </>
  );
};
