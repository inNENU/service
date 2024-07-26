import { writeFile } from "node:fs";

import type { RequestHandler } from "express";

import type { EmptyObject } from "../typings.js";

export const mpReportHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Record<string, unknown>
> = (req, res) => {
  writeFile(
    "./log",
    `${new Date().toLocaleString()} ${JSON.stringify(req.body)}\n`,
    { flag: "a" },
    (err) => {
      if (err) {
        console.error(err);
      }
    },
  );

  res.end();
};
