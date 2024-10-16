import type { ActivateInfoResponse } from "./get-info.js";
import { getActivateInfo } from "./get-info.js";
import type {
  ActivateSendSmsOptions,
  ActivateSendSmsResponse,
} from "./send-sms.js";
import { sendActivateSms } from "./send-sms.js";
import type {
  ActivateSetPasswordOptions,
  ActivateSetPasswordResponse,
} from "./set-password.js";
import { setPassword } from "./set-password.js";
import type {
  ActivateValidationOptions,
  ActivateValidationResponse,
} from "./validate-info.js";
import { validAccountInfo } from "./validate-info.js";
import type {
  ActivateValidSmsOptions,
  ActivateValidSmsResponse,
} from "./validate-sms.js";
import { validateActivateSms } from "./validate-sms.js";
import {
  InvalidArgResponse,
  MissingCredentialResponse,
} from "../../config/index.js";
import { request } from "../../utils/index.js";
import type {
  CheckPasswordOptions,
  CheckPasswordResponse,
} from "../check-password.js";
import { checkPassword } from "../check-password.js";

export type ActivateOptions =
  | ActivateValidationOptions
  | ActivateSendSmsOptions
  | ActivateValidSmsOptions
  | CheckPasswordOptions
  | ActivateSetPasswordOptions;

export type ActivateResponse =
  | ActivateValidationResponse
  | ActivateInfoResponse
  | ActivateSendSmsResponse
  | ActivateValidSmsResponse
  | ActivateSetPasswordResponse
  | CheckPasswordResponse;

export const activateHandler = request<ActivateResponse, ActivateOptions>(
  async (req, res) => {
    if (req.method === "GET") {
      const response = await getActivateInfo();

      if ("cookieStore" in response) {
        const cookies = response.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        // @ts-expect-error: CookieStore is not serializable
        delete response.cookieStore;
      }

      return res.json(response);
    }

    if (!req.headers.cookie) return MissingCredentialResponse;

    const options = req.body;

    const cookieHeader = req.headers.cookie;

    if (options.type === "validate-info")
      return res.json(await validAccountInfo(options, cookieHeader));

    if (options.type === "send-sms")
      return res.json(await sendActivateSms(options, cookieHeader));

    if (options.type === "validate-sms")
      return res.json(await validateActivateSms(options, cookieHeader));

    if (options.type === "check-password")
      return res.json(await checkPassword(options, cookieHeader, 3));

    if (options.type === "set-password")
      return res.json(await setPassword(options, cookieHeader));

    return InvalidArgResponse("type");
  },
);
