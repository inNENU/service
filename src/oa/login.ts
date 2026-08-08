import { CookieStore } from "@mptool/net";

import { WEB_VPN_AUTH_SERVER } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import { unknownResponse } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { OA_ENTRANCE_PAGE, OA_MAIN_PAGE, OA_WEB_VPN_SERVER } from "./utils.js";

export interface OALoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type OALoginFailedResponse = AuthLoginFailedResponse | VPNLoginFailedResponse;

export type OALoginResult = OALoginSuccessResult | OALoginFailedResponse;

export const oaLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<OALoginResult> =>
  loginPipeline(
    options,
    {
      service: OA_ENTRANCE_PAGE,
      webVPN: true,
      ticket: {
        referer: WEB_VPN_AUTH_SERVER,
        onNonRedirect: (status) => {
          console.error("Login to oa failed", status);

          return unknownResponse("登录失败");
        },
      },
      verify: async ({ cookieStore: store, finalLocation: sessionLocation }) => {
        if (sessionLocation?.includes("jsessionid=")) {
          const sessionResponse = await fetch(sessionLocation, {
            headers: {
              Cookie: store.getHeader(sessionLocation),
              Referer: OA_WEB_VPN_SERVER,
            },
            redirect: "manual",
          });

          store.applyResponse(sessionResponse, sessionLocation);

          if (
            sessionResponse.status === 302 &&
            sessionResponse.headers.get("Location") === OA_MAIN_PAGE
          ) {
            return {
              success: true,
              cookieStore: store,
            };
          }
        }

        console.error("login to oa failed", sessionLocation);

        return unknownResponse("登录失败");
      },
    },
    cookieStore,
  );

export const { loginTo: loginToOA, loginHandler: oaLoginHandler } = createLoginHandlers(
  oaLogin,
  OA_WEB_VPN_SERVER,
);
