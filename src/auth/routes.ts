import type { Express } from "express";
import rateLimit from "express-rate-limit";
import type { Request } from "express-serve-static-core";

import { activateHandler } from "./activate/index.js";
import { authCaptchaHandler } from "./captcha.js";
import { changePasswordHandler } from "./change-password.js";
import { authEncryptHandler } from "./encrypt.js";
import { authInitHandler, authInitInfoHandler } from "./init/index.js";
import { authLoginHandler } from "./login.js";
import { reAuthHandler } from "./re-auth/index.js";
import { resetPasswordHandler } from "./reset/index.js";
import { resetCaptchaHandler } from "./reset-captcha.js";
import { ActionFailType } from "../config/index.js";
import type { EmptyObject } from "../typings.js";

const limiter = rateLimit({
  windowMs: 30 * 1000, // 1 分钟
  max: 4,
  legacyHeaders: false,
  standardHeaders: true,
  keyGenerator: (req: Request<EmptyObject, { id: number }, { id: number }>) =>
    (req.method === "GET"
      ? (req.query.id as string)
      : req.body.id?.toString()) ?? req.ip,
  message: (req: Request<EmptyObject, { id: number }, { id: number }>) => {
    console.log(
      "Hitting rate limit:",
      req.method === "GET" ? req.query.id : req.body.id,
    );

    return {
      success: false,
      type: ActionFailType.TooFrequent,
      msg: "请求过于频繁，请 30 秒后重试",
    };
  },
});

export const registerAuthRoutes = (app: Express): void => {
  app.get("/auth/activate", activateHandler);
  app.post("/auth/activate", activateHandler);
  app.post("/auth/encrypt", authEncryptHandler);
  app.get("/auth/auth-captcha", authCaptchaHandler);
  app.post("/auth/auth-captcha", authCaptchaHandler);
  app.post("/auth/change-password", changePasswordHandler);
  app.patch("/auth/change-password", changePasswordHandler);
  app.use("/auth/init", limiter);
  app.get("/auth/init", authInitInfoHandler);
  app.post("/auth/init", authInitHandler);
  app.post("/auth/login", authLoginHandler);
  app.get("/auth/re-auth", reAuthHandler);
  app.post("/auth/re-auth", reAuthHandler);
  app.get("/auth/reset-captcha", resetCaptchaHandler);
  app.get("/auth/reset-password", resetPasswordHandler);
  app.post("/auth/reset-password", resetPasswordHandler);
};
