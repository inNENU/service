import type { RequestHandler } from "express";

import { UNDER_STUDY_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  CookieVerifySuccessResponse,
  EmptyObject,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS, cookies2Header } from "../utils/index.js";

export const underStudyCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const response = await fetch(UNDER_STUDY_SERVER, {
      headers: {
        Cookie: req.headers.cookie ?? cookies2Header(req.body.cookies),
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (response.status === 302) {
      const location = response.headers.get("location");

      if (location === `${UNDER_STUDY_SERVER}/new/welcome.page`)
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
