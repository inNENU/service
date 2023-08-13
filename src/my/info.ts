import { SERVER } from "./utils.js";
import type { CommonFailedResponse } from "../typings.js";

export interface RawInfo {
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
                lb: string;
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

export interface MyInfoSuccessResult {
  success: true;
  data: {
    /** 用户学号 */
    id: number;
    /** 用户姓名 */
    name: string;
    /** 用户身份证号 */
    idCard: string;
    /** 用户所在组织 ID */
    orgId: number;
    /** 用户所在组织名称 */
    orgName: string;
    /** 用户所在专业 ID */
    majorId: string;
    /** 用户所在专业名称 */
    majorName: string;
    /** 用户入学年份 */
    inYear: number;
    /** 用户入学年级 */
    grade: number;
    /** 用户层次 */
    type: string;
    /** 用户层次代码 */
    typeId: string;
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
  };
}

export type MyInfoResult = MyInfoSuccessResult | CommonFailedResponse;

export const getInfo = async (cookieHeader: string): Promise<MyInfoResult> => {
  const infoResponse = await fetch(`${SERVER}/sysform/loadIntelligent`, {
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
    infoResult.data.execResponse.return.Body.code === "200"
  ) {
    const info = infoResult.data.execResponse.return.Body.items.item[0];

    return {
      success: true,
      data: {
        id: Number(info.uid),
        name: info.name,
        idCard: info.idcard,
        orgName: info.orgname,
        orgId: Number(info.orgdn),
        majorName: info.zymc,
        majorId: info.zydm,
        inYear: Number(info.rxnf),
        grade: Number(info.xznj),
        type: info.pycc,
        typeId: info.lb,
        code: info.ryfldm,
        politicalStatus: info.zzmm,
        people: info.mzmc,
        peopleId: Number(info.mzdm),
        gender: info.xbmc,
        genderId: Number(info.xbdm),
        birth: info.csrq,
      },
    };
  }

  return {
    success: false,
    msg: "获取人员信息失败",
  };
};
