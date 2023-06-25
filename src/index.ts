import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import type { Response } from "express";
import express from "express";

import {
  changePasswordHandler,
  infoHandler,
  loginHandler,
} from "./auth/index.js";
import {
  underCourseTableHandler,
  underSystemLoginHandler,
} from "./under-system/index.js";
import {
  enrollPlanHandler,
  historyGradeHandler,
  postAdmissionHandler,
  underAdmissionHandler,
} from "./enroll/index.js";
import { qrCodeHandler } from "./qrcode.js";
import {
  processHandler,
  searchHandler,
  selectInfoHandler,
  selectLoginHandler,
  studentAmountHandler,
} from "./select/index.js";
import { weatherHandler } from "./weather/handler.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(cookieParser());
app.use(compression());
app.use(bodyParser.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/auth/change-password", changePasswordHandler);
app.patch("/auth/change-password", changePasswordHandler);
app.post("/auth/login", loginHandler);
app.post("/auth/info", infoHandler);

app.post("/under-system/course-table", underCourseTableHandler);
app.post("/under-system/login", underSystemLoginHandler);

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
