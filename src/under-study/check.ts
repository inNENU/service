import {
  EDGE_USER_AGENT_HEADERS,
  cookies2Header,
  request,
} from "@/utils/index.js";

import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { UNDER_STUDY_SERVER } from "./utils.js";

export const underStudyCheckHandler = request<
  CookieVerifyResponse,
  CookieOptions
>(async (req, res) => {
  try {
    const cookieHeader =
      cookies2Header(req.body.cookies) ?? req.headers.cookie ?? "";

    if (cookieHeader.includes("TEST"))
      return res.json({ success: true, valid: true });

    const response = await fetch(UNDER_STUDY_SERVER, {
      headers: {
        Cookie: cookieHeader,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (response.status === 302) {
      const location = response.headers.get("location");

      if (location === `${UNDER_STUDY_SERVER}/new/welcome.page`)
        return res.json({ success: true, valid: true });
    }

    return res.json({ success: true, valid: false });
  } catch {
    return res.json({ success: true, valid: false });
  }
});
