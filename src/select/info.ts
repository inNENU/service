import type { RequestHandler } from "express";

import type { CourseInfo, MajorInfo } from "./store.js";
import {
  coursesOfficeStore,
  coursesStore,
  gradesStore,
  majorsStore,
  paramsStore,
} from "./store.js";
import type { SelectBaseOptions } from "./typings.js";
import { COURSE_TYPES } from "./utils.js";
import { readResponseContent } from "../utils/content.js";

export interface CourseData {
  name: string;
  cid: string;
}

export interface SelectInfoSuccessResponse {
  status: "success";
  jx0502id: string;
  jx0502zbid: string;
  courses: CourseInfo[];
  courseTable: CourseData[][][];
  courseTypes: string[];
  courseOffices: string[];
  currentMajor: string;
  currentGrade: string;
  grades: string[];
  majors: MajorInfo[];
}

export interface SelectInfoFailedResponse {
  status: "failed";
  msg: string;
}

export type SelectInfoResponse =
  | SelectInfoSuccessResponse
  | SelectInfoFailedResponse;

const officesReg = /<select id="kkdws" name="kkdws"[\s\S]*?<\/select>/;
const officeReg = /<option value="(.*?)" ?>/g;
const gradesReg = /<select id="njs" name="njs"[\s\S]*?<\/select>/;
const gradeReg = /<option value="(.*?)" (?:selected)?>(.*?)<\/option>/g;
const majorsReg = /<select id="zys" name="zys"[\s\S]*?<\/select>/;
const majorReg = /<option value="(.*?)" (?:selected)?>(.*?)<\/option>/g;

const currentGradeReg = /<option value="(.*?)" selected>/;
const currentMajorReg = /<option value="(.*?)" selected>/;

const tableReg = /function binkbfzy()[\s\S]*?"<\/table>"/;
const courseRowReg =
  /str\+="<tr align='center' height='50' width='70'\s+bgcolor="\+ys\+" bordercolor='#E6E6E6'><td>.*?<\/td>/g;
const courseInfoReg =
  /tmpKc\[0\] = ".+";\s+tmpKc\[1\] = "(.*)";\s+tmpKc\[2\] = "(.*?)";\s+tmpKc\[3\] = "(.*?)";\s+tmpKc\[4\] = "(.*?)";[\s\S]+?tmpKc\[6\] = (\d+);\s+tmpKc\[7\] = "(.*?)";\s+tmpKc\[8\] = "(.*?)";\s+tmpKc\[9\] = "(.*?)";\s+tmpKc\[10\] = "(.*?)";\s+tmpKc\[11\] = "(.*?)";\s+tmpKc\[12\] = "(.*?)";[\s\S]*?tmpKc\[18\]="(.*?)";\s+tmpKc\[19\]="(.*?)";\s+tmpKc\[20\]="(.*?)";\s+tmpKc\[21\]="(.*?)"/g;

const setGrades = (gradesText: string): void => {
  if (!gradesStore.state.length) {
    const gradesInfo = [];

    let gradeMatch;

    while ((gradeMatch = gradeReg.exec(gradesText))) {
      const [, grade] = gradeMatch;

      if (Number(grade) >= 2017) gradesInfo.push(grade);
    }

    gradesStore.setState(gradesInfo);
  }
};

const setMajors = (majorsText: string): void => {
  if (!majorsStore.state.length) {
    const majorsInfo = [];

    let majorMatch;

    while ((majorMatch = majorReg.exec(majorsText))) {
      const [, id, name] = majorMatch;

      if (!majorMatch[2].includes("已删除")) majorsInfo.push({ name, id });
    }

    majorsStore.setState(majorsInfo);
  }
};

const setCourses = (documentContent: string): void => {
  if (!coursesStore.state.length) {
    const coursesInfo = [];

    let courseMatch;

    while ((courseMatch = courseInfoReg.exec(documentContent)))
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

    coursesStore.setState(coursesInfo);
  }
};

const setCourseOffices = (documentContent: string): void => {
  if (!coursesOfficeStore.state.length) {
    const officesText = officesReg.exec(documentContent)![0];
    const courseOfficesInfo = [];

    let officeMatch;

    while ((officeMatch = officeReg.exec(officesText)))
      if (officeMatch[1]) courseOfficesInfo.push(officeMatch[1]);

    coursesOfficeStore.setState(courseOfficesInfo);
  }
};

const setParams = async ({
  cookies,
  server,
}: SelectBaseOptions): Promise<void> => {
  const infoResponse = await fetch(`${server}xk/AccessToXk`, {
    method: "GET",
    headers: new Headers({
      Cookie: cookies.join(", "),
    }),
  });

  const infoReponseText = await readResponseContent(infoResponse);

  const jx0502zbid = /tmpKc\[6\] = "(\d+)";/.exec(infoReponseText)![1];
  const jx0502id = /tmpKc\[7\] = "(\d+)";/.exec(infoReponseText)![1];

  paramsStore.setState({ jx0502id, jx0502zbid });
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
      const courseContent = matched[1]!;
      const courseDataReg =
        /<a onclick=funSearchYxkc1\(2,'(\d+)',1\); style='cursor:pointer;width:100%'>(.+?)<\/a>/g;

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

export const selectInfoHandler: RequestHandler = async (req, res) => {
  try {
    const { cookies, server } = <SelectBaseOptions>req.body;

    if (!paramsStore.state) await setParams({ cookies, server });

    const { jx0502id, jx0502zbid } = paramsStore.state!;

    const urlParams = new URLSearchParams({
      jx0502zbid,
      jx0502id,
      sfktx: "1",
      sfkxk: "1",
    }).toString();

    const response = await fetch(`${server}xk/getXkInfo?${urlParams}`, {
      method: "GET",
      headers: new Headers({
        Cookie: cookies.join(", "),
      }),
    });

    const documentContent = await readResponseContent(response);

    const courseTable = getCourseTable(documentContent);

    const gradesText = gradesReg.exec(documentContent)![0];

    const majorsText = majorsReg.exec(documentContent)![0];
    const currentGrade = currentGradeReg.exec(gradesText)![1];
    const currentMajor = currentMajorReg.exec(majorsText)![1];

    setCourses(documentContent);
    setCourseOffices(documentContent);
    setGrades(gradesText);
    setMajors(majorsText);

    console.log("Personal Information:", currentGrade, currentMajor);

    const info: SelectInfoSuccessResponse = {
      status: "success",
      ...paramsStore.state!,
      currentMajor,
      currentGrade,
      grades: gradesStore.state,
      majors: majorsStore.state,
      courses: coursesStore.state,
      courseTable,
      courseTypes: COURSE_TYPES,
      courseOffices: coursesOfficeStore.state,
    };

    res.json(info);
  } catch (err) {
    res.json({ status: "failed", msg: (<Error>err).message });
  }
};
