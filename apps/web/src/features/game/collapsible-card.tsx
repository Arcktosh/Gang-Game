'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

function classNames(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ');
}

export function CollapsibleCard({
  title,
  children,
  meta,
  defaultOpen = false,
  className,
  id,
  visible = true,
  style,
}: {
  title: ReactNode;
  children: ReactNode;
  meta?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  id?: string;
  visible?: boolean;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!visible) {
    return null;
  }

  return (
    <details
      className={classNames('card', 'collapsible-card', className)}
      id={id}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
      style={style}
    >
      <summary className="collapsible-card__summary">
        <span className="collapsible-card__heading" role="heading" aria-level={2}>
          {title}
        </span>
        <span className="collapsible-card__summary-side">
          {meta ? <span className="collapsible-card__meta">{meta}</span> : null}
          <span className="collapsible-card__state" aria-hidden="true">
            {open ? 'Collapse' : 'Expand'}
          </span>
          <span className="collapsible-card__chevron" aria-hidden="true">
            ▼
          </span>
        </span>
      </summary>
      <div className="collapsible-card__body">{children}</div>
    </details>
  );
}
