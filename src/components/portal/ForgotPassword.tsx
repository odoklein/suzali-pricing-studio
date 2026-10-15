import React, { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { requestPasswordReset, errorMessage } from '../../lib/api';
import { Field, Input } from '../ui/input';
import { Button } from '../ui/button';
import { Notice } from '../ui/display';
import { AuthLayout } from './AuthLayout';

interface ForgotPasswordProps {
  initialEmail?: string;
  onBack: () => void;
}

/** Demande d'un lien de réinitialisation : la réponse est la même que l'adresse soit connue ou non. */
export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ initialEmail = '', onBack }) => {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.includes('@')) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Vérifiez votre boîte mail" footer="Le lien est valable 1 heure et ne sert qu'une fois.">
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 text-ui text-ink-2">
            <MailCheck className="mt-0.5 size-5 shrink-0 text-done" aria-hidden="true" />
            <span>
              Si un compte existe pour <span className="font-medium text-ink">{email.trim()}</span>, un e-mail avec le lien de réinitialisation vient de partir.
              Pensez à regarder dans les courriers indésirables.
            </span>
          </p>
          <Button variant="secondary" size="lg" onClick={onBack} className="w-full">
            Retour à la connexion
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Mot de passe oublié" description="Indiquez votre adresse e-mail : nous vous envoyons un lien pour en choisir un nouveau.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Adresse e-mail">
          {(id) => (
            <Input
              id={id}
              size="lg"
              type="email"
              name="email"
              autoComplete="username"
              autoFocus
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        {error && (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        )}
        <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!email.includes('@')} className="w-full">
          Envoyer le lien
        </Button>
        <Button variant="ghost" size="lg" onClick={onBack} className="w-full">
          Retour à la connexion
        </Button>
      </form>
    </AuthLayout>
  );
};
