import React, { useState } from 'react';
import type { Account } from '../../types/quote';
import { ImageUp, Trash2 } from 'lucide-react';
import { updateAccount, saveLogo, errorMessage, type OwnProfile } from '../../lib/api';
import { imageToLogoDataUrl, LogoError } from '../../lib/logo';
import { DEFAULT_LATE_PENALTIES, DEFAULT_PAYMENT_TERMS } from '../../data/terms';
import { ChangePasswordForm } from '../portal/ChangePasswordForm';
import { Button } from '../ui/button';
import { Field, Input, Textarea } from '../ui/input';
import { Card, Notice, PageHeader } from '../ui/display';

interface ProfilePanelProps {
  token: string;
  account: Account;
  onUpdated: (account: Account) => void;
}

type TextKey = Exclude<keyof OwnProfile, 'dailyRate'>;

const COMPANY: [string, TextKey, string?][] = [
  ['Société', 'name'],
  ['Accroche (sous le nom)', 'tagline'],
  ['Forme juridique', 'legalForm', 'SAS, SARL, EI…'],
  ['Capital', 'shareCapital', '10 000 €'],
  ['SIRET', 'siret'],
  ['RCS', 'rcs', 'RCS Paris 123 456 789'],
  ['N° de TVA intracommunautaire', 'vatNumber', 'FR12345678901'],
];

const CONTACT: [string, TextKey, string?][] = [
  ['Interlocuteur', 'contactName'],
  ['E-mail (identifiant de connexion)', 'email'],
  ['Téléphone', 'phone'],
  ['Site web', 'website', 'https://'],
  ['Adresse', 'address'],
];

const MONO: TextKey[] = ['siret', 'rcs', 'vatNumber'];

/** Fiche de l'entreprise : coordonnées et mentions légales imprimées sur chaque devis. */
export const ProfilePanel: React.FC<ProfilePanelProps> = ({ token, account, onUpdated }) => {
  const [profile, setProfile] = useState<OwnProfile>({
    name: account.name,
    tagline: account.tagline,
    dailyRate: account.dailyRate,
    contactName: account.contactName,
    email: account.email,
    phone: account.phone,
    address: account.address,
    siret: account.siret,
    legalForm: account.legalForm ?? '',
    shareCapital: account.shareCapital ?? '',
    rcs: account.rcs ?? '',
    vatNumber: account.vatNumber ?? '',
    website: account.website ?? '',
    paymentTerms: account.paymentTerms ?? '',
    latePenalties: account.latePenalties ?? '',
  });
  const [logoBusy, setLogoBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const canEditRate = (account.role === 'owner' || account.role === 'admin') && !account.managed;
  const set = <K extends keyof OwnProfile>(k: K, v: OwnProfile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      onUpdated(await updateAccount(token, profile));
      setMessage({ kind: 'ok', text: 'Informations enregistrées. Elles seront reprises sur vos prochains devis.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    setMessage(null);
    try {
      const logo = await imageToLogoDataUrl(file);
      await saveLogo(token, logo);
      onUpdated({ ...account, logo });
      setMessage({ kind: 'ok', text: 'Logo enregistré. Il figure sur vos devis et sur l’écran de connexion.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof LogoError ? err.message : errorMessage(err) });
    } finally {
      setLogoBusy(false);
    }
  };

  const removeLogo = async () => {
    setLogoBusy(true);
    setMessage(null);
    try {
      await saveLogo(token, null);
      onUpdated({ ...account, logo: null });
      setMessage({ kind: 'ok', text: 'Logo supprimé.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setLogoBusy(false);
    }
  };

  const fields = (list: [string, TextKey, string?][]) =>
    list.map(([label, key, placeholder]) => (
      <Field key={key} label={label}>
        {(id) => (
          <Input
            id={id}
            type={key === 'email' ? 'email' : 'text'}
            placeholder={placeholder}
            value={profile[key]}
            onChange={(e) => set(key, e.target.value)}
            className={MONO.includes(key) ? 'font-mono' : undefined}
          />
        )}
      </Field>
    ));

  return (
    <div>
      <PageHeader
        title="Mes informations"
        description="Votre société, vos mentions légales et vos contacts. Ils figurent sur les devis que vous émettez."
      />

      {message && (
        <Notice tone={message.kind === 'ok' ? 'done' : 'danger'} role={message.kind === 'ok' ? 'status' : 'alert'} className="mt-5">
          {message.text}
        </Notice>
      )}

      {!account.managed && (
        <Card className="mt-6 p-5">
          <h2 className="text-ui font-semibold">Logo</h2>
          <p className="mt-1 text-ui text-muted">
            Affiché sur vos devis et, pour le revendeur, sur l’écran de connexion. PNG, JPEG ou WebP, redimensionné automatiquement.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="grid h-20 w-56 place-items-center rounded-lg border border-dashed border-line-strong bg-surface-2 p-2">
              {account.logo ? (
                <img src={account.logo} alt={`Logo ${account.name}`} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted">Aucun logo</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-ui font-medium shadow-xs transition-colors hover:bg-surface-2 focus-within:shadow-[var(--ring)] pointer-coarse:h-11 ${logoBusy ? 'pointer-events-none opacity-60' : ''}`}
              >
                <ImageUp className="size-4" aria-hidden="true" />
                {account.logo ? 'Remplacer' : 'Ajouter un logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pickLogo} disabled={logoBusy} />
              </label>
              {account.logo && (
                <Button icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => void removeLogo()} disabled={logoBusy}>
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={save} className="mt-6 space-y-6">
        <Card className="p-5">
          <h2 className="text-ui font-semibold">Société et mentions légales</h2>
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">{fields(COMPANY)}</div>
        </Card>

        <Card className="p-5">
          <h2 className="text-ui font-semibold">Contact</h2>
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
            {fields(CONTACT)}
            {canEditRate && (
              <Field label="Tarif journalier par défaut (€ HT)">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    max={5000}
                    step={5}
                    className="font-mono"
                    value={profile.dailyRate}
                    onChange={(e) => set('dailyRate', Number(e.target.value))}
                  />
                )}
              </Field>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-ui font-semibold">Conditions par défaut des devis</h2>
          <p className="mt-1 text-ui text-muted">Reprises sur chaque nouveau devis ; modifiables devis par devis. Laissées vides, les textes ci-dessous s'impriment.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Conditions de paiement">
              {(id) => (
                <Textarea id={id} rows={4} placeholder={DEFAULT_PAYMENT_TERMS} value={profile.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} />
              )}
            </Field>
            <Field label="Pénalités de retard">
              {(id) => (
                <Textarea id={id} rows={4} placeholder={DEFAULT_LATE_PENALTIES} value={profile.latePenalties} onChange={(e) => set('latePenalties', e.target.value)} />
              )}
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={busy}>
            Enregistrer
          </Button>
        </div>
      </form>

      <Card className="mt-6 p-5">
        <h2 className="text-ui font-semibold">Mot de passe</h2>
        <div className="mt-4 max-w-md">
          <ChangePasswordForm
            token={token}
            onDone={() => setMessage({ kind: 'ok', text: 'Mot de passe modifié. Vos autres appareils devront se reconnecter.' })}
          />
        </div>
      </Card>
    </div>
  );
};
