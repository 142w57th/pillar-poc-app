export function toFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

export function parseEnumValue<T extends string>(value: unknown, allowedValues: readonly T[]): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const candidate = String(value);
  return (allowedValues as readonly string[]).includes(candidate) ? (candidate as T) : undefined;
}
