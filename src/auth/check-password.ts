import { authEncrypt } from "./encrypt.js";
import { RESET_PREFIX, RESET_SALT } from "./utils.js";
import { UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";

export interface CheckPasswordOptions {
  type: "check-password";
  sign: string;
  password: string;
}

interface RawCheckPasswordSuccessResponse {
  code: "0";
  datas: {
    rules: Record<string, boolean>;
  };
  message: "SUCCESS";
}

interface RawCheckPasswordFailResponse {
  code: unknown;
  message: string;
}

type RawCheckPasswordResponse =
  | RawCheckPasswordSuccessResponse
  | RawCheckPasswordFailResponse;

export type CheckPasswordResponse =
  | CommonSuccessResponse
  | CommonFailedResponse;

export const checkPassword = async (
  { sign, password }: CheckPasswordOptions,
  cookieHeader: string,
  operationSource: number,
): Promise<CheckPasswordResponse> => {
  const response = await fetch(`${RESET_PREFIX}/common/passwordScoreCheck`, {
    method: "POST",
    headers: {
      host: "authserver.nenu.edu.cn",
      "sec-ch-ua-platform": '"Windows"',
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "content-type": "application/json",
      dnt: "1",
      "sec-ch-ua-mobile": "?0",
      origin: "https://authserver.nenu.edu.cn",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer:
        "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      sign,
      password: authEncrypt(password, RESET_SALT),
      operationSource,
    }),
  });

  const data = (await response.json()) as RawCheckPasswordResponse;

  if (data.code !== "0" || data.message !== "SUCCESS")
    return UnknownResponse(data.message);

  const warnings = Object.entries(
    (data as RawCheckPasswordSuccessResponse).datas.rules,
  )
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (warnings.length > 0)
    return UnknownResponse(`密码不满足要求: ${warnings.join(", ")}`);

  return {
    success: true,
    data: {},
  };
};
