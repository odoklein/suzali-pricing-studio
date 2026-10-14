import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './button';

export type Tone = 'neutral' | 'accent' | 'todo' | 'progress' | 'waiting' | 'review' | 'done' | 'danger';

// Classes écrites en entier pour que Tailwind les détecte.
const TONE_SOFT: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2 ring-1 ring-inset ring-line',
  accent: 'bg-accent-soft text-accent ring-1 ring-inset ring-accent/20',
  todo: 'bg-todo-soft text-todo-text ring-1 ring-inset ring-todo/20',
  progress: 'bg-progress-soft text-progress-text ring-1 ring-inset ring-progress/20',
  waiting: 'bg-waiting-soft text-waiting-text ring-1 ring-inset ring-waiting/25',
  review: 'bg-review-soft text-review-text ring-1 ring-inset ring-review/20',
  done: 'bg-done-soft text-done-text ring-1 ring-inset ring-done/20',
  danger: 'bg-danger-soft text-danger-text ring-1 ring-inset ring-danger/20',
};

/** Pastille de libellé : statut, rôle, « Option client »… */
export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; icon?: React.ReactNode }) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        TONE_SOFT[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Bandeau d’information (erreur, succès, conflit) au fond doux du ton. */
export function Notice({
  tone = 'neutral',
  children,
  action,
  className,
  role,
}: {
  tone?: Tone;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  const tones: Record<Tone, string> = {
    neutral: 'bg-sunken text-ink-2',
    accent: 'bg-accent-soft text-accent',
    todo: 'bg-todo-soft text-todo-text',
    progress: 'bg-progress-soft text-progress-text',
    waiting: 'bg-waiting-soft text-waiting-text',
    review: 'bg-review-soft text-review-text',
    done: 'bg-done-soft text-done-text',
    danger: 'bg-danger-soft text-danger-text',
  };
  return (
    <div role={role} className={cn('flex items-center justify-between gap-4 rounded-md px-3.5 py-2.5 text-ui', tones[tone], className)}>
      <div className="min-w-0">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Carte : surface bordée, rayon xl, ombre légère. */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={cn('rounded-xl border border-line bg-surface shadow-card', className)}>
      {children}
    </section>
  );
}

/** En-tête de carte : titre 16 px semi-gras, nombre discret, action à droite. */
export function CardHeader({
  id,
  title,
  count,
  description,
  action,
  as: Heading = 'h2',
  className,
}: {
  id?: string;
  title: React.ReactNode;
  count?: number;
  description?: React.ReactNode;
  action?: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start gap-x-2 gap-y-3 px-5 pb-3 pt-4', className)}>
      <div className="min-w-0">
        <Heading id={id} className="flex min-w-0 items-center gap-2 text-title font-semibold tracking-title">
          <span className="truncate">{title}</span>
          {count !== undefined && (
            <span aria-hidden="true" className="tabular text-ui font-medium text-muted">
              {count}
            </span>
          )}
        </Heading>
        {description && <div className="mt-0.5 text-ui text-muted">{description}</div>}
      </div>
      {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Titre de section : 12 px semi-gras discret, casse normale. */
export function SectionHeader({
  title,
  count,
  action,
  as: Heading = 'h2',
  id,
  className,
}: {
  title: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  as?: 'h2' | 'h3' | 'h4';
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-2 flex items-center gap-2', className)}>
      <Heading id={id} className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {title}
        {count !== undefined && (
          <span aria-hidden="true" className="tabular font-medium text-faint">
            {count}
          </span>
        )}
      </Heading>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** En-tête de page : titre 24 px, sous-titre discret, actions à droite. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="text-h1 font-semibold tracking-tight">{title}</h1>
        {description && <div className="mt-1 text-body text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Bandeau de chiffres clés : une seule carte, des filets fins, aucune icône décorative. */
export function StatStrip({
  label,
  items,
}: {
  label: string;
  items: { label: string; value: React.ReactNode; hint?: React.ReactNode }[];
}) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card lg:grid-cols-4"
    >
      {items.map((item) => (
        <dl key={item.label} className="min-w-0 bg-surface px-5 py-4">
          <dt className="text-xs font-medium text-muted">{item.label}</dt>
          <dd className="tabular mt-2 truncate text-h1 font-semibold leading-none tracking-tight">{item.value}</dd>
          {item.hint && <dd className="mt-2 truncate text-xs text-muted">{item.hint}</dd>}
        </dl>
      ))}
    </section>
  );
}

/** État vide : pastille d’icône teintée, titre, explication et action suivante. */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-12 text-center', className)}>
      {icon && (
        <span className="mb-3 grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent ring-4 ring-surface-2 [&>svg]:size-5">
          {icon}
        </span>
      )}
      <p className="text-h2 font-semibold tracking-title">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-ui text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Touche de raccourci. `onInk` : sur un fond encre (bouton principal). */
export function Kbd({ children, onInk = false, className }: { children: React.ReactNode; onInk?: boolean; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-xs px-1 font-mono text-meta font-medium',
        onInk ? 'bg-bg/15 text-inherit' : 'border border-line bg-surface-2 text-muted',
        className
      )}
    >
      {children}
    </kbd>
  );
}

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode };

/** Choix exclusif en segments (radiogroup) : flèches pour changer, Tab pour sortir. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  className,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const group = useRef<HTMLDivElement>(null);

  const move = (event: React.KeyboardEvent, index: number) => {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div ref={group} role="radiogroup" aria-label={label} className={cn('inline-flex gap-0.5 rounded-lg bg-sunken p-1', className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md font-medium outline-hidden transition-[background-color,color,box-shadow] focus-visible:shadow-[var(--ring)] pointer-coarse:min-h-11',
              size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-ui',
              selected ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pastille de filtre (projets, statuts) : pilule bordée, accent quand active. */
export const chipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink pointer-coarse:min-h-11';
export const chipActive = 'border-accent bg-accent-soft text-accent hover:border-accent hover:text-accent';

/** Tuile d’initiales (logo d’un compte). */
export function Monogram({ label, size = 32, className }: { label: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn('grid shrink-0 place-items-center rounded-md bg-ink font-bold text-bg shadow-button', className)}
    >
      {label}
    </span>
  );
}

/** Dialogue modal : voile, panneau centré, Échap et clic sur le voile pour fermer. */
export function Dialog({
  title,
  onClose,
  children,
  size = 'md',
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // l’appelant passe souvent une fonction en ligne : l’effet ne doit pas se relancer à chaque rendu
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-[var(--scrim)] animate-fade-in" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-overlay outline-hidden animate-pop-in',
          size === 'md' ? 'max-w-lg' : size === 'lg' ? 'max-w-3xl' : 'max-w-5xl'
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-title font-semibold tracking-title">
            {title}
          </h2>
          <IconButton label="Fermer" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">{children}</div>
      </div>
    </div>
  );
}
