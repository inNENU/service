import compression from "compression";
import express from "express";
import { admissionNoticeHandler } from "./admission-notice.js";

const app = express();
const port = 8080;

app.use(compression);

app.get("/", (_req, res) => {
  res.send("这里是 in 东师服务");
});
app.post("/admission-notice", admissionNoticeHandler);

app.listen(port, () => {
  console.log(`Service listening on port ${port}`);
});
