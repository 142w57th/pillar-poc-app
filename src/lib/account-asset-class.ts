export const ACCOUNT_TEMPLATE_CODES = {
  CRYPTO: "DIGITAL_ASSETS_STANDARD",
  EQUITY: "RETAIL_SELF_DIRECTED_STANDARD",
} as const;

export type AccountTemplateCode = (typeof ACCOUNT_TEMPLATE_CODES)[keyof typeof ACCOUNT_TEMPLATE_CODES];
export type CanonicalAssetClassCode = "CRYPTO" | "EQUITY";
export type CanonicalAssetClassLabel = "Crypto" | "Equity";

const ASSET_CLASS_LABELS: Record<CanonicalAssetClassCode, CanonicalAssetClassLabel> = {
  CRYPTO: "Crypto",
  EQUITY: "Equity",
};

function normalizeKey(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function toCanonicalAssetClassCode(value: string): CanonicalAssetClassCode | null {
  const normalized = normalizeKey(value);

  if (normalized === "CRYPTO" || normalized === ACCOUNT_TEMPLATE_CODES.CRYPTO) {
    return "CRYPTO";
  }

  if (normalized === "EQUITY" || normalized === ACCOUNT_TEMPLATE_CODES.EQUITY) {
    return "EQUITY";
  }

  return null;
}

export function toCanonicalAssetClassLabel(value: string): CanonicalAssetClassLabel | null {
  const assetClass = toCanonicalAssetClassCode(value);
  if (!assetClass) {
    return null;
  }
  return ASSET_CLASS_LABELS[assetClass];
}

export function toAccountTemplateCode(value: string): AccountTemplateCode | null {
  const assetClass = toCanonicalAssetClassCode(value);
  if (assetClass === "CRYPTO") {
    return ACCOUNT_TEMPLATE_CODES.CRYPTO;
  }
  if (assetClass === "EQUITY") {
    return ACCOUNT_TEMPLATE_CODES.EQUITY;
  }
  return null;
}
