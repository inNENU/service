import { v7 } from "uuid";

const CUSTOM_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export const getShortUUID = (uuid = v7()): string => {
  // Remove dashes from UUID and convert hexadecimal to bytes
  const hex = uuid.replace(/-/g, "");
  const bytes: number[] = [];

  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, 2), 16));
  }

  // Convert bytes to custom Base64 representation
  let customBase64 = "";
  let i = 0;

  while (i < bytes.length) {
    const byte1 = bytes[i++];
    const byte2 = i < bytes.length ? bytes[i++] : 0;
    const byte3 = i < bytes.length ? bytes[i++] : 0;

    const char1 = CUSTOM_CHARS.charAt(byte1 >> 2);
    const char2 = CUSTOM_CHARS.charAt(((byte1 & 3) << 4) | (byte2 >> 4));
    const char3 = CUSTOM_CHARS.charAt(((byte2 & 15) << 2) | (byte3 >> 6));
    const char4 = CUSTOM_CHARS.charAt(byte3 & 63);

    customBase64 += char1 + char2 + char3 + char4;
  }

  // Return the first 22 characters of the custom Base64 string
  return customBase64.substring(0, 22);
};
