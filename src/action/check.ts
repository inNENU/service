import type { RequestHandler } from "express";

import { ACTION_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  CookieVerifySuccessResponse,
  EmptyObject,
} from "../typings.js";
import { cookies2Header } from "../utils/index.js";

export const actionCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const response = await fetch(`${ACTION_SERVER}/page/getidentity`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: req.headers.cookie ?? cookies2Header(req.body.cookies),
      },
      redirect: "manual",
    });

    if (response.status === 200)
      try {
        const result = (await response.json()) as { success: boolean };

        return res.json({
          success: true,
          valid: result.success,
        } as CookieVerifySuccessResponse);
      } catch (err) {
        return res.json({
          success: true,
          valid: false,
        } as CookieVerifySuccessResponse);
      }

    return res.json({
      success: true,
      valid: false,
    } as CookieVerifySuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
