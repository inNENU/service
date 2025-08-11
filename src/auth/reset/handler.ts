import { CookieStore } from "@mptool/net";

import type { ActionFailType } from "@/config/index.js";
import {
  InvalidArgResponse,
  MissingCredentialResponse,
} from "@/config/index.js";
import type { CommonFailedResponse } from "@/typings.js";
import { request } from "@/utils/index.js";

import type {
  CheckPasswordOptions,
  CheckPasswordResponse,
} from "../check-password.js";
import type {
  ResetPasswordGetInfoOptions,
  ResetPasswordGetInfoResponse,
} from "./get-info.js";
import type {
  ResetPasswordSetOptions,
  ResetPasswordSetResponse,
} from "./reset-password.js";
import type {
  ResetPasswordSendCodeOptions,
  ResetPasswordSendCodeResponse,
} from "./send-code.js";
import type {
  ResetPasswordVerifyCodeOptions,
  ResetPasswordVerifyCodeResponse,
} from "./validate-code.js";
import { checkPassword } from "../check-password.js";
import { getResetCaptcha } from "../reset-captcha.js";
import { getInfo } from "./get-info.js";
import { resetPassword } from "./reset-password.js";
import { sendCode } from "./send-code.js";
import { validateCode } from "./validate-code.js";

export type ResetPasswordOptions =
  | ResetPasswordGetInfoOptions
  | ResetPasswordSendCodeOptions
  | CheckPasswordOptions
  | ResetPasswordVerifyCodeOptions
  | ResetPasswordSetOptions;

export type ResetPasswordResponse =
  | ResetPasswordGetInfoResponse
  | ResetPasswordSendCodeResponse
  | CheckPasswordResponse
  | ResetPasswordVerifyCodeResponse
  | ResetPasswordSetResponse
  | CommonFailedResponse<
      ActionFailType.InvalidArg | ActionFailType.MissingCredential
    >;

export const resetPasswordHandler = request<
  ResetPasswordResponse,
  ResetPasswordOptions
>(async (req, res) => {
  if (req.method === "GET") {
    // 第一步：访问重置密码主页面获取初始cookie
    const pageResponse = await fetch(
      "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      {
        method: "GET",
        headers: {
          host: "authserver.nenu.edu.cn",
          "cache-control": "max-age=0",
          "sec-ch-ua":
            '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          dnt: "1",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "navigate",
          "sec-fetch-user": "?1",
          "sec-fetch-dest": "document",
          referer: "https://authserver.nenu.edu.cn/authserver/login",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
          priority: "u=0, i",
        },
      },
    );

    const cookieStore = new CookieStore();

    cookieStore.applyResponse(pageResponse, "https://authserver.nenu.edu.cn");

    const cookieHeader = cookieStore.getHeader(
      "https://authserver.nenu.edu.cn",
    );

    // 第二步：进行必要的API初始化调用
    // 定义完整的API请求headers
    const apiHeaders = {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "content-type": "application/json",
      dnt: "1",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      origin: "https://authserver.nenu.edu.cn",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer:
        "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      priority: "u=1, i",
      cookie: cookieHeader,
    };

    // getLanguageTypes
    await fetch(
      "https://authserver.nenu.edu.cn/retrieve-password/language/getLanguageTypes",
      {
        method: "POST",
        headers: apiHeaders,
        body: "{}",
      },
    );

    // getStaticLanguageData

    await fetch(
      "https://authserver.nenu.edu.cn/retrieve-password/language/getStaticLanguageData",
      {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          type: "CIAP_RETRIEVE",
          languageKey: "zh_CN",
        }),
      },
    );

    // getConsoleConfig calls

    await fetch(
      "https://authserver.nenu.edu.cn/retrieve-password/common/getConsoleConfig",
      {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          type: "retrievePasswordPageStyle",
        }),
      },
    );

    await fetch(
      "https://authserver.nenu.edu.cn/retrieve-password/common/getConsoleConfig",
      {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          type: "aliasBlackEnable,accountAppealEnable",
        }),
      },
    );

    // tenant/info (GET请求，去掉content-type)
    const getHeaders = {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      dnt: "1",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      origin: "https://authserver.nenu.edu.cn",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer:
        "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      priority: "u=1, i",
      cookie: cookieHeader,
    };

    await fetch(
      "https://authserver.nenu.edu.cn/retrieve-password/tenant/info?type=1",
      {
        method: "GET",
        headers: getHeaders,
      },
    );

    // getRealPersonEnable (GET请求，去掉content-type)
    await fetch(
      "https://authserver.nenu.edu.cn/retrieve-password/realPersonAuth/getRealPersonEnable?authScenes=1",
      {
        method: "GET",
        headers: getHeaders,
      },
    );

    // 第三步：获取验证码（使用初始化后的cookie）
    const result = await getResetCaptcha(cookieStore);

    if ("cookieStore" in result) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      // @ts-expect-error: cookieStore is not needed
      delete result.cookieStore;
    }

    return res.json(result);
  }

  const cookieHeader = req.headers.cookie;
  const options = req.body;

  if (!cookieHeader) return res.json(MissingCredentialResponse);

  if (options.type === "get-info") {
    return res.json(await getInfo(options, cookieHeader));
  }

  if (options.type === "send-code") {
    return res.json(await sendCode(options, cookieHeader));
  }

  if (options.type === "validate-code") {
    return res.json(await validateCode(options, cookieHeader));
  }

  if (options.type === "check-password") {
    return res.json(await checkPassword(options, cookieHeader, 1));
  }

  if (options.type === "reset-password") {
    return res.json(await resetPassword(options, cookieHeader));
  }

  return res.json(InvalidArgResponse("options"));
});
