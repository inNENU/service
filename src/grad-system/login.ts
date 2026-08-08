import { CookieStore } from "@mptool/net";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import { ActionFailType, unknownResponse, WAF_URL } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import { CALLBACK_URL, GRAD_SYSTEM_SERVER } from "./utils.js";

export interface GradSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type GradSystemLoginResult = GradSystemLoginSuccessResult | AuthLoginFailedResponse;

export const gradSystemLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<GradSystemLoginResult> =>
  loginPipeline(
    options,
    {
      service: `${GRAD_SYSTEM_SERVER}/HProg/yjsy/index_pc.php`,
      ticket: {},
      verify: async ({ cookieStore: store, finalLocation }) => {
        if (finalLocation?.includes(WAF_URL)) {
          return {
            success: false,
            type: ActionFailType.Forbidden,
            msg: "此账户无法登录研究生教学服务系统",
          };
        }

        if (finalLocation === CALLBACK_URL) {
          const indexResponse = await fetch(finalLocation, {
            headers: {
              Cookie: store.getHeader(finalLocation),
            },
          });

          store.applyResponse(indexResponse, finalLocation);

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

export const { loginTo: loginToGradSystem, loginHandler: gradSystemLoginHandler } =
  createLoginHandlers(gradSystemLogin, GRAD_SYSTEM_SERVER, { testMode: false });
