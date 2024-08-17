import { Router } from "express";

import { myCheckHandler } from "./check.js";
import { emailHandler } from "./email.js";
import { myIdentityHandler } from "./identity.js";
import { myInfoHandler } from "./info.js";
import { myLoginHandler } from "./login.js";

const myRouter = Router();

myRouter.post("/check", myCheckHandler);
myRouter.post("/email", emailHandler);
myRouter.post("/info", myInfoHandler);
myRouter.post("/login", myLoginHandler);
myRouter.post("/identity", myIdentityHandler);

export { myRouter };
