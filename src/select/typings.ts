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
  /** @deprecated */
  status: "success";
}

export type SelectBaseFailedResponse = CommonFailedResponse;
