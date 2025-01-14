import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { UnknownResponse } from "../config/index.js";
import type { LoginOptions } from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp, request } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";

const idCardRegExp = /\[身份证号:(.{18})\]/;
const tableRegExp = /<table[^>]*?id=mxh[^>]*?>[^]*?<\/table>/;
const applyRowRexExp =
  /<tr[^>]+funBM\('(.*?)'\)[^>]+>\s*<td[^>]+>.*?<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>/g;
const resultRowRexExp =
  /<tr[^>]+>\s*<td[^>]+>.*?<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>/g;

export interface ApplyTest {
  url: string;
  name: string;
  time: string;
  type: string;
}

export interface AppliedTest {
  name: string;
  time: string;
  type: string;
  status: string;
}

export interface UnderTestQueySuccessResponse {
  success: true;
  apply: ApplyTest[];
  result: AppliedTest[];
}

export type UnderTestQueyFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type UnderTestQueyResponse =
  | UnderTestQueySuccessResponse
  | UnderTestQueyFailedResponse;

export const underTestQueryHandler = request<
  UnderTestQueyResponse,
  LoginOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  const QUERY_URL = `${UNDER_SYSTEM_SERVER}/kjlbgl.do?method=goStudentSKBm&tktime=${getIETimeStamp()}`;
  const queryResponse = await fetch(QUERY_URL, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${UNDER_SYSTEM_SERVER}/framework/new_window.jsp?lianjie=&winid=win1`,
      "User-Agent": IE_8_USER_AGENT,
    },
  });

  const queryContent = await queryResponse.text();

  const idCard = idCardRegExp.exec(queryContent)?.[1];

  if (!idCard) return res.json(UnknownResponse("未获取到身份证号"));

  const applyListResponse = await fetch(
    `${UNDER_SYSTEM_SERVER}/kjlbgl.do?method=goStudentSKXx&xs0101id=${idCard}`,
    {
      headers: {
        Cookie: cookieHeader,
        Referer: QUERY_URL,
        "User-Agent": IE_8_USER_AGENT,
      },
    },
  );

  const applyContent = await applyListResponse.text();

  const applyTable = tableRegExp.exec(applyContent)![0];

  const applyList = Array.from(applyTable.matchAll(applyRowRexExp)).map(
    ([, url, name, time, type]) => ({ name, time, type, url }),
  );

  const resultListResponse = await fetch(
    `${UNDER_SYSTEM_SERVER}/kjlbgl.do?method=goStudentSKYbXx&xs0101id=${idCard}`,
    {
      headers: {
        Cookie: cookieHeader,
        Referer: QUERY_URL,
        "User-Agent": IE_8_USER_AGENT,
      },
    },
  );

  const resultContent = await resultListResponse.text();

  const resultTable = tableRegExp.exec(resultContent)![0];

  const resultList = Array.from(resultTable.matchAll(resultRowRexExp)).map(
    ([, name, time, type, status]) => ({ name, time, type, status }),
  );

  return res.json({
    success: true,
    apply: applyList,
    result: resultList,
  });
});
