import { Router } from "express";

import { vpnCASLoginHandler } from "./cas-login.js";
import { vpnLoginHandler } from "./login.js";

const vpnRouter = Router();

vpnRouter.post("/cas-login", vpnCASLoginHandler);
vpnRouter.post("/login", vpnLoginHandler);

export { vpnRouter };
