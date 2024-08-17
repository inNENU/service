import { Router } from "express";

import { gradInfoHandler } from "./info.js";
import { gradSystemLoginHandler } from "./login.js";

const gradRouter = Router();

gradRouter.post("/login", gradSystemLoginHandler);
gradRouter.post("/info", gradInfoHandler);

export { gradRouter };
