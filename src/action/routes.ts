import { Router } from "express";

import { borrowBooksHandler } from "./borrow-books/index.js";
import { cardBalanceHandler } from "./card-balance.js";
import { actionCheckHandler } from "./check.js";
import { actionEmailPageHandler } from "./email-page.js";
import { actionLoginHandler, loginToAction } from "./login.js";
import { noticeHandler } from "./notice-detail.js";
import { noticeListHandler } from "./notice-list.js";
import { actionRecentEmailHandler } from "./recent-mail.js";

const actionRouter = Router();

actionRouter.use("/:path", loginToAction);
actionRouter.post("/login", actionLoginHandler);
actionRouter.post("/check", actionCheckHandler);
actionRouter.post("/borrow-books", borrowBooksHandler);
actionRouter.post("/card-balance", cardBalanceHandler);
actionRouter.get("/email-page", actionEmailPageHandler);
actionRouter.post("/email-page", actionEmailPageHandler);
actionRouter.post("/recent-email", actionRecentEmailHandler);
actionRouter.post("/notice-detail", noticeHandler);
actionRouter.post("/notice-list", noticeListHandler);

export { actionRouter };
