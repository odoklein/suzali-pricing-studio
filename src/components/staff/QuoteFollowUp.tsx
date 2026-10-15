import React, { useState } from 'react';
import { Check, Undo2 } from 'lucide-react';
import type { DeliveryStatus, PaymentStep, QuoteSummary } from '../../types/quote';
import { setQuotePayment, setQuoteProgress, errorMessage } from '../../lib/api';
import { formatEuros, formatFrenchDate } from '../../utils/formatters';
import { DELIVERY_LABELS, deliveryInfo, instalments, outstanding } from '../../utils/pilotage';
import { Button } from '../ui/button';
import { Badge, Card, CardHeader, Notice, SegmentedControl } from '../ui/display';

interface QuoteFollowUpProps {
  token: string;
  quote: QuoteSummary;
  /** Le revendeur et la régie modifient le suivi ; le client le consulte seulement */
  canEdit: boolean;
  onChange: (quote: QuoteSummary) => void;
}

/** Texte du délai : date prévue et jours ouvrés restants (ou de retard) */
export function deliveryHint(q: QuoteSummary, now: Date = new Date()): string {
  const info = deliveryInfo(q, now);
  if (!info) return '';
  if (info.status === 'todo') return `Délai prévu : ${q.leadDays.toLocaleString('fr-FR')} jours ouvrés à partir du démarrage.`;
  if (info.status === 'delivered') return info.deliveredAt ? `Livré le ${formatFrenchDate(info.deliveredAt)}.` : 'Livré.';
  if (!info.due || info.remaining === null) return '';
  const r = info.remaining;
  const when = `Livraison prévue le ${formatFrenchDate(info.due)}`;
  if (r < 0) return `${when} : ${-r} jour${-r > 1 ? 's' : ''} ouvré${-r > 1 ? 's' : ''} de retard.`;
  if (r === 0) return `${when} : aujourd'hui.`;
  return `${when} : il reste ${r} jour${r > 1 ? 's' : ''} ouvré${r > 1 ? 's' : ''}.`;
}

/** Réalisation et encaissement d'un devis signé. */
export const QuoteFollowUp: React.FC<QuoteFollowUpProps> = ({ token, quote, canEdit, onChange }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = instalments(quote);
  const left = outstanding(quote);
  const late = deliveryInfo(quote)?.remaining;

  const run = async (key: string, action: () => Promise<QuoteSummary>) => {
    setBusy(key);
    setError(null);
    try {
      onChange(await action());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card aria-labelledby="followup-title">
      <CardHeader
        id="followup-title"
        title="Suivi après signature"
        description={deliveryHint(quote)}
        action={
          late !== null && late !== undefined && late < 0 ? <Badge tone="danger">En retard</Badge> : undefined
        }
      />
      <div className="space-y-5 px-5 pb-5">
        {error && (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Réalisation</p>
          {canEdit ? (
            <SegmentedControl<DeliveryStatus>
              size="sm"
              label="Avancement de la réalisation"
              value={quote.deliveryStatus}
              onChange={(status) => void run('progress', () => setQuoteProgress(token, quote.id, status))}
              options={(Object.keys(DELIVERY_LABELS) as DeliveryStatus[]).map((value) => ({ value, label: DELIVERY_LABELS[value] }))}
            />
          ) : (
            <Badge tone={quote.deliveryStatus === 'delivered' ? 'done' : quote.deliveryStatus === 'in_progress' ? 'waiting' : 'todo'}>
              {DELIVERY_LABELS[quote.deliveryStatus]}
            </Badge>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-muted">Encaissements (TTC)</p>
            <p className="tabular text-ui text-muted">
              {left > 0 ? (
                <>
                  Reste à encaisser <span className="font-semibold text-ink">{formatEuros(left)}</span>
                </>
              ) : (
                <span className="font-semibold text-done-text">Tout est encaissé</span>
              )}
            </p>
          </div>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {steps.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-ui font-medium">
                    {s.label} <span className="font-normal text-muted">· {s.percent} %</span>
                  </p>
                  <p className="text-xs text-muted">
                    {s.receivedAt ? `Reçu le ${formatFrenchDate(s.receivedAt)}` : 'En attente'}
                  </p>
                </div>
                <span className="tabular font-mono text-ui font-semibold">{formatEuros(s.amount)}</span>
                {canEdit ? (
                  <Button
                    size="sm"
                    variant={s.receivedAt ? 'ghost' : 'secondary'}
                    loading={busy === s.key}
                    icon={s.receivedAt ? <Undo2 className="size-3.5" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
                    onClick={() => void run(s.key, () => setQuotePayment(token, quote.id, s.key as PaymentStep, !s.receivedAt))}
                  >
                    {s.receivedAt ? 'Annuler' : 'Marquer reçu'}
                  </Button>
                ) : (
                  <Badge tone={s.receivedAt ? 'done' : 'neutral'}>{s.receivedAt ? 'Reçu' : 'À venir'}</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};
