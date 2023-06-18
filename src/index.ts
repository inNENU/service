import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import express from "express";
import { admissionNoticeHandler } from "./admission-notice.js";
import { weatherHandler } from "./weather/handler.js";
import {
  courseListHandler,
  selectLoginHandler,
  selectInfoHandler,
} from "./select/index.js";

const app = express();
const port = 8080;

app.use(cookieParser());
app.use(compression());
app.use(bodyParser.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});
app.post("/admission-notice", admissionNoticeHandler);
app.get("/weather", weatherHandler);
app.post("/select/login", selectLoginHandler);
app.post("/select/course-list", courseListHandler);
app.post("/select/info", selectInfoHandler);

app.listen(port, () => {
  console.log(`Service listening on port ${port}`);
});
