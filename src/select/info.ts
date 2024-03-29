import type { RequestHandler } from "express";

import { selectLogin } from "./login.js";
import type { CourseInfo, MajorInfo } from "./store.js";
import {
  gradesStore,
  postCoursesOfficeStore,
  postCoursesStore,
  postMajorsStore,
  postParamsStore,
  underCoursesOfficeStore,
  underCoursesStore,
  underMajorsStore,
  underParamsStore,
} from "./store.js";
import { POST_COURSE_TYPES, UNDER_COURSE_TYPES } from "./utils.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { getResponseContent, readResponseContent } from "../utils/index.js";

export interface CourseData {
  /** 课程名称 */
  name: string;
  /** 课程 ID */
  cid: string;
}

export interface StudentInfo {
  /** 当前学期 */
  period: string;
  /** 阶段 */
  stage: string;
  /** 姓名 */
  name: string;
  /** 学号 */
  id: string;
  /** 年级 */
  grade: string;
  /** 专业名 */
  majorName: string;
  max: number;
}

export interface SelectInfoSuccessResponse {
  success: true;
  jx0502id: string;
  jx0502zbid: string;

  /** 课程信息 */
  courses: CourseInfo[];
  /** 课程类别 */
  courseTypes: string[];
  /** 开课单位 */
  courseOffices: string[];
  /** 年级 */
  grades: string[];
  /** 专业 */
  majors: MajorInfo[];

  /** 当前校区 */
  currentLocation: "本部" | "净月";
  /** 当前专业 */
  currentMajor: string;
  /** 当前年级 */
  currentGrade: string;
  /** 课程表 */
  courseTable: CourseData[][][];
  /** 学生信息 */
  info: StudentInfo;
}

export type SelectInfoResponse =
  | SelectInfoSuccessResponse
  | CommonFailedResponse;

const officesReg = /<select id="kkdws" name="kkdws"[\s\S]*?<\/select>/;
const officeReg = /<option value="(.*?)" ?>/g;
const gradesReg = /<select id="njs" name="njs"[\s\S]*?<\/select>/;
const gradeReg = /<option value="(.*?)" (?:selected)?>(.*?)<\/option>/g;
const majorsReg = /<select id="zys" name="zys"[\s\S]*?<\/select>/;
const majorReg = /<option value="(.*?)" (?:selected)?>(.*?)<\/option>/g;
const infoReg =
  /class='tr_bg'\s*>\s*<font color="white">(.*?)&nbsp;&nbsp;.*选课 选课阶段：(.*?)<\/font><br>\s*<font color="white">姓名：(.*?)&nbsp;&nbsp;学号：(.*?)&nbsp;&nbsp;年级：(\d+)&nbsp;&nbsp;专业：(.*?)<\/font>/;
const maxCreditReg = /最多可选学分：(\d+)学分/;

const currentGradeReg = /<option value="(.*?)" selected>/;
const currentMajorReg = /<option value="(.*?)" selected>/;

const tableReg = /function binkbfzy()[\s\S]*?"<\/table>"/;
const courseRowReg =
  /str\+="<tr align='center' height='50' width='70'\s+bgcolor="\+ys\+" bordercolor='#E6E6E6'><td>.*?<\/td>/g;
const underCourseInfoReg =
  /tmpKc\[0\] = ".+";\s+tmpKc\[1\] = "(.*)";\s+tmpKc\[2\] = "(.*?)";\s+tmpKc\[3\] = "(.*?)";\s+tmpKc\[4\] = "(.*?)";[\s\S]+?tmpKc\[6\] = (\d+);\s+tmpKc\[7\] = "(.*?)";\s+tmpKc\[8\] = "(.*?)";\s+tmpKc\[9\] = "(.*?)";\s+tmpKc\[10\] = "(.*?)";\s+tmpKc\[11\] = "(.*?)";\s+tmpKc\[12\] = "(.*?)";[\s\S]*?tmpKc\[18\]="(.*?)";\s+tmpKc\[19\]="(.*?)";\s+tmpKc\[20\]="(.*?)";\s+tmpKc\[21\]="(.*?)"/g;
const postCourseInfoReg =
  /tmpKc\[0\] = ".+";\s+tmpKc\[1\] = "<a[^>]*?>\s*(.*)\s*<\/a>";\s+tmpKc\[2\] = "(.*?)";\s+tmpKc\[3\] = "(.*?)";\s+tmpKc\[4\] = "(.*?)";[\s\S]+?tmpKc\[6\] = (\d+);\s+tmpKc\[7\] = "(.*?)";\s+tmpKc\[8\] = "(.*?)";\s+tmpKc\[9\] = "(.*?)";\s+tmpKc\[10\] = "(.*?)";\s+tmpKc\[11\] = "(.*?)";\s+tmpKc\[12\] = "(.*?)";[\s\S]*?tmpKc\[18\]="(.*?)";\s+tmpKc\[19\]="(.*?)";\s+tmpKc\[20\]="(.*?)";\s+tmpKc\[21\]="(.*?)"/g;

const setGrades = (gradesText: string): void => {
  if (!gradesStore.state.length) {
    const gradesInfo = Array.from(gradesText.matchAll(gradeReg))
      .map((item) => item[1])
      .filter((item) => Number(item) >= 2017);

    gradesStore.setState(gradesInfo);
  }
};

const setUnderMajors = (majorsText: string): void => {
  if (!underMajorsStore.state.length) {
    const majorsInfo = Array.from(majorsText.matchAll(majorReg))
      .map((item) => ({
        id: item[1],
        name: item[2],
      }))
      .filter(({ name }) => !name.includes("已删除"));

    underMajorsStore.setState(majorsInfo);
  }
};

const setPostMajors = (majorsText: string): void => {
  if (!postMajorsStore.state.length) {
    const majorsInfo = Array.from(majorsText.matchAll(majorReg))
      .map((item) => ({
        id: item[1],
        name: item[2],
      }))
      .filter(({ name }) => !name.includes("已删除"));

    postMajorsStore.setState(majorsInfo);
  }
};

const setUnderCourses = (documentContent: string): void => {
  if (!underCoursesStore.state.length)
    underCoursesStore.setState(
      Array.from(documentContent.matchAll(underCourseInfoReg)).map(
        (courseMatch) => ({
          name: courseMatch[1],
          office: courseMatch[2],
          type: courseMatch[3],
          point: Number(courseMatch[4]),
          capacity: Number(courseMatch[5]),
          teacher: courseMatch[6],
          week: courseMatch[7],
          time: courseMatch[8],
          place: courseMatch[9],
          cid: courseMatch[10],
          id: courseMatch[11],
          examTime: `${courseMatch[14]}-${courseMatch[12]}`,
          weekType: courseMatch[13],
          className: courseMatch[15],
        }),
      ),
    );
};

const setPostCourses = (documentContent: string): void => {
  if (!postCoursesStore.state.length)
    postCoursesStore.setState(
      Array.from(documentContent.matchAll(postCourseInfoReg)).map(
        (courseMatch) => ({
          name: courseMatch[1],
          office: courseMatch[2],
          type: courseMatch[3],
          point: Number(courseMatch[4]),
          capacity: Number(courseMatch[5]),
          teacher: courseMatch[6],
          week: courseMatch[7],
          time: courseMatch[8],
          place: courseMatch[9],
          cid: courseMatch[10],
          id: courseMatch[11],
          examTime:
            courseMatch[12] || courseMatch[14]
              ? `${
                  courseMatch[14] && courseMatch[14] !== "null"
                    ? `${courseMatch[14]}-`
                    : ""
                }${courseMatch[12] ?? ""}`
              : "",
          weekType: courseMatch[13],
          className: courseMatch[15],
        }),
      ),
    );
};

const setUnderCourseOffices = (documentContent: string): void => {
  if (!underCoursesOfficeStore.state.length) {
    const officesText = officesReg.exec(documentContent)![0];
    const courseOfficesInfo = Array.from(officesText.matchAll(officeReg)).map(
      (item) => item[1],
    );

    underCoursesOfficeStore.setState(courseOfficesInfo);
  }
};

const setPostCourseOffices = (documentContent: string): void => {
  if (!postCoursesOfficeStore.state.length) {
    const officesText = officesReg.exec(documentContent)![0];
    const courseOfficesInfo = Array.from(officesText.matchAll(officeReg)).map(
      (item) => item[1],
    );

    postCoursesOfficeStore.setState(courseOfficesInfo);
  }
};

const setUnderParams = async (
  server: string,
  cookieHeader: string,
): Promise<void> => {
  const infoResponse = await fetch(`${server}xk/AccessToXk`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
    },
  });

  const infoResponseText = await readResponseContent(infoResponse);

  if (infoResponseText.includes("请先登录系统")) throw new Error("系统已关闭");

  const jx0502zbid = /tmpKc\[6\] = "(\d+)";/.exec(infoResponseText)![1];
  const jx0502id = /tmpKc\[7\] = "(\d+)";/.exec(infoResponseText)![1];

  underParamsStore.setState({
    jx0502id,
    jx0502zbid,
  });
};

const setPostParams = async (
  server: string,
  cookieHeader: string,
): Promise<void> => {
  const infoResponse = await fetch(`${server}xk/AccessToXk`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
    },
  });

  const infoResponseText = await readResponseContent(infoResponse);

  if (infoResponseText.includes("请先登录系统")) throw new Error("系统已关闭");

  const jx0502zbid = /tmpKc\[5\] = "(\d+)";/.exec(infoResponseText)![1];
  const jx0502id = /tmpKc\[6\] = "(\d+)";/.exec(infoResponseText)![1];

  postParamsStore.setState({
    jx0502id,
    jx0502zbid,
  });
};

const getCourseTable = (documentContent: string): CourseData[][][] => {
  const tableText = tableReg.exec(documentContent)![0];

  const [, time12, time34, time56, time78, time910, time1112] =
    tableText.split(courseRowReg);

  return [time12, time34, time56, time78, time910, time1112].map((item) => {
    const courses: CourseData[][] = [];
    let matched;
    const courseItemReg =
      /<td align='center' height='50' width='123' >&nbsp;(.*?)<\/td>/g;

    while ((matched = courseItemReg.exec(item))) {
      const courseContent = matched[1];
      const courseDataReg =
        /<a onclick=funSearchYxkc1\(2,'(.+?)',1\); style='cursor:pointer;width:100%'>(.+?)<\/a>/g;

      const courseData: CourseData[] = [];
      let matchedCourseData;

      while ((matchedCourseData = courseDataReg.exec(courseContent))) {
        const [, cid, name] = matchedCourseData;

        courseData.push({ cid, name });
      }

      courses.push(courseData);
    }

    return courses;
  });
};

export const selectInfo = async (
  cookieHeader: string,
  server: string,
  type: "under" | "post",
): Promise<SelectInfoResponse> => {
  if (type === "under") {
    if (!underParamsStore.state) await setUnderParams(server, cookieHeader);
  } else {
    if (!postParamsStore.state) await setPostParams(server, cookieHeader);
  }

  const { jx0502id, jx0502zbid } = (
    type === "under" ? underParamsStore : postParamsStore
  ).state!;

  const urlParams = new URLSearchParams({
    jx0502zbid,
    jx0502id,
    sfktx: "1",
    sfkxk: "1",
  }).toString();

  const response = await fetch(`${server}xk/getXkInfo?${urlParams}`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
    },
  });

  const documentContent = await getResponseContent(response);

  if (documentContent.includes("不在选课时间范围内，无法选课!"))
    return <CommonFailedResponse>{
      success: false,
      msg: "不在选课时间范围内，无法选课!",
    };

  const courseTable = getCourseTable(documentContent);

  const gradesText = gradesReg.exec(documentContent)![0];

  const majorsText = majorsReg.exec(documentContent)![0];
  const currentGrade = currentGradeReg.exec(gradesText)![1];
  const currentMajor = currentMajorReg.exec(majorsText)![1];
  const currentLocation = /'SO'=="SO"/.test(documentContent) ? "净月" : "本部";

  const [, period, stage, name, id, grade, majorName] =
    infoReg.exec(documentContent)!;
  const max = Number(maxCreditReg.exec(documentContent)![1]);

  if (type === "under") setUnderCourses(documentContent);
  else setPostCourses(documentContent);
  if (type === "under") setUnderCourseOffices(documentContent);
  else setPostCourseOffices(documentContent);

  setGrades(gradesText);
  if (type === "under") setUnderMajors(majorsText);
  else setPostMajors(majorsText);

  console.log("Personal Information:", currentGrade, currentMajor);

  return <SelectInfoSuccessResponse>{
    success: true,
    ...(type === "under" ? underParamsStore : postParamsStore).state!,
    currentLocation,
    currentGrade,
    currentMajor,
    grades: gradesStore.state,
    majors: (type === "under" ? underMajorsStore : postMajorsStore).state,
    courses: (type === "under" ? underCoursesStore : postCoursesStore).state,
    info: { period, stage, name, id, grade, majorName, max },
    courseTable,
    courseTypes: type === "under" ? UNDER_COURSE_TYPES : POST_COURSE_TYPES,
    courseOffices: (type === "under"
      ? underCoursesOfficeStore
      : postCoursesStore
    ).state,
  };
};

export interface SelectInfoOptions extends Partial<LoginOptions> {
  server: string;
  type: "under" | "post";
}

export const selectInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  SelectInfoOptions
> = async (req, res) => {
  try {
    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await selectLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      req.body.server = result.server;
      req.body.type = req.body.id.toString()[4] === "0" ? "under" : "post";
      req.headers.cookie = result.cookieStore.getHeader(result.server);
    }

    const { server, type } = req.body;

    const result = await selectInfo(req.headers.cookie, server, type);

    return res.json(result);
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
