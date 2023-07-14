import type { RequestHandler } from "express";

import { SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  CookieVerifySuccessResponse,
  EmptyObject,
} from "../typings.js";
import { getCookieHeader } from "../utils/cookie.js";
import { IE_8_USER_AGENT } from "../utils/ua.js";

export const underSystemCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const response = await fetch(
      `${SERVER}/framework/grxx_edit.jsp?winid=win2`,
      {
        headers: {
          Cookie: getCookieHeader(req.body.cookies),
          "User-Agent": IE_8_USER_AGENT,
        },
        redirect: "manual",
      },
    );

    if (response.status === 200) {
      const text = await response.text();

      if (text.includes("您登录后过长时间没有操作或您的用户名已经在别处登录！"))
        return res.json(<CookieVerifySuccessResponse>{
          success: true,
          status: "success",
          valid: false,
        });

      return res.json(<CookieVerifySuccessResponse>{
        success: true,
        status: "success",
        valid: true,
      });
    }

    return res.json(<CookieVerifySuccessResponse>{
      success: true,
      status: "success",
      valid: false,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      status: "failed",
      msg: message,
    });
  }
};
