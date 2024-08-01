import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  ActionFailType,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  AccountInfo,
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
        })
          .then((res) => res.arrayBuffer())
          .then(
            (buffer) =>
              `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`,
          )
          .catch(() => "")
      : "",
    examImageLink
      ? fetch(`${UNDER_SYSTEM_SERVER}${examImageLink}`, {
          method: "POST",
          headers: {
            Cookie: cookieHeader,
          },
        })
          .then((res) => res.arrayBuffer())
          .then(
            (buffer) =>
              `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`,
          )
          .catch(() => "")
      : "",
  ]);

  const path = pathRegExp.exec(content)?.[1] ?? "";
  const canRegister = registerButtonRegExp.test(content);

  return {
    basic,
    archiveImage,
    examImage,
    study,
    family,
    canRegister,
    isRegistered: !canRegister || content.includes("您已经提交注册信息"),
    path,
  };
};

export interface GetUnderStudentArchiveOptions extends LoginOptions {
  type?: "get";
}

export interface UnderGetStudentArchiveSuccessResponse {
  success: true;
  info: UnderStudentArchiveInfo;
}

export type UnderGetStudentArchiveResponse =
  | UnderGetStudentArchiveSuccessResponse
  | AuthLoginFailedResponse
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

    return {
      success: true,
      info,
    } as UnderGetStudentArchiveSuccessResponse;
  }

  return {
    success: false,
    type: ActionFailType.Unknown,
    msg: "获取学籍信息失败",
  };
};

const alertRegExp = /window.alert\('(.+?)'\)/;

export interface RegisterUnderStudentArchiveOptions extends LoginOptions {
  type?: "register";
  path: string;
}

export interface UnderRegisterStudentArchiveSuccessResponse {
  success: true;
}

export type UnderRegisterStudentArchiveResponse =
  | UnderRegisterStudentArchiveSuccessResponse
  | AuthLoginFailedResponse
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

  const alert = alertRegExp.exec(response)?.[1] ?? "注册失败";

  if (alert === "注册成功。") return { success: true };

  return UnknownResponse(alert);
};

const UNDER_STUDENT_ARCHIVE_VIEW_TEST_RESPONSE: UnderGetStudentArchiveSuccessResponse =
  {
    success: true,
    info: {
      basic: [
        { text: "张三", value: "某某某" },
        { text: "性别", value: "男" },
        { text: "民族", value: "汉" },
        { text: "出生日期", value: "2000-01-01" },
      ],
      study: [
        {
          startTime: "开始时间",
          endTime: "结束时间",
          school: "学校",
          title: "职务",
          witness: "证明人",
          remark: "备注",
        },
        ...Array.from({ length: 5 }, (_, i) => ({
          startTime: `开始时间${i + 1}`,
          endTime: `结束时间${i + 1}`,
          school: `学校${i + 1}`,
          title: "无",
          witness: `证明人${i + 1}`,
          remark: "无",
        })),
      ],
      family: [
        {
          name: "姓名",
          relation: "与本人关系",
          office: "工作单位",
          title: "职务",
          phone: "联系电话",
          remark: "备注",
        },
        ...Array.from({ length: 3 }, (_, i) => ({
          name: `家庭成员${i + 1}`,
          relation: `某关系${i + 1}`,
          office: `某单位${i + 1}`,
          title: `某职务${i + 1}`,
          phone: "12345678901",
          remark: "无",
        })),
      ],
      archiveImage: "https://innenu.com/favicon.ico",
      examImage: "https://innenu.com/favicon.ico",
      canRegister: false,
      isRegistered: true,
      path: "",
    },
  };

export const underStudentArchiveHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  GetUnderStudentArchiveOptions | RegisterUnderStudentArchiveOptions
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await underSystemLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(
        UNDER_STUDENT_ARCHIVE_QUERY_URL,
      );
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (req.body.type === "register") {
      if (cookieHeader.includes("TEST"))
        return res.json({
          success: false,
          msg: "学年学籍已注册",
        });

      return res.json(
        await registerStudentArchive(cookieHeader, req.body.path),
      );
    }

    if (cookieHeader.includes("TEST")) {
      return res.json(UNDER_STUDENT_ARCHIVE_VIEW_TEST_RESPONSE);
    }

    return res.json(await getUnderStudentArchive(cookieHeader));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
