import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
import {
  ActionFailType,
  MissingCredentialResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  unknownResponse,
} from "../config/index.js";
import type { AccountInfo, CommonFailedResponse, LoginOptions } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { vpnCASLogin } from "../vpn/index.js";
import { ACTION_443_SERVER, ACTION_LOGIN_ENDPOINT, ACTION_SERVER } from "./utils.js";

export interface ActionLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type ActionLoginResult =
  | ActionLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const actionLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<ActionLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const mainResponse = await fetch(ACTION_443_SERVER, {
    headers: {
      Cookie: cookieStore.getHeader(ACTION_443_SERVER),
    },
    redirect: "manual",
  });

  if (mainResponse.status !== 302) {
    console.error(
      "action login failed with unknown mainResponse",
      mainResponse.status,
      mainResponse,
      await mainResponse.text(),
    );

    return unknownResponse("未知错误");
  }

  cookieStore.applyResponse(mainResponse, ACTION_443_SERVER);

  // const mainLocation = mainResponse.headers.get("Location")!;

  // if (!mainLocation.startsWith(ACTION_MAIN_PAGE)) {
  //   console.error("action login failed with unknown main location", mainLocation);

  //   return unknownResponse("未知错误");
  // }

  const result = await authLogin({
    ...options,
    service: ACTION_LOGIN_ENDPOINT,
    webVPN: true,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  // https://m-443.webvpn.nenu.edu.cn/system/resource/code/auth/clogin.jsp?ticket=XXX
  if (!result.location.startsWith(ACTION_LOGIN_ENDPOINT)) {
    console.error("action login failed with unknown ticket location", result.location);

    return unknownResponse("unknown");
  }

  const ticket443Response = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticket443Response, result.location);

  if (ticket443Response.status !== 302) {
    console.error(
      "action login failed with unknown ticketResponse",
      ticket443Response.status,
      ticket443Response,
      await ticket443Response.text(),
    );

    return unknownResponse("unknown");
  }

  // https://m.webvpn.nenu.edu.cn/system/resource/code/auth/clogin.jsp?ticket=XXX
  const ticketLocation = ticket443Response.headers.get("Location")!;

  if (!ticketLocation.startsWith(ACTION_SERVER)) {
    console.error("action login failed with unknown ticketResponse location", ticketLocation);

    return unknownResponse("unknown");
  }

  const ticketResponse = await fetch(ticketLocation, {
    headers: {
      Cookie: cookieStore.getHeader(ticketLocation),
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, ticketLocation);

  if (ticketResponse.status !== 301) {
    console.error(
      "action login failed with unknown ticket",
      ticketResponse.status,
      ticketResponse,
      await ticketResponse.text(),
    );

    return unknownResponse("登录失败");
  }

  // https://m-443.webvpn.nenu.edu.cn/system/resource/code/auth/clogin.jsp
  const mainPageLocation = ticketResponse.headers.get("Location")!;

  if (mainPageLocation !== ACTION_LOGIN_ENDPOINT) {
    console.error("action login failed with unknown main page location", mainPageLocation);

    return unknownResponse("unknown");
  }

  const mainPageResponse = await fetch(mainPageLocation, {
    headers: {
      Cookie: cookieStore.getHeader(mainPageLocation),
      Referer: ticketLocation,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(mainPageResponse, mainPageLocation);

  if (mainPageResponse.status !== 302) {
    console.error(
      "action login failed with unknown pure action status code",
      mainPageResponse.status,
      mainPageResponse,
      await mainPageResponse.text(),
    );

    return unknownResponse("登录失败");
  }

  // https://m.webvpn.nenu.edu.cn/index.jsp?null
  const finalLocation = mainPageResponse.headers.get("Location")!;

  if (finalLocation !== `${ACTION_SERVER}/index.jsp?null`) {
    console.error("action login failed with unknown final location", finalLocation);

    return unknownResponse("unknown");
  }

  const finalResponse = await fetch(finalLocation, {
    headers: {
      Cookie: cookieStore.getHeader(finalLocation),
      Referer: mainPageLocation,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(finalResponse, finalLocation);
  console.log("step3");

  if (finalResponse.status !== 301) {
    console.error(
      "action login failed with unknown final status code",
      finalResponse.status,
      finalResponse,
      await finalResponse.text(),
    );

    return unknownResponse("登录失败");
  }

  // https://m-443.webvpn.nenu.edu.cn/index.jsp?null
  const final443Location = finalResponse.headers.get("Location")!;

  if (final443Location !== `${ACTION_443_SERVER}/index.jsp?null`) {
    console.error("action login failed with unknown final 443 location", final443Location);

    return unknownResponse("登录失败");
  }

  const final443Response = await fetch(final443Location, {
    headers: {
      Cookie: cookieStore.getHeader(final443Location),
      Referer: finalLocation,
    },
    redirect: "manual",
  });

  if (final443Response.status !== 200) {
    console.error(
      "action login failed with unknown action final status code",
      final443Response.status,
      final443Response,
      await final443Response.text(),
    );

    return unknownResponse("登录失败");
  }

  cookieStore.applyResponse(final443Response, final443Location);

  const content = await final443Response.text();

  if (!content.includes("融合门户")) {
    console.error("action login failed", content.slice(0, 200));

    return unknownResponse("登录失败");
  }

  const info = /pfs.comm.showDialog\("(.*?)",/u.exec(content)?.[1];

  if (info) {
    console.error("action login forbidden:", info);

    return {
      success: false,
      type: ActionFailType.Forbidden,
      msg: info,
    };
  }

  return {
    success: true,
    cookieStore,
  };
};

export interface ActionLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type ActionLoginFailedResponse = AuthLoginFailedResponse | VPNLoginFailedResponse;

export type ActionLoginResponse = ActionLoginSuccessResponse | ActionLoginFailedResponse;

export const loginToAction = request<
  ActionLoginFailedResponse | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
  // oxlint-disable-next-line typescript/consistent-return
>(async (req, res, next) => {
  if (!req.body) return res.json(MissingCredentialResponse);

  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await actionLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(ACTION_443_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  next();
});

export const actionLoginHandler = request<ActionLoginResponse, AccountInfo>(async (req, res) => {
  const result = req.body.id === TEST_ID_NUMBER ? TEST_LOGIN_RESULT : await actionLogin(req.body);

  if (result.success) {
    const cookies = result.cookieStore.getAllCookies().map((item) => item.toJSON());

    cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });

    return res.json({
      success: true,
      cookies,
    });
  }

  return res.json(result);
});
