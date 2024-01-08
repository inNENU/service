import type { RequestHandler } from "express";

import { getAction } from "./action.js";
import { postNewSystemLogin } from "./login.js";
import { MAIN_URL, SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

const TITLE_REG_EXP = /aField\s?="(.*?)"\.split\("\t"\);/;
const VALUE_REG_EXP = /aDataLS\s?="(.*?)"\.split\("\t"\);/;

export interface PostStudentInfo {
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

const getInfo = (content: string): PostStudentInfo => {
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
    gender: <"男" | "女">values[genderIndex],
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

export interface InfoSuccessResponse {
  success: true;
  info: PostStudentInfo;
}

export type InfoResponse =
  | InfoSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const getPostInfo = async (
  cookieHeader: string,
): Promise<InfoResponse> => {
  const result = await getAction(cookieHeader);

  if (result.success) {
    const { id } = result.actions.find(
      ({ name }) =>
        name === "显示硕士生信息采集" || name === "显示博士生信息采集",
    )!;

    const response = await fetch(
      `${SERVER}/HProg/sys/php/MainRun.php?WorkName=&WorkCode=${id}`,
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
        msg: "功能当前暂未开放",
      };

    const info = getInfo(content);

    return <InfoSuccessResponse>{
      success: true,
      info,
    };
  }

  return {
    success: false,
    msg: "获取学籍信息失败",
  };
};

export const postNewInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Partial<LoginOptions>
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await postNewSystemLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(SERVER);
    }

    return res.json(await getPostInfo(cookieHeader));
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
