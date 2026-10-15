import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClientMetadata, ClientQuoteView as ClientQuote } from '../../types/quote';
import { getClientQuote, updateClientOptions, signClientQuote, ApiError, errorMessage } from '../../lib/api';
import { computeQuoteCalculations } from '../../utils/formatters';
import { getInitials } from '../../lib/initials';
import { Monogram, Notice } from '../ui/display';
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
      partnerLegalForm: issuer.legalForm ?? '',
      partnerShareCapital: issuer.shareCapital ?? '',
      partnerRcs: issuer.rcs ?? '',
      partnerVat: issuer.vatNumber ?? '',
      partnerWebsite: issuer.website ?? '',
    };
  }, [quote]);

  const calculations = useMemo(
    () =>
      quote
        ? computeQuoteCalculations(
            quote.snapshot.modules,
            quote.snapshot.settings,
            quote.snapshot.metadata.depositPercentage
          )
        : null,
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
    return <div className="grid min-h-dvh place-items-center bg-bg text-ui text-muted">Chargement…</div>;
  }

  if (state !== 'ready' || !quote || !metadata || !calculations) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-ink">
        <div className="max-w-sm">
          <h1 className="text-h2 font-semibold tracking-title">
            {state === 'notfound' ? 'Devis indisponible' : 'Chargement impossible'}
          </h1>
          <p className="mt-2 text-body text-muted">
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
    <div className="min-h-dvh bg-bg text-ink">
      <div className="print-only">
        <DevisOfficialA4 {...a4Props} />
      </div>

      {showQuote ? (
        <div className="no-print">
          <DevisOfficialA4 {...a4Props} onSign={handleSign} onClose={() => setShowQuote(false)} />
        </div>
      ) : (
        <div className="no-print">
          <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
              {quote.issuer.logo ? (
                <img src={quote.issuer.logo} alt={quote.issuer.name} className="h-7 max-w-[120px] object-contain" />
              ) : (
                <Monogram label={getInitials(quote.issuer.name)} size={28} />
              )}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-ui font-semibold">{quote.issuer.name}</p>
                {quote.issuer.tagline && <p className="truncate text-xs text-muted">{quote.issuer.tagline}</p>}
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            {notice && (
              <Notice tone="danger" role="alert" className="mb-6">
                {notice}
              </Notice>
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
          <footer className="mt-12 hidden border-t border-line py-6 text-center text-xs text-muted lg:block">
            {quote.issuer.name}
            {quote.issuer.tagline ? ` · ${quote.issuer.tagline}` : ''}
          </footer>
        </div>
      )}
    </div>
  );
};
