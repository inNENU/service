import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { Express } from "express";
import { static as staticMiddleware } from "express";

import { morganMiddleware } from "./morgan.js";

export const applyMiddleware = (app: Express): void => {
  app.use(
    cors({
      origin: [
        "https://servicewechat.com",
        /^https:\/\/.*\.innenu\.com$/,
        "https://innenu.com",
      ],
    }),
  );
  app.use(cookieParser());
  app.use(compression());
  app.use(bodyParser.json());
  app.use(staticMiddleware("public"));

  // store the response body to res.body
  app.use((_req, res, next) => {
    const originalJson = res.json;

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    res.json = function (body) {
      // @ts-expect-error: Express type issue
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      res.body = body;

      // @ts-expect-error: Express type issue
      // eslint-disable-next-line prefer-rest-params
      return originalJson.apply(this, arguments);
    };
    next();
  });

  app.use(morganMiddleware());
};
