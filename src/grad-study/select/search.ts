import { missingArgResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { searchSelectCourses } from "../../study/select/index.js";
import type { SelectSearchOptions, SelectSearchResponse } from "../../study/select/index.js";
import { GRAD_STUDY_SERVER } from "../utils.js";

export const gradSelectSearchHandler = request<SelectSearchResponse, SelectSearchOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (!req.body.link) return res.json(missingArgResponse("link"));

    return res.json(await searchSelectCourses(req.body, cookieHeader, GRAD_STUDY_SERVER));
  },
);
