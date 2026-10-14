import React from 'react';
import { ArrowRight, Check, Lock, Plus } from 'lucide-react';
import type { PageModule, ClientMetadata, PricingSettings, QuoteCalculations } from '../../types/quote';
import {
  EXTRA_RETOUCHES_ID,
  addDays,
  formatDays,
  formatEuros,
  formatFrenchDate,
  formatPercent,
  getClientUnitPrice,
  paymentSchedule,
  sumModules,
} from '../../utils/formatters';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { Badge, Card } from '../ui/display';

interface ClientQuoteViewProps {
  modules: PageModule[];
  metadata: ClientMetadata;
  settings: PricingSettings;
  calculations: QuoteCalculations;
  onToggleOption: (id: string, active: boolean) => void;
  onOpenQuote: () => void;
  issuerName: string;
  reference: string;
  /** Devis signé : options figées */
  signedAt?: string | null;
}

/** « Option : version bilingue » devient « Version bilingue » */
const optionLabel = (name: string) => {
  const label = name.replace(/^Option\s*:\s*/, '');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const sectionTitle = 'mb-3 flex items-baseline justify-between gap-3 text-xs font-semibold text-muted';

export const ClientQuoteView: React.FC<ClientQuoteViewProps> = ({
  modules,
  metadata,
  settings,
  calculations,
  onToggleOption,
  onOpenQuote,
  issuerName,
  reference,
  signedAt,
}) => {
  const locked = !!signedAt;
  const fixedModules = modules.filter((m) => !m.optional && m.quantity > 0);
  const options = modules.filter((m) => m.optional);
  const activeOptions = options.filter((m) => m.quantity > 0);

  const scope = sumModules(fixedModules, settings);
  const optionsTotal = sumModules(activeOptions, settings).price;
  const firstName = metadata.clientContact.split(' ')[0];
  const schedule = paymentSchedule(metadata.depositPercentage);
  const validUntil = formatFrenchDate(addDays(metadata.issueDate, metadata.validityDays));

  const cta = locked ? 'Voir le devis signé' : 'Consulter et signer le devis';

  return (
    <div className="grid items-start gap-x-10 gap-y-8 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-0">
      {/* Proposition */}
      <div className="min-w-0 space-y-10">
        <header>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-mono">{reference}</span>
            {locked ? <Badge tone="done">Signé le {formatFrenchDate(signedAt!)}</Badge> : <Badge tone="waiting">À valider</Badge>}
          </p>
          <h1 className="mt-4 text-balance text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
            {metadata.projectName}
          </h1>
          <p className="mt-4 max-w-xl text-body text-muted">
            {firstName ? `${firstName}, voici` : 'Voici'} la proposition de {issuerName}
            {metadata.clientCompany ? ` pour ${metadata.clientCompany}` : ''}.{' '}
            {locked ? 'Merci pour votre confiance.' : 'Activez ou retirez les options : le récapitulatif se met à jour instantanément.'}
          </p>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-ui">
            <div>
              <dt className="text-xs text-muted">Émis le</dt>
              <dd className="mt-0.5 font-medium">{formatFrenchDate(metadata.issueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Valable jusqu’au</dt>
              <dd className="mt-0.5 font-medium">{validUntil}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Délai estimé</dt>
              <dd className="tabular mt-0.5 font-medium">{formatDays(calculations.totalDays)} ouvrés</dd>
            </div>
          </dl>
        </header>

        {/* Socle */}
        <section aria-labelledby="inclus">
          <h2 id="inclus" className={sectionTitle}>
            <span>Inclus dans le devis</span>
            <span className="tabular font-mono font-medium text-ink-2">
              {formatEuros(scope.price)} HT{scope.days > 0 && ` · ${formatDays(scope.days)}`}
            </span>
          </h2>
          <Card>
            <ul className="divide-y divide-line">
              {fixedModules.map((m) => {
                // Les retouches facturées sont un supplément, pas une partie du périmètre inclus
                const extra = m.id === EXTRA_RETOUCHES_ID;
                return (
                  <li key={m.id} className="flex items-start gap-3.5 px-5 py-4">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-inset',
                        extra ? 'bg-sunken text-ink-2 ring-line-strong' : 'bg-done-soft text-done-text ring-done/25'
                      )}
                    >
                      {extra ? <Plus className="size-3" strokeWidth={2.5} /> : <Check className="size-3" strokeWidth={2.5} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium">
                        {m.name}
                        {m.quantity > 1 && <span className="font-normal text-muted"> × {m.quantity}</span>}
                      </p>
                      {m.description && <p className="mt-0.5 text-ui leading-relaxed text-muted">{m.description}</p>}
                    </div>
                    {extra && (
                      <p className="tabular shrink-0 font-mono text-ui font-semibold">{formatEuros(getClientUnitPrice(m, settings) * m.quantity)}</p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">
              Périmètre contractuel verrouillé, recettage et mise en ligne inclus.
            </p>
          </Card>
        </section>

        {/* Options */}
        {options.length > 0 && (
          <section aria-labelledby="options">
            <h2 id="options" className={sectionTitle}>
              <span>Options à la carte</span>
              <span className="tabular font-medium text-ink-2">
                {activeOptions.length} / {options.length} retenue{activeOptions.length > 1 ? 's' : ''}
              </span>
            </h2>
            <div className="space-y-2.5">
              {options.map((m) => {
                const active = m.quantity > 0;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="switch"
                    aria-checked={active}
                    disabled={locked}
                    onClick={() => onToggleOption(m.id, !active)}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-xl border bg-surface p-5 text-left shadow-card outline-hidden transition-[border-color,background-color,box-shadow] focus-visible:shadow-[var(--ring)] disabled:cursor-default',
                      active ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-line-strong'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                        active ? 'border-accent bg-accent text-accent-ink' : 'border-control bg-surface'
                      )}
                    >
                      {active && <Check className="size-3.5" strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-medium">{optionLabel(m.name)}</span>
                      <span className="mt-0.5 block text-ui leading-relaxed text-muted">{m.description}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tabular block font-mono text-ui font-semibold">+{formatEuros(getClientUnitPrice(m, settings), false)}</span>
                      <span className="block text-xs text-muted">HT{m.days > 0 && ` · ${formatDays(m.days)}`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Récapitulatif */}
      <aside className="lg:sticky lg:top-24">
        <Card aria-label="Récapitulatif" className="overflow-hidden">
          <div className="px-6 pb-5 pt-6">
            <p className="text-xs font-medium text-muted">Total TTC</p>
            <p className="tabular mt-1.5 text-[40px] font-semibold leading-none tracking-tight">{formatEuros(calculations.totalTTC)}</p>
            <p className="tabular mt-2.5 text-ui text-muted">
              {formatEuros(calculations.finalSellingPriceHT)} HT · TVA {formatPercent(settings.vatRate)}
            </p>
          </div>

          <dl className="space-y-2.5 border-t border-line px-6 py-4 text-ui">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Socle</dt>
              <dd className="tabular font-mono">{formatEuros(scope.price)}</dd>
            </div>
            {options.length > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Options</dt>
                <dd className="tabular font-mono">{activeOptions.length ? `+${formatEuros(optionsTotal)}` : '—'}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Délai estimé</dt>
              <dd className="tabular font-mono">{formatDays(calculations.totalDays)}</dd>
            </div>
          </dl>

          <div className="border-t border-line px-6 py-4">
            <p className="mb-2.5 text-xs font-semibold text-muted">Échéancier {schedule.map((s) => s.percent).join(' / ')}</p>
            <ul className="space-y-2 text-ui">
              {schedule.map((s) => (
                <li key={s.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-2">
                    <span className="tabular mr-2 font-mono text-xs text-muted">{s.percent} %</span>
                    {s.label}
                  </span>
                  <span className="tabular font-mono">{formatEuros((calculations.totalTTC * s.percent) / 100)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden border-t border-line bg-surface-2 p-4 lg:block">
            <Button variant="primary" size="lg" onClick={onOpenQuote} className="w-full" icon={<ArrowRight className="size-4" aria-hidden="true" />}>
              {cta}
            </Button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-muted">
              <Lock className="size-3" aria-hidden="true" />
              Lien privé · {issuerName}
            </p>
          </div>
        </Card>
      </aside>

      {/* Mobile : le total et l'action restent à portée de pouce */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-xs text-muted">Total TTC</p>
          <p className="tabular text-title font-semibold">{formatEuros(calculations.totalTTC)}</p>
        </div>
        <Button variant="primary" size="lg" onClick={onOpenQuote}>
          {locked ? 'Voir le devis' : 'Signer'}
        </Button>
      </div>
    </div>
  );
};
