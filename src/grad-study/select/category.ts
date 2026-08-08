import { request } from "@/utils/index.js";

import {
  TEST_UNDER_SELECT_CATEGORY_RESPONSE,
  getSelectCategories,
} from "../../study/select/index.js";
import type { SelectCategoryResponse } from "../../study/select/index.js";
import { GRAD_STUDY_SERVER } from "../utils.js";

export const gradSelectCategoryHandler = request<SelectCategoryResponse>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_UNDER_SELECT_CATEGORY_RESPONSE);

  return res.json(await getSelectCategories(cookieHeader, GRAD_STUDY_SERVER));
});
