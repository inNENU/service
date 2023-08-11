import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import type { Response } from "express";
import express from "express";
import morgan from "morgan";

import {
  actionCheckHandler,
  actionLoginHandler,
  borrowBooksHandler,
  cardBalanceHandler,
  noticeHandler,
  noticeListHandler,
} from "./action/index.js";
import {
  activateHandler,
  authInitHandler,
  authLoginHandler,
  changePasswordHandler,
  infoHandler,
} from "./auth/index.js";
import {
  enrollPlanHandler,
  historyGradeHandler,
  postAdmissionHandler,
  underAdmissionHandler,
} from "./enroll/index.js";
import { libraryPeopleHandler } from "./library/people.js";
import {
  mainInfoHandler,
  mainInfoListHandler,
  mainStatusHandler,
} from "./main/index.js";
import { mpLoginHandler } from "./mp/index.js";
import {
  postInfoHandler,
  postSystemLoginHandler,
} from "./post-system/index.js";
import { qrCodeHandler } from "./qrcode.js";
import {
  processHandler,
  searchHandler,
  selectInfoHandler,
  selectLoginHandler,
  studentAmountHandler,
} from "./select/index.js";
import type { CommonFailedResponse } from "./typings.js";
import {
  underCourseTableHandler,
  underGradeListHandler,
  underInfoHandler,
  underSystemCheckHandler,
  underSystemLoginHandler,
} from "./under-system/index.js";
import { vpnCASLoginHandler, vpnLoginHandler } from "./vpn/index.js";
import { weatherHandler } from "./weather/handler.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const originalFetch = fetch;

global.fetch = async (url, options): Promise<globalThis.Response> => {
  const response = await originalFetch(url, options);

  console.log("Fetching", url, `with ${response.status}`);

  return response;
};

app.use(cookieParser());
app.use(compression());
app.use(bodyParser.json());
app.use(morgan("common"));

app.get("/", (_req, res) => {
  res.json({ success: true });
});

app.post("/action/login", actionLoginHandler);
app.post("/action/check", actionCheckHandler);
app.post("/action/borrow-books", borrowBooksHandler);
app.post("/action/card-balance", cardBalanceHandler);
app.post("/action/notice", noticeHandler);
app.post("/action/notice-list", noticeListHandler);

app.get("/auth/activate", activateHandler);
app.post("/auth/activate", activateHandler);
app.post("/auth/change-password", changePasswordHandler);
app.patch("/auth/change-password", changePasswordHandler);
app.get("/auth/init", authInitHandler);
app.post("/auth/init", authInitHandler);
app.post("/auth/login", authLoginHandler);
app.post("/auth/info", infoHandler);

app.post("/under-system/login", underSystemLoginHandler);
app.post("/under-system/check", underSystemCheckHandler);
app.post("/under-system/course-table", underCourseTableHandler);
app.post("/under-system/grade-list", underGradeListHandler);
app.post("/under-system/info", underInfoHandler);

app.post("/post-system/login", postSystemLoginHandler);
app.post("/post-system/info", postInfoHandler);

app.get("/main/info", mainInfoHandler);
app.post("/main/info-list", mainInfoListHandler);
app.get("/main/status", mainStatusHandler);

app.post("/enroll/grade", historyGradeHandler);
app.post("/enroll/plan", enrollPlanHandler);
app.get("/enroll/under-admission", underAdmissionHandler);
app.post("/enroll/under-admission", underAdmissionHandler);
app.post("/enroll/post-admission", postAdmissionHandler);

app.post("/select/login", selectLoginHandler);
app.post("/select/info", selectInfoHandler);
app.post("/select/search", searchHandler);
app.post("/select/student-amount", studentAmountHandler);
app.delete("/select/process", processHandler);
app.put("/select/process", processHandler);

app.post("/vpn/cas-login", vpnCASLoginHandler);
app.post("/vpn/login", vpnLoginHandler);

app.post("/mp/login", mpLoginHandler);

app.get("/library/people", libraryPeopleHandler);
app.get("/qrcode", qrCodeHandler);
app.get("/weather", weatherHandler);

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req, res: Response, _next: () => void) => {
  console.error(err.stack);

  res.status(500).send(<CommonFailedResponse>{
    success: false,
    msg: "我们出了问题! 请联系 Mr.Hope",
  });
});

app.listen(port, () => {
  console.log(`Service listening on port ${port}`);
});
