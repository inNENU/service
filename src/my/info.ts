import { writeFileSync } from "node:fs";

import type { RequestHandler } from "express";

import type { MyLoginFailedResult } from "./login.js";
import { myLogin } from "./login.js";
import { MY_SERVER } from "./utils.js";
import { code2major } from "../config/major.js";
import { code2org } from "../config/org.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

interface RawInfo {
  success: true;
  data: {
    execResponse: {
      return: {
        Body: {
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

export type MyInfoResult = MyInfoSuccessResult | CommonFailedResponse;

export const getMyInfo = async (
  cookieHeader: string,
): Promise<MyInfoResult> => {
  try {
    const infoResponse = await fetch(`${MY_SERVER}/sysform/loadIntelligent`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: "serviceAddress=dataCenter2.0%2Fsoap%2F00001_00036_01_02_20170918192121",
    });

    const infoResult = <RawInfo>await infoResponse.json();

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

      // fix post birth
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
          year.startsWith("0") || year.startsWith("1") ? "20" : "19"
        }-${monthMap[month]}-${day}`;
      }

      const location = [
        // 本部外国语专业
        "167111",
        "167110",
        "1066",
        "050201",
        "055102",
      ].includes(info.majorId)
        ? "benbu"
        : [
            // 净月外国语专业
            "167120",
            "167180",
            "167130",
            "167140",
          ].includes(info.majorId)
        ? "jingyue"
        : ["070201"].includes(info.majorId) || info.major === "细胞生物学"
        ? "unknown"
        : [
            253000, 170000, 166000, 234000, 173000, 236000, 232000, 174000,
            175000, 177000,
          ].includes(info.orgId)
        ? "benbu"
        : [161000, 169000, 252000, 168000, 261000, 178000, 235000].includes(
            info.orgId,
          )
        ? "jingyue"
        : "unknown";

      if (!code2org.has(info.orgId)) {
        writeFileSync("data", `["${info.org}", ${info.orgId}],\n`, {
          flag: "a",
        });
        code2org.set(info.orgId, info.org);
      }

      if (!code2major.has(info.majorId)) {
        writeFileSync(
          "data",
          `["${info.major}", "${info.majorId}"], // ${info.org}\n`,
          { flag: "a" },
        );
        code2major.set(info.majorId, info.major);
      }

      return {
        success: true,
        data: {
          ...info,
          location,
        },
      };
    }

    return {
      success: false,
      msg: "获取人员信息失败",
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,
      msg: "获取人员信息失败",
    };
  }
};

export type MyInfoResponse = MyInfoSuccessResult | MyLoginFailedResult;

export const myInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      const result = await myLogin(req.body);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(MY_SERVER);
    }

    const info = await getMyInfo(cookieHeader);

    return res.json(info);
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<MyLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
