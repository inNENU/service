import { writeFileSync } from "node:fs";

import type { RequestHandler } from "express";

import type { EmptyObject } from "../typings.js";

export const mpReportHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Record<string, unknown>
> = (req, res) => {
  writeFileSync(
    "./log",
    `${new Date().toLocaleString()} ${JSON.stringify(req.body)}\n`,
    { flag: "a" },
  );

  res.end();
};
