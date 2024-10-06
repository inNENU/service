import type { RequestHandler } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";

import type { EmptyObject } from "../typings.js";

export const middleware =
  <
    ResBody = unknown,
    ReqBody = EmptyObject,
    ReqQuery = Query,
    Params = ParamsDictionary,
    Locals extends Record<string, unknown> = EmptyObject,
  >(
    handler: RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>,
  ): RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals> =>
  async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
