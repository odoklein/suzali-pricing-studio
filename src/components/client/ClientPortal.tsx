import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClientMetadata, ClientQuoteView as ClientQuote } from '../../types/quote';
import { getClientQuote, updateClientOptions, signClientQuote, ApiError, errorMessage } from '../../lib/api';
import { computeQuoteCalculations } from '../../utils/formatters';
import { Header, getInitials } from '../layout/Header';
import { ClientQuoteView } from './ClientQuoteView';
import { DevisOfficialA4 } from '../pdf/DevisOfficialA4';

interface ClientPortalProps {
  shareToken: string;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ shareToken }) => {
  const [quote, setQuote] = useState<ClientQuote | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [showQuote, setShowQuote] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getClientQuote(shareToken);
      if (!data) {
        setState('notfound');
        return;
      }
      setQuote(data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [shareToken]);

  useEffect(() => {
    void load();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [load]);

  const metadata: ClientMetadata | null = useMemo(() => {
    if (!quote) return null;
    const { issuer, snapshot, reference } = quote;
    return {
      ...snapshot.metadata,
      quoteNumber: reference,
      partnerCompany: issuer.name,
      partnerTagline: issuer.tagline,
      partnerContact: issuer.contactName || issuer.name,
      partnerEmail: issuer.email,
      partnerPhone: issuer.phone,
      partnerAddress: issuer.address,
      partnerSiret: issuer.siret,
    };
  }, [quote]);

  const calculations = useMemo(
    () => (quote ? computeQuoteCalculations(quote.snapshot.modules, quote.snapshot.settings) : null),
    [quote]
  );

  const handleToggle = (id: string, active: boolean) => {
    if (!quote || quote.status === 'signed') return;
    const modules = quote.snapshot.modules.map((m) => (m.id === id ? { ...m, quantity: active ? 1 : 0 } : m));
    setQuote({ ...quote, snapshot: { ...quote.snapshot, modules } });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const quantities = Object.fromEntries(modules.filter((m) => m.optional).map((m) => [m.id, m.quantity]));
      try {
        await updateClientOptions(shareToken, quantities);
        setNotice(null);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'locked') await load();
        setNotice(errorMessage(e));
      }
    }, 500);
  };

  const handleSign = async (name: string, signature: string) => {
    try {
      // les choix en attente doivent être enregistrés avant la signature
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        const quantities = Object.fromEntries(
          (quote?.snapshot.modules ?? []).filter((m) => m.optional).map((m) => [m.id, m.quantity])
        );
        await updateClientOptions(shareToken, quantities);
      }
      const res = await signClientQuote(shareToken, name, signature);
      setQuote((q) =>
        q ? { ...q, status: 'signed', signedBy: name, signedAt: res.signedAt, signature } : q
      );
      return { success: true, signedAt: res.signedAt };
    } catch (e) {
      return { success: false, error: errorMessage(e) };
    }
  };

  if (state === 'loading') {
    return <div className="min-h-screen bg-white flex items-center justify-center text-sm text-slate-400">Chargement…</div>;
  }

  if (state !== 'ready' || !quote || !metadata || !calculations) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {state === 'notfound' ? 'Devis indisponible' : 'Chargement impossible'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {state === 'notfound'
              ? "Ce lien n'est plus valide ou le devis n'a pas encore été transmis."
              : 'Vérifiez votre connexion puis rechargez la page.'}
          </p>
        </div>
      </div>
    );
  }

  const signedInfo =
    quote.status === 'signed' && quote.signedBy && quote.signedAt
      ? { by: quote.signedBy, at: quote.signedAt, signature: quote.signature }
      : null;

  const a4Props = {
    modules: quote.snapshot.modules,
    metadata,
    settings: quote.snapshot.settings,
    calculations,
    signed: signedInfo,
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-200 font-sans">
      <div className="print-only">
        <DevisOfficialA4 {...a4Props} />
      </div>

      {showQuote ? (
        <div className="no-print">
          <DevisOfficialA4 {...a4Props} onSign={handleSign} onClose={() => setShowQuote(false)} />
        </div>
      ) : (
        <div className="no-print">
          <Header
            brandName={quote.issuer.name}
            brandSub={quote.issuer.tagline}
            initials={getInitials(quote.issuer.name)}
          />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {notice && (
              <p className="mb-6 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{notice}</p>
            )}
            <ClientQuoteView
              modules={quote.snapshot.modules}
              metadata={metadata}
              settings={quote.snapshot.settings}
              calculations={calculations}
              onToggleOption={handleToggle}
              onOpenQuote={() => setShowQuote(true)}
              issuerName={quote.issuer.name}
              reference={quote.reference}
              signedAt={quote.signedAt}
            />
          </main>
          <footer className="border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
            {quote.issuer.name}
            {quote.issuer.tagline ? ` - ${quote.issuer.tagline}` : ''}
          </footer>
        </div>
      )}
    </div>
  );
};
