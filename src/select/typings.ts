import type { CommonFailedResponse } from "../typings";

export interface SelectBaseOptions {
  /**
   * Cookie
   */
  cookies: string[];
  /**
   * 服务器地址
   */
  server: string;
}

export interface SelectBaseSuccessResponse {
  success: true;
}

export type SelectBaseFailedResponse = CommonFailedResponse;
