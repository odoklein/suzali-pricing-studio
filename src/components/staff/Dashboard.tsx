import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Account, QuoteSummary, QuoteStatus } from '../../types/quote';
import { listQuotes, saveQuote, deleteQuote, errorMessage } from '../../lib/api';
import { newQuoteData, snapshotTotalHt } from '../../utils/quoteData';
import { formatEuros, formatFrenchDate } from '../../utils/formatters';
import { Plus, Trash2 } from 'lucide-react';

interface DashboardProps {
  token: string;
  account: Account;
  onOpen: (id: string) => void;
}

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  signed: 'Signé',
};

const STATUS_STYLES: Record<QuoteStatus, string> = {
  draft: 'bg-slate-50 text-slate-600 border-slate-100',
  sent: 'bg-amber-50 text-amber-800 border-amber-100',
  signed: 'bg-emerald-50 text-emerald-800 border-emerald-100',
};

export const StatusBadge: React.FC<{ status: QuoteStatus }> = ({ status }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

export const Dashboard: React.FC<DashboardProps> = ({ token, account, onOpen }) => {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');

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

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = newQuoteData(account);
      const res = await saveQuote(token, {
        id: null,
        title: data.metadata.projectName,
        clientName: '',
        clientEmail: '',
        status: 'draft',
        totalHt: snapshotTotalHt(data.clientSnapshot),
        data: {
          ...data,
          // la référence officielle est attribuée par le serveur : on la reporte dans le devis dès l'ouverture
        },
        expectedUpdatedAt: null,
      });
      if (res.quote) onOpen(res.quote.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

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

  const visible = (quotes ?? []).filter(
    (q) =>
      (partnerFilter === 'all' || q.accountId === partnerFilter) &&
      (statusFilter === 'all' || q.status === statusFilter)
  );

  const signedTotal = visible.filter((q) => q.status === 'signed').reduce((s, q) => s + q.totalHt, 0);
  const pendingTotal = visible.filter((q) => q.status === 'sent').reduce((s, q) => s + q.totalHt, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isStaff ? 'Tous les devis' : 'Mes devis'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isStaff
              ? 'Les devis créés par vous et par vos partenaires.'
              : 'Créez un devis, ajustez votre marge puis transmettez le lien à votre client.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-all active:scale-[0.99] disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>{creating ? 'Création…' : 'Nouveau devis'}</span>
        </button>
      </div>

      {error && (
        <p className="mb-6 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Devis', value: String(visible.length), mono: true },
          { label: 'En attente de signature', value: formatEuros(pendingTotal, false) + ' HT', mono: true },
          { label: 'Signé', value: formatEuros(signedTotal, false) + ' HT', mono: true },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-[11px] uppercase tracking-widest text-slate-400">{k.label}</p>
            <p className={`mt-2 text-2xl font-semibold text-slate-900 ${k.mono ? 'font-mono' : ''}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {isStaff && partners.length > 1 && (
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-100 shadow-sm bg-white text-xs text-slate-700"
            aria-label="Filtrer par partenaire"
          >
            <option value="all">Tous les comptes</option>
            {partners.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
        {(['all', 'draft', 'sent', 'signed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'Tous' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th className="py-3 px-5 font-medium">Référence</th>
              <th className="py-3 px-5 font-medium">Projet / Client</th>
              {isStaff && <th className="py-3 px-5 font-medium">Compte</th>}
              <th className="py-3 px-5 font-medium">Statut</th>
              <th className="py-3 px-5 font-medium text-right">Total HT</th>
              <th className="py-3 px-5 font-medium">Mis à jour</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {quotes === null && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                  Chargement…
                </td>
              </tr>
            )}
            {quotes !== null && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                  Aucun devis pour le moment.
                </td>
              </tr>
            )}
            {visible.map((q) => (
              <tr
                key={q.id}
                onClick={() => onOpen(q.id)}
                className="cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <td className="py-3.5 px-5 font-mono text-xs text-slate-700">{q.reference}</td>
                <td className="py-3.5 px-5">
                  <p className="text-slate-900 font-medium">{q.title || 'Sans titre'}</p>
                  <p className="text-xs text-slate-400">{q.clientName || 'Client à renseigner'}</p>
                </td>
                {isStaff && <td className="py-3.5 px-5 text-slate-600">{q.accountName}</td>}
                <td className="py-3.5 px-5">
                  <StatusBadge status={q.status} />
                </td>
                <td className="py-3.5 px-5 text-right font-mono text-slate-900">{formatEuros(q.totalHt)}</td>
                <td className="py-3.5 px-5 text-xs text-slate-500">{formatFrenchDate(q.updatedAt)}</td>
                <td className="py-3.5 pr-4">
                  {q.status !== 'signed' && (isStaff || q.status === 'draft') && (
                    <button
                      type="button"
                      title="Supprimer"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(q);
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
