import type { RequestHandler } from "express";

import type { SelectBaseOptions } from "./typings.js";

export interface SearchOptions extends SelectBaseOptions {
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
  jx0502id: string;
}

export interface CourseBasicInfo {
  /** 课程号 */
  id: string;
  /** 课程名称 */
  name: string;
  /** 开课单位 */
  office: string;
  /** 课程类型 */
  type: string;
}

export interface SearchSuccessResponse {
  status: "success";
  courses: CourseBasicInfo[];
}

export interface SearchFailedResponse {
  status: "failed";
  msg: string;
}

export type SearchResponse = SearchSuccessResponse | SearchFailedResponse;

export const searchHandler: RequestHandler = async (req, res) => {
  try {
    const {
      cookies,
      server,
      jx0502id,
      grade = "",
      major = "",
      courseType = "",
      courseName = "",
      office = "",
      week = "",
      index = "",
    } = <SearchOptions>req.body;

    // Tip: kcmc is not URL encoded
    const params = Object.entries({
      jx0502id,
      kclbs: courseType,
      kkdws: office,
      njs: grade,
      kcmc: courseName,
      zys: major,
      xq: week,
      jc: index,
    })
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const url = `${server}xk/SeachKC`;

    console.log("Searching with", url, params);

    const response = await fetch(url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookies.join(", "),
      }),
      body: params,
    });

    const rawData = await response.text();

    console.log("Raw data:", rawData);

    if (rawData.match(/\s+<!DOCTYPE html/))
      return res.json({ status: "failed", msg: "请重新登录" });

    try {
      const courses = (<Record<string, string>[]>JSON.parse(rawData)).map(
        ({ kch, kcmc, kkdw, szklb }) => ({
          id: kch,
          name: kcmc,
          office: kkdw,
          type: szklb,
        })
      );

      console.log(`Getting ${courses.length} courses`);

      res.json({ status: "success", courses });
    } catch (err) {
      console.error(err);
      res.json({ status: "failed", msg: (<Error>err).message });
    }
  } catch (err) {
    console.error(err);
    res.json({ status: "failed", msg: (<Error>err).message });
  }
};
