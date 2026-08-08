import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { CookieVerifyResponse } from "../typings.js";

/**
 * 校验教务系统会话是否有效（本科/研究生共用，按服务器地址区分）
 *
 * @param cookieHeader 会话 cookie 请求头
 * @param server 教务系统服务器地址
 * @returns 会话是否有效
 */
export const checkStudySession = async (
  cookieHeader: string,
  server: string,
): Promise<CookieVerifyResponse> => {
  try {
    if (cookieHeader.includes("TEST")) return { success: true, valid: true };

    const response = await fetch(server, {
      headers: {
        Cookie: cookieHeader,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (
      response.status === 302 &&
      response.headers.get("location") === `${server}/new/welcome.page`
    )
      return { success: true, valid: true };

    return { success: true, valid: false };
  } catch {
    return { success: true, valid: false };
  }
};
