import { cookies2Header, request } from "@/utils/index.js";

import { checkStudySession } from "../study/check.js";
import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { GRAD_STUDY_SERVER } from "./utils.js";

export const gradStudyCheckHandler = request<CookieVerifyResponse, CookieOptions>(
  async (req, res) => {
    const cookieHeader = cookies2Header(req.body.cookies) ?? req.headers.cookie ?? "";

    return res.json(await checkStudySession(cookieHeader, GRAD_STUDY_SERVER));
  },
);
