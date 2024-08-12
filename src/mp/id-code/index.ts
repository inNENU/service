import type { RequestHandler } from "express";

import type { StoreAccountInfoOptions } from "./account.js";
import { storeStoreAccountInfo } from "./account.js";
import type { CheckIDCodeOptions } from "./check.js";
import { checkIDCode } from "./check.js";
import type { EmptyObject } from "../../typings.js";

export const idCodeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  StoreAccountInfoOptions | CheckIDCodeOptions
> = async (req, res) => {
  if ("uuid" in req.body) return res.json(await checkIDCode(req.body));

  return res.json(await storeStoreAccountInfo(req.body));
};
