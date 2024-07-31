import { INFO_SALT } from "./utils.js";
import { UnknownResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { authEncrypt } from "../auth-encrypt.js";
import { RESET_PREFIX } from "../utils.js";

export interface ActivateCheckPasswordOptions {
  type: "check-password";
  sign: string;
  password: string;
}

interface RawCheckPasswordSuccessResponse {
  code: 0;
  message: "SUCCESS";
}

interface RawCheckPasswordFailResponse {
  code: unknown;
  message: string;
}

type RawCheckPasswordResponse =
  | RawCheckPasswordSuccessResponse
  | RawCheckPasswordFailResponse;

export type ActivateCheckPasswordResponse =
  | CommonSuccessResponse
  | CommonFailedResponse;

export const checkPassword = async (
  { sign, password }: ActivateCheckPasswordOptions,
  cookieHeader: string,
): Promise<ActivateCheckPasswordResponse> => {
  const response = await fetch(`${RESET_PREFIX}/common/passwordScoreCheck`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sign,
      password: authEncrypt(password, INFO_SALT),
      operationSource: 3,
    }),
  });

  const data = (await response.json()) as RawCheckPasswordResponse;

  if (data.code !== "0" || data.message !== "SUCCESS")
    return UnknownResponse(data.message);

  return {
    success: true,
    data: {},
  };
};
