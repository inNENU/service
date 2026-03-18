import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { Express } from "express";
import { json, static as staticMiddleware } from "express";

import { morganMiddleware } from "./morgan.js";

export const applyMiddleware = (app: Express): void => {
  app.use(
    cors({
      origin: ["https://servicewechat.com", /^https:\/\/.*\.innenu\.com$/, "https://innenu.com"],
    }),
  );
  app.use(cookieParser());
  app.use(compression());
  app.use(json());
  app.use(staticMiddleware("public"));

  // store the response body to res.body
  app.use((_req, res, next) => {
    const originalJson = res.json;

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    res.json = function json(...args: Parameters<typeof originalJson>) {
      // @ts-expect-error: Express type issue
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      res.body = args[0];

      return Reflect.apply(originalJson, this, args);
    };
    next();
  });

  app.use(morganMiddleware());
};
