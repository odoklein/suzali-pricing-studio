import React, { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Check, Copy, Plus, Power, Sparkles, Tag, Users } from 'lucide-react';
import type { Account, PartnerAccount } from '../../types/quote';
import { listPartners, savePartner, setPartnerState, errorMessage, type AccountProfile } from '../../lib/api';
import { formatEuros } from '../../utils/formatters';
import { getInitials } from '../../lib/initials';
import { generatePassword } from '../../lib/password';
import { completePriceList } from '../../data/priceModel';
import { PriceListDialog } from './PriceListDialog';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/input';
import { Badge, Card, Dialog, EmptyState, Monogram, Notice, PageHeader, chipActive, chipClass } from '../ui/display';
import { cn } from '../../lib/cn';

interface PartnersPanelProps {
  token: string;
  account: Account;
}

interface FormState extends AccountProfile {
  id: string | null;
  active: boolean;
  password: string;
  /** Client du revendeur : prix imposés par sa grille, aucun prix d'achat visible */
  managed: boolean;
}

const emptyForm: FormState = {
  id: null,
  name: '',
  tagline: '',
  dailyRate: 75,
  contactName: '',
  email: '',
  phone: '',
  address: '',
  siret: '',
  active: true,
  password: '',
  managed: false,
};

const th = 'px-5 py-2.5 text-xs font-medium text-muted';

export const PartnersPanel: React.FC<PartnersPanelProps> = ({ token, account }) => {
  const [partners, setPartners] = useState<PartnerAccount[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pricesFor, setPricesFor] = useState<PartnerAccount | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [stateBusy, setStateBusy] = useState<string | null>(null);

  // Le revendeur n'a que des clients ; la régie choisit, compte par compte
  const isOwner = account.role === 'owner';

  const refresh = useCallback(async () => {
    try {
      setPartners(await listPartners(token));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const archivedCount = (partners ?? []).filter((p) => p.archived).length;
  const visible = (partners ?? []).filter((p) => (showArchived ? p.archived : !p.archived));
  const editingArchived = form?.id ? partners?.find((p) => p.id === form.id)?.archived === true : false;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const openForm = (next: FormState) => {
    setForm(next);
    setFormError(null);
    setCreated(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      const password = form.password === '' ? null : form.password;
      const becomesManaged = isOwner || form.managed;
      const wasManaged = form.id ? partners?.find((p) => p.id === form.id)?.managed === true : false;
      await savePartner(token, form.id, form, password, {
        managed: isOwner ? null : form.managed,
        // un nouveau client part du modèle RM-2026-0013 : le revendeur ajuste ensuite ses prix
        priceList: becomesManaged && !wasManaged ? completePriceList(null) : null,
      });
      if (password) setCreated({ name: form.name, email: form.email, password });
      setForm(null);
      await refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeState = async (p: PartnerAccount, state: { active: boolean | null; archived?: boolean | null }, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setStateBusy(p.id);
    setError(null);
    try {
      await setPartnerState(token, p.id, state);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStateBusy(null);
    }
  };

  const copyAccess = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`E-mail : ${created.email}\nMot de passe provisoire : ${created.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copiez ces accès :', `${created.email} / ${created.password}`);
    }
  };

  return (
    <div>
      <PageHeader
        title={isOwner ? 'Clients' : 'Partenaires'}
        description={
          isOwner
            ? 'Vos clients : chacun a son espace et ne voit que les prix de sa grille tarifaire, sans prix d’achat.'
            : 'Chaque partenaire a son espace, son e-mail de connexion et son tarif journalier ; un client du revendeur applique la grille de prix du revendeur.'
        }
        actions={
          <Button variant="primary" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => openForm({ ...emptyForm })}>
            {isOwner ? 'Nouveau client' : 'Nouveau partenaire'}
          </Button>
        }
      />

      {error && (
        <Notice tone="danger" role="alert" className="mt-5">
          {error}
        </Notice>
      )}

      {created && (
        <Notice
          tone="done"
          className="mt-5"
          action={
            <Button size="sm" icon={copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />} onClick={copyAccess}>
              {copied ? 'Copié' : 'Copier les accès'}
            </Button>
          }
        >
          <p className="font-medium">Accès de {created.name}</p>
          <p className="mt-0.5">
            <span className="font-mono">{created.email}</span> · mot de passe provisoire{' '}
            <span className="font-mono font-semibold">{created.password}</span>
          </p>
          <p className="mt-0.5 text-xs opacity-80">Il ne sera plus affiché et devra être remplacé à la première connexion.</p>
        </Notice>
      )}

      {partners !== null && archivedCount > 0 && (
        <div role="group" aria-label="Filtrer les comptes" className="mt-6 flex items-center gap-1.5">
          {([false, true] as const).map((archived) => (
            <button
              key={String(archived)}
              type="button"
              aria-pressed={showArchived === archived}
              onClick={() => setShowArchived(archived)}
              className={cn(chipClass, showArchived === archived && chipActive)}
            >
              {archived ? 'Archivés' : 'Actifs et désactivés'}
              <span className="tabular font-normal opacity-80">{archived ? archivedCount : partners.length - archivedCount}</span>
            </button>
          ))}
        </div>
      )}

      <Card className="mt-4 overflow-hidden">
        {partners === null ? (
          <p className="px-5 py-10 text-center text-ui text-muted">Chargement…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={isOwner ? 'Aucun client' : 'Aucun partenaire'}
            action={
              <Button variant="primary" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => openForm({ ...emptyForm })}>
                {isOwner ? 'Créer le premier client' : 'Créer le premier partenaire'}
              </Button>
            }
          >
            Un compte reçoit un e-mail de connexion et un mot de passe provisoire.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[640px] text-left text-ui">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th scope="col" className={th}>{isOwner ? 'Client' : 'Partenaire'}</th>
                  <th scope="col" className={`${th} text-right`}>{isOwner ? 'Tarifs' : 'Tarif / jour'}</th>
                  <th scope="col" className={`${th} text-right`}>Devis</th>
                  <th scope="col" className={`${th} text-right`}>Signés</th>
                  <th scope="col" className={th}>Statut</th>
                  <th scope="col" className="w-64">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Monogram label={getInitials(p.name)} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="truncate text-xs text-muted">{[p.contactName, p.email].filter(Boolean).join(' · ') || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular px-5 py-3 text-right font-mono">
                      {p.managed ? (
                        <Badge tone="accent" icon={<Tag className="size-3" aria-hidden="true" />}>
                          Grille revendeur
                        </Badge>
                      ) : (
                        formatEuros(p.dailyRate, false)
                      )}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-mono">{p.quoteCount}</td>
                    <td className="tabular px-5 py-3 text-right font-mono">{p.signedCount}</td>
                    <td className="px-5 py-3">
                      <Badge tone={p.archived ? 'neutral' : p.active ? 'done' : 'waiting'}>
                        {p.archived ? 'Archivé' : p.active ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap justify-end gap-1">
                        {p.managed && !p.archived && (
                          <Button variant="secondary" size="sm" onClick={() => setPricesFor(p)}>
                            Tarifs
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openForm({ ...p, managed: p.managed === true, password: '' })}>
                          Modifier
                        </Button>
                        {p.archived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={stateBusy === p.id}
                            icon={<ArchiveRestore className="size-3.5" aria-hidden="true" />}
                            onClick={() => void changeState(p, { active: null, archived: false })}
                          >
                            Restaurer
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={stateBusy === p.id}
                              icon={<Power className="size-3.5" aria-hidden="true" />}
                              onClick={() =>
                                void changeState(
                                  p,
                                  { active: !p.active },
                                  p.active ? `Désactiver ${p.name} ? Il ne pourra plus se connecter ; ses devis sont conservés.` : undefined
                                )
                              }
                            >
                              {p.active ? 'Désactiver' : 'Réactiver'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={stateBusy === p.id}
                              icon={<Archive className="size-3.5" aria-hidden="true" />}
                              onClick={() =>
                                void changeState(
                                  p,
                                  { active: false, archived: true },
                                  `Archiver ${p.name} ? Le compte est masqué et ne peut plus se connecter ; ses devis et son historique sont conservés.`
                                )
                              }
                            >
                              Archiver
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pricesFor && (
        <PriceListDialog
          token={token}
          partner={pricesFor}
          others={(partners ?? []).filter((p) => p.id !== pricesFor.id)}
          onClose={() => setPricesFor(null)}
          onSaved={() => {
            setPricesFor(null);
            void refresh();
          }}
        />
      )}

      {form && (
        <Dialog title={form.id ? 'Modifier le compte' : isOwner ? 'Nouveau client' : 'Nouveau partenaire'} onClose={() => setForm(null)} size="lg">
          <form onSubmit={handleSave} className="p-5">
            {formError && (
              <Notice tone="danger" role="alert" className="mb-4">
                {formError}
              </Notice>
            )}

            <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
              <Field label="Société">
                {(id) => <Input id={id} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
              </Field>
              <Field label="Accroche (sous le nom)">
                {(id) => <Input id={id} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />}
              </Field>
              <Field label="E-mail (identifiant de connexion)">
                {(id) => (
                  <Input id={id} type="email" required autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} />
                )}
              </Field>
              {!isOwner && (
                <Field label="Type de compte">
                  {(id) => (
                    <select
                      id={id}
                      value={form.managed ? 'managed' : 'independent'}
                      onChange={(e) => set('managed', e.target.value === 'managed')}
                      className="h-9 w-full rounded-md border border-control bg-surface-2 px-2 text-ui text-ink"
                    >
                      <option value="independent">Partenaire : fixe ses propres prix</option>
                      <option value="managed">Client du revendeur : grille de prix imposée</option>
                    </select>
                  )}
                </Field>
              )}
              {!form.managed && !isOwner && (
                <Field label="Tarif journalier (€ HT / jour)">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      max={5000}
                      step={5}
                      required
                      className="font-mono"
                      value={form.dailyRate}
                      onChange={(e) => set('dailyRate', Number(e.target.value))}
                    />
                  )}
                </Field>
              )}
              <Field label="Contact">
                {(id) => <Input id={id} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />}
              </Field>
              <Field label="Téléphone">
                {(id) => <Input id={id} value={form.phone} onChange={(e) => set('phone', e.target.value)} />}
              </Field>
              <Field label="Adresse">
                {(id) => <Input id={id} value={form.address} onChange={(e) => set('address', e.target.value)} />}
              </Field>
              <Field label="SIRET">
                {(id) => <Input id={id} className="font-mono" value={form.siret} onChange={(e) => set('siret', e.target.value)} />}
              </Field>
            </div>

            <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4">
              <Field label={form.id ? 'Nouveau mot de passe provisoire' : 'Mot de passe provisoire'}>
                {(id) => (
                  <div className="flex gap-2">
                    <Input
                      id={id}
                      minLength={10}
                      autoComplete="off"
                      required={!form.id}
                      className="font-mono"
                      hint={
                        form.id
                          ? 'Laissez vide pour conserver le mot de passe actuel.'
                          : '10 caractères minimum. Le partenaire devra le remplacer à sa première connexion.'
                      }
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                    />
                    <Button icon={<Sparkles className="size-4" aria-hidden="true" />} onClick={() => set('password', generatePassword())}>
                      Générer
                    </Button>
                  </div>
                )}
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              {editingArchived ? (
                <p className="text-ui text-muted">Compte archivé : restaurez-le depuis la liste pour le modifier.</p>
              ) : (
                <label className="flex items-center gap-2 text-ui text-ink-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={form.active}
                    onChange={(e) => set('active', e.target.checked)}
                  />
                  Compte actif
                </label>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setForm(null)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" loading={saving}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
