import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import type { Response } from "express";
import express from "express";
import morgan from "morgan";

import {
  actionCheckHandler,
  actionEmailPageHandler,
  actionLoginHandler,
  actionRecentEmailHandler,
  borrowBooksHandler,
  cardBalanceHandler,
  noticeHandler,
  noticeListHandler,
} from "./action/index.js";
import {
  activateHandler,
  authEncryptHandler,
  authInitHandler,
  authLoginHandler,
  changePasswordHandler,
  infoHandler,
} from "./auth/index.js";
import {
  historyGradeHandler,
  postAdmissionHandler,
  postEnrollPlanHandler,
  postRecommendPlanHandler,
  underAdmissionHandler,
  underEnrollPlanHandler,
} from "./enroll/index.js";
import { libraryPeopleHandler } from "./library/people.js";
import {
  mainInfoHandler,
  mainStatusHandler,
  researchListHandler,
} from "./main/index.js";
import {
  mpLoginHandler,
  mpQrCodeHandler,
  mpReportHandler,
  mpSearchHandler,
} from "./mp/index.js";
import {
  emailHandler,
  myCheckHandler,
  myInfoHandler,
  myLoginHandler,
} from "./my/index.js";
import {
  postNewInfoHandler,
  postNewSystemLoginHandler,
} from "./post-new-system/index.js";
import {
  postCourseTableHandler,
  postGradeListHandler,
  postSystemCheckHandler,
  postSystemLoginHandler,
} from "./post-system/index.js";
import {
  processHandler,
  searchHandler,
  selectInfoHandler,
  selectLoginHandler,
  studentAmountHandler,
} from "./select/index.js";
import type { CommonFailedResponse } from "./typings.js";
import {
  underChangeMajorPlanHandler,
  underCourseTableHandler,
  underCreateStudentArchiveHandler,
  underExamPlaceHandler,
  underGradeListHandler,
  underInfoHandler,
  underSpecialExamHandler,
  underStudentArchiveHandler,
  underSystemCheckHandler,
  underSystemLoginHandler,
  underTestQueryHandler,
} from "./under-system/index.js";
import { getMemoryUsage } from "./utils/index.js";
import { vpnCASLoginHandler, vpnLoginHandler } from "./vpn/index.js";
import { weatherHandler } from "./weather.js";
import pkg from "../package.json" assert { type: "json" };

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
  res.header("Content-Type", "text/html");

  return res.send(`\
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>in东师服务</title>
</head>
<body>
  当前版本: ${pkg.version}
  <h1><a href="https://innenu.com">访问网页版 in东师</a></h1>
</body>
</html>\
`);
});

app.post("/action/login", actionLoginHandler);
app.post("/action/check", actionCheckHandler);
app.post("/action/borrow-books", borrowBooksHandler);
app.post("/action/card-balance", cardBalanceHandler);
app.get("/action/email-page", actionEmailPageHandler);
app.post("/action/email-page", actionEmailPageHandler);
app.post("/action/recent-email", actionRecentEmailHandler);
app.post("/action/notice", noticeHandler);
app.post("/action/notice-list", noticeListHandler);

app.get("/auth/activate", activateHandler);
app.post("/auth/activate", activateHandler);
app.post("/auth/encrypt", authEncryptHandler);
app.post("/auth/change-password", changePasswordHandler);
app.patch("/auth/change-password", changePasswordHandler);
app.get("/auth/init", authInitHandler);
app.post("/auth/init", authInitHandler);
app.post("/auth/login", authLoginHandler);
app.post("/auth/info", infoHandler);

app.post("/my/check", myCheckHandler);
app.post("/my/info", myInfoHandler);
app.post("/my/login", myLoginHandler);
app.post("/my/email", emailHandler);

app.post("/under-system/login", underSystemLoginHandler);
app.post("/under-system/check", underSystemCheckHandler);
app.post("/under-system/change-major-plan", underChangeMajorPlanHandler);
app.post("/under-system/course-table", underCourseTableHandler);
app.post("/under-system/create-archive", underCreateStudentArchiveHandler);
app.post("/under-system/exam-place", underExamPlaceHandler);
app.post("/under-system/grade-list", underGradeListHandler);
app.post("/under-system/info", underInfoHandler);
app.post("/under-system/special-exam", underSpecialExamHandler);
app.post("/under-system/student-archive", underStudentArchiveHandler);
app.post("/under-system/test-query", underTestQueryHandler);

app.post("/post-new-system/login", postNewSystemLoginHandler);
app.post("/post-new-system/info", postNewInfoHandler);

app.post("/post-system/login", postSystemLoginHandler);
app.post("/post-system/check", postSystemCheckHandler);
app.post("/post-system/course-table", postCourseTableHandler);
app.post("/post-system/grade-list", postGradeListHandler);

app.get("/main/info", mainInfoHandler);
app.post("/main/research-list", researchListHandler);
app.get("/main/status", mainStatusHandler);

app.post("/enroll/grade", historyGradeHandler);
app.get("/enroll/under-admission", underAdmissionHandler);
app.post("/enroll/under-admission", underAdmissionHandler);
app.post("/enroll/under-plan", underEnrollPlanHandler);
app.post("/enroll/post-admission", postAdmissionHandler);
app.post("/enroll/post-recommend-plan", postRecommendPlanHandler);
app.post("/enroll/post-plan", postEnrollPlanHandler);

app.post("/select/login", selectLoginHandler);
app.post("/select/info", selectInfoHandler);
app.post("/select/search", searchHandler);
app.post("/select/student-amount", studentAmountHandler);
app.delete("/select/process", processHandler);
app.put("/select/process", processHandler);

app.post("/vpn/cas-login", vpnCASLoginHandler);
app.post("/vpn/login", vpnLoginHandler);

app.post("/mp/login", mpLoginHandler);
app.post("/mp/report", mpReportHandler);
app.post("/mp/search", mpSearchHandler);
app.get("/mp/qrcode", mpQrCodeHandler);

app.get("/library/people", libraryPeopleHandler);
app.get("/qrcode", mpQrCodeHandler);
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

setInterval(() => {
  global.gc?.();
  getMemoryUsage();
}, 60 * 1000);
