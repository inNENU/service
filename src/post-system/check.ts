import type { RequestHandler } from "express";

import { HTTPS_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  CookieVerifySuccessResponse,
  EmptyObject,
} from "../typings.js";
import { IE_8_USER_AGENT, cookies2Header } from "../utils/index.js";

export const postSystemCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const response = await fetch(
      `${HTTPS_SERVER}/framework/userInfo_edit.jsp?winid=win6`,
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
        text.startsWith("<script languge='javascript'>")
      )
        return res.json(<CookieVerifySuccessResponse>{
          success: true,
          valid: false,
        });

      return res.json(<CookieVerifySuccessResponse>{
        success: true,
        valid: true,
      });
    }

    return res.json(<CookieVerifySuccessResponse>{
      success: true,
      valid: false,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
