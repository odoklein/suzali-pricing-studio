import React, { useState } from 'react';
import type { Account } from '../../types/quote';
import { updateAccount, errorMessage, type OwnProfile } from '../../lib/api';
import { ChangePasswordForm } from '../portal/ChangePasswordForm';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/input';
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
  });
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
