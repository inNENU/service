import { missingArgResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { getSelectClasses } from "../../study/select/index.js";
import type { SelectClassOptions, SelectClassResponse } from "../../study/select/index.js";
import { GRAD_STUDY_SERVER } from "../utils.js";

export const gradSelectClassHandler = request<SelectClassResponse, SelectClassOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;
    const { link, courseId } = req.body;

    if (!link) return res.json(missingArgResponse("link"));
    if (!courseId) return res.json(missingArgResponse("courseId"));

    return res.json(await getSelectClasses(link, courseId, cookieHeader, GRAD_STUDY_SERVER));
  },
);
