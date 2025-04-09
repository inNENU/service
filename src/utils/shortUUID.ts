import { v7 } from "uuid";

const CUSTOM_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export const getShortUUID = (uuid?: string): string => {
  // Generate a random UUID if not provided
  uuid ??= v7();

  // Remove dashes from UUID
  const hex = uuid.replace(/-/g, "");
  // Generate 8 bit BigInt
  let bigInt = BigInt("0x" + hex);

  // 转换为 64 进制字符串
  let shortUUID = "";

  while (bigInt > 0) {
    const index = Number(bigInt % 64n);

    shortUUID = CUSTOM_CHARS[index] + shortUUID;
    bigInt = bigInt / 64n;
  }

  while (shortUUID.length < 24) shortUUID = "A" + shortUUID;

  return shortUUID;
};
