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

export interface UnderArchiveInfo {
  text: string;
  value: string;
  editable: boolean;
}

export interface UnderStudyOptions {
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

export interface UnderFamilyOptions {
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

export interface UnderCreateStudentArchiveOptions
  extends Partial<LoginOptions> {
  type: "get-info";
}

export interface UnderCreateStudentArchiveSuccessResponse {
  success: true;
  info: unknown;
}

export type UnderCreateStudentArchiveResponse =
  | UnderCreateStudentArchiveSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

const nextLinkRegExp =
  /<input\s+type="button"\s+class="button"\s+onclick="window.location.href='([^']+)';"\s+value=" 下一步 "\/>/;
const infoRowRegExp =
  /<tr height="25px"\s*><td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<\/tr>/g;

export const getUnderStudentArchiveInfo = async (
  cookieHeader: string
): Promise<UnderCreateStudentArchiveResponse> => {
  const welcomePageResponse = await fetch(
    `${SERVER}/ggxx/xj/bdzcsm.jsp?tktime=${getTimeStamp()}`,
    {
      headers: {
        Cookie: cookieHeader,
        Referer: `${SERVER}/framework/new_window.jsp?lianjie=&winid=win1`,
        "User-Agent": IE_8_USER_AGENT,
      },
    }
  );

  const welcomePageContent = await welcomePageResponse.text();

  const link = welcomePageContent.match(nextLinkRegExp)?.[1];

  if (!link)
    return {
      success: false,
      msg: "未找到注册学籍链接",
    };

  const infoResponse = await fetch(`${SERVER}${link}`, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${SERVER}/ggxx/xj/bdzcsm.jsp`,
      "User-Agent": IE_8_USER_AGENT,
    },
  });

  const infoContent = await infoResponse.text();

  const info = Array.from(infoContent.matchAll(infoRowRegExp)).map(
    ([, ...matches]) =>
      matches.map((item) => item.replace(/&nbsp;/g, " ").trim())
  );

  console.log(info);

  return {
    success: true,
    info,
  };
};

// xs.xh
// xs.xm
// xs.xbm
// xs.csrq
// xs.sfzjh
// xs.zzmmm
// xs.mzm
// xs.zxwyyz
// xs.kslbm
// hcdz	xs.hcdz
// xs.hcdz	220581
// gxstr	xs.hcdz
// xs0101id	220421200601174147
// xjxgsqid
// xjxgsqid	bd
// kzlx	1
// xs.xm.oldvalue	陈良宇
// xs.xbm.oldvalue	女
// xs.csrq.oldvalue	20060117
// xs.sfzjh.oldvalue	220421200601174147
// xs.zzmmm.oldvalue	共青团员
// xs.mzm.oldvalue	汉族
// xs.zxwyyz.oldvalue	英语
// xs.kslbm.oldvalue	农村应届
// xs.hcdz.oldvalue
// xs0105.jtlxr.oldvalue

export const underCreateStudentArchiveHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderCreateStudentArchiveOptions
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

      cookieHeader = result.cookieStore.getHeader(SERVER);
    }

    if (req.body.type === "get-info")
      return res.json(await getUnderStudentArchiveInfo(cookieHeader));

    return res.json({
      success: false,
      msg: "未知操作",
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
