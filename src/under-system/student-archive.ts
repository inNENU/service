import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp } from "../utils/index.js";

const infoRegExp =
  /<td>(\S+)<\/td>\s+<td colspan="\d">(?:&nbsp;)*(.*?)(?:&nbsp;)*<\/td>/g;
const studyRegExp =
  /<td {2}>(\S+)<\/td>\s*<td {2}>(\S+)<\/td>\s*<td\scolspan="4">(\S+)<\/td>\s*<td {2}>(\S+)<\/td>\s*<td\scolspan="2">(\S+)<\/td>\s*<td {2}>(\S+)<\/td>/g;
const familyRegExp =
  /<td {2}>(\S+)<\/td>\s*<td {2}>(\S+)<\/td>\s*<td\scolspan="2">(\S+)<\/td>\s*<td\scolspan="2">(\S+)<\/td>\s*<td\scolspan="3">(\S+)<\/td>\s*<td {2}>(\S+)<\/td/g;
const pathRegExp = /var newwin = window.showModalDialog\("(.+?)"\);/;
const registerButtonRegExp =
  /<input\s+type="button"\s+id="zc"\s+class="button"\s+value="确定注册"\s+onclick="bc\(\)"\/>/;
const isRegisteredRegExp = /您已经提交注册信息/;

const UNDER_STUDENT_ARCHIVE_QUERY_URL = `${UNDER_SYSTEM_SERVER}/xszhxxAction.do?method=addStudentPic_xszc`;

export interface UnderBasicInfo {
  text: string;
  value: string;
}

export interface UnderStudyInfo {
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 地点 */
  school: string;
  /** 职务 */
  title: string;
  /** 证明人 */
  witness: string;
  /** 备注 */
  remark: string;
}

export interface UnderFamilyInfo {
  /** 姓名 */
  name: string;
  /** 与本人关系 */
  relation: string;
  /** 工作单位 */
  office: string;
  /** 职务 */
  title: string;
  /** 联系电话 */
  phone: string;
  /** 备注 */
  remark: string;
}

export interface UnderStudentArchiveInfo {
  /** 学籍照片 */
  archiveImage: string;
  /** 高考照片 */
  examImage: string;
  /** 基础信息 */
  basic: UnderBasicInfo[];
  /** 学习经历信息 */
  study: UnderStudyInfo[];
  /** 家庭信息 */
  family: UnderFamilyInfo[];
  /** 是否能注册 */
  canRegister: boolean;
  /** 是否已注册 */
  isRegistered: boolean;
  /** 注册路径 */
  path: string;
}

const getStudentArchive = async (
  cookieHeader: string,
  content: string,
): Promise<UnderStudentArchiveInfo> => {
  const [baseInfo, tableInfo] = content.split("本人学历及社会经历");
  const [studyInfo, familyInfo] = tableInfo.split("家庭成员及主要社会关系");

  const basic = Array.from(baseInfo.matchAll(infoRegExp)).map(
    ([, text, value]) => ({
      text: text.replace(/&nbsp;/g, ""),
      value,
    }),
  );
  const study = Array.from(studyInfo.matchAll(studyRegExp))
    .map(([, startTime, endTime, school, title, witness, remark]) => ({
      startTime: startTime.replace(/&nbsp;/g, ""),
      endTime: endTime.replace(/&nbsp;/g, ""),
      school: school.replace(/&nbsp;/g, " ").trim(),
      title: title.replace(/&nbsp;/g, " ").trim(),
      witness: witness.replace(/&nbsp;/g, " ").trim(),
      remark: remark.replace(/&nbsp;/g, " ").trim(),
    }))
    .filter(
      ({ startTime, endTime, school, title, witness, remark }) =>
        startTime || endTime || school || title || witness || remark,
    );
  const family = Array.from(familyInfo.matchAll(familyRegExp))
    .map(([, name, relation, office, title, phone, remark]) => ({
      name: name.replace(/&nbsp;/g, ""),
      relation: relation.replace(/&nbsp;/g, ""),
      office: office.replace(/&nbsp;/g, " ").trim(),
      title: title.replace(/&nbsp;/g, " ").trim(),
      phone: phone.replace(/&nbsp;/g, " ").trim(),
      remark: remark.replace(/&nbsp;/g, " ").trim(),
    }))
    .filter(
      ({ name, relation, office, title, phone, remark }) =>
        name || relation || office || title || phone || remark,
    );
  const [examImageLink, archiveImageLink] = Array.from(
    content.matchAll(/var url\s*=\s*"(.*)"/g),
  ).map(([, url]) => url);

  const [archiveImage, examImage] = await Promise.all([
    archiveImageLink
      ? fetch(`${UNDER_SYSTEM_SERVER}${archiveImageLink}`, {
          method: "POST",
          headers: {
            Cookie: cookieHeader,
          },
        }).catch(() => "")
      : "",
    examImageLink
      ? fetch(`${UNDER_SYSTEM_SERVER}${examImageLink}`, {
          method: "POST",
          headers: {
            Cookie: cookieHeader,
          },
        }).catch(() => "")
      : "",
  ]);

  const path = pathRegExp.exec(content)?.[1] || "";

  return {
    basic,
    archiveImage,
    examImage,
    study,
    family,
    canRegister: registerButtonRegExp.test(content),
    isRegistered: isRegisteredRegExp.test(content),
    path,
  };
};

export interface GetUnderStudentArchiveOptions extends Partial<LoginOptions> {
  type?: "get";
}

export interface UnderGetStudentArchiveSuccessResponse {
  success: true;
  info: UnderStudentArchiveInfo;
}

export type UnderGetStudentArchiveResponse =
  | UnderGetStudentArchiveSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const getUnderStudentArchive = async (
  cookieHeader: string,
): Promise<UnderGetStudentArchiveResponse> => {
  const response = await fetch(
    `${UNDER_STUDENT_ARCHIVE_QUERY_URL}&tktime=${getIETimeStamp()}`,
    {
      headers: {
        Cookie: cookieHeader,
        Referer: `${UNDER_SYSTEM_SERVER}/framework/new_window.jsp?lianjie=&winid=win3`,
        "User-Agent": IE_8_USER_AGENT,
      },
    },
  );

  const content = await response.text();

  if (content.includes("学生学籍卡片")) {
    const info = await getStudentArchive(cookieHeader, content);

    return <UnderGetStudentArchiveSuccessResponse>{
      success: true,
      info,
    };
  }

  return {
    success: false,
    msg: "获取学籍信息失败",
  };
};

const alertRegExp = /window.alert\('(.+?)'\)/;

export interface RegisterUnderStudentArchiveOptions
  extends Partial<LoginOptions> {
  type?: "register";
  path: string;
}

export interface UnderRegisterStudentArchiveSuccessResponse {
  success: true;
}

export type UnderRegisterStudentArchiveResponse =
  | UnderRegisterStudentArchiveSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const registerStudentArchive = async (
  cookieHeader: string,
  path: string,
): Promise<UnderRegisterStudentArchiveResponse> => {
  const url = `${UNDER_SYSTEM_SERVER}${path}`;

  const registerResponse = await fetch(url, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${UNDER_SYSTEM_SERVER}/framework/new_window.jsp?lianjie=&winid=win3`,
      "User-Agent": IE_8_USER_AGENT,
    },
  });

  const response = await registerResponse.text();

  const alert = alertRegExp.exec(response)?.[1] || "注册失败";

  if (alert === "注册成功。") return { success: true };

  return {
    success: false,
    msg: alert,
  };
};

export const underStudentArchiveHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  GetUnderStudentArchiveOptions | RegisterUnderStudentArchiveOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await underSystemLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(
        UNDER_STUDENT_ARCHIVE_QUERY_URL,
      );
    }

    if (req.body.type === "register")
      return res.json(
        await registerStudentArchive(cookieHeader, req.body.path),
      );

    return res.json(await getUnderStudentArchive(cookieHeader));
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
