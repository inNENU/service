import { Router } from "express";

import { validate } from "../utils/validate.js";
import { oaCheckHandler } from "./check.js";
import { emailApplyHandler } from "./email-apply.js";
import { oaInfoHandler } from "./info.js";
import { loginToOA, oaLoginHandler } from "./login.js";
import { emailApplySchema, oaLoginSchema } from "./schemas.js";

const oaRouter = Router();

// These are the routes that don't require login
oaRouter.post("/login", validate(oaLoginSchema), oaLoginHandler);
oaRouter.post("/check", oaCheckHandler);

oaRouter.use(loginToOA);

oaRouter.post("/email-apply", validate(emailApplySchema), emailApplyHandler);
oaRouter.post("/info", oaInfoHandler);

export { oaRouter };
