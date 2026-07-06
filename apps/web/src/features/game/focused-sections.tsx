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
  const [activeSection, setActiveSection] = useState(fallbackSectionId);
  const sectionIds = useMemo(() => new Set(sections.map((section) => section.id)), [sections]);

  useEffect(() => {
    function resolveSectionFromHash() {
      const hash = window.location.hash.replace('#', '');
      setActiveSection(sectionIds.has(hash) ? hash : fallbackSectionId);
    }

    resolveSectionFromHash();
    window.addEventListener('hashchange', resolveSectionFromHash);

    return () => window.removeEventListener('hashchange', resolveSectionFromHash);
  }, [fallbackSectionId, sectionIds]);

  const activeLabel = sections.find((section) => section.id === activeSection)?.label ?? label;

  return (
    <div className="focused-sections">
      <p className="dashboard-section-focus">Showing {activeLabel}.</p>
      {Children.map(children, (child) => {
        if (!isValidElement<FocusedSectionElementProps>(child)) {
          return child;
        }

        const childId = child.props.id;
        if (!childId || !sectionIds.has(childId)) {
          return child;
        }

        return cloneElement(child as ReactElement<FocusedSectionElementProps>, {
          hidden: childId !== activeSection,
          className: classNames(child.props.className, 'focused-section'),
        });
      })}
    </div>
  );
}
