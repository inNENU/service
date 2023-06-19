import type { RequestHandler } from "express";
import type { SelectBaseOptions } from "./typings.js";
import { COURSE_TYPE } from "./utils.js";
import { readResponseContent } from "../utils/content.js";

export interface MajorInfo {
  name: string;
  id: string;
}

export interface SelectInfoSuccessResponse {
  status: "success";
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

// cache
let courseOffices = <string[]>[];
let majors = <MajorInfo[]>[];

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

  const info: SelectInfoSuccessResponse = {
    status: "success",
    grade,
    major: currentMajor,
    courseType: COURSE_TYPE,
    courseOffices,
    majors,
  };

  console.log("Information:", info);

  res.json(info);
};
