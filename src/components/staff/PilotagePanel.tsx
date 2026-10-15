import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Download } from 'lucide-react';
import type { PartnerAccount, QuoteSummary } from '../../types/quote';
import { listPartners, listQuotes, setQuotePayment, errorMessage } from '../../lib/api';
import { downloadCsv, toCsv } from '../../lib/csv';
import { formatEuros, formatFrenchDate } from '../../utils/formatters';
import {
  DELIVERY_LABELS,
  clientStats,
  deliveryInfo,
  instalments,
  monthlySigned,
  outstanding,
  pendingQuotes,
} from '../../utils/pilotage';
import { deliveryHint } from './QuoteFollowUp';
import { Button } from '../ui/button';
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatStrip } from '../ui/display';

interface PilotagePanelProps {
  token: string;
  onOpen: (id: string) => void;
}

const th = 'px-5 py-2.5 text-xs font-medium text-muted';
const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
const stamp = () => new Date().toISOString().slice(0, 10);

const STATUS_LABELS = { draft: 'Brouillon', sent: 'Envoyé', signed: 'Signé' } as const;

/** Tableau de bord du revendeur : chiffre d'affaires, devis à relancer, réalisation, encaissements, exports. */
export const PilotagePanel: React.FC<PilotagePanelProps> = ({ token, onOpen }) => {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [partners, setPartners] = useState<PartnerAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [q, p] = await Promise.all([listQuotes(token), listPartners(token)]);
      setQuotes(q);
      setPartners(p);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const now = useMemo(() => new Date(), []);
  const all = useMemo(() => quotes ?? [], [quotes]);
  const signed = all.filter((q) => q.status === 'signed');
  const months = useMemo(() => monthlySigned(all, now), [all, now]);
  const pending = useMemo(() => pendingQuotes(all, now), [all, now]);
  const stats = useMemo(() => clientStats(all), [all]);
  const inProduction = signed.filter((q) => q.deliveryStatus !== 'delivered');
  const toCollect = signed.filter((q) => outstanding(q) > 0);
  const collectTotal = toCollect.reduce((n, q) => n + outstanding(q), 0);
  const signedTotal = signed.reduce((n, q) => n + q.totalHt, 0);
  const maxMonth = Math.max(1, ...months.map((m) => m.total));
  const yearTotal = months.reduce((n, m) => n + m.total, 0);

  const markReceived = async (q: QuoteSummary) => {
    const next = instalments(q).find((s) => !s.receivedAt);
    if (!next) return;
    setBusyId(q.id);
    try {
      const updated = await setQuotePayment(token, q.id, next.key, true);
      setQuotes((list) => (list ?? []).map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const exportQuotes = () => {
    const header = [
      'Référence', 'Projet', 'Client', 'Compte', 'Statut', 'Total HT', 'TVA (%)', 'Total TTC', 'Envoyé le', 'Signé le',
      'Signé par', 'Réalisation', 'Livraison prévue', 'Acompte reçu le', 'Maquettes reçu le', 'Solde reçu le',
      'Reste à encaisser TTC', 'Mis à jour le',
    ];
    const rows = all.map((q) => {
      const d = deliveryInfo(q);
      const paid = (key: string) => date(q.payments[key as keyof typeof q.payments]);
      return [
        q.reference, q.title, q.clientName, q.accountName, STATUS_LABELS[q.status], q.totalHt, q.vatRate, q.totalTtc,
        date(q.sentAt), date(q.signedAt), q.signedBy, q.status === 'signed' ? DELIVERY_LABELS[q.deliveryStatus] : '',
        d?.due ? d.due.toLocaleDateString('fr-FR') : '', paid('order'), paid('mockups'), paid('production'),
        q.status === 'signed' ? outstanding(q) : '', date(q.updatedAt),
      ];
    });
    downloadCsv(`devis-${stamp()}.csv`, toCsv(header, rows));
  };

  const exportClients = () => {
    const header = [
      'Société', 'Interlocuteur', 'E-mail', 'Téléphone', 'Adresse', 'SIRET', 'Type', 'Statut',
      'Devis envoyés', 'Devis signés', 'CA signé HT', 'En attente HT',
    ];
    const rows = partners.map((p) => {
      const s = stats.find((x) => x.accountId === p.id);
      return [
        p.name, p.contactName, p.email, p.phone, p.address, p.siret,
        p.managed ? 'Client du revendeur' : 'Partenaire',
        p.archived ? 'Archivé' : p.active ? 'Actif' : 'Désactivé',
        s?.sent ?? 0, s?.signed ?? 0, s?.signedTotal ?? 0, s?.pendingTotal ?? 0,
      ];
    });
    downloadCsv(`clients-${stamp()}.csv`, toCsv(header, rows));
  };

  return (
    <div>
      <PageHeader
        title="Pilotage"
        description="Chiffre d'affaires signé, devis à relancer, réalisation et encaissements."
        actions={
          <>
            <Button icon={<Download className="size-4" aria-hidden="true" />} onClick={exportQuotes} disabled={quotes === null}>
              Exporter les devis
            </Button>
            <Button icon={<Download className="size-4" aria-hidden="true" />} onClick={exportClients} disabled={quotes === null}>
              Exporter les clients
            </Button>
          </>
        }
      />

      {error && (
        <Notice tone="danger" role="alert" className="mt-5">
          {error}
        </Notice>
      )}

      <div className="mt-6">
        <StatStrip
          label="Chiffres clés"
          items={[
            { label: 'CA signé', value: formatEuros(signedTotal, false), hint: `${signed.length} devis · HT` },
            { label: 'À encaisser', value: formatEuros(collectTotal, false), hint: `${toCollect.length} devis · TTC` },
            { label: 'À relancer', value: pending.length, hint: 'sans réponse depuis plus de 7 jours' },
            { label: 'En réalisation', value: inProduction.length, hint: `${signed.length - inProduction.length} livré${signed.length - inProduction.length > 1 ? 's' : ''}` },
          ]}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="CA signé par mois" description={`${formatEuros(yearTotal, false)} HT sur les 12 derniers mois`} />
        <div
          role="img"
          aria-label={`Chiffre d'affaires signé par mois : ${months.map((m) => `${m.label} ${formatEuros(m.total, false)}`).join(', ')}`}
          className="flex h-44 items-end gap-1.5 px-5 pb-4 sm:gap-2.5"
        >
          {months.map((m) => (
            <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${m.label} : ${formatEuros(m.total, false)} HT · ${m.count} devis`}>
              <span className="tabular text-[10px] text-muted">{m.total > 0 ? formatEuros(m.total, false) : ''}</span>
              <div
                className={m.total > 0 ? 'w-full rounded-t-md bg-accent' : 'w-full rounded-t-md bg-sunken'}
                style={{ height: `${Math.max(m.total > 0 ? 6 : 2, (m.total / maxMonth) * 100)}%`, maxHeight: '70%' }}
              />
              <span className="text-[11px] text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid items-start gap-6 2xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Devis à relancer" count={pending.length} description="Envoyés il y a plus de 7 jours, sans signature." />
          {pending.length === 0 ? (
            <EmptyState icon={<Check />} title="Rien à relancer">
              Aucun devis n'attend de réponse depuis plus de 7 jours.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[440px] text-left text-ui">
                <thead>
                  <tr className="border-y border-line bg-surface-2">
                    <th className={th}>Devis</th>
                    <th className={`${th} text-right`}>Envoyé depuis</th>
                    <th className={`${th} text-right`}>Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pending.map(({ quote: q, days }) => (
                    <tr key={q.id} onClick={() => onOpen(q.id)} className="cursor-pointer transition-colors hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <p className="font-medium">{q.clientName || q.title || 'Sans titre'}</p>
                        <p className="text-xs text-muted">
                          <span className="font-mono">{q.reference}</span> · {q.accountName}
                          {q.clientEmail ? ` · ${q.clientEmail}` : ''}
                        </p>
                      </td>
                      <td className="tabular px-5 py-3 text-right font-mono">{days} j</td>
                      <td className="tabular px-5 py-3 text-right font-mono">{formatEuros(q.totalHt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="À encaisser" count={toCollect.length} description="Prochaine échéance de chaque devis signé." />
          {toCollect.length === 0 ? (
            <EmptyState icon={<Check />} title="Tout est encaissé">
              Aucune échéance en attente sur les devis signés.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[480px] text-left text-ui">
                <thead>
                  <tr className="border-y border-line bg-surface-2">
                    <th className={th}>Devis</th>
                    <th className={`${th} text-right`}>Prochaine échéance</th>
                    <th className={`${th} text-right`}>Reste TTC</th>
                    <th className="w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {toCollect.map((q) => {
                    const next = instalments(q).find((s) => !s.receivedAt);
                    return (
                      <tr key={q.id}>
                        <td className="px-5 py-3">
                          <button type="button" onClick={() => onOpen(q.id)} className="text-left font-medium outline-hidden hover:underline focus-visible:shadow-[var(--ring)]">
                            {q.clientName || q.title || 'Sans titre'}
                          </button>
                          <p className="font-mono text-xs text-muted">{q.reference}</p>
                        </td>
                        <td className="tabular px-5 py-3 text-right">
                          {next && (
                            <>
                              <span className="font-mono">{formatEuros(next.amount)}</span>
                              <p className="text-xs text-muted">{next.label}</p>
                            </>
                          )}
                        </td>
                        <td className="tabular px-5 py-3 text-right font-mono font-semibold">{formatEuros(outstanding(q))}</td>
                        <td className="py-3 pr-4 text-right">
                          <Button size="sm" loading={busyId === q.id} onClick={() => void markReceived(q)}>
                            Marquer reçu
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="En réalisation" count={inProduction.length} description="Devis signés pas encore livrés, avec le délai restant en jours ouvrés." />
        {inProduction.length === 0 ? (
          <EmptyState icon={<Check />} title="Aucune réalisation en cours">
            Les devis signés apparaissent ici jusqu'à leur livraison.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {inProduction.map((q) => {
              const info = deliveryInfo(q);
              const late = info?.remaining !== null && info?.remaining !== undefined && info.remaining < 0;
              return (
                <li key={q.id} onClick={() => onOpen(q.id)} className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{q.clientName || q.title || 'Sans titre'}</p>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{q.reference}</span> · signé le {formatFrenchDate(q.signedAt ?? '')}
                    </p>
                  </div>
                  <p className="text-xs text-muted">{deliveryHint(q)}</p>
                  <Badge tone={late ? 'danger' : q.deliveryStatus === 'in_progress' ? 'waiting' : 'todo'}>
                    {late ? 'En retard' : DELIVERY_LABELS[q.deliveryStatus]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Taux de signature par client" description="Part des devis envoyés qui ont été signés." />
        {stats.length === 0 ? (
          <p className="px-5 pb-6 text-ui text-muted">Aucun devis pour le moment.</p>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[560px] text-left text-ui">
              <thead>
                <tr className="border-y border-line bg-surface-2">
                  <th className={th}>Client</th>
                  <th className={`${th} text-right`}>En attente</th>
                  <th className={`${th} text-right`}>Signés</th>
                  <th className={`${th} text-right`}>Taux</th>
                  <th className={`${th} text-right`}>CA signé HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.map((s) => (
                  <tr key={s.accountId}>
                    <td className="px-5 py-3 font-medium">
                      {s.name} {s.archived && <Badge tone="neutral">Archivé</Badge>}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-mono">{s.sent}</td>
                    <td className="tabular px-5 py-3 text-right font-mono">{s.signed}</td>
                    <td className="tabular px-5 py-3 text-right font-mono">{s.rate === null ? '—' : `${s.rate} %`}</td>
                    <td className="tabular px-5 py-3 text-right font-mono font-semibold">{formatEuros(s.signedTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
