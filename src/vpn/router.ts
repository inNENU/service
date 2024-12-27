import { Router } from "express";

import { vpnCASLoginHandler } from "./cas-login.js";

const vpnRouter = Router();

vpnRouter.post("/cas-login", vpnCASLoginHandler);

export { vpnRouter };
