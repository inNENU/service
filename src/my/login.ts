import { CookieStore } from "@mptool/net";

import { WEB_VPN_AUTH_SERVER } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import { ActionFailType, unknownResponse } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { FORBIDDEN_URL } from "../vpn/index.js";
import { MY_MAIN_PAGE, MY_SERVER } from "./utils.js";

export interface MyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type MyLoginFailedResponse = AuthLoginFailedResponse | VPNLoginFailedResponse;

export type MyLoginResult = MyLoginSuccessResult | MyLoginFailedResponse;

export const myLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<MyLoginResult> =>
  loginPipeline(
    options,
    {
      service: MY_MAIN_PAGE,
      webVPN: true,
      ticket: {
        referer: WEB_VPN_AUTH_SERVER,
        onNonRedirect: (status) => {
          console.error("Login to my failed", status);

          return unknownResponse("由于当前账户权限缺失，服务大厅登录失败。");
        },
      },
      verify: async ({ cookieStore: store, location, finalLocation: sessionLocation }) => {
        if (sessionLocation?.includes("jsessionid=")) {
          const mainResponse = await fetch(sessionLocation, {
            headers: {
              Cookie: store.getHeader(location),
              Referer: MY_SERVER,
            },
            redirect: "manual",
          });

          store.applyResponse(mainResponse, sessionLocation);

          const content = await mainResponse.text();

          if (content.includes("<title>网上服务大厅</title>")) {
            return {
              success: true,
              cookieStore: store,
            };
          }
        }

        if (sessionLocation === FORBIDDEN_URL) {
          return {
            success: false,
            type: ActionFailType.Forbidden,
            msg: "当前系统暂未开放",
          };
        }

        console.error("login to my failed", sessionLocation);

        return unknownResponse("登录失败");
      },
    },
    cookieStore,
  );

export const { loginTo: loginToMy, loginHandler: myLoginHandler } = createLoginHandlers(
  myLogin,
  MY_SERVER,
);
