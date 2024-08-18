import { Router } from "express";

import { myCheckHandler } from "./check.js";
import { emailHandler } from "./email.js";
import { myIdentityHandler } from "./identity.js";
import { myInfoHandler } from "./info.js";
import { loginToMy, myLoginHandler } from "./login.js";

const myRouter = Router();

// These are the routes that don't require login
myRouter.post("/login", myLoginHandler);
myRouter.post("/check", myCheckHandler);

myRouter.use("/:path", loginToMy);

myRouter.post("/email", emailHandler);
myRouter.post("/info", myInfoHandler);
myRouter.post("/identity", myIdentityHandler);

export { myRouter };
