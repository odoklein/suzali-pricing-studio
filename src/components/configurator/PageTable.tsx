import React, { useId, useState } from 'react';
import type { PageModule, UserRole, PricingSettings, PricingView } from '../../types/quote';
import {
  formatEuros,
  formatDays,
  getClientUnitPrice,
  getUnitCost,
  sumModules,
  retouchBilling,
  retouchClientPrice,
  clientPricingMode,
  isOptionModule,
} from '../../utils/formatters';
import { cn } from '../../lib/cn';
import { NumberInput } from '../ui/NumberInput';
import { Button, IconButton } from '../ui/button';
import { Field, Input, Textarea } from '../ui/input';
import { Badge, Card, CardHeader, SegmentedControl } from '../ui/display';
import { Plus, Minus, Pencil, Check, ChevronRight, Info, Trash2, X } from 'lucide-react';

interface PageTableProps {
  modules: PageModule[];
  currentRole: UserRole;
  /** Lecture des prix : voir PricingView (par défaut : prix d'achat + prix client) */
  pricing?: PricingView;
  settings: PricingSettings;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onUpdateIncluded: (id: string, newIncluded: string) => void;
  onUpdateBasePrice: (id: string, newPrice: number) => void;
  onUpdateClientPrice: (id: string, newPrice: number) => void;
  onUpdateDays: (id: string, newDays: number) => void;
  onAddCustomModule: (name: string, description: string, included: string, price: number, days: number) => void;
  onDeleteModule: (id: string) => void;
}

type Phase = 'all' | 'pages' | 'options';

/** Livrables de la grille ; les options à la carte et le sur-mesure forment l'autre groupe */
const isPage = (m: PageModule) => !isOptionModule(m) && !m.isCustom;

/** Champ numérique de cellule : la largeur se règle par l'appelant (pas de w-full parasite). */
const cellInput =
  'h-7 rounded-sm border border-control bg-surface-2 px-1.5 text-right font-mono tabular text-ui text-ink outline-hidden transition-[border-color,background-color,box-shadow] ' +
  'focus-visible:border-accent focus-visible:bg-surface focus-visible:shadow-[var(--ring-field)] pointer-coarse:h-10 pointer-coarse:text-[16px]';

const stepBtn =
  'grid size-7 place-items-center rounded-sm text-muted outline-hidden transition-colors hover:bg-sunken hover:text-ink focus-visible:shadow-[var(--ring)] disabled:pointer-events-none disabled:opacity-35 pointer-coarse:size-9';

const th = 'px-3 py-2 text-xs font-medium text-muted';

export const PageTable: React.FC<PageTableProps> = ({
  modules,
  currentRole,
  pricing = 'resale',
  settings,
  onUpdateQuantity,
  onUpdateIncluded,
  onUpdateBasePrice,
  onUpdateClientPrice,
  onUpdateDays,
  onAddCustomModule,
  onDeleteModule,
}) => {
  const isAdmin = currentRole === 'admin';
  const resale = pricing === 'resale';
  const fixed = pricing === 'fixed';
  const formId = useId();

  const [phase, setPhase] = useState<Phase>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftIncluded, setDraftIncluded] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIncluded, setNewIncluded] = useState('');
  const [newPrice, setNewPrice] = useState(60);
  const [newDays, setNewDays] = useState(0.8);

  const groups: Record<Exclude<Phase, 'all'>, PageModule[]> = {
    pages: modules.filter(isPage),
    options: modules.filter((m) => !isPage(m)),
  };
  const active = (mods: PageModule[]) => mods.filter((m) => m.quantity > 0);
  const totals = sumModules(active(modules), settings);
  const retouches = retouchBilling(modules, settings);
  const activeCount = active(modules).length;
  const showTabs = groups.options.length > 0;
  const displayed = phase === 'all' || !showTabs ? modules : groups[phase];

  const startEdit = (mod: PageModule) => {
    setOpenId(mod.id);
    setEditingId(mod.id);
    setDraftIncluded(mod.includedDetails);
  };

  const saveEdit = (id: string) => {
    onUpdateIncluded(id, draftIncluded.trim());
    setEditingId(null);
  };

  const resetForm = () => {
    setNewName('');
    setNewDesc('');
    setNewIncluded('');
    setIsAdding(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddCustomModule(newName.trim(), newDesc.trim(), (newIncluded || newDesc).trim(), newPrice, newDays);
    resetForm();
    // le nouveau livrable doit rester visible
    if (phase === 'pages') setPhase('options');
  };

  const handleDelete = (mod: PageModule) => {
    if (window.confirm(`Supprimer « ${mod.name} » du devis ?`)) onDeleteModule(mod.id);
  };

  return (
    <Card aria-labelledby={`${formId}-title`} className="overflow-hidden">
      <CardHeader
        id={`${formId}-title`}
        title="Livrables"
        count={activeCount}
        description={
          fixed
            ? 'Choisissez les quantités : les prix sont ceux de votre grille tarifaire.'
            : !resale
            ? 'Choisissez les quantités ; le prix de chaque ligne vient de la grille tarifaire du client.'
            : clientPricingMode(settings) === 'tjm'
            ? 'Choisissez les quantités : le prix client suit les jours et votre TJM.'
            : 'Choisissez les quantités, puis fixez votre prix client pour chaque ligne.'
        }
        action={
          fixed ? undefined : (
          <Button
            onClick={() => setIsAdding((v) => !v)}
            aria-expanded={isAdding}
            aria-controls={`${formId}-form`}
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            Ajouter
          </Button>
          )
        }
      />

      {showTabs && (
        <div className="px-5 pb-3">
          <SegmentedControl<Phase>
            size="sm"
            label="Filtrer les livrables"
            value={phase}
            onChange={setPhase}
            options={[
              { value: 'all', label: `Tous ${modules.length}` },
              { value: 'pages', label: `Pages ${groups.pages.length}` },
              { value: 'options', label: `Options ${groups.options.length}` },
            ]}
          />
        </div>
      )}

      {isAdding && (
        <form id={`${formId}-form`} onSubmit={handleCreate} className="border-y border-line bg-surface-2 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-ui font-semibold">Nouveau livrable sur-mesure</h3>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Annuler
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Nom">
              {(id) => (
                <Input id={id} placeholder="Page carte cadeau" value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus />
              )}
            </Field>
            <Field label="Description courte">
              {(id) => (
                <Input id={id} placeholder="Vente de bons cadeaux" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              )}
            </Field>
            <Field label="Inclus au devis">
              {(id) => (
                <Input id={id} placeholder="Paiement Stripe, envoi du PDF" value={newIncluded} onChange={(e) => setNewIncluded(e.target.value)} />
              )}
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {settings.mode === 'forfait' && (
              <Field label={resale ? "Prix d'achat (€)" : 'Prix HT (€)'}>
                {(id) => <NumberInput id={id} min={0} value={newPrice} onValueChange={setNewPrice} className={cn(cellInput, 'h-8 w-24')} />}
              </Field>
            )}
            <Field label="Jours par unité">
              {(id) => <NumberInput id={id} min={0} value={newDays} onValueChange={setNewDays} className={cn(cellInput, 'h-8 w-24')} />}
            </Field>
            <Button type="submit" variant="primary">
              Ajouter au devis
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto scroll-thin">
        <table className={cn('w-full border-collapse text-left text-ui', resale ? 'min-w-[680px]' : 'min-w-[520px]')}>
          <thead>
            <tr className="border-y border-line bg-surface-2">
              <th scope="col" className={cn(th, 'w-[100px] pl-5 text-center')}>Qté</th>
              <th scope="col" className={th}>Livrable</th>
              <th scope="col" className={cn(th, 'w-28 text-right')}>Jours</th>
              {resale && <th scope="col" className={cn(th, 'w-24 text-right')}>{isAdmin ? 'Coût' : "Prix d'achat"}</th>}
              <th scope="col" className={cn(th, 'w-32 pr-5 text-right')}>
                {!resale ? 'Prix HT' : isAdmin ? 'Prix client' : 'Votre prix'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {displayed.length === 0 && (
              <tr>
                <td colSpan={resale ? 5 : 4} className="py-10 text-center text-muted">
                  Aucun livrable dans cette catégorie.
                </td>
              </tr>
            )}
            {displayed.map((mod) => {
              const isOn = mod.quantity > 0;
              const unitCost = getUnitCost(mod, settings);
              const unitPrice = getClientUnitPrice(mod, settings);
              const lineTotal = unitPrice * mod.quantity;
              const atMin = mod.minQuantity !== undefined && mod.quantity <= mod.minQuantity;
              const open = openId === mod.id;
              const editing = editingId === mod.id;

              return (
                <tr key={mod.id} className={cn('align-top transition-colors', isOn ? 'hover:bg-surface-2/70' : 'bg-surface-2/60')}>
                  <td className="py-3.5 pl-5 pr-2 text-center">
                    <div className="inline-flex items-center rounded-md border border-line bg-surface p-0.5 shadow-xs">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(mod.id, Math.max(0, mod.quantity - 1))}
                        disabled={atMin || mod.quantity === 0}
                        aria-label={`Retirer une unité : ${mod.name}`}
                        className={stepBtn}
                      >
                        <Minus className="size-3.5" aria-hidden="true" />
                      </button>
                      <span className="tabular w-6 text-center font-mono font-semibold text-ink" aria-live="polite">
                        {mod.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(mod.id, mod.quantity + 1)}
                        disabled={mod.maxQuantity !== undefined && mod.quantity >= mod.maxQuantity}
                        aria-label={`Ajouter une unité : ${mod.name}`}
                        className={stepBtn}
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>

                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('text-body font-medium', isOn ? 'text-ink' : 'text-muted')}>{mod.name}</span>
                      {isOptionModule(mod) && <Badge tone="accent">Option client</Badge>}
                      {mod.isCustom && <Badge tone="review">Sur-mesure</Badge>}
                    </div>
                    {mod.description && <p className="mt-0.5 text-ui leading-snug text-muted">{mod.description}</p>}

                    <button
                      type="button"
                      onClick={() => {
                        setOpenId(open ? null : mod.id);
                        if (open) setEditingId(null);
                      }}
                      aria-expanded={open}
                      className="mt-1.5 inline-flex items-center gap-0.5 rounded-sm text-xs font-medium text-muted outline-hidden hover:text-ink focus-visible:shadow-[var(--ring)]"
                    >
                      <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} aria-hidden="true" />
                      Périmètre inclus
                    </button>

                    {open && (
                      <div className="mt-2 rounded-lg border border-line bg-surface-2 p-3 animate-fade-in">
                        {editing ? (
                          <>
                            <Textarea
                              value={draftIncluded}
                              onChange={(e) => setDraftIncluded(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setEditingId(null);
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(mod.id);
                              }}
                              rows={3}
                              autoFocus
                              aria-label={`Périmètre inclus : ${mod.name}`}
                              placeholder="Ce qui est livré, et ce qui ne l'est pas"
                            />
                            <div className="mt-2 flex justify-end gap-1">
                              <Button variant="ghost" size="sm" icon={<X className="size-3.5" aria-hidden="true" />} onClick={() => setEditingId(null)}>
                                Annuler
                              </Button>
                              <Button size="sm" icon={<Check className="size-3.5" aria-hidden="true" />} onClick={() => saveEdit(mod.id)}>
                                Valider
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <p className="leading-relaxed text-ink-2">
                              {mod.includedDetails || <span className="text-waiting-text">Périmètre non précisé</span>}
                            </p>
                            <IconButton label={`Modifier le périmètre inclus : ${mod.name}`} size="sm" onClick={() => startEdit(mod)}>
                              <Pencil className="size-3.5" />
                            </IconButton>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono">
                    <span className={cn('tabular text-body font-semibold', isOn ? 'text-ink' : 'text-faint')}>
                      {formatDays(mod.days * mod.quantity)}
                    </span>
                    <span className="mt-1 flex items-center justify-end gap-1 whitespace-nowrap text-meta text-muted">
                      {isAdmin || mod.isCustom ? (
                        <>
                          <NumberInput
                            min={0}
                            value={mod.days}
                            onValueChange={(v) => onUpdateDays(mod.id, v)}
                            aria-label={`Jours par unité : ${mod.name}`}
                            className={cn(cellInput, 'h-6 w-14 text-meta')}
                          />
                          <span>/ unité</span>
                        </>
                      ) : (
                        <span className="tabular">{formatDays(mod.days)} / unité</span>
                      )}
                    </span>
                  </td>

                  {resale && (
                    <td className="px-3 py-3.5 text-right font-mono">
                      {isAdmin && settings.mode === 'forfait' ? (
                        <NumberInput
                          min={0}
                          value={mod.basePrice}
                          onValueChange={(v) => onUpdateBasePrice(mod.id, v)}
                          aria-label={`Coût unitaire : ${mod.name}`}
                          className={cn(cellInput, 'w-[4.5rem]')}
                        />
                      ) : (
                        <span className="tabular text-ink-2">{formatEuros(unitCost)}</span>
                      )}
                    </td>
                  )}

                  <td className="py-3.5 pl-3 pr-5 text-right font-mono">
                    {fixed || (resale && clientPricingMode(settings) === 'tjm') ? (
                      <span className="tabular text-body font-semibold text-ink">{formatEuros(unitPrice)}</span>
                    ) : !resale ? (
                      <NumberInput
                        min={0}
                        value={Math.round(unitPrice * 100) / 100}
                        onValueChange={(v) => onUpdateBasePrice(mod.id, v)}
                        aria-label={`Prix unitaire : ${mod.name}`}
                        className={cn(cellInput, 'w-24 font-semibold')}
                      />
                    ) : (
                      <NumberInput
                        min={0}
                        value={Math.round(unitPrice * 100) / 100}
                        onValueChange={(v) => onUpdateClientPrice(mod.id, v)}
                        aria-label={`Prix client unitaire : ${mod.name}`}
                        className={cn(cellInput, 'w-24 font-semibold')}
                      />
                    )}
                    <span className="mt-1.5 flex items-center justify-end gap-1 text-meta text-muted">
                      {mod.isCustom && (
                        <IconButton label={`Supprimer ${mod.name}`} size="sm" onClick={() => handleDelete(mod)} className="text-muted hover:text-danger-text">
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      )}
                      <span className={cn('tabular whitespace-nowrap', isOn ? 'text-ink-2' : 'text-faint')}>
                        Total{' '}
                        <span className="font-semibold">{formatEuros(lineTotal)}</span>
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong bg-surface-2">
              <th scope="row" colSpan={2} className="py-3 pl-5 pr-3 text-left text-ui font-medium text-muted">
                {activeCount} ligne{activeCount > 1 ? 's' : ''} retenue{activeCount > 1 ? 's' : ''}
              </th>
              <td className="tabular px-3 py-3 text-right font-mono text-ui font-semibold text-ink">{formatDays(totals.days)}</td>
              {resale && <td />}
              <td className="tabular py-3 pl-3 pr-5 text-right font-mono text-body font-semibold text-ink">{formatEuros(totals.price)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-xs text-muted">
        <Info className="mt-px size-3.5 shrink-0 text-faint" aria-hidden="true" />
        <span>
          {settings.retouchesIncludedPerPage} retouches incluses par page, soit {retouches.included} pour {retouches.pageCount} page
          {retouches.pageCount > 1 ? 's' : ''}. Au-delà, chaque retouche en plus est facturée {formatEuros(retouchClientPrice(settings), false)}. La
          TVA ({settings.vatRate} %) s’ajoute au total.
        </span>
      </p>
    </Card>
  );
};
