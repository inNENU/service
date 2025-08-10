import { request } from "@/utils/index.js";

import { getAction } from "./action.js";
import { gradSystemLogin } from "./login.js";
import { GRAD_SYSTEM_SERVER, MAIN_URL } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  ActionFailType,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";

const TITLE_REG_EXP = /aField\s?="(.*?)"\.split\("\t"\);/;
const VALUE_REG_EXP = /aDataLS\s?="(.*?)"\.split\("\t"\);/;

export interface GradStudentInfo {
  /** 姓名 */
  name: string;
  /** 性别 */
  gender: "男" | "女";
  /** 身份证号 */
  idCard: string;
  /** 政治面貌 */
  politicalType: string;
  /** 出生日期 */
  birth: string;
  /** 民族 */
  people: string;

  /** 学号 */
  id: number;
  /** 年级 */
  grade: number;
  /** 学院 */
  school: string;
  /** 专业 */
  major: string;
  /** 专业 */
  majorCode: number;
  /** 研究生类别 */
  type: string;
  /** 学生分类 */
  category: string;
  /** 入学日期 */
  inDate: string;
}

const getInfo = (content: string): GradStudentInfo => {
  const titles = TITLE_REG_EXP.exec(content)![1].split("\t");
  const values = VALUE_REG_EXP.exec(content)![1].split("\t");

  const nameIndex = titles.findIndex((title) => title === "学生姓名");
  const genderIndex = titles.findIndex((title) => title === "性别");
  const idCardIndex = titles.findIndex((title) => title === "身份证号");
  const idCard = values[idCardIndex];
  const birth = idCard
    .substring(6, 14)
    .replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
  const peopleIndex = titles.findIndex((title) => title === "民族");
  const politicalTypeIndex = titles.findIndex((title) => title === "政治面貌");

  const idIndex = titles.findIndex((title) => title === "学号");
  const id = values[idIndex];
  const schoolIndex = titles.findIndex((title) => title === "学院名称");
  const majorIndex = titles.findIndex((title) => title === "专业名称");
  const majorCodeIndex = titles.findIndex((title) => title === "专业代码");
  const typeIndex = titles.findIndex((title) => title === "研究生类型");
  const categoryIndex = titles.findIndex((title) => title === "研究生分类");
  const inDateIndex = titles.findIndex((title) => title === "入学日期");
  const inDate = values[inDateIndex];

  return {
    name: values[nameIndex],
    gender: values[genderIndex] as "男" | "女",
    idCard,
    people: values[peopleIndex],
    politicalType: values[politicalTypeIndex],
    birth,

    id: Number(id),
    grade: Number(id.substring(0, 4)),
    school: values[schoolIndex],
    major: values[majorIndex],
    majorCode: Number(values[majorCodeIndex]),
    type: values[typeIndex],
    category: values[categoryIndex],
    inDate: inDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
  };
};

export interface GradInfoSuccessResponse {
  success: true;
  info: GradStudentInfo;
}

export type GradInfoResponse =
  | GradInfoSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>;

export const getGradInfo = async (
  cookieHeader: string,
): Promise<GradInfoResponse> => {
  const result = await getAction(cookieHeader);

  if (result.success) {
    const { id } = result.data.actions.find(
      ({ name }) =>
        name === "显示硕士生信息采集" || name === "显示博士生信息采集",
    )!;

    const response = await fetch(
      `${GRAD_SYSTEM_SERVER}/HProg/sys/php/MainRun.php?WorkName=&WorkCode=${id}`,
      {
        headers: {
          Cookie: cookieHeader,
          Referer: MAIN_URL,
        },
      },
    );

    const content = await response.text();

    if (content.includes("错误:当前时间不在本功能有效时间范围内!"))
      return {
        success: false,
        type: ActionFailType.Forbidden,
        msg: "功能当前暂未开放",
      };

    const info = getInfo(content);

    return {
      success: true,
      info,
    };
  }

  return UnknownResponse("获取信息失败");
};

export const gradInfoHandler = request<GradInfoResponse, AccountInfo>(
  async (req, res) => {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await gradSystemLogin(req.body);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(GRAD_SYSTEM_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    return res.json(await getGradInfo(req.headers.cookie));
  },
);
