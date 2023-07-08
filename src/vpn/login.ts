import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import {
  EDGE_USER_AGENT_HEADERS,
  getCookieHeader,
  getCookies,
} from "../utils/index.js";

const authenticityTokenRegExp =
  /<input\s+type="hidden"\s+name="authenticity_token" value="(.*?)" \/>/;

export interface VPNLoginSuccessResponse {
  status: "success";
  cookies: Cookie[];
}

export interface VPNLoginFailedResponse extends CommonFailedResponse {
  type: "locked" | "wrong" | "unknown";
}

export type VPNLoginResponse = VPNLoginSuccessResponse | VPNLoginFailedResponse;

export const VPN_SERVER = "https://webvpn.nenu.edu.cn";

const COMMON_HEADERS = {
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  ...EDGE_USER_AGENT_HEADERS,
};

export const vpnLogin = async ({
  id,
  password,
}: LoginOptions): Promise<VPNLoginResponse> => {
  const url = `${VPN_SERVER}/users/sign_in`;

  const loginPageResponse = await fetch(url, {
    headers: COMMON_HEADERS,
  });

  const initialCookies = getCookies(loginPageResponse);

  console.log("Getting cookie:", initialCookies);

  const content = await loginPageResponse.text();

  const authenticityToken = authenticityTokenRegExp.exec(content)![1];

  const params = {
    utf8: "✓",
    authenticity_token: authenticityToken,
    "user[login]": id.toString(),
    "user[password]": password,
    "user[dymatice_code]": "unknown",
    "user[otp_with_capcha]": "false",
    commit: "登录 Login",
  };

  console.log("Params", params);

  const body = new URLSearchParams(params).toString();

  const loginResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: getCookieHeader(initialCookies),
    },
    body,
    redirect: "manual",
  });

  const location = loginResponse.headers.get("Location");

  initialCookies.push(...getCookies(loginResponse));

  console.log(`Request ends with ${loginResponse.status}`, location);
  console.log("Login cookies:", initialCookies);

  if (loginResponse.status === 302)
    if (location === `${VPN_SERVER}/vpn_key/update`) {
      const keyResponse = await fetch(`${VPN_SERVER}/vpn_key/update`, {
        headers: {
          Cookie: getCookieHeader([
            ...initialCookies,
            ...getCookies(loginResponse),
          ]),
        },
      });

      const cookies = getCookies(keyResponse);

      const webVpnCookies = [
        cookies.find(({ name }) => name === "_webvpn_key")!,
        cookies.find(({ name }) => name === "webvpn_username")!,
      ];

      return {
        status: "success",
        cookies: webVpnCookies,
      };
    }

  if (loginResponse.status === 200) {
    const response = await loginResponse.text();

    if (response.includes("用户名或密码错误, 超过五次将被锁定。"))
      return {
        status: "failed",
        type: "wrong",
        msg: "用户名或密码错误, 超过五次将被锁定。",
      };

    if (response.includes("您的帐号已被锁定, 请在十分钟后再尝试。"))
      return {
        status: "failed",
        type: "locked",
        msg: "您的帐号已被锁定, 请在十分钟后再尝试。",
      };
  }

  console.error("Unknown status", loginResponse.status);
  console.error("Response", await loginResponse.text());

  return {
    status: "failed",
    type: "unknown",
    msg: "未知错误",
  };
};

export const vpnLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = await vpnLogin({ id, password });

    return res.json(data);
  } catch (err) {
    return res.json(<VPNLoginFailedResponse>{
      status: "failed",
      msg: "参数错误",
    });
  }
};
