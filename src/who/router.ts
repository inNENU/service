import { Router } from "express";

// import { whoCheckHandler } from "./check.js";
import { whoInfoHandler } from "./info.js";
import { loginToWho, whoLoginHandler } from "./login.js";

const whoRouter = Router();

// These are the routes that don't require login
whoRouter.post("/login", whoLoginHandler);
// whoRouter.post("/check", whoCheckHandler);

whoRouter.use(loginToWho);

whoRouter.post("/info", whoInfoHandler);

export { whoRouter };
