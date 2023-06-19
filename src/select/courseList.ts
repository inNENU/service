import type { RequestHandler } from "express";
import type { SelectBaseOptions } from "./typings.js";

export interface CourseListOptions extends SelectBaseOptions {
  /** 年级 */
  grade?: string;
  /** 专业 */
  major?: string;
  /** 课程类型 */
  courseType?: string;
  /** 课程名称 */
  courseName?: string;
  /** 开课单位 */
  office?: string;
  /** 周次 */
  week?: string;
  /** 节次 */
  index?: string;
}

export interface CourseInfo {
  /** 课程号 */
  id: string;
  /** 课程名称 */
  name: string;
  /** 开课单位 */
  office: string;
  /** 课程类型 */
  type: string;
}

export interface CourseListSuccessResponse {
  status: "success";
  courses: CourseInfo[];
}

export const courseListHandler: RequestHandler = async (req, res) => {
  try {
    const {
      cookies,
      server,
      grade = "",
      major = "",
      courseType = "",
      courseName = "",
      office = "",
      week = "",
      index = "",
    } = <CourseListOptions>req.body;

    const params = new URLSearchParams({
      // check this
      jx0502id: "59",
      kclbs: courseType,
      kkdws: office,
      njs: grade,
      kcmc: courseName,
      zys: major,
      xq: week,
      jc: index,
    });

    const url = `${server}xk/SeachKC`;

    console.log("Searching with", url, params.toString());

    const response = await fetch(url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies.join(", "),
      }),
      body: params.toString(),
    });

    try {
      const data = <Record<string, string>[]>await response.json();

      console.log("Raw data:", data);

      const courses = data.map(({ kch, hcmc, kkdw, kclb }) => ({
        id: kch,
        name: hcmc,
        office: kkdw,
        type: kclb,
      }));

      console.log("Getting courses:", courses);

      res.json({ status: "success", courses });
    } catch (err) {
      console.error(err);
      res.json({ status: "failed", err: (<Error>err).message });
    }
  } catch (err) {
    console.error(err);
    res.json({ status: "failed", err: (<Error>err).message });
  }
};
