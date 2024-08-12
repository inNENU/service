import type { IncomingMessage, ServerResponse } from "http";

import morgan from "morgan";
import picocolors from "picocolors";

morgan.token(
  "success",
  (
    _req,
    res: ServerResponse<IncomingMessage> & {
      body: string | Record<string, unknown>;
    },
  ) => {
    console.log(JSON.stringify(res.body));

    return typeof res.body === "object" && typeof res.body.success === "boolean"
      ? res.body.success
        ? picocolors.green("success")
        : picocolors.red("fail")
      : picocolors.gray("-");
  },
);

morgan.token("status-code", (_req, res) => {
  const { statusCode } = res;

  return statusCode >= 200 && statusCode < 300
    ? picocolors.green(statusCode)
    : statusCode >= 400 && statusCode < 500
      ? picocolors.red(statusCode)
      : statusCode >= 500
        ? picocolors.red(statusCode)
        : picocolors.gray(statusCode);
});

// 自定义 Morgan 格式化中间件
export const morganMiddleware = morgan(
  ":date[iso] :method :url HTTP/:http-version :status-code :response-time ms :res[content-length] :success",
);
