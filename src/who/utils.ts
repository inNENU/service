export const WHO_SERVER = "https://who-443.webvpn.nenu.edu.cn";
export const WHO_SERVICE = "https://who.nenu.edu.cn/shiro-cas";
export const WHO_HOMEPAGE = "https://who-443.webvpn.nenu.edu.cn/#/index";
export const WHO_AUTH_URL = `https://who-443.webvpn.nenu.edu.cn/auth?service=${encodeURIComponent(WHO_SERVER + "/#/index")}`;
export const getWhoTime = (): number => Math.round(new Date().getTime() / 1000);
