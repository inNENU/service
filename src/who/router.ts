import { Router } from "express";

import { validate } from "../utils/validate.js";
// import { whoCheckHandler } from "./check.js";
import { whoInfoHandler } from "./info.js";
import { loginToWho, whoLoginHandler } from "./login.js";
import { whoInfoSchema, whoLoginSchema } from "./schemas.js";

const whoRouter = Router();

// These are the routes that don't require login
whoRouter.post("/login", validate(whoLoginSchema), whoLoginHandler);
// whoRouter.post("/check", whoCheckHandler);

whoRouter.use(loginToWho);

whoRouter.post("/info", validate(whoInfoSchema), whoInfoHandler);

export { whoRouter };
