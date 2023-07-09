import type { RequestHandler } from "express";

import type { AuthLoginFailedResponse } from "../auth/login.js";
import type { CookieOptions, EmptyObject } from "../typings.js";
import { getCookieHeader } from "../utils/cookie.js";

export const underSystemCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const response = await fetch(
      "https://dsjx.webvpn.nenu.edu.cn/framework/main.jsp",
      {
        headers: {
          Cookies: getCookieHeader(req.body.cookies),
        },
      },
    );

    if (response.status === 200)
      return res.json({
        status: "success",
        type: "valid",
      });

    return res.json({
      status: "success",
      type: "invalid",
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResponse>{
      status: "failed",
      msg: message,
    });
  }
};
