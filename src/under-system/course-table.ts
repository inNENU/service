import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import { underSystemLogin } from "./login.js";
import { getTimeStamp } from "./utils.js";
import type { LoginFailedData, LoginOptions } from "../auth/index.js";
import type { EmptyObject } from "../typings.js";
import { IE_8_USER_AGENT, getCookieHeader } from "../utils/index.js";

interface UnderCourseTableAuthOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

interface UnderCourseTableCookieOptions {
  cookies: Cookie[];
  id: number;
  time: string;
}

export type UserCourseTableOptions =
  | UnderCourseTableAuthOptions
  | UnderCourseTableCookieOptions;

export interface ClassItem {
  name: string;
  teacher: string;
  time: string;
  location: string;
}

export type CellItem = ClassItem[];
export type RowItem = CellItem[];
export type TableItem = RowItem[];

const courseTableRegExp = /<table id="kbtable" [\s\S]*?>([\s\S]+?)<\/table>/;
const courseRowRegExp =
  /<tr>\s+<td .*>\s+\d+\s+<\/td>\s+((?:<td .*>[\s\S]+?<\/td>\s*?)+)\s+<\/tr>/g;
const courseCellRegExp =
  /<td .*?>\s+<div id="\d-\d-\d"\s?>([\s\S]+?)<\/div>[\s\S]+?<\/td>/g;

const classRegExp =
  /<a .*?>(\S+?)<br>(\S+?)<br>\s*<nobr>\s*(\S+?)<nobr><br>(\S+?)<br><br>\s*<\/a>/g;

const getCourses = (content: string): TableItem => {
  const table = courseTableRegExp.exec(content)?.[0];

  if (!table) throw new Error("Failed to get course table");

  return [...table.matchAll(courseRowRegExp)].map(([, rowContent]) =>
    [...rowContent.matchAll(courseCellRegExp)].map(([, cell]) =>
      [...cell.matchAll(classRegExp)].map(
        ([, name, teacher, time, location]) => (
          console.log(name, teacher, time, location),
          {
            name,
            teacher,
            time,
            location,
          }
        )
      )
    )
  );
};

export const underCourseTableHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UserCourseTableOptions
> = async (req, res) => {
  try {
    let cookies: Cookie[] = [];

    const { id, time } = req.body;

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await underSystemLogin(req.body);

      if (result.status === "failed") return res.json(result);

      ({ cookies } = result);
    }

    await fetch("https://dsjx.webvpn.nenu.edu.cn/Logon.do?method=logonBySSO", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: getCookieHeader(cookies),
        Referer: "https://dsjx.webvpn.nenu.edu.cn/framework/main.jsp",
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    const params = new URLSearchParams({
      method: "goListKbByXs",
      istsxx: "no",
      xnxqh: time,
      zc: "",
      xs0101id: id.toString(),
    });

    console.log("Using params", params);

    const headers = {
      Cookie: getCookieHeader(cookies),
      Referer: `https://dsjx.webvpn.nenu.edu.cn/tkglAction.do?method=kbxxXs&tktime=${getTimeStamp().toString()}`,
      "User-Agent": IE_8_USER_AGENT,
    };

    console.log("Using headers", headers);

    const response = await fetch(
      `https://dsjx.webvpn.nenu.edu.cn/tkglAction.do?${params.toString()}`,
      {
        headers,
      }
    );

    console.log(response.status);

    const content = await response.text();

    const tableData = getCourses(content);

    return res.json(tableData);
  } catch (err) {
    res.json(<LoginFailedData>{
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};