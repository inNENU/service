import type { RequestHandler } from "express";

import type {
  CommonFailedResponse,
  CookieOptions,
  CookieVerifySuccessResponse,
  EmptyObject,
} from "../typings.js";
import { getCookieHeader } from "../utils/cookie.js";
import { IE_8_USER_AGENT } from "../utils/ua.js";

export const actionCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const response = await fetch(
      "https://m-443.webvpn.nenu.edu.cn/page/getidentity",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Cookie: getCookieHeader(req.body.cookies),
          "User-Agent": IE_8_USER_AGENT,
        },
        redirect: "manual",
      },
    );

    if (response.status === 200) {
      try {
        const result = <{ success: boolean }>await response.json();

        if (result.success)
          return res.json(<CookieVerifySuccessResponse>{
            status: "success",
            valid: true,
          });
      } catch (err) {
        return res.json(<CookieVerifySuccessResponse>{
          status: "success",
          valid: false,
        });
      }

      return;
    }

    return res.json(<CookieVerifySuccessResponse>{
      status: "success",
      valid: false,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      status: "failed",
      msg: message,
    });
  }
};
