import { Router } from "express";

import { gradInfoHandler } from "./info.js";
import { gradSystemLoginHandler, loginToGradSystem } from "./login.js";

const gradRouter = Router();

// These are the routes that don't require login
gradRouter.post("/login", gradSystemLoginHandler);
// TODO: Add /check route

gradRouter.use("/:path", loginToGradSystem);

gradRouter.post("/info", gradInfoHandler);

export { gradRouter };
