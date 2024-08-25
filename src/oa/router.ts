import { Router } from "express";

import { oaCheckHandler } from "./check.js";
import { emailApplyHandler } from "./email-apply.js";
import { oaInfoHandler } from "./info.js";
import { loginToOA, oaLoginHandler } from "./login.js";

const oaRouter = Router();

// These are the routes that don't require login
oaRouter.post("/login", oaLoginHandler);
oaRouter.post("/check", oaCheckHandler);

oaRouter.use(loginToOA);

oaRouter.post("/email-apply", emailApplyHandler);
oaRouter.post("/info", oaInfoHandler);

export { oaRouter };
