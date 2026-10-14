import React from 'react';
import { Button } from '../ui/button';
import { AuthLayout } from './AuthLayout';
import { ChangePasswordForm } from './ChangePasswordForm';

interface PasswordChangeGateProps {
  token: string;
  onDone: () => void;
  onLogout: () => void;
}

/** Écran bloquant : un mot de passe provisoire doit être remplacé avant d'accéder à l'application. */
export const PasswordChangeGate: React.FC<PasswordChangeGateProps> = ({ token, onDone, onLogout }) => (
  <AuthLayout
    title="Choisissez votre mot de passe"
    description="Le mot de passe que vous avez reçu est provisoire. Remplacez-le pour continuer."
    footer={
      <Button variant="ghost" size="sm" onClick={onLogout}>
        Se déconnecter
      </Button>
    }
  >
    <ChangePasswordForm token={token} onDone={onDone} submitLabel="Enregistrer et continuer" block />
  </AuthLayout>
);
