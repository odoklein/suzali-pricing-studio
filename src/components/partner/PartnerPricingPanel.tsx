import React, { useState } from 'react';
import type { PricingSettings, QuoteCalculations, ClientMetadata } from '../../types/quote';
import { formatEuros, displayQuoteNumber } from '../../utils/formatters';
import { Copy, Check } from 'lucide-react';

interface PartnerPricingPanelProps {
  settings: PricingSettings;
  calculations: QuoteCalculations;
  metadata: ClientMetadata;
  onUpdateSettings: (newSettings: Partial<PricingSettings>) => void;
}

export const PartnerPricingPanel: React.FC<PartnerPricingPanelProps> = ({
  settings,
  calculations,
  metadata,
  onUpdateSettings,
}) => {
  const [unit, setUnit] = useState<'percent' | 'euro'>('percent');
  const [copied, setCopied] = useState(false);
  const [token] = useState(() => 'rm-' + Math.random().toString(36).substring(2, 9));

  const base = calculations.baseSuzaliCostHT;
  const netInPocket = calculations.finalSellingPriceHT - base;
  const clientName = metadata.clientContact.split(' ')[0] || 'le client';

  // Convertit un gain net souhaité (€) en pourcentage de marge, remise comprise
  const setNetAmount = (euros: number) => {
    if (base <= 0) return;
    const keep = 1 - settings.discountPercent / 100;
    if (keep <= 0) return;
    const percent = ((euros / base + 1) / keep - 1) * 100;
    onUpdateSettings({ partnerMarginPercent: Math.max(0, Math.round(percent * 10) / 10) });
  };

  const handleCopy = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}#client-view?token=${token}&quote=${encodeURIComponent(displayQuoteNumber(metadata.quoteNumber))}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copiez ce lien :', url);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">

        {/* Margin control */}
        <div className="flex-1 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Votre marge commerciale
            </h2>
            <div className="inline-flex p-0.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              {(['percent', 'euro'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-3 py-1 rounded-md font-mono transition-all ${
                    unit === u ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {u === 'percent' ? '%' : '€'}
                </button>
              ))}
            </div>
          </div>

          {unit === 'percent' ? (
            <div className="flex items-center gap-5">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.min(100, settings.partnerMarginPercent)}
                onChange={(e) => onUpdateSettings({ partnerMarginPercent: Number(e.target.value) })}
                className="flex-1 accent-slate-900"
                aria-label="Marge commerciale en pourcentage"
              />
              <div className="flex items-baseline gap-1 w-24 justify-end">
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={settings.partnerMarginPercent}
                  onChange={(e) => onUpdateSettings({ partnerMarginPercent: Number(e.target.value) || 0 })}
                  className="w-16 text-right font-mono text-2xl font-semibold text-slate-900 bg-transparent focus:outline-none"
                />
                <span className="font-mono text-slate-400">%</span>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                min={0}
                step={10}
                value={Math.round(netInPocket * 100) / 100}
                onChange={(e) => setNetAmount(Number(e.target.value) || 0)}
                className="w-40 font-mono text-2xl font-semibold text-slate-900 bg-transparent border-b border-slate-100 focus:border-slate-900 focus:outline-none"
                aria-label="Gain net en euros"
              />
              <span className="font-mono text-slate-400">€ nets HT</span>
            </div>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-[11px] text-slate-400">Prix d'achat</dt>
              <dd className="font-mono text-slate-700">{formatEuros(base)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">Prix vendu HT</dt>
              <dd className="font-mono text-slate-700">{formatEuros(calculations.finalSellingPriceHT)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">Dans votre poche</dt>
              <dd className="font-mono font-semibold text-slate-900">{formatEuros(netInPocket)}</dd>
            </div>
          </dl>
        </div>

        {/* Copy link */}
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Lien copié' : `Copier le lien sécurisé pour ${clientName}`}</span>
        </button>
      </div>
    </div>
  );
};
