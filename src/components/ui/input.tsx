import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

type Size = 'md' | 'lg';

/** Classes communes aux champs : à réutiliser pour un <select> ou un champ numérique. */
export const fieldControl =
  'w-full border border-control bg-surface-2 text-ink outline-hidden placeholder:text-muted transition-[border-color,background-color,box-shadow] duration-[var(--dur-1)] ' +
  'focus-visible:border-accent focus-visible:bg-surface focus-visible:shadow-[var(--ring-field)] ' +
  'disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-danger ' +
  // 16 px minimum sur écran tactile : sinon iOS zoome à la prise de focus.
  'pointer-coarse:text-[16px]';

export const fieldSizes: Record<Size, string> = {
  md: 'h-8 rounded-md px-3 text-ui pointer-coarse:h-11',
  lg: 'h-10 rounded-md px-3.5 text-body pointer-coarse:h-11',
};

const textareaSizes: Record<Size, string> = {
  md: 'min-h-16 rounded-md px-3 py-2 text-ui',
  lg: 'min-h-20 rounded-md px-3.5 py-2.5 text-body',
};

type FieldProps = {
  size?: Size;
  /** Message d’erreur : met le champ en état invalide et le relie au champ. */
  error?: string;
  hint?: string;
};

function Message({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={id} role="alert" className="mt-1 text-xs text-danger-text">
        {error}
      </p>
    );
  }
  return hint ? (
    <p id={id} className="mt-1 text-xs text-muted">
      {hint}
    </p>
  ) : null;
}

export const Input = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & FieldProps>(
  function Input({ size = 'md', error, hint, className, ...props }, ref) {
    const messageId = useId();
    const described = error || hint ? messageId : undefined;
    return (
      <div className="w-full">
        <input
          {...props}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(props['aria-describedby'], described) || undefined}
          className={cn(fieldControl, fieldSizes[size], className)}
        />
        <Message id={messageId} error={error} hint={hint} />
      </div>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(
  function Textarea({ size = 'md', error, hint, className, ...props }, ref) {
    const messageId = useId();
    const described = error || hint ? messageId : undefined;
    return (
      <div className="w-full">
        <textarea
          {...props}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(props['aria-describedby'], described) || undefined}
          className={cn(fieldControl, textareaSizes[size], 'resize-none leading-relaxed', className)}
        />
        <Message id={messageId} error={error} hint={hint} />
      </div>
    );
  }
);

/** Libellé + champ : relie le label au contrôle sans que l’appelant gère les id. */
export function Field({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: (id: string) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-2">
        {label}
      </label>
      {children(id)}
    </div>
  );
}
