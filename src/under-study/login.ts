import { CookieStore } from "@mptool/net";

import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import { AUTH_SERVER, WEB_VPN_AUTH_SERVER } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import type { ActionFailType } from "../config/index.js";
import { RestrictedResponse, unknownResponse } from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { UNDER_STUDY_SERVER, UNDER_STUDY_VPN_SERVER } from "./utils.js";

export interface UnderStudyLoginOptions extends AccountInfo {
  webVPN?: boolean;
}

export interface UnderStudyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type UnderStudyLoginResult =
  | UnderStudyLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Restricted>;

export const underStudyLogin = async (
  { webVPN = false, ...options }: UnderStudyLoginOptions,
  cookieStore = new CookieStore(),
): Promise<UnderStudyLoginResult> => {
  const server = webVPN ? UNDER_STUDY_VPN_SERVER : UNDER_STUDY_SERVER;
  const SSO_LOGIN_URL = `${server}/new/ssoLogin`;
  const MAIN_URL = `${server}/new/welcome.page`;

  return loginPipeline(
    options,
    {
      service: SSO_LOGIN_URL,
      webVPN,
      ticket: {
        referer: webVPN ? WEB_VPN_AUTH_SERVER : AUTH_SERVER,
        timeout: 10_000,
        ...(webVPN
          ? {
              transformUrl: (location) =>
                location.replace(UNDER_STUDY_SERVER, UNDER_STUDY_VPN_SERVER),
            }
          : {}),
        onNonRedirect: (status) => (status === 405 ? RestrictedResponse : null),
      },
      verify: async ({ cookieStore: store, finalLocation }) => {
        if (finalLocation === SSO_LOGIN_URL) {
          const ssoResponse = await fetch(SSO_LOGIN_URL, {
            headers: {
              Cookie: store.getHeader(SSO_LOGIN_URL),
              Referer: server,
              ...EDGE_USER_AGENT_HEADERS,
            },
            redirect: "manual",
            signal: AbortSignal.timeout(10_000),
          });

          if (
            ssoResponse.status === 302 &&
            ssoResponse.headers.get("Location")?.startsWith(MAIN_URL)
          ) {
            return {
              success: true,
              cookieStore: store,
            };
          }
        }

        return unknownResponse("登录失败");
      },
    },
    cookieStore,
  );
};

export type UnderStudyLoginFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Restricted>;

export const { loginTo: loginToUnderStudy, loginHandler: underStudyLoginHandler } =
  createLoginHandlers(underStudyLogin, UNDER_STUDY_SERVER);
