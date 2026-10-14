import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field, Input } from '../ui/input';
import { IconButton } from '../ui/button';

type PasswordFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Champ mot de passe avec affichage à la demande : évite les fautes de frappe sans rien exposer par défaut. */
export const PasswordField: React.FC<PasswordFieldProps> = ({ label, hint, error, className, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label}>
      {(id) => (
        <div className="relative">
          <Input
            {...props}
            id={id}
            size="lg"
            type={visible ? 'text' : 'password'}
            hint={hint}
            error={error}
            className={className ? `pr-11 ${className}` : 'pr-11'}
          />
          <span className="absolute right-2 top-2 flex">
            <IconButton
              label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              size="sm"
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </IconButton>
          </span>
        </div>
      )}
    </Field>
  );
};
