import type { RequestHandler } from "express";

import { MY_SERVER } from "./utils.js";
import type {
  CookieOptions,
  CookieVerifyResponse,
  EmptyObject,
} from "../typings.js";
import { cookies2Header } from "../utils/index.js";

export const myCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

  if (cookieHeader.includes("TEST"))
    return res.json({ success: true, valid: true } as CookieVerifyResponse);

  const identityResponse = await fetch(`${MY_SERVER}/hallIndex/getidentity`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
    },
  });

  try {
    const identityResult = (await identityResponse.json()) as {
      success: boolean;
    };

    return res.json({
      success: true,
      valid: identityResult.success,
    } as CookieVerifyResponse);
  } catch {
    return res.json({
      success: true,
      valid: false,
    } as CookieVerifyResponse);
  }
};
