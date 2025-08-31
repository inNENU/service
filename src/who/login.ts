import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { request } from "@/utils/index.js";

import {
  WHO_AUTH_URL,
  WHO_HOMEPAGE,
  WHO_SERVER,
  WHO_SERVICE,
} from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import {
  MissingCredentialResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  UnknownResponse,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  LoginOptions,
} from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { vpnCASLogin } from "../vpn/index.js";

export interface WhoLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type WhoLoginFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type WhoLoginResult = WhoLoginSuccessResult | WhoLoginFailedResponse;

export const whoLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<WhoLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  // const whoMainResponse = await fetch(WHO_SERVER, {
  //   headers: {
  //     Cookie: cookieStore.getHeader(WHO_SERVER),
  //   },
  //   redirect: "manual",
  // });

  // cookieStore.applyResponse(whoMainResponse, WHO_SERVER);

  const whoAuthResponse = await fetch(WHO_AUTH_URL, {
    headers: {
      Cookie: cookieStore.getHeader(WHO_SERVER),
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(whoAuthResponse, WHO_AUTH_URL);

  console.log(whoAuthResponse.headers.getSetCookie());
  console.log(cookieStore.getHeader(WHO_SERVER));

  // const link1 = `https://who-443.webvpn.nenu.edu.cn/api/bd-sjmh/sy/queryParentDept?_t=${getWhoTime()}`;
  // const link2 = `https://who-443.webvpn.nenu.edu.cn/api/bd-sjmh/sy/queryDataScope?_t=${getWhoTime()}`;

  // const whoResponse1 = await fetch(link1, {
  //   headers: {
  //     Cookie: cookieStore.getHeader(WHO_SERVER),
  //   },
  //   redirect: "manual",
  // });
  // const whoResponse2 = await fetch(link2, {
  //   headers: {
  //     Cookie: cookieStore.getHeader(WHO_SERVER),
  //   },
  //   redirect: "manual",
  // });

  // cookieStore.applyResponse(whoResponse1, link1);
  // cookieStore.applyResponse(whoResponse2, link2);

  const result = await authLogin({
    ...options,
    service: WHO_SERVICE,
    webVPN: true,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  console.log(
    "location",
    result.location,
    cookieStore.getHeader(result.location),
  );

  const ticketUrl = result.location;
  const ticketResponse = await fetch(ticketUrl, {
    headers: {
      cookie: cookieStore.getHeader(ticketUrl),
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, ticketUrl);

  const finalLocation = ticketResponse.headers.get("Location");

  if (ticketResponse.status !== 302 || finalLocation !== WHO_HOMEPAGE) {
    console.error(
      "Login to Who failed",
      ticketResponse.status,
      await ticketResponse.text(),
    );

    return UnknownResponse("登录失败");
  }

  const finalResponse = await fetch(finalLocation, {
    headers: {
      Cookie: cookieStore.getHeader(finalLocation),
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(finalResponse, finalLocation);

  return {
    success: true,
    cookieStore,
  };
};

export interface WhoLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type WhoLoginResponse = WhoLoginSuccessResponse | WhoLoginFailedResponse;

export const loginToWho = request<
  WhoLoginResponse | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
>(async (req, res, next) => {
  if (!req.body) {
    return res.json(MissingCredentialResponse);
  }

  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await whoLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(WHO_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  return next();
});

export const whoLoginHandler = request<WhoLoginResponse, AccountInfo>(
  async (req, res) => {
    const result =
      // fake result for testing
      req.body.id === TEST_ID_NUMBER
        ? TEST_LOGIN_RESULT
        : await whoLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json({ success: true, cookies });
    }

    return res.json(result);
  },
);
