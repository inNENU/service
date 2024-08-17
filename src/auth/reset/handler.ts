import type { RequestHandler } from "express";

import type { ResetPasswordGetInfoOptions } from "./get-info.js";
import { getInfo } from "./get-info.js";
import type { ResetPasswordSetOptions } from "./reset-password.js";
import { resetPassword } from "./reset-password.js";
import type { ResetPasswordSendCodeOptions } from "./send-code.js";
import { sendCode } from "./send-code.js";
import type { ResetPasswordVerifyCodeOptions } from "./validate-code.js";
import { validateCode } from "./validate-code.js";
import { InvalidArgResponse } from "../../config/index.js";
import type { EmptyObject } from "../../typings.js";
import type { CheckPasswordOptions } from "../check-password.js";
import { checkPassword } from "../check-password.js";
import { getResetCaptcha } from "../reset-captcha.js";

export type ResetPasswordOptions =
  | ResetPasswordGetInfoOptions
  | ResetPasswordSendCodeOptions
  | CheckPasswordOptions
  | ResetPasswordVerifyCodeOptions
  | ResetPasswordSetOptions;

export const resetPasswordHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ResetPasswordOptions
> = async (req, res) => {
  if (req.method === "GET") {
    const result = await getResetCaptcha();

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

  const options = req.body;

  if (options.type === "get-info") {
    return res.json(await getInfo(options, req.headers.cookie!));
  }

  if (options.type === "send-code") {
    return res.json(await sendCode(options, req.headers.cookie!));
  }

  if (options.type === "validate-code") {
    return res.json(await validateCode(options, req.headers.cookie!));
  }

  if (options.type === "check-password") {
    return res.json(await checkPassword(options, req.headers.cookie!, 1));
  }

  if (options.type === "reset-password") {
    return res.json(await resetPassword(options, req.headers.cookie!));
  }

  return res.json(InvalidArgResponse("options"));
};
