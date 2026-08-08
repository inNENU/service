import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { WEB_VPN_AUTH_SERVER } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import { ActionFailType, unknownResponse } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { ACTION_443_SERVER, ACTION_LOGIN_ENDPOINT, ACTION_SERVER } from "./utils.js";

export interface ActionLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type ActionLoginResult =
  | ActionLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const actionLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<ActionLoginResult> =>
  loginPipeline(
    options,
    {
      service: ACTION_LOGIN_ENDPOINT,
      webVPN: true,
      // oxlint-disable-next-line typescript/consistent-return
      beforeAuth: async (store) => {
        const mainResponse = await fetch(ACTION_443_SERVER, {
          headers: {
            Cookie: store.getHeader(ACTION_443_SERVER),
          },
          redirect: "manual",
        });

        if (mainResponse.status !== 302) {
          console.error(
            "action login failed with unknown mainResponse",
            mainResponse.status,
            mainResponse,
            await mainResponse.text(),
          );

          return unknownResponse("未知错误");
        }

        store.applyResponse(mainResponse, ACTION_443_SERVER);
      },
      verify: async ({ cookieStore: store, location: mainLocation }) => {
        // https://m-443.webvpn.nenu.edu.cn/system/resource/code/auth/clogin.jsp?ticket=XXX
        if (!mainLocation.startsWith(ACTION_LOGIN_ENDPOINT)) {
          console.error("action login failed with unknown ticket location", mainLocation);

          return unknownResponse("unknown");
        }

        const ticket443Response = await fetch(mainLocation, {
          headers: {
            Cookie: store.getHeader(mainLocation),
            Referer: WEB_VPN_AUTH_SERVER,
          },
          redirect: "manual",
        });

        store.applyResponse(ticket443Response, mainLocation);

        if (ticket443Response.status !== 302) {
          console.error(
            "action login failed with unknown ticketResponse",
            ticket443Response.status,
            ticket443Response,
            await ticket443Response.text(),
          );

          return unknownResponse("unknown");
        }

        // https://m.webvpn.nenu.edu.cn/system/resource/code/auth/clogin.jsp?ticket=XXX
        const ticketLocation = ticket443Response.headers.get("Location")!;

        if (!ticketLocation.startsWith(ACTION_SERVER)) {
          console.error("action login failed with unknown ticketResponse location", ticketLocation);

          return unknownResponse("unknown");
        }

        const ticketResponse = await fetch(ticketLocation, {
          headers: {
            Cookie: store.getHeader(ticketLocation),
            Referer: WEB_VPN_AUTH_SERVER,
          },
          redirect: "manual",
        });

        store.applyResponse(ticketResponse, ticketLocation);

        if (ticketResponse.status !== 301) {
          console.error(
            "action login failed with unknown ticket",
            ticketResponse.status,
            ticketResponse,
            await ticketResponse.text(),
          );

          return unknownResponse("登录失败");
        }

        // https://m-443.webvpn.nenu.edu.cn/system/resource/code/auth/clogin.jsp
        const mainPageLocation = ticketResponse.headers.get("Location")!;

        if (mainPageLocation !== ACTION_LOGIN_ENDPOINT) {
          console.error("action login failed with unknown main page location", mainPageLocation);

          return unknownResponse("unknown");
        }

        const mainPageResponse = await fetch(mainPageLocation, {
          headers: {
            Cookie: store.getHeader(mainPageLocation),
            Referer: ticketLocation,
          },
          redirect: "manual",
        });

        store.applyResponse(mainPageResponse, mainPageLocation);

        if (mainPageResponse.status !== 302) {
          console.error(
            "action login failed with unknown pure action status code",
            mainPageResponse.status,
            mainPageResponse,
            await mainPageResponse.text(),
          );

          return unknownResponse("登录失败");
        }

        // https://m.webvpn.nenu.edu.cn/index.jsp?null
        const finalLocation = mainPageResponse.headers.get("Location")!;

        if (finalLocation !== `${ACTION_SERVER}/index.jsp?null`) {
          console.error("action login failed with unknown final location", finalLocation);

          return unknownResponse("unknown");
        }

        const finalResponse = await fetch(finalLocation, {
          headers: {
            Cookie: store.getHeader(finalLocation),
            Referer: mainPageLocation,
          },
          redirect: "manual",
        });

        store.applyResponse(finalResponse, finalLocation);

        if (finalResponse.status !== 301) {
          console.error(
            "action login failed with unknown final status code",
            finalResponse.status,
            finalResponse,
            await finalResponse.text(),
          );

          return unknownResponse("登录失败");
        }

        // https://m-443.webvpn.nenu.edu.cn/index.jsp?null
        const final443Location = finalResponse.headers.get("Location")!;

        if (final443Location !== `${ACTION_443_SERVER}/index.jsp?null`) {
          console.error("action login failed with unknown final 443 location", final443Location);

          return unknownResponse("登录失败");
        }

        const final443Response = await fetch(final443Location, {
          headers: {
            Cookie: store.getHeader(final443Location),
            Referer: finalLocation,
          },
          redirect: "manual",
        });

        if (final443Response.status !== 200) {
          console.error(
            "action login failed with unknown action final status code",
            final443Response.status,
            final443Response,
            await final443Response.text(),
          );

          return unknownResponse("登录失败");
        }

        store.applyResponse(final443Response, final443Location);

        const content = await final443Response.text();

        if (!content.includes("融合门户")) {
          console.error("action login failed", content.slice(0, 200));

          return unknownResponse("登录失败");
        }

        const info = /pfs.comm.showDialog\("(.*?)",/u.exec(content)?.[1];

        if (info) {
          console.error("action login forbidden:", info);

          return {
            success: false,
            type: ActionFailType.Forbidden,
            msg: info,
          };
        }

        return {
          success: true,
          cookieStore: store,
        };
      },
    },
    cookieStore,
  );

export type ActionLoginFailedResponse = AuthLoginFailedResponse | VPNLoginFailedResponse;

export interface ActionLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type ActionLoginResponse = ActionLoginSuccessResponse | ActionLoginFailedResponse;

export const { loginTo: loginToAction, loginHandler: actionLoginHandler } = createLoginHandlers(
  actionLogin,
  ACTION_443_SERVER,
);
