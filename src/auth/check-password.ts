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
      Cookie: cookieHeader,
      "Content-Type": "application/json",
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
