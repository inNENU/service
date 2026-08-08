import { getCampusLocation, request } from "@/utils/index.js";

import { TEST_GRADE, TEST_ID_NUMBER, unknownResponse } from "../config/index.js";
import type { CommonSuccessResponse } from "../typings.js";
import type { WhoLoginFailedResponse } from "./login.js";
import { WHO_SERVER, getWhoTime } from "./utils.js";

interface RawWhoInfoData {
  userId: string;
  userName: string;
  idcard: string;
  departmentName: string;
  departmentId: string;
}

interface RawWhoStudentInfoData {
  XY: string;
  XZ: string;
  XJZT: string;
  SFZJ: string;
  SZXQ: string;
  ZYH: string;
  SFXS: string;
  XB: string;
  PYCC: string;
  MZ: string;
  XH: string;
  XM: string;
  YJBYRQ: string;
  SFZX: string;
  RXNY: string;
  XSLB: string;
  SFYJBYS: string;
  TXTP2: "";
  NJ: string;
  NL: string;
  ZYMC: string;
}

export interface WhoInfoData {
  /** 用户学号 */
  id: number;
  /** 用户姓名 */
  name: string;
  /** 用户所在组织名称 */
  org: string;
  /** 用户所在组织 ID */
  orgId: number;
  /** 用户所在专业名称 */
  major: string;
  /** 用户所在专业 ID */
  majorId: string;
  /** 用户入学年份 */
  inYear: number;
  /** 用户入学年级 */
  grade: number;
  /** 用户学制（年） */
  studyLength?: number;
  /** 用户年龄 */
  age?: number;
  /** 用户预计毕业日期 */
  expectedGraduationDate?: string;
  /** 用户层次 */
  type: string;
  /** 用户层次代码 */
  typeId: "bks" | "yjs" | "unknown";
  /** 身份证号 */
  idCard: string;
  /** 用户民族 */
  people: string;
  /** 用户性别 */
  gender: string;
  /** 用户性别代码 */
  genderId: number;
  /** 用户出生日期 */
  birth: string;
  /** 用户所在校区 */
  location: "benbu" | "jingyue" | "unknown";
}

export type WhoInfoSuccessResponse = CommonSuccessResponse<WhoInfoData>;

export type WhoInfoResponse = WhoInfoSuccessResponse | WhoLoginFailedResponse;

export const TEST_WHO_INFO: WhoInfoSuccessResponse = {
  success: true,
  data: {
    id: TEST_ID_NUMBER,
    name: "测试用户",
    idCard: "123456789012345678",
    org: "测试学院",
    orgId: 1,
    major: "测试专业",
    majorId: "1",
    inYear: TEST_GRADE,
    grade: TEST_GRADE,
    studyLength: 4,
    age: 18,
    expectedGraduationDate: `${TEST_GRADE + 4}-07-01`,
    type: "本科",
    typeId: "bks",
    people: "汉族",
    gender: "男",
    genderId: 1,
    birth: "2000-01-01",
    location: "benbu",
  },
};

export const getWhoInfo = async (id: number, cookieHeader: string): Promise<WhoInfoResponse> => {
  const userInfoResponse = await fetch(`${WHO_SERVER}/tryLoginUserInfo?_t=${getWhoTime()}`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
    },
  });

  const userInfoData = (await userInfoResponse.json()) as {
    meta: { success: boolean; statusCode: number; message: string };
    data: RawWhoInfoData;
  };

  if (!userInfoData.meta.success) {
    console.error("获取 Who 信息失败", userInfoData);

    return unknownResponse("获取 Who 信息失败");
  }

  const studentInfoResponse = await fetch(
    `${WHO_SERVER}/api/bd-sjmh/xs/info/queryXsInfo?xh=${id}&_t=${getWhoTime()}`,
    {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
      },
    },
  );

  const studentInfoData = (await studentInfoResponse.json()) as {
    meta: { success: boolean; statusCode: number; message: string };
    data: RawWhoStudentInfoData;
  };

  if (!studentInfoData.meta.success) {
    console.error("获取 Who 信息失败", studentInfoData);

    return unknownResponse("获取 Who 信息失败");
  }

  const { departmentId, departmentName, idcard } = userInfoData.data;
  const { XY, XH, ZYH, XB, PYCC, MZ, XM, RXNY, XSLB, NJ, NL, XZ, YJBYRQ, ZYMC } =
    studentInfoData.data;

  return {
    success: true,
    data: {
      id: Number(XH),
      name: XM,
      // 研究生 queryXsInfo 的 XY（学院）可能为空，回退到 tryLoginUserInfo 的学院名
      org: XY || departmentName,
      orgId: Number(departmentId),
      major: ZYMC,
      majorId: ZYH,
      inYear: Number(RXNY.slice(0, 4)),
      grade: Number(NJ),
      ...(XZ ? { studyLength: Number(XZ) } : {}),
      ...(NL ? { age: Number(NL) } : {}),
      ...(YJBYRQ ? { expectedGraduationDate: YJBYRQ } : {}),
      type: XSLB,
      typeId: PYCC === "本科" ? "bks" : PYCC === "硕士" || PYCC === "博士" ? "yjs" : "unknown",
      idCard: idcard,
      people: MZ,
      gender: XB,
      genderId: XB === "女" ? 1 : 0,
      birth:
        idcard.length >= 14
          ? `${idcard.slice(6, 10)}-${idcard.slice(10, 12)}-${idcard.slice(12, 14)}`
          : "",
      location: getCampusLocation({ majorId: ZYH, orgId: Number(departmentId), major: ZYMC }),
    },
  };
};

export const whoInfoHandler = request<WhoInfoResponse, { id: number }>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_WHO_INFO);

  return res.json(await getWhoInfo(req.body.id, cookieHeader));
});
