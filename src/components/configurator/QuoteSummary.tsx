import React, { useState } from 'react';
import { Check, Link2, Minus, Plus } from 'lucide-react';
import type { ClientMetadata, PricingMode, PricingSettings, PricingView, QuoteCalculations, UserRole } from '../../types/quote';
import { clientDayRate, clientPricingMode, formatDays, formatEuros, formatPercent, retouchClientPrice } from '../../utils/formatters';
import { cn } from '../../lib/cn';
import { NumberInput } from '../ui/NumberInput';
import { Button } from '../ui/button';
import { Card, SegmentedControl } from '../ui/display';

interface QuoteSummaryProps {
  currentRole: UserRole;
  /** Lecture des prix : voir PricingView (par défaut : prix d'achat + prix client) */
  pricing?: PricingView;
  settings: PricingSettings;
  calculations: QuoteCalculations;
  metadata: ClientMetadata;
  onUpdateSettings: (patch: Partial<PricingSettings>) => void;
  /** Marque le devis comme transmis puis retourne le lien client */
  onShare: () => Promise<string | null>;
}

const stepBtn =
  'grid size-8 place-items-center rounded-sm text-muted outline-hidden transition-colors hover:bg-sunken hover:text-ink focus-visible:shadow-[var(--ring)] disabled:pointer-events-none disabled:opacity-35 pointer-coarse:size-10';

const miniInput =
  'h-8 rounded-md border border-control bg-surface-2 px-2 text-right font-mono tabular text-ui text-ink outline-hidden transition-[border-color,background-color,box-shadow] focus-visible:border-accent focus-visible:bg-surface focus-visible:shadow-[var(--ring-field)] pointer-coarse:h-11 pointer-coarse:text-[16px]';

function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: 'danger' }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={cn('tabular mt-0.5 truncate text-title font-semibold tracking-title', tone === 'danger' ? 'text-danger-text' : 'text-ink')}>
        {value}
      </dd>
      {hint && <dd className="mt-0.5 text-xs leading-snug text-muted">{hint}</dd>}
    </div>
  );
}

export const QuoteSummary: React.FC<QuoteSummaryProps> = ({
  currentRole,
  pricing = 'resale',
  settings,
  calculations,
  metadata,
  onUpdateSettings,
  onShare,
}) => {
  const isAdmin = currentRole === 'admin';
  const resale = pricing === 'resale';
  const fixed = pricing === 'fixed';
  const [copyState, setCopyState] = useState<'idle' | 'busy' | 'copied'>('idle');
  const clientName = metadata.clientContact.split(' ')[0] || 'votre client';

  const margin = calculations.partnerMarginAmount;
  const marginRate = calculations.finalSellingPriceHT > 0 ? (margin / calculations.finalSellingPriceHT) * 100 : 0;
  const retouchesRequested = settings.retouchesRequested;

  const handleCopy = async () => {
    setCopyState('busy');
    const url = await onShare();
    if (!url) {
      setCopyState('idle');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2500);
    } catch {
      setCopyState('idle');
      window.prompt('Copiez ce lien :', url);
    }
  };

  return (
    <Card aria-label="Récapitulatif du devis" className="overflow-hidden">
      <div className="px-5 pb-5 pt-5">
        <p className="text-xs font-medium text-muted">{fixed ? 'Total HT' : 'Prix client HT'}</p>
        <p className="tabular mt-1 text-[34px] font-semibold leading-none tracking-tight text-ink">
          {formatEuros(calculations.finalSellingPriceHT)}
        </p>
        <p className="tabular mt-2 text-ui text-muted">
          {formatEuros(calculations.totalTTC)} TTC · TVA {formatPercent(settings.vatRate)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line px-5 py-4">
        <Figure
          label="Délai estimé"
          value={formatDays(calculations.totalDays)}
          hint={`${formatDays(calculations.totalDevDays)} + ${formatPercent(settings.bufferPercent)} de marge`}
        />
        {!resale && (
          <Figure
            label="Livrables retenus"
            value={String(calculations.activeModuleCount)}
            hint={calculations.retouchesPrice > 0 ? `dont ${formatEuros(calculations.retouchesPrice, false)} de retouches` : undefined}
          />
        )}
        {resale && (
          <Figure
            label={isAdmin ? 'Coût de revient' : "Prix d'achat"}
            value={formatEuros(calculations.baseSuzaliCostHT)}
            hint={calculations.retouchesCost > 0 ? `dont ${formatEuros(calculations.retouchesCost, false)} de retouches` : undefined}
          />
        )}
        {resale && isAdmin && (
          <Figure
            label="Marge partenaire"
            value={formatEuros(margin)}
            hint={`${formatPercent(marginRate)} du prix client`}
            tone={margin < 0 ? 'danger' : undefined}
          />
        )}
        {resale && !isAdmin && (
          <Figure
            label={clientPricingMode(settings) === 'tjm' ? 'Votre TJM client' : "Tarif d'achat journalier"}
            value={`${formatEuros(clientPricingMode(settings) === 'tjm' ? clientDayRate(settings) : settings.tjmSuzali, false)} / j`}
            hint={clientPricingMode(settings) === 'tjm' ? `Achat : ${formatEuros(settings.tjmSuzali, false)} / j` : 'Défini par la régie'}
          />
        )}
      </dl>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="retouches-demandees" className="text-ui font-medium text-ink">
            Retouches demandées
          </label>
          <div className="inline-flex items-center rounded-md border border-line bg-surface p-0.5 shadow-xs">
            <button
              type="button"
              aria-label="Une retouche de moins"
              disabled={retouchesRequested <= 0}
              onClick={() => onUpdateSettings({ retouchesRequested: Math.max(0, retouchesRequested - 1) })}
              className={stepBtn}
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </button>
            <NumberInput
              id="retouches-demandees"
              min={0}
              max={500}
              value={retouchesRequested}
              onValueChange={(v) => onUpdateSettings({ retouchesRequested: Math.round(v) })}
              className="tabular h-8 w-11 bg-transparent text-center font-mono text-ui font-semibold text-ink outline-hidden"
            />
            <button
              type="button"
              aria-label="Une retouche de plus"
              onClick={() => onUpdateSettings({ retouchesRequested: Math.min(500, retouchesRequested + 1) })}
              className={stepBtn}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs leading-snug text-muted">
          {calculations.retouchesIncluded} incluses ({settings.retouchesIncludedPerPage} par page) ·{' '}
          {calculations.retouchesBillable > 0 ? (
            <span className="font-medium text-ink-2">
              {calculations.retouchesBillable} facturée{calculations.retouchesBillable > 1 ? 's' : ''} {formatEuros(calculations.retouchesPrice, false)}
            </span>
          ) : (
            'aucune facturée'
          )}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <label htmlFor="retouche-prix-client" className="text-ui text-ink-2">
            {resale ? 'Votre prix par retouche en plus' : 'Prix par retouche en plus'}
          </label>
          {fixed ? (
            <span className="tabular font-mono text-ui font-semibold text-ink">{formatEuros(retouchClientPrice(settings), false)}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <NumberInput
                id="retouche-prix-client"
                min={0}
                max={1000}
                value={retouchClientPrice(settings)}
                onValueChange={(price) => onUpdateSettings(resale ? { retouchClientPrice: price } : { retouchUnitPrice: price })}
                className={cn(miniInput, 'w-16')}
              />
              <span className="text-xs text-muted">€</span>
            </span>
          )}
        </div>
        {resale && (
          <p className="mt-1.5 text-xs text-muted">
            {isAdmin ? 'Coût' : "Prix d'achat"} : {formatEuros(settings.retouchUnitPrice, false)} par retouche en plus.
          </p>
        )}
      </div>

      {resale && (
      <div className="space-y-3 border-t border-line px-5 py-4">
        <p className="text-xs font-medium text-muted">Votre tarification client</p>
        <SegmentedControl<PricingMode>
          size="sm"
          label="Facturer votre client"
          value={clientPricingMode(settings)}
          onChange={(clientMode) => onUpdateSettings({ clientMode, clientTjm: settings.clientTjm ?? settings.tjmSuzali })}
          options={[
            { value: 'forfait', label: 'Forfait par page' },
            { value: 'tjm', label: 'Temps passé (TJM)' },
          ]}
        />
        {clientPricingMode(settings) === 'tjm' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="client-tjm" className="text-ui text-ink-2">
                Votre TJM client
              </label>
              <span className="inline-flex items-center gap-1.5">
                <NumberInput
                  id="client-tjm"
                  min={0}
                  max={5000}
                  value={clientDayRate(settings)}
                  onValueChange={(clientTjm) => onUpdateSettings({ clientTjm })}
                  className={cn(miniInput, 'w-20')}
                />
                <span className="text-xs text-muted">€/j</span>
              </span>
            </div>
            <p className="text-xs leading-snug text-muted">Le prix de chaque ligne = jours × TJM. Le client voit un prix par livrable, jamais le TJM.</p>
          </>
        ) : (
          <p className="text-xs leading-snug text-muted">Vous fixez votre prix client pour chaque ligne du tableau.</p>
        )}
      </div>
      )}

      {isAdmin && (
        <div className="space-y-3 border-t border-line px-5 py-4">
          <p className="text-xs font-medium text-muted">Réglages régie</p>
          {resale && (
            <SegmentedControl<PricingMode>
              size="sm"
              label="Modèle de calcul du prix d'achat"
              value={settings.mode}
              onChange={(mode) => onUpdateSettings({ mode })}
              options={[
                { value: 'forfait', label: 'Forfait par page' },
                { value: 'tjm', label: 'Temps passé (TJM)' },
              ]}
            />
          )}
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="buffer-percent" className="text-ui text-ink-2">
              Marge de sécurité
            </label>
            <span className="inline-flex items-center gap-1.5">
              <NumberInput
                id="buffer-percent"
                min={0}
                max={100}
                value={settings.bufferPercent}
                onValueChange={(bufferPercent) => onUpdateSettings({ bufferPercent })}
                className={cn(miniInput, 'w-16')}
              />
              <span className="text-xs text-muted">%</span>
            </span>
          </div>
          {resale && settings.mode === 'tjm' && (
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="tjm" className="text-ui text-ink-2">
                TJM d'achat
              </label>
              <span className="inline-flex items-center gap-1.5">
                <NumberInput
                  id="tjm"
                  min={0}
                  max={5000}
                  value={settings.tjmSuzali}
                  onValueChange={(tjmSuzali) => onUpdateSettings({ tjmSuzali })}
                  className={cn(miniInput, 'w-20')}
                />
                <span className="text-xs text-muted">€/j</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-line bg-surface-2 p-4">
        <Button
          variant="primary"
          size="lg"
          loading={copyState === 'busy'}
          icon={copyState === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
          onClick={handleCopy}
          className="w-full"
        >
          <span className="truncate">{copyState === 'copied' ? 'Lien copié' : `Copier le lien pour ${clientName}`}</span>
        </Button>
        <p className="mt-2 text-center text-xs text-muted" aria-live="polite">
          {copyState === 'copied' ? 'Collez-le dans votre message.' : 'Le devis passera au statut « Envoyé ».'}
        </p>
      </div>
    </Card>
  );
};
