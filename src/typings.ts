import type { CookieType } from "@mptool/net";

export type EmptyObject = Record<never, never>;

export interface AccountInfo {
  /** 学号 */
  id: number;
  /** 密码 */
  password: string;
}

export type LoginOptions = Partial<AccountInfo>;

export interface CookieOptions {
  cookies: CookieType[];
}

export interface CommonSuccessResponse<T = EmptyObject> {
  success: true;
  data: T;
}

export interface CommonListSuccessResponse<T = EmptyObject> {
  success: true;
  data: T;
  current: number;
  total: number;
}

export interface CommonFailedResponse {
  success: false;
  msg: string;
}

export interface CookieVerifySuccessResponse {
  success: true;
  valid: boolean;
}

export type CookieVerifyResponse =
  | CookieVerifySuccessResponse
  | CommonFailedResponse;
