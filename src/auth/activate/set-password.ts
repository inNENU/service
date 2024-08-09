import { UnknownResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { authEncrypt } from "../encrypt.js";
import { RESET_PREFIX, RESET_SALT } from "../utils.js";

export interface ActivateSetPasswordOptions {
  type: "set-password";
  sign: string;
  password: string;
}

interface RawSetPasswordSuccessResponse {
  code: 0;
  success: true;
}

interface RawSetPasswordFailResponse {
  code: unknown;
  success: false;
  message: string;
}

type RawSetPasswordResponse =
  | RawSetPasswordSuccessResponse
  | RawSetPasswordFailResponse;

export type ActivateSetPasswordResponse =
  | CommonSuccessResponse
  | CommonFailedResponse;

export const setPassword = async (
  { sign, password }: ActivateSetPasswordOptions,
  cookieHeader: string,
): Promise<ActivateSetPasswordResponse> => {
  const response = await fetch(
    `${RESET_PREFIX}/accountActivation/initPassword`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sign,
        password: authEncrypt(password, RESET_SALT),
        confirmPassword: authEncrypt(password, RESET_SALT),
      }),
    },
  );

  const data = (await response.json()) as RawSetPasswordResponse;

  if (data.code !== "0" || !data.success)
    return UnknownResponse((data as RawSetPasswordFailResponse).message);

  return {
    success: true,
    data: {},
  };
};
