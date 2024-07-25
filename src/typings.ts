import type { CookieType } from "@mptool/net";

import type { ActionFailType } from "./config/index.js";

export type EmptyObject = Record<never, never>;

export interface AccountInfo {
  /** 学号 */
  id: number;
  /** 密码 */
  password: string;
  authToken: string;
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

export interface CommonFailedResponse<
  T extends ActionFailType = ActionFailType.Unknown,
> {
  success: false;
  type: T;
  msg: string;
}

export interface CookieVerifyResponse {
  success: true;
  valid: boolean;
}
