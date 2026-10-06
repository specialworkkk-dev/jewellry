export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export function calculateDiscountedAmount(
  amount: number,
  type?: DiscountType | string,
  value?: number,
) {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const safeValue = Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
  const reduction = type === "PERCENTAGE"
    ? safeAmount * Math.min(safeValue, 100) / 100
    : type === "FIXED_AMOUNT"
      ? Math.min(safeValue, safeAmount)
      : 0;
  return Math.round((safeAmount - reduction) * 100) / 100;
}

export function discountLabel(type?: string, value?: number) {
  if (!value || value <= 0) return "";
  return type === "FIXED_AMOUNT"
    ? `₹${value.toLocaleString("en-IN")} off`
    : `${value}% off`;
}
