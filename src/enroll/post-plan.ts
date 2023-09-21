import { existsSync, readFileSync } from "node:fs";

import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings";

const POST_ENROLL_PLAN_URL = "https://yzb.nenu.edu.cn/tmp/2024ssml.html";
const schoolRegExp = /var XYName='(.*?)'/;
const schollInfoRegExp =
  /bXYName\['(.*?)']="<tr><td colspan=4><a href='(.*?)' target='_blank'>([^<]+) ([^<]+)<\/a><br>联系方式：(\S+?)，(\S+?)，(\S+?)<\/td><\/tr>";/g;

export interface PostEnrollPlanInfo {
  major: string;
  majorCode: string;
  school: string;
}

export interface PostEnrollSchoolPlan {
  school: string;
  majors: PostEnrollPlanInfo[];
}

export interface PostEnrollSuccessResponse {
  success: true;
  data: PostEnrollSchoolPlan[];
}

export const postEnrollPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject
> = async (req, res) => {
  try {
    const response = await fetch(POST_ENROLL_PLAN_URL);

    const content = await response.text();

    // check cache
    if (
      existsSync("./cache/post-enroll.html") &&
      content ===
        readFileSync("./cache/post-enroll.html", { encoding: "utf-8" })
    )
      return res.json({
        success: true,
        data: <PostEnrollSchoolPlan[]>JSON.parse(
          readFileSync("./cache/post-enroll.json", {
            encoding: "utf-8",
          })
        ),
      });

    const schools = schoolRegExp.exec(content)![1].split(",");
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
