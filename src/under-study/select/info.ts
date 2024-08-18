import type { SelectOptionConfig } from "./store.js";
import { areasStore, majorsStore, officesStore, typesStore } from "./store.js";
import { COURSE_CATEGORIES } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ActionFailType,
  ExpiredResponse,
  MissingArgResponse,
  UnknownResponse,
} from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS, middleware } from "../../utils/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

const CHECK_URL = `${UNDER_STUDY_SERVER}/new/student/xsxk/checkFinishPj`;

const COURSE_OFFICES_REGEXP =
  /<select id='kkyxdm' name='kkyxdm'.*?><option value=''>\(请选择\)<\/option>(.*?)<\/select>/;
const COURSE_OFFICE_ITEM_REGEXP = /<option value='(.+?)' >\d+-(.*?)<\/option>/g;
const AREAS_REGEXP =
  /<select id='xqdm' name='xqdm'.*?><option value=''>\(请选择\)<\/option>(.*?)<\/select>/;
const AREA_ITEM_REGEXP = /<option value='(.+?)' >\d+-(.*?)<\/option>/g;
const COURSE_TYPES_REGEXP =
  /<select id='kcdldm' name='kcdldm'.*?><option value=''>\(请选择\)<\/option>(.*?)<\/select>/;
const COURSE_TYPE_ITEM_REGEXP = /<option value='(.+?)' >(.*?)<\/option>/g;
const CURRENT_GRADE_REGEXP = /<option value='(\d+)' selected>\1<\/option>/;
const MAJORS_REGEXP =
  /<select id='zydm' name='zydm'.*?><option value=''>\(全部\)<\/option>(.*?)<\/select>/;
const MAJOR_ITEM_REGEXP =
  /<option value='(\d+?)' (?:selected)?>\d+-(.*?)<\/option>/g;
const CURRENT_MAJOR_REGEXP =
  /<option value='(\d{6,7})' selected>\d+-(.*?)<\/option>/;
const INFO_TITLE_REGEXP =
  /<span id="title">(.*?)学期&nbsp;&nbsp;(.*?)&nbsp;&nbsp;(?:<span.*?>(.*?)<\/span>)?<\/span>/;
const ALLOWED_INFO_REGEXP =
  /<span id="sub-title">\s+?<div id="text">现在是(.*?)时间\s+（(\d\d:\d\d:\d\d)--(\d\d:\d\d:\d\d)）/;

const setMajors = (content: string): void => {
  if (!majorsStore.state.length) {
    const majorText = MAJORS_REGEXP.exec(content)![1];

    const majors = Array.from(majorText.matchAll(MAJOR_ITEM_REGEXP)).map(
      ([, value, name]) => ({
        value,
        name,
      }),
    );

    majorsStore.setState(majors);
  }
};

const setCourseOffices = (content: string): void => {
  if (!officesStore.state.length) {
    const courseOfficeText = COURSE_OFFICES_REGEXP.exec(content)![1];

    const offices = Array.from(
      courseOfficeText.matchAll(COURSE_OFFICE_ITEM_REGEXP),
    ).map(([, value, name]) => ({
      value,
      name,
    }));

    officesStore.setState(offices);
  }
};

const setCourseTypes = (content: string): void => {
  if (!typesStore.state.length) {
    const courseTypeText = COURSE_TYPES_REGEXP.exec(content)![1];

    const types = Array.from(
      courseTypeText.matchAll(COURSE_TYPE_ITEM_REGEXP),
    ).map(([, value, name]) => ({
      value,
      name,
    }));

    typesStore.setState(types);
  }
};

const setAreas = (content: string): void => {
  if (!areasStore.state.length) {
    const areaText = AREAS_REGEXP.exec(content)![1];

    const areas = Array.from(areaText.matchAll(AREA_ITEM_REGEXP)).map(
      ([, value, name]) => ({
        value,
        name,
      }),
    );

    areasStore.setState(areas);
  }
};

export interface UnderSelectInfoOptions extends LoginOptions {
  link: string;
}

export interface UnderSelectBaseInfo {
  /** 学期 */
  term: string;
  /** 选课名称 */
  name: string;
  /** 是否可以选课 */
  canSelect: boolean;

  /** 可用年级 */
  grades: number[];
  /** 可用校区 */
  areas: SelectOptionConfig[];
  /** 可用专业 */
  majors: SelectOptionConfig[];
  /** 可用开课单位 */
  offices: SelectOptionConfig[];
  /** 可用课程类别 */
  types: SelectOptionConfig[];
  /** 可用课程分类 */
  categories: SelectOptionConfig[];

  /** 当前校区 */
  currentArea: string;
  /** 当前专业 */
  currentMajor: string;
  /** 当前年级 */
  currentGrade: number;
}

export interface UnderSelectAllowedInfo extends UnderSelectBaseInfo {
  canSelect: true;

  /** 是否可退选 */
  canCancel: boolean;
  /** 选课阶段 */
  stage: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
}

export interface UnderSelectDisallowedInfo extends UnderSelectBaseInfo {
  canSelect: false;
}

export type UnderSelectInfo =
  | UnderSelectAllowedInfo
  | UnderSelectDisallowedInfo;

const getSelectInfo = (content: string): UnderSelectInfo => {
  const [, term, name, canCancelText = ""] = INFO_TITLE_REGEXP.exec(content)!;

  const canSelect = !content.includes("现在不是选课时间");

  const currentArea = name.includes("本部")
    ? "本部"
    : name.includes("净月")
      ? "净月"
      : "";
  const currentGrade = Number(CURRENT_GRADE_REGEXP.exec(content)![1]);
  const currentMajor = CURRENT_MAJOR_REGEXP.exec(content)![2];

  const currentYear = new Date().getFullYear();
  const grades = Array(6)
    .fill(null)
    .map((_, i) => currentYear - i);

  setAreas(content);
  setCourseOffices(content);
  setCourseTypes(content);
  setMajors(content);

  const currentMajorConfig = majorsStore.state.find(
    (major) => major.name === currentMajor,
  )!;

  const state = {
    term,
    name,
    canSelect,
    grades,
    majors: [currentMajorConfig, ...majorsStore.state],
    areas: areasStore.state,
    offices: officesStore.state,
    types: typesStore.state,
    categories: COURSE_CATEGORIES,

    currentArea,
    currentGrade,
    currentMajor,
  };

  if (canSelect) {
    const [, stage, startTime, endTime] = ALLOWED_INFO_REGEXP.exec(content)!;

    return {
      canCancel: canCancelText === "可退选",
      stage,
      startTime,
      endTime,

      ...state,
    };
  }

  return {
    ...state,
    canSelect,
  };
};

const checkCourseCommentary = async (
  cookieHeader: string,
  term: string,
  categoryUrl: string,
): Promise<{ completed: boolean; msg: string }> => {
  const response = await fetch(`${CHECK_URL}?xnxqdm=${term}&_=${Date.now()}`, {
    headers: {
      // Accept: "application/json; q=0.01",
      Cookie: cookieHeader,
      DNT: "1",
      Referer: categoryUrl,
      "X-Requested-With": "XMLHttpRequest",
      ...EDGE_USER_AGENT_HEADERS,
    },
  });

  if (response.status !== 200) throw new Error(`status: ${response.status}`);

  try {
    const content = await response.text();

    if (content.includes("评价已完成")) {
      return { completed: true, msg: "已完成评教" };
    }

    if (content.includes("下次可检查时间为：")) {
      const time = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.exec(content)?.[0];

      return { completed: false, msg: `检查过于频繁，请于 ${time} 后重试` };
    }

    if (content.includes("评价未完成")) {
      return { completed: false, msg: "未完成评教" };
    }

    return {
      completed: false,
      msg: "请检查是否完成评教",
    };
  } catch (err) {
    console.error(err);

    throw new Error("评教检查失败");
  }
};

export type UnderSelectInfoSuccessResponse =
  CommonSuccessResponse<UnderSelectInfo>;

export type UnderSelectInfoResponse =
  | UnderSelectInfoSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.NotInitialized
      | ActionFailType.MissingCredential
      | ActionFailType.MissingCommentary
      | ActionFailType.MissingArg
      | ActionFailType.Unknown
    >;

export const getUnderSelectInfo = async (
  cookieHeader: string,
  link: string,
): Promise<UnderSelectInfoResponse> => {
  const categoryUrl = `${UNDER_STUDY_SERVER}${link}`;

  const response = await fetch(categoryUrl, {
    headers: {
      "Cache-Control": "max-age=0",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/xsxk/xklx`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    redirect: "manual",
  });

  if (response.status !== 200) return ExpiredResponse;

  let content = await response.text();

  if (/<title>.*?评教检查<\/title>/.exec(content)) {
    const { completed } = await checkCourseCommentary(
      cookieHeader,
      /xnxqdm=(\d+)'/.exec(content)![1],
      categoryUrl,
    );

    if (!completed) {
      return {
        success: false,
        msg: "未完成评教",
        type: ActionFailType.MissingCommentary,
      };
    }

    // 重新请求选课信息
    const recheckResponse = await fetch(categoryUrl, {
      headers: {
        "Cache-Control": "max-age=0",
        Cookie: cookieHeader,
        Referer: `${UNDER_STUDY_SERVER}/new/student/xsxk/xklx`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (recheckResponse.status !== 200) return ExpiredResponse;

    content = await recheckResponse.text();
  }

  if (content.includes("选课正在初始化")) {
    return {
      success: false,
      msg: "选课正在初始化，请稍后再试",
      type: ActionFailType.NotInitialized,
    };
  }

  return {
    success: true,
    data: getSelectInfo(content),
  };
};

export const underStudySelectInfoHandler = middleware<
  UnderSelectInfoResponse,
  UnderSelectInfoOptions
>(async (req, res) => {
  const { link } = req.body;

  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST"))
    return res.json(
      UnknownResponse("因子系统逻辑复杂，测试账号暂不提供选课操作模拟"),
    );

  if (!link) return res.json(MissingArgResponse("link"));

  return res.json(await getUnderSelectInfo(cookieHeader, link));
});
