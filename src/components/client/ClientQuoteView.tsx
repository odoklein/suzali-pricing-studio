import React from 'react';
import type { PageModule, ClientMetadata, PricingSettings, QuoteCalculations } from '../../types/quote';
import {
  formatEuros,
  formatDays,
  getClientUnitPrice,
  CORE_MODULE_IDS,
  LOCATOR_MODULE_ID,
  formatFrenchDate,
} from '../../utils/formatters';
import { Check, ArrowRight, Lock } from 'lucide-react';

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

  const coreCount = fixedModules.filter((m) => CORE_MODULE_IDS.includes(m.id)).length;
  const hasLocator = fixedModules.some((m) => m.id === LOCATOR_MODULE_ID);
  const scopeTitle =
    coreCount > 0
      ? `${coreCount} pages${hasLocator ? ' + Store Locator' : ''}`
      : `${fixedModules.length} prestation${fixedModules.length > 1 ? 's' : ''}`;

  const scopeTotal = fixedModules.reduce(
    (sum, m) => sum + getClientUnitPrice(m, settings) * m.quantity,
    0
  );
  const firstName = metadata.clientContact.split(' ')[0];

  const deposit = metadata.depositPercentage;
  const middle = 40;
  const balance = Math.max(0, 100 - deposit - middle);
  const schedule = [
    { label: 'À la commande', percent: deposit },
    { label: 'Validation des maquettes', percent: middle },
    { label: 'Mise en production', percent: balance },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">

      {/* LEFT: cart */}
      <div className="space-y-10">
        <div>
          <p className="text-xs font-mono text-slate-400 mb-2">
            {reference}
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
          </h2>
          <p className="text-sm text-slate-500 mt-3 leading-relaxed max-w-xl">
            Voici votre proposition pour <span className="text-slate-800">{metadata.projectName}</span>.
            {locked
              ? `Devis signé le ${formatFrenchDate(signedAt!)}. Merci pour votre confiance.`
              : 'Activez ou retirez les options : le récapitulatif se met à jour instantanément.'}
          </p>
        </div>

        {/* Locked scope */}
        <section>
          <h3 className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">
            Le socle — inclus
          </h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{scopeTitle}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Périmètre contractuel verrouillé, recettage et mise en ligne inclus.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-semibold text-slate-900">{formatEuros(scopeTotal)}</p>
                <p className="text-[11px] text-slate-400">HT</p>
              </div>
            </div>
            <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {fixedModules.map((m) => (
                <li key={m.id} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span>{m.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Options */}
        {options.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">
              Options à la carte
            </h3>
            <div className="space-y-3">
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
                    className={`w-full text-left bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-all disabled:cursor-default ${
                      active ? 'border-slate-900' : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        active ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-slate-900 text-sm">
                        {m.name.replace(/^Option\s*:\s*/, '')}
                      </span>
                      <span className="block text-sm text-slate-500 mt-1 leading-relaxed">
                        {m.description}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block font-mono text-sm font-semibold text-slate-900">
                        +{formatEuros(getClientUnitPrice(m, settings), false)}
                      </span>
                      <span className="block text-[11px] text-slate-400">HT</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* RIGHT: summary */}
      <aside className="lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <h3 className="text-xs font-medium uppercase tracking-widest text-slate-400">Récapitulatif</h3>

        <dl className="space-y-3 text-sm">
          {calculations.discountAmount > 0 && (
            <div className="flex justify-between text-slate-500">
              <dt>Remise ({settings.discountPercent} %)</dt>
              <dd className="font-mono">-{formatEuros(calculations.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <dt>Total HT</dt>
            <dd className="font-mono">{formatEuros(calculations.finalSellingPriceHT)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>TVA ({settings.vatRate} %)</dt>
            <dd className="font-mono">{formatEuros(calculations.vatAmount)}</dd>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-slate-100">
            <dt className="font-medium text-slate-900">Total TTC</dt>
            <dd className="font-mono text-2xl font-semibold text-slate-900">
              {formatEuros(calculations.totalTTC)}
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
            Échéancier {schedule.map((s) => s.percent).join('/')}
          </p>
          <ul className="space-y-2 text-sm">
            {schedule.map((s) => (
              <li key={s.label} className="flex justify-between text-slate-600">
                <span>
                  <span className="font-mono text-slate-400 mr-2">{s.percent}%</span>
                  {s.label}
                </span>
                <span className="font-mono text-slate-900">
                  {formatEuros((calculations.totalTTC * s.percent) / 100)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          Délai estimé : <span className="font-mono text-slate-600">{formatDays(calculations.totalDays)}</span> ouvrés
        </p>

        <button
          type="button"
          onClick={onOpenQuote}
          className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <span>{locked ? 'Voir le devis signé' : 'Consulter et signer le devis'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Lock className="w-3 h-3" />
          Lien privé — {issuerName}
        </p>
      </aside>
    </div>
  );
};
