import { Router } from "express";

import { actionCheckHandler } from "./check.js";
import { actionEmailPageHandler } from "./email-page.js";
import { actionLoginHandler, loginToAction } from "./login.js";
import { noticeHandler } from "./notice-detail.js";
import { noticeListHandler } from "./notice-list.js";
import { actionRecentEmailHandler } from "./recent-mail.js";

const actionRouter = Router();

// These are the routes that don't require login
actionRouter.post("/login", actionLoginHandler);
actionRouter.post("/check", actionCheckHandler);

actionRouter.use(loginToAction);

actionRouter.get("/email-page", actionEmailPageHandler);
actionRouter.post("/email-page", actionEmailPageHandler);
actionRouter.post("/recent-email", actionRecentEmailHandler);
actionRouter.post("/notice-detail", noticeHandler);
actionRouter.post("/notice-list", noticeListHandler);

export { actionRouter };
