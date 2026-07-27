import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express-serve-static-core";

import { ActionFailType } from "../config/index.js";
import type { EmptyObject } from "../typings.js";
import { activateHandler } from "./activate/index.js";
import { authCaptchaHandler } from "./captcha.js";
import { authEncryptHandler } from "./encrypt.js";
import { authInitHandler, authInitInfoHandler } from "./init/index.js";
import { authLoginHandler } from "./login.js";
import { startReAuthHandler, verifyReAuthHandler } from "./re-auth/index.js";
import { resetCaptchaHandler } from "./reset-captcha.js";
import { resetPasswordHandler } from "./reset/index.js";

const loginLimiter = rateLimit({
  windowMs: 60000, // 1 分钟
  max: 3,
  legacyHeaders: false,
  standardHeaders: true,
  keyGenerator: (req: Request<EmptyObject, EmptyObject, { id?: number }, { id?: number }>) =>
    (req.method === "GET" ? req.query?.id : req.body.id)?.toString() ?? ipKeyGenerator(req.ip!),
  message: (req: Request<EmptyObject, { id: number }, { id: number }>) => {
    console.log("Hitting rate limit:", req.method === "GET" ? req.query.id : req.body.id);

    return {
      success: false,
      type: ActionFailType.TooFrequent,
      msg: "登录过于频繁，请 1 分钟后重试",
    };
  },
});

const captchaLimiter = rateLimit({
  windowMs: 60000, // 1 分钟
  max: 5,
  legacyHeaders: false,
  standardHeaders: true,
  message: {
    success: false,
    type: ActionFailType.TooFrequent,
    msg: "请求过于频繁，请稍后再试",
  },
});

const authRouter = Router();

authRouter.get("/activate", activateHandler);
authRouter.post("/activate", activateHandler);
authRouter.post("/encrypt", authEncryptHandler);
authRouter.get("/auth-captcha", captchaLimiter, authCaptchaHandler);
authRouter.post("/auth-captcha", captchaLimiter, authCaptchaHandler);
authRouter.get("/init", loginLimiter, authInitInfoHandler);
authRouter.post("/init", loginLimiter, authInitHandler);
authRouter.post("/login", loginLimiter, authLoginHandler);
authRouter.get("/re-auth", captchaLimiter, startReAuthHandler);
authRouter.post("/re-auth", captchaLimiter, verifyReAuthHandler);
authRouter.get("/reset-captcha", captchaLimiter, resetCaptchaHandler);
authRouter.get("/reset-password", resetPasswordHandler);
authRouter.post("/reset-password", resetPasswordHandler);

export { authRouter };
