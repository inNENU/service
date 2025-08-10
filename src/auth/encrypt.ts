import AES from "crypto-js/aes.js";
import Utf8 from "crypto-js/enc-utf8.js";
import Pkcs7 from "crypto-js/pad-pkcs7.js";

import { request } from "@/utils/index.js";

import type { CommonSuccessResponse } from "../typings.js";

const DICT = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
const DICT_LENGTH = DICT.length;

const getRandomString = (length: number): string =>
  Array(length)
    .fill(null)
    .map(() => DICT.charAt(Math.floor(Math.random() * DICT_LENGTH)))
    .join("");

export const authEncrypt = (password: string, key: string): string => {
  const CONTENT = getRandomString(64) + password;
  const SECRET_KEY = Utf8.parse(key);
  const SECRET_IV = Utf8.parse(getRandomString(16));

  return AES.encrypt(CONTENT.trim(), SECRET_KEY, {
    iv: SECRET_IV,
    padding: Pkcs7,
  }).toString();
};

export interface AuthEncryptOptions {
  password: string;
  salt: string;
}

export const authEncryptHandler = request<
  CommonSuccessResponse<string>,
  AuthEncryptOptions
>((req, res) =>
  res.json({
    success: true,
    data: authEncrypt(req.body.password, req.body.salt),
  }),
);
