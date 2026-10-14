import React, { useState } from 'react';
import { changePassword, errorMessage, type ChangePasswordError } from '../../lib/api';
import { Button } from '../ui/button';
import { Notice } from '../ui/display';
import { PasswordField } from './PasswordField';

export const MIN_PASSWORD_LENGTH = 10;

interface ChangePasswordFormProps {
  token: string;
  /** Appelé après un changement réussi */
  onDone: () => void;
  submitLabel?: string;
  /** Pleine largeur (écran dédié) plutôt qu'un bouton à sa taille (dialogue) */
  block?: boolean;
}

const ERRORS: Record<ChangePasswordError, string> = {
  invalid_format: `Le nouveau mot de passe doit comporter au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  wrong_password: 'Mot de passe actuel incorrect.',
  same_password: "Le nouveau mot de passe doit être différent de l'actuel.",
  too_many_attempts: 'Trop de tentatives. Réessayez dans quelques minutes.',
};

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  token,
  onDone,
  submitLabel = 'Changer mon mot de passe',
  block = false,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const ready = oldPassword.length > 0 && newPassword.length >= MIN_PASSWORD_LENGTH && confirm === newPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await changePassword(token, oldPassword, newPassword);
      if (res.ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirm('');
        onDone();
      } else {
        setError(ERRORS[res.error as ChangePasswordError] ?? 'Modification impossible.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordField
        label="Mot de passe actuel"
        autoComplete="current-password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
      />
      <PasswordField
        label="Nouveau mot de passe"
        autoComplete="new-password"
        hint={tooShort ? undefined : `${MIN_PASSWORD_LENGTH} caractères minimum.`}
        error={tooShort ? `Encore ${MIN_PASSWORD_LENGTH - newPassword.length} caractère${MIN_PASSWORD_LENGTH - newPassword.length > 1 ? 's' : ''}.` : undefined}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <PasswordField
        label="Confirmer le nouveau mot de passe"
        autoComplete="new-password"
        error={mismatch ? 'Les deux mots de passe ne correspondent pas.' : undefined}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      )}
      <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!ready} className={block ? 'w-full' : undefined}>
        {submitLabel}
      </Button>
    </form>
  );
};
