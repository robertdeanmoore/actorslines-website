import type { ReactNode } from "react";
import LinkButton from "./LinkButton";

export interface PricingProduct {
  name: string;
  price?: ReactNode;
  period?: string;
  included: string[];
  cta: { label: string; to?: string; href?: string };
  smallPrint?: ReactNode;
  /** Shows a "Best value" badge above the name. */
  bestValue?: boolean;
  /** Discount line under the price, e.g. "Returning customers: £1 off". Text comes from the caller; no prices live here. */
  discountLine?: ReactNode;
}

export interface PricingCardProps {
  product: PricingProduct;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

function CheckIcon() {
  return (
    <svg
      className="al-pricing__check"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

export default function PricingCard({ product, headingLevel = 3, className }: PricingCardProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div className={className ? `al-pricing ${className}` : "al-pricing"}>
      {product.bestValue ? <p className="al-pricing__badge">Best value</p> : null}
      <Heading className="al-pricing__name">{product.name}</Heading>
      {product.price !== undefined ? (
        <p className="al-pricing__price">{product.price}</p>
      ) : (
        <p className="al-pricing__price-tba">Price to be announced</p>
      )}
      {product.period ? <p className="al-pricing__period">{product.period}</p> : null}
      {product.discountLine ? <p className="al-pricing__discount">{product.discountLine}</p> : null}
      <ul className="al-pricing__list">
        {product.included.map((item) => (
          <li key={item} className="al-pricing__item">
            <CheckIcon />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="al-pricing__cta">
        {product.cta.to !== undefined ? (
          <LinkButton variant="primary" block to={product.cta.to}>
            {product.cta.label}
          </LinkButton>
        ) : (
          <LinkButton variant="primary" block href={product.cta.href as string}>
            {product.cta.label}
          </LinkButton>
        )}
      </div>
      {product.smallPrint ? <p className="al-pricing__small">{product.smallPrint}</p> : null}
    </div>
  );
}
