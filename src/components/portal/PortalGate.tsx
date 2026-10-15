import React, { useState } from 'react';
import { Field, Input } from '../ui/input';
import { Button } from '../ui/button';
import { Notice } from '../ui/display';
import { AuthLayout } from './AuthLayout';
import { ForgotPassword } from './ForgotPassword';
import { PasswordField } from './PasswordField';

interface PortalGateProps {
  /** Retourne null si la connexion a réussi, sinon le code d'erreur */
  onSubmit: (email: string, password: string) => Promise<'invalid_credentials' | 'too_many_attempts' | 'network' | null>;
  notice?: string | null;
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  too_many_attempts: 'Trop de tentatives. Réessayez dans quelques minutes.',
  network: 'Connexion impossible. Réessayez.',
};

export const PortalGate: React.FC<PortalGateProps> = ({ onSubmit, notice }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ code: string; n: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const result = await onSubmit(email.trim(), password);
    if (result === null) return; // l'écran est remplacé par l'application
    setBusy(false);
    setError((prev) => ({ code: result, n: (prev?.n ?? 0) + 1 }));
    setPassword('');
  };

  if (forgot) return <ForgotPassword initialEmail={email} onBack={() => setForgot(false)} />;

  return (
    <AuthLayout
      title="Connexion"
      description="Accédez à votre espace de chiffrage."
      footer="Accès réservé · connexion chiffrée"
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {notice && <Notice tone="waiting">{notice}</Notice>}

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

        <PasswordField
          label="Mot de passe"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="-mt-1 text-right">
          <button
            type="button"
            onClick={() => setForgot(true)}
            className="rounded-xs text-xs font-medium text-muted underline-offset-4 outline-hidden hover:text-ink hover:underline focus-visible:shadow-[var(--ring)]"
          >
            Mot de passe oublié ?
          </button>
        </div>

        {error && (
          <div key={error.n} className="animate-shake">
            <Notice tone="danger" role="alert">
              {MESSAGES[error.code] ?? 'Erreur de connexion.'}
            </Notice>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!email.trim() || !password} className="w-full">
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  );
};
