import type { PoolConnection } from "mysql2/promise";

import type { MyLoginFailedResponse } from "./login.js";
import { MY_SERVER } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import {
  ExpiredResponse,
  TEST_INFO,
  UnknownResponse,
} from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";
import { getConnection, releaseConnection, request } from "../utils/index.js";

type RawInfo =
  | {
      success: true;
      data: {
        execResponse: {
          return: {
            Body?: {
              code: "200";
              flag: "1";
              msg: "sueccess";
              rows: "1";
              total: "1";
              items: {
                item: [
                  {
                    uid: string;
                    name: string;
                    idcard: string;
                    orgdn: string;
                    mzdm: string;
                    mzmc: string;
                    xbdm: string;
                    xbmc: string;
                    csrq: string;
                    orgname: string;
                    zydm: string;
                    zymc: string;
                    rxnf: string;
                    xznj: string;
                    lb: "bks" | "yjs" | "lxs" | "jzg";
                    zzmm: string;
                    wf_dhhm: string;
                    dhhm: string;
                    wf_wx: string;
                    wf_qq: string;
                    wf_email: string;
                    status: string;
                    pycc: string;
                    ryfldm: string;
                  },
                ];
              };
            };
          };
        };
      };
    }
  | { success: false; data: { msg: string } };

export interface MyInfo {
  /** 用户学号 */
  id: number;
  /** 用户姓名 */
  name: string;
  /** 用户身份证号 */
  idCard: string;
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
  typeId: "bks" | "yjs" | "lxs" | "jzg";
  /** 用户类别码 */
  code: string;
  /** 用户政治面貌 */
  politicalStatus: string;
  /** 用户民族 */
  people: string;
  /** 用户民族代码 */
  peopleId: number;
  /** 用户性别 */
  gender: string;
  /** 用户性别代码 */
  genderId: number;
  /** 用户出生日期 */
  birth: string;
  /** 用户所在校区 */
  location: "benbu" | "jingyue" | "unknown";
}

export interface MyInfoSuccessResult {
  success: true;
  data: MyInfo;
}

export type MyInfoResult =
  | MyInfoSuccessResult
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

const TEST_INFO_RESULT: MyInfoSuccessResult = {
  success: true,
  data: TEST_INFO,
};

export const getMyInfo = async (
  cookieHeader: string,
): Promise<MyInfoResult> => {
  let connection: PoolConnection | null = null;

  try {
    const infoResponse = await fetch(`${MY_SERVER}/sysform/loadIntelligent`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: "serviceAddress=dataCenter2.0%2Fsoap%2F00001_00036_01_02_20170918192121",
      redirect: "manual",
    });

    if (infoResponse.status === 302) return ExpiredResponse;

    const infoResult = (await infoResponse.json()) as RawInfo;

    if (
      infoResult.success &&
      infoResult.data.execResponse.return.Body?.code === "200"
    ) {
      const personInfo = infoResult.data.execResponse.return.Body.items.item[0];

      const info = {
        id: Number(personInfo.uid),
        name: personInfo.name,
        idCard: personInfo.idcard,
        org: personInfo.orgname,
        school: personInfo.orgname,
        orgId: Number(personInfo.orgdn),
        major: personInfo.zymc,
        majorId: personInfo.zydm,
        inYear: Number(personInfo.rxnf),
        grade: Number(personInfo.xznj),
        type: personInfo.pycc,
        typeId: personInfo.lb,
        code: personInfo.ryfldm,
        politicalStatus: personInfo.zzmm,
        people: personInfo.mzmc,
        peopleId: Number(personInfo.mzdm),
        gender: personInfo.xbmc,
        genderId: Number(personInfo.xbdm),
        birth: personInfo.csrq,
      };

      // fix grad birth
      if (/[A-Z]/.test(personInfo.csrq)) {
        const [day, month, year] = personInfo.csrq.split("-");

        const monthMap: Record<string, string> = {
          JAN: "01",
          FEB: "02",
          MAR: "03",
          APR: "04",
          MAY: "05",
          JUN: "06",
          JUL: "07",
          AUG: "08",
          SEP: "09",
          OCT: "10",
          NOV: "11",
          DEC: "12",
        };

        info.birth = `${
          Number(year[0]) < 5 ? "20" : "19"
        }${year}-${monthMap[month]}-${day}`;
      }

      const location = [
        // 本部外国语专业
        "167110",
        "167111",
        "167115",
        "167118",
        "045108",
        "050201",
        "055101",
        "055102",
        "1013973",
        "1014014",
        "1014030",
      ].includes(info.majorId)
        ? "benbu"
        : [
              // 净月外国语专业
              "1066",
              "167120",
              "167122",
              "167130",
              "167133",
              "167140",
              "167141",
              "167180",
              "1014014",
              "050202",
              "1013992",
              "1014015",
              "1014073",
              "1014199",
              "050211",
            ].includes(info.majorId)
          ? "jingyue"
          : ["070201"].includes(info.majorId) || info.major === "细胞生物学"
            ? "unknown"
            : [
                  164000, 166000, 170000, 173000, 174000, 175000, 177000,
                  232000, 234000, 236000, 253000,
                ].includes(info.orgId)
              ? "benbu"
              : [
                    161000, 168000, 169000, 178000, 235000, 245000, 246000,
                    252000, 261000,
                  ].includes(info.orgId)
                ? "jingyue"
                : "unknown";

      try {
        connection = await getConnection();
        await connection.execute(
          "INSERT IGNORE INTO `org_id` (`orgId`, `org`) VALUES (?, ?)",
          [info.orgId, info.org],
        );
        await connection.execute(
          "INSERT IGNORE INTO `major_id` (`majorId`, `major`, `orgId`) VALUES (?, ?, ?)",
          [info.majorId, info.major, info.orgId],
        );
      } catch (err) {
        console.error("Database error", err);
      }

      return {
        success: true,
        data: {
          ...info,
          location,
        },
      };
    }

    return UnknownResponse("获取人员信息失败");
  } finally {
    releaseConnection(connection);
  }
};

export type MyInfoResponse =
  | MyInfoSuccessResult
  | MyLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>;

export const myInfoHandler = request<MyInfoResponse, AccountInfo>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_INFO_RESULT);

    return res.json(await getMyInfo(cookieHeader));
  },
);
