import { CookieStore } from "@mptool/net";

import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { createLoginHandlers, loginPipeline } from "../auth/login-pipeline.js";
import { unknownResponse } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import { GRAD_STUDY_SERVER } from "./utils.js";

const SSO_LOGIN_URL = `${GRAD_STUDY_SERVER}/new/ssoLogin`;
const MAIN_URL = `${GRAD_STUDY_SERVER}/new/welcome.page`;

export interface GradStudyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type GradStudyLoginFailedResponse = AuthLoginFailedResponse;

export type GradStudyLoginResult = GradStudyLoginSuccessResult | GradStudyLoginFailedResponse;

export const gradStudyLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<GradStudyLoginResult> =>
  loginPipeline(
    options,
    {
      service: SSO_LOGIN_URL,
      ticket: {
        headers: EDGE_USER_AGENT_HEADERS,
        timeout: 10_000,
      },
      verify: async ({ cookieStore: store, finalLocation }) => {
        if (finalLocation === SSO_LOGIN_URL) {
          const ssoResponse = await fetch(SSO_LOGIN_URL, {
            headers: {
              Cookie: store.getHeader(SSO_LOGIN_URL),
              Referer: GRAD_STUDY_SERVER,
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

export const { loginTo: loginToGradStudy, loginHandler: gradStudyLoginHandler } =
  createLoginHandlers(gradStudyLogin, GRAD_STUDY_SERVER);
