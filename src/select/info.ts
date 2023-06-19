import type { RequestHandler } from "express";
import type { SelectBaseOptions } from "./typings.js";
import { COURSE_TYPE } from "./utils.js";
import { readResponseContent } from "../utils/content.js";

export interface CourseInfo {
  /** 名称 */
  name: string;
  /** 开课单位 */
  office: string;
  /** 类别 */
  type: string;
  /** 学分 */
  point: string;
  /** 容量 */
  capacity: string;
  /** 任课教师 */
  teacher: string;
  /** 上课周次 */
  week: string;
  /** 上课时间 */
  time: string;
  /** 上课地点 */
  place: string;
  /** 课 ID */
  cid: string;
  /** 课程 ID */
  id: string;

  /** 考试时间 */
  examTime: string;
  /** 周次类型 */
  weekType: string;
  /** 班级名称 */
  className: string;
}

export interface MajorInfo {
  /** 名称 */
  name: string;
  /** 编号 */
  id: string;
}

export interface SelectInfoSuccessResponse {
  status: "success";
  courses: CourseInfo[];
  courseType: string[];
  courseOffices: string[];
  majors: MajorInfo[];
  major: string;
  grade: string;
}

const officesReg = /<select id="kkdws" name="kkdws"[\s\S]*?<\/select>/;
const officeReg = /<option value="(.*?)" ?>/g;
const gradesReg = /<select id="njs" name="njs"[\s\S]*?<\/select>/;
const gradeReg = /<option value="(.*?)" selected>/;
const majorsReg = /<select id="zys" name="zys"[\s\S]*?<\/select>/;
const majorReg = /<option value="(.*?)" (?:selected)?>(.*?)<\/option>/g;
const currentMajorReg = /<option value="(.*?)" selected>/;

const courseInfoReg =
  /tmpKc\[0\] = " ";\s+tmpKc\[1\] = "(.*)";\s+tmpKc\[2\] = "(.*?)";\s+tmpKc\[3\] = "(.*?)";\s+tmpKc\[4\] = "(.*?)";.*tmpKc\[6\] = (\d+);\s+tmpKc\[7\] = "(.*?)";\s+tmpKc\[8\] = "(.*?)";\s+tmpKc\[9\] = "(.*?)";\s+tmpKc\[10\] = "(.*?)";\s+tmpKc\[11\] = "(.*?)";\s+tmpKc\[12\] = "(.*?)";[\s\S]*?tmpKc\[18\]="(.*?)";\s+tmpKc\[19\]="(.*?)";\s+tmpKc\[20\]="(.*?)";\s+tmpKc\[21\]="(.*?)"/g;

// cache
let courseOffices = <string[]>[];
let majors = <MajorInfo[]>[];
let courses = <CourseInfo[]>[];

export const selectInfoHandler: RequestHandler = async (req, res) => {
  const { cookies, server } = <SelectBaseOptions>req.body;

  const response = await fetch(
    `${server}xk/getXkInfo?jx0502zbid=148&jx0502id=59&sfktx=1&sfkxk=1`,
    {
      method: "GET",
      headers: new Headers({
        Cookie: cookies.join(", "),
      }),
    }
  );

  const actualText = await readResponseContent(response);

  const majorsText = majorsReg.exec(actualText)![0];

  if (!majors.length) {
    const majorsInfo = [];

    let majorMatch;

    while ((majorMatch = majorReg.exec(majorsText))) {
      majorsInfo.push({
        name: majorMatch[2],
        id: majorMatch[1],
      });
    }

    majors = majorsInfo;
  }

  const currentMajor = currentMajorReg.exec(majorsText)![1];

  const gradesText = gradesReg.exec(actualText)![0];
  const grade = gradeReg.exec(gradesText)![1];

  if (!courseOffices.length) {
    const officesText = officesReg.exec(actualText)![0];
    const courseOfficesInfo = [];

    let officeMatch;

    while ((officeMatch = officeReg.exec(officesText))) {
      courseOfficesInfo.push(officeMatch[1]);
    }

    courseOffices = courseOfficesInfo;
  }

  if (!courses.length) {
    const coursesInfo = [];

    let courseMatch;

    while ((courseMatch = courseInfoReg.exec(actualText))) {
      coursesInfo.push({
        name: courseMatch[1],
        office: courseMatch[2],
        type: courseMatch[3],
        point: courseMatch[4],
        capacity: courseMatch[5],
        teacher: courseMatch[6],
        week: courseMatch[7],
        time: courseMatch[8],
        place: courseMatch[9],
        cid: courseMatch[10],
        id: courseMatch[11],
        examTime: `${courseMatch[14]}-${courseMatch[12]}`,
        weekType: courseMatch[13],
        className: courseMatch[15],
      });
    }

    courses = coursesInfo;
  }

  console.log("Personal Information:", grade, currentMajor);

  const info: SelectInfoSuccessResponse = {
    status: "success",
    grade,
    major: currentMajor,
    courses,
    courseType: COURSE_TYPE,
    courseOffices,
    majors,
  };

  res.json(info);
};
