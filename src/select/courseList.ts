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
    jx0502id: "49",
    kclbs: courseType,
    kkdws: office,
    njs: grade,
    kcmc: courseName,
    zys: major,
  });

  if (week) params.append("xq", week);
  if (index) params.append("jc", index);

  const response = await fetch(`${server}xk/SearchKC`, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.join(", "),
    }),
    body: `jx0502id=49&kclbs=${courseType}&kxh=&skjs=&xq=&jx0502id=${major}&jx0502zbid=${grade}&sfktx=1&sfkxk=1`,
  });

  // TODO: Add failed logic

  const courses = (<Record<string, string>[]>await response.json()).map(
    ({ kch, hcmc, kkdw, kclb }) => ({
      id: kch,
      name: hcmc,
      office: kkdw,
      type: kclb,
    })
  );

  res.json({ status: "success", courses });
};
