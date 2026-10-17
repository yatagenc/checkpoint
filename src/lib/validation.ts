/** Shared date checks; offset timestamps remain supported for existing records. */
export const isDateOnly = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const isTimestamp = (value: unknown): value is string =>
  typeof value === "string" &&
  isDateOnly(value.slice(0, 10)) &&
  value[10] === "T" &&
  Number.isFinite(Date.parse(value));
