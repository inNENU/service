import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { SERVER, getTimeStamp } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT } from "../utils/index.js";

const infoRegExp =
  /<td>(\S+)<\/td>\s+<td colspan="\d">(?:&nbsp;)*(.*?)(?:&nbsp;)*<\/td>/g;
const studyRegExp =
  /<td {2}>(\S+)<\/td>\s*<td {2}>(\S+)<\/td>\s*<td\scolspan="4">(\S+)<\/td>\s*<td {2}>(\S+)<\/td>\s*<td\scolspan="2">(\S+)<\/td>\s*<td {2}>(\S+)<\/td>/g;
const familyRegExp =
  /<td {2}>(\S+)<\/td>\s*<td {2}>(\S+)<\/td>\s*<td\scolspan="2">(\S+)<\/td>\s*<td\scolspan="2">(\S+)<\/td>\s*<td\scolspan="3">(\S+)<\/td>\s*<td {2}>(\S+)<\/td/g;

const UNDER_STUDENT_ARCHIVE_QUERY_URL = `${SERVER}/xszhxxAction.do?method=addStudentPic_xszc`;

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
  study: UnderStudyInfo[];
  family: UnderFamilyInfo[];
  registered: boolean;
}

const getStudentArchive = async (
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

  const id = basic.find(({ text }) => text === "学籍号")!.value;
  const idCard = basic.find(({ text }) => text === "身份证号")!.value;

  const [examImage, archiveImage] = await Promise.all([
    fetch(`${SERVER}/gkuploadfile/studentphoto/pic/${idCard}.JPG`).then(
      async (examImageResponse) =>
        `data:image/jpeg;base64,${Buffer.from(
          await examImageResponse.arrayBuffer(),
        ).toString("base64")}`,
    ),
    fetch(`${SERVER}/rxuploadfile/studentphoto/pic/${id}.JPG`).then(
      async (archiveImageResponse) =>
        `data:image/jpeg;base64,${Buffer.from(
          await archiveImageResponse.arrayBuffer(),
        ).toString("base64")}`,
    ),
  ]);

  return {
    basic,
    archiveImage,
    examImage,
    study,
    family,
    registered: content.includes("您已经提交注册信息"),
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
    `${UNDER_STUDENT_ARCHIVE_QUERY_URL}&tktime=${getTimeStamp()}`,
    {
      headers: {
        Cookie: cookieHeader,
        Referer: `${SERVER}/framework/new_window.jsp?lianjie=&winid=win3`,
        "User-Agent": IE_8_USER_AGENT,
      },
    },
  );

  const content = await response.text();

  if (content.includes("学生学籍卡片")) {
    const info = await getStudentArchive(content);

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
  id: number;
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
  id: number,
): Promise<UnderRegisterStudentArchiveResponse> => {
  const url = `${SERVER}/xszhxxAction.do?method=addStudentPic_ZC&xs0101id=${id}`;

  const registerResponse = await fetch(url, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${SERVER}/framework/new_window.jsp?lianjie=&winid=win3`,
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
      return res.json(await registerStudentArchive(cookieHeader, req.body.id));

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
