import type { Express } from "express";

import { borrowBooksHandler } from "./borrow-books/index.js";
import { cardBalanceHandler } from "./card-balance.js";
import { actionCheckHandler } from "./check.js";
import { actionEmailPageHandler } from "./email-page.js";
import { actionLoginHandler } from "./login.js";
import { noticeHandler } from "./notice-detail.js";
import { noticeListHandler } from "./notice-list.js";
import { actionRecentEmailHandler } from "./recent-mail.js";

export const registerActionRoutes = (app: Express): void => {
  app.post("/action/login", actionLoginHandler);
  app.post("/action/check", actionCheckHandler);
  app.post("/action/borrow-books", borrowBooksHandler);
  app.post("/action/card-balance", cardBalanceHandler);
  app.get("/action/email-page", actionEmailPageHandler);
  app.post("/action/email-page", actionEmailPageHandler);
  app.post("/action/recent-email", actionRecentEmailHandler);
  app.post("/action/notice-detail", noticeHandler);
  app.post("/action/notice-list", noticeListHandler);
};
