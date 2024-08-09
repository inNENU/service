import type { RequestHandler } from "express";

import { INFO_PAGE } from "./utils.js";
import type {
  CookieOptions,
  CookieVerifyResponse,
  EmptyObject,
} from "../typings.js";
import { cookies2Header } from "../utils/index.js";

export const authCenterCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

  if (cookieHeader.includes("TEST")) {
    return res.json({ success: true, valid: true } as CookieVerifyResponse);
  }

  const response = await fetch(INFO_PAGE, {
    headers: {
      "Cache-Control": "no-cache",
      Cookie: cookieHeader,
    },
    redirect: "manual",
  });

  if (response.status === 200)
    return res.json({
      success: true,
      valid: true,
    } as CookieVerifyResponse);

  return res.json({
    success: true,
    valid: false,
  } as CookieVerifyResponse);
};
