import { request } from "@/utils/index.js";

import type { WhoLoginFailedResponse } from "./login.js";
import { WHO_SERVER, getWhoTime } from "./utils.js";
import {
  TEST_GRADE,
  TEST_ID_NUMBER,
  UnknownResponse,
} from "../config/index.js";
import type { CommonSuccessResponse } from "../typings.js";

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
    type: "本科",
    typeId: "bks",
    people: "汉族",
    gender: "男",
    genderId: 1,
    birth: "2000-01-01",
    location: "benbu",
  },
};

export const getWhoInfo = async (
  id: number,
  cookieHeader: string,
): Promise<WhoInfoResponse> => {
  const userInfoResponse = await fetch(
    `${WHO_SERVER}/tryLoginUserInfo?_t=${getWhoTime()}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
      },
    },
  );

  const userInfoData = (await userInfoResponse.json()) as {
    meta: { success: boolean; statusCode: number; message: string };
    data: RawWhoInfoData;
  };

  if (!userInfoData.meta.success) {
    console.error("获取 Who 信息失败", userInfoData);

    return UnknownResponse("获取 Who 信息失败");
  }

  console.log(userInfoData.data);

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

    return UnknownResponse("获取 Who 信息失败");
  }

  console.log(studentInfoData.data);

  const { departmentId, idcard } = userInfoData.data;
  const { XY, XH, SZXQ, ZYH, XB, PYCC, MZ, XM, RXNY, XSLB, NJ, ZYMC } =
    studentInfoData.data;

  return {
    success: true,
    data: {
      id: Number(XH),
      name: XM,
      org: XY,
      orgId: Number(departmentId),
      major: ZYMC,
      majorId: ZYH,
      inYear: Number(RXNY.substring(0, 4)),
      grade: Number(NJ),
      type: XSLB,
      typeId:
        PYCC === "本科"
          ? "bks"
          : PYCC === "硕士" || PYCC === "博士"
            ? "yjs"
            : "unknown",
      idCard: idcard,
      people: MZ,
      gender: XB,
      genderId: XB === "女" ? 1 : 0,
      birth: `${idcard.substring(6, 10)}-${idcard.substring(10, 12)}-${idcard.substring(12, 14)}`,
      location:
        SZXQ === "自由校区"
          ? "benbu"
          : SZXQ === "净月校区"
            ? "jingyue"
            : "unknown",
    },
  };
};

export const whoInfoHandler = request<
  WhoInfoResponse,
  Record<string, never>,
  { id: number }
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_WHO_INFO);

  return res.json(await getWhoInfo(req.body.id, cookieHeader));
});
