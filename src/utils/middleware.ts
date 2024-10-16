import type {
  NextFunction,
  ParamsDictionary,
  Query,
  Request,
  RequestHandler,
  Response,
} from "express-serve-static-core";
import type { ParsedQs } from "qs";

import type { EmptyObject } from "../typings.js";

export type CustomRequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
  res: Response<ResBody, LocalsObj>,
  next: NextFunction,
) => unknown;

export const request =
  <
    ResBody = unknown,
    ReqBody = EmptyObject,
    ReqQuery = Query,
    Params = ParamsDictionary,
    Locals extends Record<string, unknown> = EmptyObject,
  >(
    handler: CustomRequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>,
  ): RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals> =>
  async (req, res, next) => {
    try {
      await handler(req, res, next);

      return;
    } catch (err) {
      next(err);
    }
  };
