import { CookieStore } from "@mptool/net";

import { AUTH_SERVER } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import { unknownResponse } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import { AUTH_INFO_PAGE } from "./utils.js";

export interface AuthCenterLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type AuthCenterLoginFailResult = AuthLoginFailedResponse;

export type AuthCenterLoginResult = AuthCenterLoginSuccessResult | AuthCenterLoginFailResult;

export const authCenterLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<AuthCenterLoginResult> =>
  loginPipeline(
    options,
    {
      service: AUTH_INFO_PAGE,
      ticket: {
        referer: AUTH_SERVER,
      },
      verify: ({ cookieStore: store, finalLocation }) => {
        if (finalLocation === AUTH_INFO_PAGE) {
          return {
            success: true,
            cookieStore: store,
          };
        }

        return unknownResponse("登录失败");
      },
    },
    cookieStore,
  );

export const { loginHandler: authCenterLoginHandler } = createLoginHandlers(
  authCenterLogin,
  AUTH_SERVER,
);
