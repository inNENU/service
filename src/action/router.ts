import { Router } from "express";

import { validate } from "../utils/validate.js";
import { actionCheckHandler } from "./check.js";
import { actionEmailPageHandler } from "./email-page.js";
import { actionLoginHandler, loginToAction } from "./login.js";
import { noticeHandler } from "./notice-detail.js";
import { noticeListHandler } from "./notice-list.js";
import { actionRecentEmailHandler } from "./recent-mail.js";
import { actionLoginSchema, noticeDetailSchema, noticeListSchema } from "./schemas.js";

const actionRouter = Router();

// These are the routes that don't require login
actionRouter.post("/login", validate(actionLoginSchema), actionLoginHandler);
actionRouter.post("/check", actionCheckHandler);

actionRouter.use(loginToAction);

actionRouter.get("/email-page", actionEmailPageHandler);
actionRouter.post("/email-page", actionEmailPageHandler);
actionRouter.post("/recent-email", actionRecentEmailHandler);
actionRouter.post("/notice-detail", validate(noticeDetailSchema), noticeHandler);
actionRouter.post("/notice-list", validate(noticeListSchema), noticeListHandler);

export { actionRouter };
