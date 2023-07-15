export interface CookieType {
  /**
   * cookie name
   */
  name: string;
  /**
   * cookie value
   */
  value: string;
  /**
   * cookie path
   */
  path?: string | undefined;
  /**
   * absolute expiration date for the cookie
   */
  expires?: Date | undefined;
  /**
   * relative max age of the cookie in seconds from when the client receives it (integer or undefined)
   * Note: when using with express's res.cookie() method, multiply maxAge by 1000 to convert to miliseconds
   */
  maxAge?: number | undefined;
  /**
   * domain for the cookie,
   * may begin with "." to indicate the named domain or any subdomain of it
   */
  domain?: string | undefined;
  /**
   * indicates that this cookie should only be sent over HTTPs
   */
  secure?: boolean | undefined;
  /**
   * indicates that this cookie should not be accessible to client-side JavaScript
   */
  httpOnly?: boolean | undefined;
  /**
   * indicates a cookie ought not to be sent along with cross-site requests
   */
  sameSite?: string | undefined;
}

export type EmptyObject = Record<never, never>;

export interface LoginOptions {
  /** 学号 */
  id: number;
  /** 密码 */
  password: string;
}

export interface CookieOptions {
  cookies: CookieType[];
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
