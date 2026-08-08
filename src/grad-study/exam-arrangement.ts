import { request } from "@/utils/index.js";

import {
  TEST_EXAM_ARRANGEMENT_RESPONSE,
  getStudyExamArrangement,
} from "../study/exam-arrangement.js";
import type {
  ExamArrangementQueryOptions,
  ExamArrangementResponse,
} from "../study/exam-arrangement.js";
import { GRAD_STUDY_SERVER } from "./utils.js";

export type * from "../study/exam-arrangement.js";

export const gradStudyExamArrangementHandler = request<
  ExamArrangementResponse,
  ExamArrangementQueryOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_EXAM_ARRANGEMENT_RESPONSE);

  return res.json(await getStudyExamArrangement(cookieHeader, GRAD_STUDY_SERVER, req.body));
});
