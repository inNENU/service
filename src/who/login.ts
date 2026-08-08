import { CookieStore } from "@mptool/net";

import { WEB_VPN_AUTH_SERVER } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import { unknownResponse } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { WHO_AUTH_URL, WHO_HOMEPAGE, WHO_SERVER, WHO_SERVICE } from "./utils.js";

export interface WhoLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type WhoLoginFailedResponse = AuthLoginFailedResponse | VPNLoginFailedResponse;

export type WhoLoginResult = WhoLoginSuccessResult | WhoLoginFailedResponse;

export const whoLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<WhoLoginResult> =>
  loginPipeline(
    options,
    {
      service: WHO_SERVICE,
      webVPN: true,
      beforeAuth: async (store) => {
        const whoAuthResponse = await fetch(WHO_AUTH_URL, {
          headers: {
            Cookie: store.getHeader(WHO_SERVER),
          },
          redirect: "manual",
        });

        store.applyResponse(whoAuthResponse, WHO_AUTH_URL);
      },
      ticket: {},
      verify: async ({ cookieStore: store, finalLocation }) => {
        if (finalLocation !== WHO_HOMEPAGE) {
          console.error("Login to Who failed", finalLocation);

          return unknownResponse("登录失败");
        }

        const finalResponse = await fetch(finalLocation, {
          headers: {
            Cookie: store.getHeader(finalLocation),
            Referer: WEB_VPN_AUTH_SERVER,
          },
          redirect: "manual",
        });

        store.applyResponse(finalResponse, finalLocation);

        return {
          success: true,
          cookieStore: store,
        };
      },
    },
    cookieStore,
  );

export const { loginTo: loginToWho, loginHandler: whoLoginHandler } = createLoginHandlers(
  whoLogin,
  WHO_SERVER,
);
