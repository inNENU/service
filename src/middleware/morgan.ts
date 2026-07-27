import type { ServerResponse } from "node:http";

import type { Handler } from "express";
import morgan, { token } from "morgan";
import picocolors from "picocolors";

export const morganMiddleware = (): Handler => {
  token(
    "success",
    (
      _req,
      res: ServerResponse & {
        body: string | Record<string, unknown>;
      },
    ) =>
      typeof res.body === "object" && typeof res.body.success === "boolean"
        ? res.body.success
          ? picocolors.green("success")
          : picocolors.red("fail")
        : picocolors.gray("-"),
  );

  token("status-code", (_req, res) => {
    const { statusCode } = res;

    return statusCode >= 200 && statusCode < 300
      ? picocolors.green(statusCode)
      : statusCode >= 400 && statusCode < 500
        ? picocolors.red(statusCode)
        : statusCode >= 500
          ? picocolors.red(statusCode)
          : picocolors.gray(statusCode);
  });

  return morgan(
    ":date[iso] :method :url HTTP/:http-version :status-code :response-time ms :res[content-length] :success",
  );
};
