import React from 'react';

import type { JSX } from 'react';

export type StatCardProps = { label: string; value: string | number };

export function StatCard({ label, value }: StatCardProps): JSX.Element {
  return (
    <article>
      <h2>{label}</h2>
      <p>{value}</p>
    </article>
  );
}
