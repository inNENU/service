import { Router } from "express";

import { avatarHandler } from "./avatar.js";
import { authCenterCheckHandler } from "./check.js";
import { authCenterLoginHandler } from "./login.js";

const authCenterRouter = Router();

authCenterRouter.post("/check", authCenterCheckHandler);
authCenterRouter.post("/login", authCenterLoginHandler);
authCenterRouter.post("/avatar", avatarHandler);

export { authCenterRouter };
