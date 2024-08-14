import type { RequestHandler } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";

import type { EmptyObject } from "../typings";

export const middleware = <
  ResBody = unknown,
  ReqBody = EmptyObject,
  ReqQuery = Query,
  Params = ParamsDictionary,
  Locals extends Record<string, unknown> = EmptyObject,
>(
  handler: RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>,
): RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals> => handler;
