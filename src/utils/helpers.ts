export const isNumber = (value: unknown): value is number =>
  typeof value === "number";

export const isString = (value: unknown): value is string =>
  typeof value === "string";

export const isPlainObject = (value: unknown): value is Record<string, any> =>
  Object.prototype.toString.call(value) === "[object Object]";
