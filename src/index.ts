import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import type { Response } from "express";
import express from "express";
import morgan from "morgan";

import { actionCheckHandler, actionLoginHandler } from "./action/index.js";
import {
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
import { qrCodeHandler } from "./qrcode.js";
import {
  processHandler,
  searchHandler,
  selectInfoHandler,
  selectLoginHandler,
  studentAmountHandler,
} from "./select/index.js";
import {
  underCourseTableHandler,
  underGradeListHandler,
  underSystemCheckHandler,
  underSystemLoginHandler,
} from "./under-system/index.js";
import { vpnCASLoginHandler, vpnLoginHandler } from "./vpn/index.js";
import { weatherHandler } from "./weather/handler.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const originalFetch = fetch;

global.fetch = (url, options): Promise<globalThis.Response> => {
  console.log("Fetching", url);

  return originalFetch(url, options);
};

app.use(cookieParser());
app.use(compression());
app.use(bodyParser.json());
app.use(morgan("common"));

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/action/login", actionLoginHandler);
app.post("/action/check", actionCheckHandler);

app.post("/auth/change-password", changePasswordHandler);
app.patch("/auth/change-password", changePasswordHandler);
app.post("/auth/login", authLoginHandler);
app.post("/auth/info", infoHandler);

app.post("/under-system/login", underSystemLoginHandler);
app.post("/under-system/check", underSystemCheckHandler);
app.post("/under-system/course-table", underCourseTableHandler);
app.post("/under-system/grade-list", underGradeListHandler);

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

app.get("/library/people", libraryPeopleHandler);
app.get("/qrcode", qrCodeHandler);
app.get("/weather", weatherHandler);

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req, res: Response, _next: () => void) => {
  console.error(err.stack);

  res.status(500).send("我们出了问题! 请联系 Mr.Hope");
});

app.listen(port, () => {
  console.log(`Service listening on port ${port}`);
});
