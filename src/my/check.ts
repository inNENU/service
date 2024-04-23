import type { RequestHandler } from "express";

import { MY_SERVER } from "./utils.js";
import type {
  CookieOptions,
  CookieVerifySuccessResponse,
  EmptyObject,
} from "../typings.js";
import { cookies2Header } from "../utils/index.js";

export const myCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  const identityResponse = await fetch(`${MY_SERVER}/hallIndex/getidentity`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: req.headers.cookie ?? cookies2Header(req.body.cookies),
    },
  });

  try {
    const identityResult = (await identityResponse.json()) as {
      success: boolean;
    };

    return res.json({
      success: true,
      valid: identityResult.success,
    } as CookieVerifySuccessResponse);
  } catch (err) {
    return res.json({
      success: true,
      valid: false,
    } as CookieVerifySuccessResponse);
  }
};
