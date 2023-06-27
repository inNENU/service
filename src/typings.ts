import type { Cookie } from "set-cookie-parser";

export type EmptyObject = Record<never, never>;

export interface LoginOptions {
  /** 学号 */
  id: number;
  /** 密码 */
  password: string;
}

export interface CookieOptions {
  cookies: Cookie[];
}

export interface CommonFailedResponse {
  status: "failed";
  msg: string;
}
