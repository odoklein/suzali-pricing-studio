import React, { useMemo, useState } from 'react';
import type { PartnerAccount, PriceList } from '../../types/quote';
import { initialModules } from '../../data/initialModules';
import { PRICE_MODEL, completePriceList } from '../../data/priceModel';
import { savePartnerPrices, errorMessage } from '../../lib/api';
import { formatDays, isOptionModule } from '../../utils/formatters';
import { cn } from '../../lib/cn';
import { NumberInput } from '../ui/NumberInput';
import { Button } from '../ui/button';
import { Badge, Dialog, Notice } from '../ui/display';

interface PriceListDialogProps {
  token: string;
  partner: PartnerAccount;
  /** Autres clients du revendeur : leur grille peut être reprise comme point de départ */
  others: PartnerAccount[];
  onClose: () => void;
  onSaved: () => void;
}

const priceInput =
  'h-8 w-24 rounded-sm border border-control bg-surface-2 px-2 text-right font-mono tabular text-ui font-semibold text-ink outline-hidden transition-[border-color,background-color,box-shadow] ' +
  'focus-visible:border-accent focus-visible:bg-surface focus-visible:shadow-[var(--ring-field)] pointer-coarse:h-10 pointer-coarse:text-[16px]';

const th = 'px-3 py-2 text-xs font-medium text-muted';

/** Grille de prix d'un client du revendeur : le client ne voit que ces prix, il ne peut pas les modifier. */
export const PriceListDialog: React.FC<PriceListDialogProps> = ({ token, partner, others, onClose, onSaved }) => {
  const [list, setList] = useState<PriceList>(() => completePriceList(partner.priceList));
  const [initial] = useState(() => JSON.stringify(list));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState('');

  const dirty = useMemo(() => JSON.stringify(list) !== initial, [list, initial]);
  const donors = others.filter((o) => o.managed && o.priceList && Object.keys(o.priceList.prices).length > 0);

  const setPrice = (id: string, price: number) => setList((l) => ({ ...l, prices: { ...l.prices, [id]: price } }));

  const copyFrom = (id: string) => {
    setSource(id);
    if (id === 'model') setList(completePriceList(PRICE_MODEL));
    else {
      const donor = donors.find((d) => d.id === id);
      if (donor) setList(completePriceList(donor.priceList));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePartnerPrices(token, partner.id, list);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Tarifs de ${partner.name}`} onClose={onClose} size="lg">
      <div className="p-5">
        <p className="text-ui text-muted">
          {partner.name} ne voit que ces prix HT : ni prix d'achat, ni marge, et il ne peut pas les modifier. Ses nouveaux devis
          les utilisent ; un devis non signé les reprend à son prochain enregistrement, un devis signé ne change jamais.
        </p>

        {error && (
          <Notice tone="danger" role="alert" className="mt-4">
            {error}
          </Notice>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor="price-source" className="text-ui text-ink-2">
            Reprendre une grille
          </label>
          <select
            id="price-source"
            value={source}
            onChange={(e) => copyFrom(e.target.value)}
            className="h-8 rounded-md border border-control bg-surface-2 px-2 text-ui text-ink"
          >
            <option value="" disabled>
              Choisir…
            </option>
            <option value="model">Modèle RM-2026-0013</option>
            {donors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto scroll-thin rounded-lg border border-line">
          <table className="w-full min-w-[520px] border-collapse text-left text-ui">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th scope="col" className={th}>Livrable</th>
                <th scope="col" className={cn(th, 'w-24 text-right')}>Jours</th>
                <th scope="col" className={cn(th, 'w-36 pr-4 text-right')}>Prix HT / unité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {initialModules.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-ink">{m.name}</span>
                    {isOptionModule(m) && (
                      <Badge tone="accent" className="ml-2">
                        Option
                      </Badge>
                    )}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right font-mono text-muted">{formatDays(m.days)}</td>
                  <td className="py-2 pl-3 pr-4 text-right">
                    <NumberInput
                      min={0}
                      max={100000}
                      value={list.prices[m.id] ?? 0}
                      onValueChange={(v) => setPrice(m.id, v)}
                      aria-label={`Prix HT : ${m.name}`}
                      className={priceInput}
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-2">
                <td className="px-3 py-2.5">
                  <span className="font-medium text-ink">Retouche supplémentaire</span>
                  <p className="text-xs text-muted">Au-delà des retouches incluses dans le devis.</p>
                </td>
                <td />
                <td className="py-2 pl-3 pr-4 text-right">
                  <NumberInput
                    min={0}
                    max={100000}
                    value={list.retouchPrice}
                    onValueChange={(v) => setList((l) => ({ ...l, retouchPrice: v }))}
                    aria-label="Prix HT d'une retouche supplémentaire"
                    className={priceInput}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={handleSave}>
            Enregistrer les tarifs
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
