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
  status: "success";
}

export interface SelectBaseFailedResponse {
  status: "failed";
  /** 错误信息 */
  msg: string;
}
