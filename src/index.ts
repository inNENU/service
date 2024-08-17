import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { Response } from "express";
import express from "express";

import { actionRouter } from "./action/index.js";
import { authRouter } from "./auth/index.js";
import {
  authCenterCheckHandler,
  authCenterLoginHandler,
  avatarHandler,
} from "./auth-center/index.js";
import { UnknownResponse } from "./config/index.js";
import { enrollRouter } from "./enroll/index.js";
import { gradRouter } from "./grad-system/index.js";
import { libraryPeopleHandler } from "./library/index.js";
import { morganMiddleware } from "./middlewire/index.js";
import {
  checkIdCodeHandler,
  generateIdCodeHandler,
  mpLoginHandler,
  mpQrCodeHandler,
  mpReceiveHandler,
  mpRemoveHandler,
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
import { officialRouter } from "./official/index.js";
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
import { vpnCASLoginHandler, vpnLoginHandler } from "./vpn/index.js";
import { weatherHandler } from "./weather.js";

const currentDate = new Date().toLocaleDateString("zh");

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const originalFetch = fetch;

global.fetch = async (url, options): Promise<globalThis.Response> => {
  const response = await originalFetch(url, options);

  console.debug("Fetching", url, `with ${response.status}`);

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

// store the response body to res.body
app.use((_req, res, next) => {
  const originalSend = res.json;

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  res.json = function (body) {
    // @ts-expect-error: Express type issue
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    res.body = body;

    // @ts-expect-error: Express type issue
    // eslint-disable-next-line
    return originalSend.apply(this, arguments);
  };
  next();
});
app.use(morganMiddleware);

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
  当前版本: ${currentDate}
  <h1><a href="https://innenu.com">访问网页版 inNENU</a></h1>
</body>
</html>\
`);
});

app.use("/action", actionRouter);
app.use("/auth", authRouter);
app.use("/enroll", enrollRouter);
app.use("/official", officialRouter);
app.use("/grad-system", gradRouter);

app.post("/auth-center/check", authCenterCheckHandler);
app.post("/auth-center/login", authCenterLoginHandler);
app.post("/auth-center/avatar", avatarHandler);

/*  ------------ 服务大厅 ------------ */

app.post("/my/check", myCheckHandler);
app.post("/my/email", emailHandler);
app.post("/my/info", myInfoHandler);
app.post("/my/login", myLoginHandler);
app.post("/my/identity", myIdentityHandler);

/*  ------------ 本科教务系统 ------------ */

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

/*  ------------ 旧本科教务系统 ------------ */

app.post("/under-system/login", underSystemLoginHandler);
app.post("/under-system/check", underSystemCheckHandler);
app.post("/under-system/change-major-plan", underChangeMajorPlanHandler);
app.post("/under-system/course-table", underCourseTableHandler);
app.post("/under-system/create-archive", underCreateStudentArchiveHandler);
app.post("/under-system/exam-place", underExamPlaceHandler);
app.post("/under-system/info", underInfoHandler);
app.post("/under-system/student-archive", underStudentArchiveHandler);
app.post("/under-system/test-query", underTestQueryHandler);

/*  ------------ WebVPN ------------ */

app.post("/vpn/cas-login", vpnCASLoginHandler);
app.post("/vpn/login", vpnLoginHandler);

/*  ------------ 小程序 ------------ */

app.post("/mp/login", mpLoginHandler);
app.post("/mp/check-id-code", checkIdCodeHandler);
app.post("/mp/generate-id-code", generateIdCodeHandler);
app.get("/mp/qrcode", mpQrCodeHandler);
app.get("/mp/receive", mpReceiveHandler);
app.post("/mp/receive", mpReceiveHandler);
app.post("/mp/remove", mpRemoveHandler);
app.post("/mp/report", mpReportHandler);
app.post("/mp/search", mpSearchHandler);

/*  ------------ 图书馆 ------------ */

app.get("/library/people", libraryPeopleHandler);

/*  ------------ 天气 ------------ */

app.get("/weather", weatherHandler);

/*  ------------ 测试 API ------------ */

app.get("/test/get", testGetHandler);
app.post("/test/post", testPostHandler);
app.post("/test/301", test301Handler);
app.post("/test/302", test302Handler);

// @ts-expect-error: Express type issue
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: () => void) => {
  console.error(err);

  res.status(500).json(UnknownResponse(err.message ?? "未知错误"));
});

app.listen(port, () => {
  console.info(`Service is started on port ${port}`);
});

setInterval(() => {
  global.gc?.();

  const { rss, heapTotal, heapUsed, arrayBuffers } = process.memoryUsage();

  console.debug(
    `rss: ${Math.round((rss / 1024 / 1024 / 100) * 100)} MB, heap: ${Math.round(
      (heapUsed / 1024 / 1024 / 100) * 100,
    )} / ${Math.round(
      (heapTotal / 1024 / 1024 / 100) * 100,
    )} MB, arrayBuffers: ${Math.round((arrayBuffers / 1024 / 1024 / 100) * 100)} MB`,
  );
}, /** 5 min */ 300000);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
