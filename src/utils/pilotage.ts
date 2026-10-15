import type { DeliveryStatus, PaymentStep, QuoteSummary } from '../types/quote';
import { paymentSchedule } from './formatters';

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  todo: 'À démarrer',
  in_progress: 'En cours',
  delivered: 'Livré',
};

const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isWorkingDay = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Date obtenue en ajoutant `n` jours ouvrés (hors samedi et dimanche) */
export function addBusinessDays(from: Date, n: number): Date {
  const d = startOfDay(from);
  let left = Math.max(0, Math.round(n));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d)) left -= 1;
  }
  return d;
}

/** Jours ouvrés restants de `from` à `to` (négatif si `to` est dépassée) */
export function businessDaysBetween(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  const sign = b >= a ? 1 : -1;
  const [lo, hi] = sign === 1 ? [a, b] : [b, a];
  let count = 0;
  for (const d = new Date(lo); d < hi; ) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d)) count += 1;
  }
  return sign * count;
}

export interface DeliveryInfo {
  status: DeliveryStatus;
  /** Date de livraison prévue : début de réalisation + délai du devis en jours ouvrés */
  due: Date | null;
  /** Jours ouvrés restants (négatif : en retard) ; null si livré ou pas démarré */
  remaining: number | null;
  deliveredAt: Date | null;
}

/** Suivi de réalisation d'un devis signé ; null pour un devis non signé */
export function deliveryInfo(q: QuoteSummary, now: Date = new Date()): DeliveryInfo | null {
  if (q.status !== 'signed') return null;
  const due = q.startedAt ? addBusinessDays(new Date(q.startedAt), Math.ceil(q.leadDays)) : null;
  return {
    status: q.deliveryStatus,
    due,
    remaining: due && q.deliveryStatus === 'in_progress' ? businessDaysBetween(now, due) : null,
    deliveredAt: q.deliveredAt ? new Date(q.deliveredAt) : null,
  };
}

export interface Instalment {
  key: PaymentStep;
  label: string;
  percent: number;
  /** Montant TTC de l'échéance */
  amount: number;
  /** Date de réception (AAAA-MM-JJ) ou null */
  receivedAt: string | null;
}

/** Échéances TTC d'un devis (acompte, maquettes, solde) et leur état d'encaissement */
export function instalments(q: QuoteSummary): Instalment[] {
  const steps = paymentSchedule(q.depositPercent);
  let allocated = 0;
  return steps.map((s, i) => {
    // la dernière échéance absorbe l'arrondi : la somme est toujours égale au total
    const amount = i === steps.length - 1 ? round2(q.totalTtc - allocated) : round2((q.totalTtc * s.percent) / 100);
    allocated += amount;
    return { key: s.key, label: s.label, percent: s.percent, amount, receivedAt: q.payments[s.key] ?? null };
  });
}

/** Reste à encaisser (TTC) sur un devis signé */
export const outstanding = (q: QuoteSummary): number =>
  q.status === 'signed' ? round2(instalments(q).reduce((n, s) => (s.receivedAt ? n : n + s.amount), 0)) : 0;

export interface MonthTotal {
  key: string;
  label: string;
  total: number;
  count: number;
}

/** Chiffre d'affaires HT signé, mois par mois, sur les `months` derniers mois (le mois en cours inclus) */
export function monthlySigned(quotes: QuoteSummary[], now: Date = new Date(), months = 12): MonthTotal[] {
  const fmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const buckets: MonthTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: fmt.format(d).replace('.', ''), total: 0, count: 0 });
  }
  for (const q of quotes) {
    if (q.status !== 'signed' || !q.signedAt) continue;
    const bucket = buckets.find((b) => b.key === monthKey(new Date(q.signedAt as string)));
    if (bucket) {
      bucket.total = round2(bucket.total + q.totalHt);
      bucket.count += 1;
    }
  }
  return buckets;
}

export interface PendingQuote {
  quote: QuoteSummary;
  /** Jours écoulés depuis l'envoi */
  days: number;
}

/** Devis envoyés sans réponse depuis plus de `minDays` jours, les plus anciens d'abord */
export function pendingQuotes(quotes: QuoteSummary[], now: Date = new Date(), minDays = 7): PendingQuote[] {
  return quotes
    .filter((q) => q.status === 'sent')
    .map((quote) => ({
      quote,
      days: Math.floor((now.getTime() - new Date(quote.sentAt ?? quote.updatedAt).getTime()) / DAY_MS),
    }))
    .filter((p) => p.days > minDays)
    .sort((a, b) => b.days - a.days);
}

export interface ClientStat {
  accountId: string;
  name: string;
  archived: boolean;
  sent: number;
  signed: number;
  /** Part de signés parmi les devis envoyés ou signés, en % (null : aucun devis envoyé) */
  rate: number | null;
  signedTotal: number;
  pendingTotal: number;
}

/** Taux de signature et chiffres d'affaires par client (compte) */
export function clientStats(quotes: QuoteSummary[]): ClientStat[] {
  const map = new Map<string, ClientStat>();
  for (const q of quotes) {
    const s: ClientStat =
      map.get(q.accountId) ??
      { accountId: q.accountId, name: q.accountName, archived: q.accountArchived, sent: 0, signed: 0, rate: null, signedTotal: 0, pendingTotal: 0 };
    if (q.status === 'sent') {
      s.sent += 1;
      s.pendingTotal = round2(s.pendingTotal + q.totalHt);
    } else if (q.status === 'signed') {
      s.signed += 1;
      s.signedTotal = round2(s.signedTotal + q.totalHt);
    }
    map.set(q.accountId, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, rate: s.sent + s.signed > 0 ? Math.round((s.signed / (s.sent + s.signed)) * 100) : null }))
    .sort((a, b) => b.signedTotal - a.signedTotal || a.name.localeCompare(b.name, 'fr'));
}
