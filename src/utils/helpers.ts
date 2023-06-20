export const isNumber = (value: unknown): value is number =>
  typeof value === "number";

export const isString = (value: unknown): value is string =>
  typeof value === "string";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isPlainObject = <T extends Record<string, any>>(
  value: unknown
): value is T => Object.prototype.toString.call(value) === "[object Object]";
