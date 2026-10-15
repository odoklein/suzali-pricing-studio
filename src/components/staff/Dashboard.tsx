import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Account, QuoteSummary, QuoteStatus } from '../../types/quote';
import { listQuotes, deleteQuote, errorMessage } from '../../lib/api';
import { formatEuros, formatFrenchDate } from '../../utils/formatters';
import { DELIVERY_LABELS } from '../../utils/pilotage';
import { cn } from '../../lib/cn';
import { Button, IconButton } from '../ui/button';
import { fieldControl, fieldSizes, Input } from '../ui/input';
import { Badge, Card, EmptyState, Kbd, Notice, PageHeader, StatStrip, chipActive, chipClass, type Tone } from '../ui/display';
import { FilePlus2, Plus, Search, Trash2 } from 'lucide-react';

interface DashboardProps {
  token: string;
  account: Account;
  onOpen: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
  createError?: string | null;
}

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  signed: 'Signé',
};

const STATUS_TONES: Record<QuoteStatus, Tone> = {
  draft: 'todo',
  sent: 'waiting',
  signed: 'done',
};

export const StatusBadge: React.FC<{ status: QuoteStatus }> = ({ status }) => (
  <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
);

export const Dashboard: React.FC<DashboardProps> = ({ token, account, onOpen, onCreate, creating, createError }) => {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');
  const [query, setQuery] = useState('');

  const isStaff = account.role === 'owner' || account.role === 'admin';

  const refresh = useCallback(async () => {
    try {
      setQuotes(await listQuotes(token));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (q: QuoteSummary) => {
    if (!window.confirm(`Supprimer le devis ${q.reference} ?`)) return;
    try {
      await deleteQuote(token, q.id);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const partners = useMemo(() => {
    const map = new Map<string, string>();
    (quotes ?? []).forEach((q) => map.set(q.accountId, q.accountName));
    return [...map.entries()];
  }, [quotes]);

  const needle = query.trim().toLowerCase();
  const matching = (quotes ?? []).filter(
    (q) =>
      (partnerFilter === 'all' || q.accountId === partnerFilter) &&
      (!needle ||
        [q.reference, q.title, q.clientName, q.clientEmail, q.accountName].some((f) => f?.toLowerCase().includes(needle)))
  );
  const visible = matching.filter((q) => statusFilter === 'all' || q.status === statusFilter);

  // Indicateurs calculés sur la recherche en cours, indépendamment du filtre de statut
  const countOf = (st: QuoteStatus) => matching.filter((q) => q.status === st).length;
  const signedTotal = matching.filter((q) => q.status === 'signed').reduce((s, q) => s + q.totalHt, 0);
  const pendingTotal = matching.filter((q) => q.status === 'sent').reduce((s, q) => s + q.totalHt, 0);
  const decided = countOf('sent') + countOf('signed');
  const signRate = decided > 0 ? Math.round((countOf('signed') / decided) * 100) : null;

  const summary = [
    countOf('draft') && `${countOf('draft')} brouillon${countOf('draft') > 1 ? 's' : ''}`,
    countOf('sent') && `${countOf('sent')} en attente de signature`,
    countOf('signed') && `${countOf('signed')} signé${countOf('signed') > 1 ? 's' : ''}`,
  ].filter(Boolean);

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setPartnerFilter('all');
  };

  return (
    <div>
      <PageHeader
        title={isStaff ? 'Tous les devis' : 'Mes devis'}
        description={
          quotes === null
            ? 'Chargement…'
            : summary.length
            ? `${summary.join(' · ')}.`
            : isStaff
            ? 'Les devis créés par vous et par vos partenaires.'
            : account.managed
            ? 'Créez un devis aux tarifs de votre grille, puis transmettez le lien pour le faire signer.'
            : 'Créez un devis, fixez vos prix client puis transmettez le lien à votre client.'
        }
        actions={
          <Button variant="primary" icon={<Plus className="size-4" aria-hidden="true" />} loading={creating} onClick={onCreate}>
            Nouveau devis
            <Kbd onInk>N</Kbd>
          </Button>
        }
      />

      {(error || createError) && (
        <Notice tone="danger" role="alert" className="mt-5">
          {error || createError}
        </Notice>
      )}

      <div className="mt-6">
        <StatStrip
          label="Chiffres clés"
          items={[
            { label: 'Devis', value: matching.length, hint: `${countOf('draft')} en brouillon` },
            {
              label: 'En attente de signature',
              value: formatEuros(pendingTotal, false),
              hint: `${countOf('sent')} envoyé${countOf('sent') > 1 ? 's' : ''} · HT`,
            },
            { label: 'Signé', value: formatEuros(signedTotal, false), hint: `${countOf('signed')} devis · HT` },
            { label: 'Taux de signature', value: signRate === null ? '—' : `${signRate} %`, hint: 'sur les devis envoyés' },
          ]}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Référence, projet, client…"
            aria-label="Rechercher un devis"
            className="pl-8"
          />
        </div>
        {isStaff && partners.length > 1 && (
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            aria-label="Filtrer par compte"
            className={cn(fieldControl, fieldSizes.md, 'w-auto pr-8')}
          >
            <option value="all">Tous les comptes</option>
            {partners.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
        <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          {(['all', 'draft', 'sent', 'signed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              className={cn(chipClass, statusFilter === s && chipActive)}
            >
              {s === 'all' ? 'Tous' : STATUS_LABELS[s]}
              <span className="tabular font-normal opacity-80">{s === 'all' ? matching.length : countOf(s)}</span>
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {quotes !== null && quotes.length === 0 ? (
          <EmptyState
            icon={<FilePlus2 />}
            title="Aucun devis pour le moment"
            action={
              <Button variant="primary" icon={<Plus className="size-4" aria-hidden="true" />} loading={creating} onClick={onCreate}>
                Créer le premier devis
              </Button>
            }
          >
            La grille tarifaire est déjà prête : il ne reste qu’à renseigner le client.
          </EmptyState>
        ) : quotes !== null && visible.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="Aucun devis ne correspond"
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-left text-ui">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-xs text-muted">
                  <th scope="col" className="px-5 py-2.5 font-medium">Référence</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Projet / Client</th>
                  {isStaff && <th scope="col" className="px-5 py-2.5 font-medium">Compte</th>}
                  <th scope="col" className="px-5 py-2.5 font-medium">Statut</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Total HT</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Mis à jour</th>
                  <th scope="col" className="w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotes === null &&
                  [0, 1, 2].map((i) => (
                    <tr key={i} aria-hidden="true">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="h-4 w-2/3 animate-pulse rounded-sm bg-sunken" />
                      </td>
                    </tr>
                  ))}
                {visible.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => onOpen(q.id)}
                    className="group cursor-pointer transition-colors hover:bg-surface-2 focus-within:bg-surface-2"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted">{q.reference}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(q.id);
                        }}
                        className="rounded-xs text-left font-medium text-ink outline-hidden hover:underline focus-visible:shadow-[var(--ring)] underline-offset-4"
                      >
                        {q.title || 'Sans titre'}
                      </button>
                      <p className="text-xs text-muted">{q.clientName || 'Client à renseigner'}</p>
                    </td>
                    {isStaff && <td className="px-5 py-3 text-ink-2">{q.accountName}</td>}
                    <td className="px-5 py-3">
                      <StatusBadge status={q.status} />
                      {q.status === 'signed' && <p className="mt-1 text-xs text-muted">{DELIVERY_LABELS[q.deliveryStatus]}</p>}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-mono text-ink">{formatEuros(q.totalHt)}</td>
                    <td className="px-5 py-3 text-xs text-muted">{formatFrenchDate(q.updatedAt)}</td>
                    <td className="py-3 pr-3 text-right">
                      {q.status !== 'signed' && (isStaff || q.status === 'draft') && (
                        <IconButton
                          label={`Supprimer le devis ${q.reference}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(q);
                          }}
                          className="text-muted hover:text-danger-text sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      )}
                    </td>
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
