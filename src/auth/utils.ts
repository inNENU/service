import { isString } from "../utils/index.js";

export const AUTH_DOMAIN = "authserver.nenu.edu.cn";
export const AUTH_SERVER = `https://${AUTH_DOMAIN}`;
export const AUTH_LOGIN_URL = `${AUTH_SERVER}/authserver/login`;
export const AUTH_CAPTCHA_URL = `${AUTH_SERVER}/authserver/common/openSliderCaptcha.htl`;
export const AUTH_INDEX_URL = `${AUTH_SERVER}/authserver/index.do`;

export const RE_AUTH_URL = `${AUTH_SERVER}/authserver/reAuthCheck/reAuthLoginView.do?isMultifactor=true`;
export const RESET_PREFIX = `${AUTH_SERVER}/retrieve-password`;
export const RESET_SALT = "rjBFAaHsNkKAhpoi";
export const SALT_REGEXP =
  /input type="hidden" id="pwdEncryptSalt" value="([^"]+)" \/>/;
export const WEB_VPN_AUTH_DOMAIN = "authserver-443.webvpn.nenu.edu.cn";
export const WEB_VPN_AUTH_SERVER = `https://${WEB_VPN_AUTH_DOMAIN}`;
export const IMPROVE_INFO_URL = `${AUTH_SERVER}/authserver/improveInfo/improveUserInfo.do`;
export const UPDATE_INFO_URL = `${AUTH_SERVER}/authserver/improveInfo/updateUserInfo.do`;

export const isReAuthPage = (server: string, url: string | null): boolean =>
  isString(url) &&
  (url.startsWith(`${server}/authserver/reAuthCheck/reAuthSubmit.do`) ||
    url.startsWith(`${server}/authserver/reAuthCheck/reAuthLoginView.do`));
