import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { sendReAuthSMS } from "./send-sms.js";
import { verifyReAuthCaptcha } from "./verify.js";
import { InvalidArgResponse, UnknownResponse } from "../../config/index.js";
import type { EmptyObject } from "../../typings.js";

export interface ReAuthSmsOptions {
  type: "sms";
  /** 学号 */
  id: string;
  cookie?: CookieType[];
}

export interface ReAuthVerifyOptions {
  type: "verify";
  /** 短信验证码 */
  smsCode: string;
  cookie?: CookieType[];
}

export type ReAuthOptions = ReAuthSmsOptions | ReAuthVerifyOptions;

export const reAuthHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ReAuthOptions
> = async (req, res) => {
  try {
    const cookieHeader = req.body.cookie
      ? req.body.cookie.map(({ name, value }) => `${name}=${value}`).join("; ")
      : req.headers.cookie;

    if (!cookieHeader) throw new Error("Cookie not found");

    if (req.method === "GET") {
      const id = req.query.id as string;

      if (!id) return InvalidArgResponse("id");

      return res.json(await sendReAuthSMS(cookieHeader, id));
    }

    if ("id" in req.body) {
      return res.json(await sendReAuthSMS(cookieHeader, req.body.id));
    }

    const smsCode = req.body.smsCode;

    if (!smsCode) return InvalidArgResponse("id or smsCode");

    const result = await verifyReAuthCaptcha(cookieHeader, smsCode);

    if (result.success) {
      result.cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
