import type { RequestHandler } from "express";

import type { AuthInitInfoSuccessResult } from "./get-info.js";
import { TEST_AUTH_INIT_INFO, getAuthInitInfo } from "./get-info.js";
import type { InitAuthOptions, InitAuthResult } from "./init.js";
import { TEST_AUTH_INIT, initAuth } from "./init.js";
import { TEST_ID, UnknownResponse } from "../../config/index.js";
import type { EmptyObject } from "../../typings.js";

export type AuthInitInfoResponse = AuthInitInfoSuccessResult | InitAuthResult;

export const authInitHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  InitAuthOptions,
  { id: string }
> = async (req, res) => {
  try {
    if (req.method === "GET") {
      const id = req.query.id;

      const result =
        // Note: Return fake result for testing
        id === TEST_ID ? TEST_AUTH_INIT_INFO : await getAuthInitInfo(id);

      if (result.success) {
        const cookies = result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        return res.json({
          success: true,
          needCaptcha: result.needCaptcha,
          captcha: result.captcha,
          params: result.params,
          salt: result.salt,
        } as AuthInitInfoSuccessResult);
      }

      return res.json(result);
    }

    const cookieHeader = req.headers.cookie ?? "";

    // Note: Return fake result for testing
    if (cookieHeader.includes("TEST")) return res.json(TEST_AUTH_INIT);

    const result = await initAuth(req.body, cookieHeader);

    if ("cookieStore" in result) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      // @ts-expect-error: cookieStore is not a JSON-serializable object
      delete result.cookieStore;
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
