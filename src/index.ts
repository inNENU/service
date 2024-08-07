import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
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
  authCaptchaHandler,
  authEncryptHandler,
  authInitHandler,
  authLoginHandler,
  changePasswordHandler,
  reAuthHandler,
  resetCaptchaHandler,
  resetPasswordHandler,
} from "./auth/index.js";
import {
  authCenterCheckHandler,
  authCenterLoginHandler,
  avatarHandler,
} from "./auth-center/index.js";
import { UnknownResponse } from "./config/index.js";
import {
  gradAdmissionHandler,
  gradEnrollPlanHandler,
  gradRecommendPlanHandler,
  underAdmissionHandler,
  underEnrollPlanHandler,
  underHistoryScoreHandler,
} from "./enroll/index.js";
import {
  gradOldCourseTableHandler,
  gradOldGradeListHandler,
  gradOldSystemCheckHandler,
  gradOldSystemLoginHandler,
} from "./grad-old-system/index.js";
import {
  gradInfoHandler,
  gradSystemLoginHandler,
} from "./grad-system/index.js";
import { libraryPeopleHandler } from "./library/people.js";
import {
  idCodeHandler,
  mpLoginHandler,
  mpQrCodeHandler,
  mpReportHandler,
  mpSearchHandler,
} from "./mp/index.js";
import {
  emailHandler,
  myCheckHandler,
  myIdentityHandler,
  myInfoHandler,
  myLoginHandler,
} from "./my/index.js";
import {
  officialAcademicDetailHandler,
  officialAcademicListHandler,
  officialInfoDetailHandler,
  officialInfoListHandler,
  officialNoticeDetailHandler,
  officialNoticeListHandler,
  underMajorPlanHandler,
} from "./official/index.js";
import {
  test301Handler,
  test302Handler,
  testGetHandler,
  testPostHandler,
} from "./test/index.js";
import {
  underStudyCheckHandler,
  underStudyCourseCommentaryHandler,
  underStudyGradeDetailHandler,
  underStudyGradeListHandler,
  underStudyLoginHandler,
  underStudySearchClassHandler,
  underStudySearchCourseHandler,
  underStudySelectCategoryHandler,
  underStudySelectInfoHandler,
  underStudySelectedCourseHandler,
  underStudySpecialExamHandler,
} from "./under-study/index.js";
import { underStudyProcessCourseHandler } from "./under-study/select/process.js";
import {
  underChangeMajorPlanHandler,
  underCourseTableHandler,
  underCreateStudentArchiveHandler,
  underExamPlaceHandler,
  underInfoHandler,
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

app.use(
  cors({
    origin: [
      "https://servicewechat.com",
      /^https:\/\/.*\.innenu\.com$/,
      "https://innenu.com",
    ],
  }),
);
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
  <title>inNENU 服务</title>
</head>
<body>
  当前版本: ${pkg.version}
  <h1><a href="https://innenu.com">访问网页版 inNENU</a></h1>
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
app.post("/action/notice-detail", noticeHandler);
app.post("/action/notice-list", noticeListHandler);

app.get("/auth/activate", activateHandler);
app.post("/auth/activate", activateHandler);
app.post("/auth/avatar", avatarHandler);
app.post("/auth/encrypt", authEncryptHandler);
app.get("/auth/auth-captcha", authCaptchaHandler);
app.post("/auth/auth-captcha", authCaptchaHandler);
app.post("/auth/center-check", authCenterCheckHandler);
app.post("/auth/center-login", authCenterLoginHandler);
app.post("/auth/change-password", changePasswordHandler);
app.patch("/auth/change-password", changePasswordHandler);
app.get("/auth/init", authInitHandler);
app.post("/auth/init", authInitHandler);
app.post("/auth/login", authLoginHandler);
app.get("/auth/re-auth", reAuthHandler);
app.post("/auth/re-auth", reAuthHandler);
app.get("/auth/reset-captcha", resetCaptchaHandler);
app.get("/auth/reset-password", resetPasswordHandler);
app.post("/auth/reset-password", resetPasswordHandler);

app.post("/my/check", myCheckHandler);
app.post("/my/email", emailHandler);
app.post("/my/info", myInfoHandler);
app.post("/my/login", myLoginHandler);
app.post("/my/identity", myIdentityHandler);

app.post("/under-study/check", underStudyCheckHandler);
app.post("/under-study/course-commentary", underStudyCourseCommentaryHandler);
app.post("/under-study/grade-detail", underStudyGradeDetailHandler);
app.post("/under-study/grade-list", underStudyGradeListHandler);
app.post("/under-study/login", underStudyLoginHandler);
app.post("/under-study/select/category", underStudySelectCategoryHandler);
app.post("/under-study/select/class", underStudySearchClassHandler);
app.post("/under-study/select/info", underStudySelectInfoHandler);
app.post("/under-study/select/search", underStudySearchCourseHandler);
app.post("/under-study/select/process", underStudyProcessCourseHandler);
app.post("/under-study/select/selected", underStudySelectedCourseHandler);
app.post("/under-study/special-exam", underStudySpecialExamHandler);

app.post("/under-system/login", underSystemLoginHandler);
app.post("/under-system/check", underSystemCheckHandler);
app.post("/under-system/change-major-plan", underChangeMajorPlanHandler);
app.post("/under-system/course-table", underCourseTableHandler);
app.post("/under-system/create-archive", underCreateStudentArchiveHandler);
app.post("/under-system/exam-place", underExamPlaceHandler);
app.post("/under-system/info", underInfoHandler);
app.post("/under-system/student-archive", underStudentArchiveHandler);
app.post("/under-system/test-query", underTestQueryHandler);

app.post("/grad-system/login", gradSystemLoginHandler);
app.post("/grad-system/info", gradInfoHandler);

app.post("/grad-old-system/login", gradOldSystemLoginHandler);
app.post("/grad-old-system/check", gradOldSystemCheckHandler);
app.post("/grad-old-system/course-table", gradOldCourseTableHandler);
app.post("/grad-old-system/grade-list", gradOldGradeListHandler);

/*  ------------ 官网相关 ------------ */

app.get("/official/academic-detail", officialAcademicDetailHandler);
app.post("/official/academic-list", officialAcademicListHandler);
app.get("/official/info-detail", officialInfoDetailHandler);
app.post("/official/info-list", officialInfoListHandler);
app.get("/official/notice-detail", officialNoticeDetailHandler);
app.post("/official/notice-list", officialNoticeListHandler);
app.get("/official/under-major-plan", underMajorPlanHandler);
app.post("/official/under-major-plan", underMajorPlanHandler);

/*  ------------ 招生相关 ------------ */

app.get("/enroll/under-admission", underAdmissionHandler);
app.post("/enroll/under-admission", underAdmissionHandler);
app.post("/enroll/under-history-score", underHistoryScoreHandler);
app.post("/enroll/under-plan", underEnrollPlanHandler);
app.post("/enroll/grad-admission", gradAdmissionHandler);
app.post("/enroll/grad-recommend-plan", gradRecommendPlanHandler);
app.post("/enroll/grad-plan", gradEnrollPlanHandler);

app.post("/vpn/cas-login", vpnCASLoginHandler);
app.post("/vpn/login", vpnLoginHandler);

app.post("/mp/login", mpLoginHandler);
app.post("/mp/report", mpReportHandler);
app.post("/mp/search", mpSearchHandler);
app.get("/mp/qrcode", mpQrCodeHandler);
app.post("/mp/id-code", idCodeHandler);

app.get("/library/people", libraryPeopleHandler);

app.get("/weather", weatherHandler);

app.get("/test/get", testGetHandler);
app.post("/test/post", testPostHandler);
app.post("/test/301", test301Handler);
app.post("/test/302", test302Handler);

// @ts-expect-error: Express type issue
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: () => void) => {
  console.error(err.stack);

  res.status(500).json(UnknownResponse("未知错误"));
});

app.listen(port, () => {
  console.log(`Service listening on port ${port}`);
});

setInterval(() => {
  global.gc?.();
  getMemoryUsage();
}, 60 * 1000);
