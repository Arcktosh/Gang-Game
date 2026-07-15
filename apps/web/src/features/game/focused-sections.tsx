'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type FocusedSectionItem = {
  id: string;
  label: string;
};

type FocusedSectionElementProps = {
  id?: string;
  className?: string;
  hidden?: boolean;
};

function classNames(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ');
}

export function FocusedSections({
  sections,
  children,
  label = 'section',
}: {
  sections: readonly FocusedSectionItem[];
  children: ReactNode;
  label?: string;
}) {
  const fallbackSectionId = sections[0]?.id ?? '';
  const sectionIds = useMemo(() => new Set(sections.map((section) => section.id)), [sections]);
  const sectionLabels = useMemo(
    () => new Map(sections.map((section) => [section.id, section.label])),
    [sections],
  );
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(fallbackSectionId ? [fallbackSectionId] : []),
  );

  useEffect(() => {
    function revealSectionFromHash() {
      const hash = window.location.hash.replace('#', '');
      const targetId = sectionIds.has(hash) ? hash : fallbackSectionId;

      if (!targetId) {
        return;
      }

      setOpenSections((current) => {
        if (current.has(targetId)) {
          return current;
        }

        const next = new Set(current);
        next.add(targetId);
        return next;
      });

      if (hash) {
        window.requestAnimationFrame(() => {
          document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
        });
      }
    }

    revealSectionFromHash();
    window.addEventListener('hashchange', revealSectionFromHash);

    return () => window.removeEventListener('hashchange', revealSectionFromHash);
  }, [fallbackSectionId, sectionIds]);

  function updateSection(sectionId: string, open: boolean) {
    setOpenSections((current) => {
      const next = new Set(current);

      if (open) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }

      return next;
    });
  }

  return (
    <div className="focused-sections">
      <p className="dashboard-section-focus">
        Expand one or more {label}s below. Direct page links automatically open their target.
      </p>
      {Children.map(children, (child) => {
        if (!isValidElement<FocusedSectionElementProps>(child)) {
          return child;
        }

        const childId = child.props.id;
        if (!childId || !sectionIds.has(childId)) {
          return child;
        }

        const open = openSections.has(childId);
        const sectionLabel = sectionLabels.get(childId) ?? label;

        return (
          <details
            className="collapsible-section"
            key={childId}
            onToggle={(event) => updateSection(childId, event.currentTarget.open)}
            open={open}
          >
            <summary className="collapsible-section__summary">
              <span>{sectionLabel}</span>
              <span className="collapsible-section__state" aria-hidden="true">
                {open ? 'Collapse' : 'Expand'}
              </span>
            </summary>
            <div className="collapsible-section__body">
              {cloneElement(child as ReactElement<FocusedSectionElementProps>, {
                hidden: false,
                className: classNames(child.props.className, 'focused-section'),
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
