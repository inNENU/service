import type { RequestHandler } from "express";

import { getActivateInfo } from "./get-info.js";
import type { ActivateSendSmsOptions } from "./send-sms.js";
import { sendActivateSms } from "./send-sms.js";
import type { ActivateSetPasswordOptions } from "./set-password.js";
import { setPassword } from "./set-password.js";
import type { ActivateValidationOptions } from "./validate-info.js";
import { validAccountInfo } from "./validate-info.js";
import type { ActivateValidSmsOptions } from "./validate-sms.js";
import { validateActivateSms } from "./validate-sms.js";
import { InvalidArgResponse } from "../../config/response.js";
import type { CommonFailedResponse, EmptyObject } from "../../typings.js";
import type { CheckPasswordOptions } from "../check-password.js";
import { checkPassword } from "../check-password.js";

export type ActivateOptions =
  | ActivateValidationOptions
  | ActivateSendSmsOptions
  | ActivateValidSmsOptions
  | CheckPasswordOptions
  | ActivateSetPasswordOptions;

export const activateHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ActivateOptions
> = async (req, res) => {
  try {
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
    } else {
      const options = req.body;

      if (!req.headers.cookie) throw new Error(`Cookie is missing!`);

      const cookieHeader = req.headers.cookie;

      if (options.type === "validate-info")
        return res.json(validAccountInfo(options, cookieHeader));

      if (options.type === "send-sms")
        return res.json(sendActivateSms(options, cookieHeader));

      if (options.type === "validate-sms")
        return res.json(validateActivateSms(options, cookieHeader));

      if (options.type === "check-password")
        return res.json(checkPassword(options, cookieHeader, 3));

      if (options.type === "set-password")
        return res.json(setPassword(options, cookieHeader));

      return InvalidArgResponse("type");
    }
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
