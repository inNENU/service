import CryptoJS from "crypto-js";

const DICT = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
const DICT_LENGTH = DICT.length;

export const saltRegExp = /var pwdDefaultEncryptSalt = "(.*)";/;

const getRandomString = (length: number): string =>
  Array(length)
    .fill(null)
    .map(() => DICT.charAt(Math.floor(Math.random() * DICT_LENGTH)))
    .join("");

export const authEncrypt = (password: string, key: string): string => {
  const CONTENT = getRandomString(64) + password;
  const SECRET_KEY = CryptoJS.enc.Utf8.parse(key);
  const SECRET_IV = CryptoJS.enc.Utf8.parse(getRandomString(16));

  return CryptoJS.AES.encrypt(CONTENT, SECRET_KEY, {
    iv: SECRET_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};
