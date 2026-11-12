import Callout from "./Callout";

/** Form-level failure message (one callout, role="alert"). Plain words only, never a raw backend string. */
export default function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Callout tone="error">{message}</Callout>;
}
