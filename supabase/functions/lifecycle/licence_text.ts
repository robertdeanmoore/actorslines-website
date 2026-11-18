// Plain-English licence names for the licence-expiry emails (DEF: the email used to print the raw
// product code, e.g. "Your trial_30d licence expires..."). Pure, so node --test can run it.

const NAMES: Record<string, string> = {
  trial_30d: "30-day trial",
  single_play_6mo: "Single Play licence",
  unlimited_6mo: "Unlimited licence",
  group_member: "Group member licence",
  comp_rolling: "complimentary licence",
};

/** Name that reads after "Your ": never a raw product code; unknown codes fall back to "licence". */
export function licenceDisplayName(productCode: string | null | undefined): string {
  return (productCode && NAMES[productCode]) || "licence";
}
