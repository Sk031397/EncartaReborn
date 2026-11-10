/**
 * Retro UI primitives as React components. Small, composable, accessible.
 * Styles live in primitives.css / tokens.css.
 */
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';

type PanelProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  raised?: boolean;
  as?: 'section' | 'article' | 'aside' | 'div';
  children: ReactNode;
};

export function Panel({
  title,
  raised = false,
  as: Tag = 'section',
  children,
  className,
  ...rest
}: PanelProps) {
  return (
    <Tag
      className={['panel', raised ? 'panel--raised' : '', className ?? '']
        .join(' ')
        .trim()}
      {...rest}
    >
      {title ? <h2 className="panel__title">{title}</h2> : null}
      {children}
    </Tag>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={['btn', `btn--${variant}`, className ?? ''].join(' ').trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: 'primary' | 'ghost';
  children: ReactNode;
};

/** An anchor styled as a button, for real navigation (keeps semantics correct). */
export function LinkButton({
  variant = 'ghost',
  children,
  className,
  ...rest
}: LinkButtonProps) {
  return (
    <a
      className={['btn', `btn--${variant}`, className ?? ''].join(' ').trim()}
      {...rest}
    >
      {children}
    </a>
  );
}

type RailProps = {
  label: string;
  children: ReactNode;
};

/** A bounded list of items. Deliberately not an infinite feed (manifesto 1). */
export function Rail({ label, children }: RailProps) {
  return (
    <ul className="rail" aria-label={label}>
      {children}
    </ul>
  );
}

export function RailItem({ children }: { children: ReactNode }) {
  return <li className="rail__item">{children}</li>;
}

/** The spinning CD-ROM loader. Respects prefers-reduced-motion via CSS. */
export function DiscLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <div className="disc" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
