export const AUTH_DOMAIN = "authserver.nenu.edu.cn";
export const AUTH_SERVER = `https://${AUTH_DOMAIN}`;
export const LOGIN_URL = `${AUTH_SERVER}/authserver/login`;

export const SALT_REGEXP =
  /input type="hidden" id="pwdEncryptSalt" value="([^"]+)" \/>/;
export const WEB_VPN_AUTH_DOMAIN = "authserver-443.webvpn.nenu.edu.cn";
export const WEB_VPN_AUTH_SERVER = `https://${WEB_VPN_AUTH_DOMAIN}`;
