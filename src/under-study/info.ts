import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import type { UnderStudyLoginFailedResponse } from "./login.js";
import { UNDER_STUDY_SERVER } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import {
  ExpiredResponse,
  TEST_INFO,
  UnknownResponse,
} from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";

const ID_REGEXP =
  /<td align="right" style="width: 90px">学号：<\/td>\s*<td align="left"><label style="width: 90px">(.*?)<\/label><\/td>/;
const NAME_REGEXP = /title="学生姓名" value="(.*?)"/;
const IN_YEAR_REGEXP =
  /<td align="right" style="width: 100px">入学年份：<\/td>\s*<td align="left"><label style="width: 90px">(.*?)<\/label><\/td>/;
const SCHOOL_REGEXP =
  /<td\s+align="right">院系名称：<\/td>\s*<td><label style="width: 90px">(.*?)<\/label><\/td>/;
const MAJOR_REGEXP =
  /<td\s+align="right">专业：<\/td>\s*<td\s*><label style="width: 90px">\s+(.*?)-?\s+<\/label><\/td>/;

const GRADE_REGEXP =
  /<td\s+align="right">所在年级：<\/td>\s*<td align="left"><label style="width: 90px">(.*?)<\/label><\/td>/;
// <td align="right">所在校区：</td>
// <td><label style="width: 90px">本部</label></td>

const LOCATION_REGEXP =
  /<td align="right">所在校区：<\/td>\s*<td><label style="width: 90px">(.*?)<\/label><\/td>/;
const PEOPLE_WRAPPER_REGEXP =
  /<select.+?title='民族' disabled='disabled'>([\s\S]+?)<\/select>/;
const PEOPLE_MATCH_REGEXP =
  /<option\s+value='\d+'\s*?selected>(.*?)<\/option>/g;

const ID_CARD_REGEXP =
  /<td align="right">证件号码：<\/td>\s*<td><input\s+id="sfzh"[\s\S]*?value="(.*?)"/;

export interface UnderStudyInfo {
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
  typeId: "bks";
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

export interface UnderStudyInfoSuccessResult {
  success: true;
  data: UnderStudyInfo;
}

export type UnderStudyInfoResult =
  | UnderStudyInfoSuccessResult
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

const TEST_INFO_RESULT: UnderStudyInfoSuccessResult = {
  success: true,
  data: TEST_INFO,
};

export const getUnderStudyInfo = async (
  cookieHeader: string,
): Promise<UnderStudyInfoResult> => {
  try {
    const infoResponse = await fetch(
      `${UNDER_STUDY_SERVER}/new/student/xjkpxx/edit.page?confirmInfo=`,
      {
        headers: {
          Cookie: cookieHeader,
          Referer: `${UNDER_STUDY_SERVER}/new/student/xjkpxx`,
          ...EDGE_USER_AGENT_HEADERS,
        },
        redirect: "manual",
      },
    );

    if (infoResponse.status === 302) return ExpiredResponse;

    const infoResult = await infoResponse.text();

    const location = LOCATION_REGEXP.exec(infoResult)![1];
    const idCard = ID_CARD_REGEXP.exec(infoResult)![1];
    const peopleSelectContent = PEOPLE_WRAPPER_REGEXP.exec(infoResult)![1];

    return {
      success: true,
      data: {
        id: Number(ID_REGEXP.exec(infoResult)![1]),
        name: NAME_REGEXP.exec(infoResult)![1],
        idCard,
        org: SCHOOL_REGEXP.exec(infoResult)![1],
        orgId: -1,
        major: MAJOR_REGEXP.exec(infoResult)![1],
        majorId: "",
        inYear: Number(IN_YEAR_REGEXP.exec(infoResult)![1]),
        grade: Number(GRADE_REGEXP.exec(infoResult)![1]),
        type: "本科生",
        typeId: "bks",
        people: PEOPLE_MATCH_REGEXP.exec(peopleSelectContent)![1],
        gender: Number(idCard[16]) % 2 === 0 ? "女" : "男",
        genderId: Number(idCard[16]) % 2 === 0 ? 2 : 1,
        birth: `${idCard.slice(6, 10)}-${idCard.slice(10, 12)}-${idCard.slice(12, 14)}`,
        location:
          location === "本部"
            ? "benbu"
            : location === "净月"
              ? "jingyue"
              : "unknown",
      },
    };
  } catch (err) {
    console.error("获取人员信息失败", err);

    return UnknownResponse("获取人员信息失败");
  }
};

export type UnderStudyInfoResponse =
  | UnderStudyInfoSuccessResult
  | UnderStudyLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>;

export const underInfoHandler = request<UnderStudyInfoResponse, AccountInfo>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_INFO_RESULT);

    return res.json(await getUnderStudyInfo(cookieHeader));
  },
);
