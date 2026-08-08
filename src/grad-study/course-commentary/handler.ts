import type { RequestHandler } from "express";

import { invalidArgResponse, missingArgResponse } from "@/config/index.js";
import type { EmptyObject } from "@/typings.js";

import {
  COURSE_COMMENTARY_LIST_TEST_RESPONSE,
  COURSE_COMMENTARY_VIEW_TEST_RESPONSE,
  getCommentary,
  listCommentary,
  submitCommentary,
  viewCommentary,
} from "../../study/course-commentary/index.js";
import type {
  GetCourseCommentaryOptions,
  ListCourseCommentaryOptions,
  SubmitCourseCommentaryOptions,
  ViewCourseCommentaryOptions,
} from "../../study/course-commentary/index.js";
import { GRAD_STUDY_SERVER } from "../utils.js";

type CourseCommentaryOptions =
  | ListCourseCommentaryOptions
  | ViewCourseCommentaryOptions
  | GetCourseCommentaryOptions
  | SubmitCourseCommentaryOptions;

export const gradStudyCourseCommentaryHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CourseCommentaryOptions
> = async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (req.body.type === "list") {
    if (cookieHeader.includes("TEST")) return res.json(COURSE_COMMENTARY_LIST_TEST_RESPONSE);

    return res.json(await listCommentary(cookieHeader, req.body.time, GRAD_STUDY_SERVER));
  }

  if (req.body.type === "view") {
    const { commentaryCode } = req.body;

    if (cookieHeader.includes("TEST")) return res.json(COURSE_COMMENTARY_VIEW_TEST_RESPONSE);

    if (!commentaryCode) return res.json(missingArgResponse("commentaryCode"));

    return res.json(await viewCommentary(cookieHeader, req.body.commentaryCode, GRAD_STUDY_SERVER));
  }

  if (req.body.type === "get") {
    const { courseCode, teacherCode } = req.body;

    if (!courseCode) return res.json(missingArgResponse("courseCode"));
    if (!teacherCode) return res.json(missingArgResponse("teacherCode"));

    return res.json(await getCommentary(cookieHeader, courseCode, teacherCode, GRAD_STUDY_SERVER));
  }

  if (req.body.type === "submit")
    return res.json(await submitCommentary(cookieHeader, req.body, GRAD_STUDY_SERVER));

  return res.json(invalidArgResponse("type"));
};
