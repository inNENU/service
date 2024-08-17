import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request } from "express-serve-static-core";

import { activateHandler } from "./activate/index.js";
import { authCaptchaHandler } from "./captcha.js";
import { authEncryptHandler } from "./encrypt.js";
import { authInitHandler, authInitInfoHandler } from "./init/index.js";
import { authLoginHandler } from "./login.js";
import { startReAuthHandler, verifyReAuthHandler } from "./re-auth/index.js";
import { resetPasswordHandler } from "./reset/index.js";
import { resetCaptchaHandler } from "./reset-captcha.js";
import { ActionFailType } from "../config/index.js";
import type { EmptyObject } from "../typings.js";

const loginLimiter = rateLimit({
  windowMs: 60000, // 1 分钟
  max: 3,
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
      msg: "登录过于频繁，请 1 分钟后重试",
    };
  },
});

const authRouter = Router();

authRouter.get("/activate", activateHandler);
authRouter.post("/activate", activateHandler);
authRouter.post("/encrypt", authEncryptHandler);
authRouter.get("/auth-captcha", authCaptchaHandler);
authRouter.post("/auth-captcha", authCaptchaHandler);
authRouter.use("/init", loginLimiter);
authRouter.get("/init", authInitInfoHandler);
authRouter.post("/init", authInitHandler);
authRouter.post("/login", authLoginHandler);
authRouter.get("/re-auth", startReAuthHandler);
authRouter.post("/re-auth", verifyReAuthHandler);
authRouter.get("/reset-captcha", resetCaptchaHandler);
authRouter.get("/reset-password", resetPasswordHandler);
authRouter.post("/reset-password", resetPasswordHandler);

export { authRouter };
