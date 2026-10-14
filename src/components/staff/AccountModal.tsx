import React, { useState } from 'react';
import type { Account } from '../../types/quote';
import { updateAccount, errorMessage, type AccountProfile } from '../../lib/api';
import { ChangePasswordForm } from '../portal/ChangePasswordForm';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/input';
import { Dialog, Notice } from '../ui/display';

interface AccountModalProps {
  token: string;
  account: Account;
  onUpdated: (account: Account) => void;
  onClose: () => void;
}

const FIELDS = [
  ['Société', 'name'],
  ['Accroche', 'tagline'],
  ['Contact', 'contactName'],
  ['E-mail (identifiant de connexion)', 'email'],
  ['Téléphone', 'phone'],
  ['Adresse', 'address'],
  ['SIRET', 'siret'],
] as const;

export const AccountModal: React.FC<AccountModalProps> = ({ token, account, onUpdated, onClose }) => {
  const [profile, setProfile] = useState<AccountProfile>({
    name: account.name,
    tagline: account.tagline,
    dailyRate: account.dailyRate,
    contactName: account.contactName,
    email: account.email,
    phone: account.phone,
    address: account.address,
    siret: account.siret,
  });
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const canEditRate = account.role === 'owner' || account.role === 'admin';
  const set = <K extends keyof AccountProfile>(k: K, v: AccountProfile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdated(await updateAccount(token, profile));
      setMessage({ kind: 'ok', text: 'Profil enregistré. Il sera repris sur vos prochains devis.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Mon compte" onClose={onClose}>
      <div className="space-y-8 p-5">
        {message && (
          <Notice tone={message.kind === 'ok' ? 'done' : 'danger'} role={message.kind === 'ok' ? 'status' : 'alert'}>
            {message.text}
          </Notice>
        )}

        <form onSubmit={saveProfile} className="space-y-4">
          <h3 className="text-xs font-semibold text-muted">Coordonnées sur les devis</h3>
          {FIELDS.map(([label, key]) => (
            <Field key={key} label={label}>
              {(id) => (
                <Input
                  id={id}
                  type={key === 'email' ? 'email' : 'text'}
                  value={profile[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className={key === 'siret' ? 'font-mono' : undefined}
                />
              )}
            </Field>
          ))}
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
          <Button type="submit" variant="primary" loading={busy}>
            Enregistrer
          </Button>
        </form>

        <div className="space-y-4 border-t border-line pt-6">
          <h3 className="text-xs font-semibold text-muted">Mot de passe</h3>
          <ChangePasswordForm
            token={token}
            onDone={() => setMessage({ kind: 'ok', text: 'Mot de passe modifié. Vos autres appareils devront se reconnecter.' })}
          />
        </div>
      </div>
    </Dialog>
  );
};
