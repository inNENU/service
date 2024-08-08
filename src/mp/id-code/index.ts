import type { RequestHandler } from "express";

import type { StoreAccountInfoOptions } from "./account.js";
import { storeStoreAccountInfo } from "./account.js";
import type { StoreAdmissionInfoOptions } from "./admission.js";
import { storeStoreAdmissionInfo } from "./admission.js";
import type { GetInfoOptions } from "./getInfo.js";
import { getInfo } from "./getInfo.js";
import type { EmptyObject } from "../../typings.js";

export const idCodeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  StoreAdmissionInfoOptions | StoreAccountInfoOptions | GetInfoOptions
> = async (req, res) => {
  if ("uuid" in req.body) return res.json(await getInfo(req.body));

  if ("name" in req.body) return await storeStoreAdmissionInfo(req.body);

  return res.json(await storeStoreAccountInfo(req.body));
};
