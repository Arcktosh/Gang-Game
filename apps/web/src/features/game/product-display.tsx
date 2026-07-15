import type { CSSProperties } from 'react';
import { getProductImageUrl } from '@/lib/product-images';

export function ProductImage({
  itemKey,
  name,
  imageAltText,
  imageUpdatedAt,
  compact = false,
}: {
  itemKey: string;
  name: string;
  imageAltText?: string | null;
  imageUpdatedAt?: string | Date | null;
  compact?: boolean;
}) {
  const fallback = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={`product-image${compact ? ' product-image--compact' : ''}`}>
      {imageUpdatedAt ? (
        <img
          alt={imageAltText?.trim() || `${name} product image`}
          decoding="async"
          loading="lazy"
          src={getProductImageUrl(itemKey, imageUpdatedAt)}
        />
      ) : (
        <span aria-label={`${name} has no uploaded image`} role="img">
          {fallback}
        </span>
      )}
    </div>
  );
}

export function SupplyDemandGraph({ supply, demand }: { supply: number; demand: number }) {
  const safeSupply = Math.max(0, Math.floor(supply));
  const safeDemand = Math.max(0, Math.floor(demand));
  const maximum = Math.max(1, safeSupply, safeDemand);
  const supplyWidth = safeSupply === 0 ? 0 : Math.max(2, Math.round((safeSupply / maximum) * 100));
  const demandWidth = safeDemand === 0 ? 0 : Math.max(2, Math.round((safeDemand / maximum) * 100));

  return (
    <figure className="supply-demand-graph">
      <figcaption>Local supply and demand</figcaption>
      <div
        aria-label={`Supply ${safeSupply}; demand ${safeDemand}`}
        className="supply-demand-graph__plot"
        role="img"
      >
        <div className="supply-demand-graph__row">
          <span>Supply</span>
          <div className="supply-demand-graph__track" aria-hidden="true">
            <span
              className="supply-demand-graph__bar supply-demand-graph__bar--supply"
              style={{ '--product-bar-width': `${supplyWidth}%` } as CSSProperties}
            />
          </div>
          <strong>{safeSupply}</strong>
        </div>
        <div className="supply-demand-graph__row">
          <span>Demand</span>
          <div className="supply-demand-graph__track" aria-hidden="true">
            <span
              className="supply-demand-graph__bar supply-demand-graph__bar--demand"
              style={{ '--product-bar-width': `${demandWidth}%` } as CSSProperties}
            />
          </div>
          <strong>{safeDemand}</strong>
        </div>
      </div>
    </figure>
  );
}
