import { Router } from "express";

import { validate } from "../utils/validate.js";
import { gradInfoHandler } from "./info.js";
import { gradInformationHandler } from "./information.js";
import { gradSystemLoginHandler, loginToGradSystem } from "./login.js";
import { gradSystemInfoSchema, gradSystemLoginSchema } from "./schemas.js";

const gradRouter = Router();

// These are the routes that don't require login
gradRouter.post("/login", validate(gradSystemLoginSchema), gradSystemLoginHandler);
// TODO: Add /check route

gradRouter.use(loginToGradSystem);

gradRouter.post("/info", validate(gradSystemInfoSchema), gradInfoHandler);
gradRouter.post("/information", validate(gradSystemInfoSchema), gradInformationHandler);

export { gradRouter };
