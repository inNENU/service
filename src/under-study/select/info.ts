import { missingArgResponse, unknownResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { getSelectInfo } from "../../study/select/index.js";
import type { UnderSelectInfoOptions, UnderSelectInfoResponse } from "../../study/select/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export const underStudySelectInfoHandler = request<UnderSelectInfoResponse, UnderSelectInfoOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;
    const { link } = req.body;

    if (!link) return res.json(missingArgResponse("link"));

    if (cookieHeader.includes("TEST"))
      return res.json(unknownResponse("因子系统逻辑复杂，测试账号暂不提供选课操作模拟"));

    return res.json(await getSelectInfo(cookieHeader, link, UNDER_STUDY_SERVER));
  },
);
