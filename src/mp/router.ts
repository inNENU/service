import { Router } from "express";

import { checkIdCodeHandler, generateIdCodeHandler } from "./id-code/index.js";
import { mpLoginHandler } from "./login.js";
import { mpQrCodeHandler } from "./qrcode.js";
import { mpReceiveHandler } from "./receive.js";
import { mpRemoveHandler } from "./remove.js";
import { mpReportHandler } from "./report.js";
import { mpSearchHandler } from "./search.js";

const mpRouter = Router();

mpRouter.post("/login", mpLoginHandler);
mpRouter.post("/check-id-code", checkIdCodeHandler);
mpRouter.post("/generate-id-code", generateIdCodeHandler);
mpRouter.get("/qrcode", mpQrCodeHandler);
mpRouter.get("/receive", mpReceiveHandler);
mpRouter.post("/receive", mpReceiveHandler);
mpRouter.post("/remove", mpRemoveHandler);
mpRouter.post("/report", mpReportHandler);
mpRouter.post("/search", mpSearchHandler);

export { mpRouter };
