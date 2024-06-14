import type { RequestHandler } from "express";

import type { AuthLoginFailedResult } from "../../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { underStudyLogin } from "../login.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderSelectInfoOptions extends Partial<LoginOptions> {
  link: string;
}

export interface UnderSelectOption {
  value: string;
  name: string;
}

export interface UnderSelectInfo {
  /** 学期 */
  term: string;
  /** 选课名称 */
  name: string;
  /** 是否可退选 */
  canCancel: boolean;
  /** 选课阶段 */
  stage: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;

  /** 可用年级 */
  grades: number[];
  /** 可用校区 */
  locations: UnderSelectOption[];
  /** 可用开课单位 */
  courseOffices: UnderSelectOption[];
  /** 可用课程类别 */
  courseTypes: UnderSelectOption[];

  /** 当前校区 */
  currentLocation: string;
  /** 当前年级 */
  currentGrade: number;
}

export interface UnderSelectInfoSuccessResponse {
  success: true;
  data: UnderSelectInfo;
}

export type UnderSelectInfoResponse =
  | UnderSelectInfoSuccessResponse
  | AuthLoginFailedResult
  | (CommonFailedResponse & { type: "not-initialized" });

const COURSE_OFFICES_REGEXP =
  /<select id='kkyxdm' name='kkyxdm'.*?><option value=''>\(请选择\)<\/option>(.*?)<\/select>/;
const COURSE_OFFICE_ITEM_REGEXP = /<option value='(.+?)' >\d+-(.*?)<\/option>/g;
const LOCATIONS_REGEXP =
  /<select id='xqdm' name='xqdm'.*?><option value=''>\(请选择\)<\/option>(.*?)<\/select>/;
const LOCATION_ITEM_REGEXP = /<option value='(.+?)' >\d+-(.*?)<\/option>/g;
const COURSE_TYPES_REGEXP =
  /<select id='kcdldm' name='kcdldm'.*?><option value=''>\(请选择\)<\/option>(.*?)<\/select>/;
const COURSE_TYPE_ITEM_REGEXP = /<option value='(.+?)' >(.*?)<\/option>/g;
const CURRENT_GRADE_REGEXP = /<option value='(\d+)' selected>\1<\/option>/;
const INFO_REGEXP =
  /<span id="title">(.*?)学期&nbsp;&nbsp;(.*?)&nbsp;&nbsp;<span.*?>(.*?)<\/span><\/span>\s+?<br>\s+?<span id="sub-title">\s+?<div id="text">现在是(.*?)时间\s+（(\d\d:\d\d:\d\d)--(\d\d:\d\d:\d\d)）/;

const getSelectInfo = (content: string): UnderSelectInfo => {
  const [, term, name, canCancelText, stage, startTime, endTime] =
    content.match(INFO_REGEXP)!;
  const courseOfficeText = content.match(COURSE_OFFICES_REGEXP)![1];
  const courseOffices = Array.from(
    courseOfficeText.matchAll(COURSE_OFFICE_ITEM_REGEXP),
  ).map(([, value, name]) => ({
    value,
    name,
  }));
  const locationText = content.match(LOCATIONS_REGEXP)![1];
  const locations = Array.from(locationText.matchAll(LOCATION_ITEM_REGEXP)).map(
    ([, value, name]) => ({
      value,
      name,
    }),
  );
  const currentYear = new Date().getFullYear();
  const grades = Array(6)
    .fill(null)
    .map((_, i) => currentYear - i);
  const currentGrade = Number(content.match(CURRENT_GRADE_REGEXP)![1]);
  const courseTypeText = content.match(COURSE_TYPES_REGEXP)![1];
  const courseTypes = Array.from(
    courseTypeText.matchAll(COURSE_TYPE_ITEM_REGEXP),
  ).map(([, value, name]) => ({
    value,
    name,
  }));

  return {
    term,
    name,
    canCancel: canCancelText === "可退选",
    stage,
    startTime,
    endTime,

    grades,
    locations,
    courseOffices,
    courseTypes,

    currentLocation: name.includes("本部")
      ? "本部"
      : name.includes("净月")
        ? "净月"
        : "",
    currentGrade,
  };
};

export const underStudySelectInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectInfoOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json({
          success: false,
          msg: "请提供账号密码",
        } as CommonFailedResponse);

      const result = await underStudyLogin(req.body as LoginOptions);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(UNDER_STUDY_SERVER);
    }

    const { link } = req.body;

    if (!link) {
      return res.json({
        success: false,
        msg: "请提供选课信息链接",
      } as CommonFailedResponse);
    }

    const infoUrl = `${UNDER_STUDY_SERVER}${link}`;

    const response = await fetch(infoUrl, {
      headers: {
        Cookie: cookieHeader,
        Referer: infoUrl,
        ...EDGE_USER_AGENT_HEADERS,
      },
    });

    const content = await response.text();

    if (content.includes("选课正在初始化")) {
      return res.json({
        success: false,
        msg: "选课正在初始化，请稍后再试",
        type: "not-initialized",
      } as CommonFailedResponse);
    }

    return res.json({
      success: true,
      data: getSelectInfo(content),
    } as UnderSelectInfoSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
