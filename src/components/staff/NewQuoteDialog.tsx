import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Account, PartnerAccount } from '../../types/quote';
import { listPartners, savePartner, errorMessage } from '../../lib/api';
import { completePriceList } from '../../data/priceModel';
import { generatePassword } from '../../lib/password';
import { Button } from '../ui/button';
import { Field, Input, fieldControl, fieldSizes } from '../ui/input';
import { Dialog, Notice } from '../ui/display';
import { cn } from '../../lib/cn';

interface NewQuoteDialogProps {
  token: string;
  account: Account;
  /** `client` : compte pour lequel le devis est créé ; null = devis à mon nom, à mes propres prix */
  onPick: (client: Account | null) => void;
  onClose: () => void;
}

const NEW = '__new';
const NONE = '__none';

/** Choix du client d'un nouveau devis : un client existant (ses prix s'appliquent) ou un nouveau client. */
export const NewQuoteDialog: React.FC<NewQuoteDialogProps> = ({ token, account, onPick, onClose }) => {
  const [clients, setClients] = useState<PartnerAccount[] | null>(null);
  const [choice, setChoice] = useState<string>('');
  const [form, setForm] = useState({ name: '', contactName: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ account: Account; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPartners(token)
      .then((list) => {
        if (cancelled) return;
        const mine = list.filter((p) => p.managed && p.active);
        setClients(mine);
        setChoice(mine[0]?.id ?? NEW);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(errorMessage(e));
        setClients([]);
        setChoice(NONE);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const picked = clients?.find((c) => c.id === choice) ?? null;
  const ready = choice === NEW ? form.name.trim() !== '' && form.email.includes('@') : choice !== '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    if (choice !== NEW) {
      onPick(picked);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const password = generatePassword();
      const acc = await savePartner(
        token,
        null,
        {
          name: form.name.trim(),
          tagline: '',
          dailyRate: 75,
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: '',
          address: '',
          siret: '',
          active: true,
        },
        password,
        // la régie rattache le nouveau compte au revendeur ; pour le revendeur, c'est automatique
        { managed: account.role === 'admin' ? true : null, priceList: completePriceList(null) }
      );
      setCreated({ account: acc, password });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyAccess = async () => {
    if (!created) return;
    const text = `E-mail : ${created.account.email}\nMot de passe provisoire : ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copiez ces accès :', text);
    }
  };

  return (
    <Dialog title="Nouveau devis" onClose={onClose}>
      {created ? (
        <div className="space-y-4 p-5">
          <Notice
            tone="done"
            action={
              <Button size="sm" icon={copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />} onClick={copyAccess}>
                {copied ? 'Copié' : 'Copier les accès'}
              </Button>
            }
          >
            <p className="font-medium">Client créé : {created.account.name}</p>
            <p className="mt-0.5">
              <span className="font-mono">{created.account.email}</span> · mot de passe provisoire{' '}
              <span className="font-mono font-semibold">{created.password}</span>
            </p>
            <p className="mt-0.5 text-xs opacity-80">Il ne sera plus affiché. Ses prix sont ceux du modèle : ajustez-les dans Clients → Tarifs.</p>
          </Notice>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => onPick(created.account)}>
              Créer le devis pour {created.account.name}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-5">
          {error && (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          )}

          {clients === null ? (
            <p className="text-ui text-muted">Chargement…</p>
          ) : (
            <>
              <Field label="Client">
                {(id) => (
                  <select
                    id={id}
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    className={cn(fieldControl, fieldSizes.lg)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value={NEW}>+ Nouveau client…</option>
                    <option value={NONE}>Sans client (devis à mon nom, mes propres prix)</option>
                  </select>
                )}
              </Field>

              {choice === NEW ? (
                <div className="space-y-4 rounded-lg border border-line bg-surface-2 p-4">
                  <Field label="Société">
                    {(id) => <Input id={id} autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
                  </Field>
                  <Field label="Contact">
                    {(id) => <Input id={id} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />}
                  </Field>
                  <Field label="E-mail (identifiant de connexion)">
                    {(id) => (
                      <Input id={id} type="email" required autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    )}
                  </Field>
                  <p className="text-xs text-muted">Un compte client est créé avec un mot de passe provisoire, et la grille de prix du modèle.</p>
                </div>
              ) : picked ? (
                <p className="text-ui text-muted">
                  Le devis est créé dans l'espace de {picked.name}, avec sa grille de prix. Il le retrouve en se connectant.
                </p>
              ) : (
                <p className="text-ui text-muted">Le devis est créé à votre nom, avec vos propres prix.</p>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!ready || clients === null}>
              {choice === NEW ? 'Créer le client' : picked ? `Créer le devis pour ${picked.name}` : 'Créer le devis'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};
