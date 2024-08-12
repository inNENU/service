import type { Express } from "express";

import { activateHandler } from "./activate/index.js";
import { authCaptchaHandler } from "./captcha.js";
import { changePasswordHandler } from "./change-password.js";
import { authEncryptHandler } from "./encrypt.js";
import { authInitHandler, authInitInfoHandler } from "./init/index.js";
import { authLoginHandler } from "./login.js";
import { reAuthHandler } from "./re-auth/index.js";
import { resetPasswordHandler } from "./reset/index.js";
import { resetCaptchaHandler } from "./reset-captcha.js";

export const registerAuthRoutes = (app: Express): void => {
  app.get("/auth/activate", activateHandler);
  app.post("/auth/activate", activateHandler);
  app.post("/auth/encrypt", authEncryptHandler);
  app.get("/auth/auth-captcha", authCaptchaHandler);
  app.post("/auth/auth-captcha", authCaptchaHandler);
  app.post("/auth/change-password", changePasswordHandler);
  app.patch("/auth/change-password", changePasswordHandler);
  app.get("/auth/init", authInitInfoHandler);
  app.post("/auth/init", authInitHandler);
  app.post("/auth/login", authLoginHandler);
  app.get("/auth/re-auth", reAuthHandler);
  app.post("/auth/re-auth", reAuthHandler);
  app.get("/auth/reset-captcha", resetCaptchaHandler);
  app.get("/auth/reset-password", resetPasswordHandler);
  app.post("/auth/reset-password", resetPasswordHandler);
};
