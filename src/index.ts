import type { Response } from "express";
import express from "express";

import { actionRouter } from "./action/index.js";
import { authRouter } from "./auth/index.js";
import { authCenterRouter } from "./auth-center/index.js";
import { UnknownResponse } from "./config/index.js";
import { enrollRouter } from "./enroll/index.js";
import { gradRouter } from "./grad-system/index.js";
import { libraryRouter } from "./library/index.js";
import { applyMiddleware } from "./middlewire/index.js";
import { mpRouter } from "./mp/index.js";
import { myRouter } from "./my/index.js";
import { oaRouter } from "./oa/index.js";
import { officialRouter } from "./official/index.js";
import { testRouter } from "./test/index.js";
import { underStudyRouter } from "./under-study/index.js";
import { underSystemRouter } from "./under-system/index.js";
import { vpnRouter } from "./vpn/index.js";
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

applyMiddleware(app);

app.get("/", (_req, res) => {
  res.header("Content-Type", "text/html");
  res.send(`\
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
app.use("/auth-center", authCenterRouter);
app.use("/enroll", enrollRouter);
app.use("/official", officialRouter);
app.use("/grad-system", gradRouter);
app.use("/library", libraryRouter);
app.use("/mp", mpRouter);
app.use("/my", myRouter);
app.use("/oa", oaRouter);
app.use("/test", testRouter);
app.use("/under-study", underStudyRouter);
app.use("/under-system", underSystemRouter);
app.use("/vpn", vpnRouter);

/*  ------------ 天气 ------------ */

app.get("/weather", weatherHandler);

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
    )}/${Math.round(
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
