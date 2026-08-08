import { missingArgResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { getSelectClasses } from "../../study/select/index.js";
import type {
  UnderSelectClassOptions,
  UnderSelectClassResponse,
} from "../../study/select/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export const underSelectClassHandler = request<UnderSelectClassResponse, UnderSelectClassOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;
    const { link, courseId } = req.body;

    if (!link) return res.json(missingArgResponse("link"));
    if (!courseId) return res.json(missingArgResponse("courseId"));

    return res.json(await getSelectClasses(link, courseId, cookieHeader, UNDER_STUDY_SERVER));
  },
);
