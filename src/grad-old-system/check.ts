import type { RequestHandler } from "express";

import { GRAD_OLD_SYSTEM_HTTPS_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  CookieVerifySuccessResponse,
  EmptyObject,
} from "../typings.js";
import { IE_8_USER_AGENT, cookies2Header } from "../utils/index.js";

export const gradOldSystemCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const response = await fetch(
      `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/framework/userInfo_edit.jsp?winid=win6`,
      {
        headers: {
          Cookie: req.headers.cookie ?? cookies2Header(req.body.cookies),
          "User-Agent": IE_8_USER_AGENT,
        },
        redirect: "manual",
      },
    );

    if (response.status === 200) {
      const text = await response.text();

      if (
        text.includes("您登录后过长时间没有操作或您的用户名已经在别处登录！") ||
        text.startsWith("<script")
      )
        return res.json({
          success: true,
          valid: false,
        } as CookieVerifySuccessResponse);

      return res.json({
        success: true,
        valid: true,
      } as CookieVerifySuccessResponse);
    }

    return res.json({
      success: true,
      valid: false,
    } as CookieVerifySuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
