import { Router } from "express";

import { validate } from "../utils/validate.js";
import { avatarHandler } from "./avatar.js";
import { authCenterCheckHandler } from "./check.js";
import { authCenterLoginHandler } from "./login.js";
import { authCenterLoginSchema, avatarSchema } from "./schemas.js";

const authCenterRouter = Router();

authCenterRouter.post("/check", authCenterCheckHandler);
authCenterRouter.post("/login", validate(authCenterLoginSchema), authCenterLoginHandler);
authCenterRouter.post("/avatar", validate(avatarSchema), avatarHandler);

export { authCenterRouter };
