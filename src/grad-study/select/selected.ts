import { missingArgResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { getSelectedCourses } from "../../study/select/index.js";
import type { SelectSelectedOptions, SelectSelectedResponse } from "../../study/select/index.js";
import { GRAD_STUDY_SERVER } from "../utils.js";

export const gradSelectSelectedHandler = request<SelectSelectedResponse, SelectSelectedOptions>(
  async (req, res) => {
    const { link } = req.body;
    const cookieHeader = req.headers.cookie!;

    if (!link) return res.json(missingArgResponse("link"));

    return res.json(await getSelectedCourses(link, cookieHeader, GRAD_STUDY_SERVER));
  },
);
