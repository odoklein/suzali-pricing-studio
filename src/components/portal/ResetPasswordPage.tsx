import React, { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { checkResetToken, resetPassword, errorMessage } from '../../lib/api';
import { Button } from '../ui/button';
import { Notice } from '../ui/display';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { MIN_PASSWORD_LENGTH } from './ChangePasswordForm';

interface ResetPasswordPageProps {
  token: string;
  /** Quitte la page de réinitialisation pour l'écran de connexion */
  onDone: () => void;
  /** Ouvre la demande d'un nouveau lien */
  onRequestNew: () => void;
}

/** Page ouverte depuis le lien de l'e-mail : choix d'un nouveau mot de passe. */
export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token, onDone, onRequestNew }) => {
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkResetToken(token)
      .then((ok) => !cancelled && setValid(ok))
      .catch(() => !cancelled && setValid(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= MIN_PASSWORD_LENGTH && confirm === password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await resetPassword(token, password);
      if (res.ok) {
        setDone(true);
      } else if (res.error === 'invalid_token') {
        setValid(false);
      } else {
        setError(`Le mot de passe doit comporter au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Mot de passe modifié" footer="Vos autres appareils ont été déconnectés.">
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 text-ui text-ink-2">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-done" aria-hidden="true" />
            Votre nouveau mot de passe est enregistré. Vous pouvez vous connecter.
          </p>
          <Button variant="primary" size="lg" onClick={onDone} className="w-full">
            Se connecter
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (valid === false) {
    return (
      <AuthLayout title="Lien expiré" description="Ce lien n'est plus valable : il a déjà servi ou dépassé 1 heure.">
        <div className="space-y-3">
          <Button variant="primary" size="lg" onClick={onRequestNew} className="w-full">
            Recevoir un nouveau lien
          </Button>
          <Button variant="ghost" size="lg" onClick={onDone} className="w-full">
            Retour à la connexion
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nouveau mot de passe" description="Choisissez un mot de passe d'au moins 10 caractères.">
      {valid === null ? (
        <p className="text-ui text-muted">Vérification du lien…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <PasswordField
            label="Nouveau mot de passe"
            autoComplete="new-password"
            autoFocus
            hint={tooShort ? undefined : `${MIN_PASSWORD_LENGTH} caractères minimum.`}
            error={tooShort ? `Encore ${MIN_PASSWORD_LENGTH - password.length} caractère${MIN_PASSWORD_LENGTH - password.length > 1 ? 's' : ''}.` : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordField
            label="Confirmer le mot de passe"
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
          <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!ready} className="w-full">
            Enregistrer le mot de passe
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};
