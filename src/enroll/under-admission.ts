import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type { CommonFailedResponse } from "../typings.js";
import { getCookieHeader, getCookies } from "../utils/index.js";

export interface GetUnderAdmissionResponse {
  cookies: Cookie[];
  /** 填写信息 */
  info: string[];
  /** 验证码 */
  captcha: string;
  /** 通知 */
  notice: string;
  /** 详情 */
  detail: { title: string; content: string } | null;
}

const getCaptcha = async (): Promise<GetUnderAdmissionResponse> => {
  const imageResponse = await fetch(
    "http://bkzsw.nenu.edu.cn/include/webgetcode.php?width=85&height=28&sitex=15&sitey=6",
  );

  const cookies = getCookies(imageResponse);

  const base64Image = `data:image/png;base64,${Buffer.from(
    await imageResponse.arrayBuffer(),
  ).toString("base64")}`;

  const infoResponse = await fetch(
    "http://bkzsw.nenu.edu.cn/col_000018_000169.html",
    {
      headers: {
        Cookie: getCookieHeader(cookies),
      },
    },
  );

  const infoBody = await infoResponse.text();

  const [, notice = ""] =
    /<td colspan="2" align="left">(.*?)<\/td>\s*<\/tr>\s*<\/table>/.exec(
      infoBody,
    ) || [];

  return {
    cookies,
    info: ["name", "id", "testId"],
    captcha: base64Image,
    notice: infoBody.includes("东北师范大学2022年普通高考录取结果查询")
      ? "目前招生办暂无 2023 年查询方式，此查询返回的是 2022 年结果"
      : "部分省份信息正在录入中，点击查看详情",
    detail: {
      title: "录取信息",
      content: notice.replace(/<br>/g, "\n").replace(/<\/?font[^>]*>/g, ""),
    },
  };
};

export interface UnderAdmissionPostOptions {
  captcha: string;
  name: string;
  id: string;
  testId: string;
  cookies: Cookie[];
}

export interface UnderAdmissionSuccessResponse {
  status: "success";
  info: { text: string; value: string }[];
}

export type UnderAdmissionResponse =
  | UnderAdmissionSuccessResponse
  | CommonFailedResponse;

const getInfo = async ({
  cookies,
  testId,
  id,
  name,
  captcha,
}: UnderAdmissionPostOptions): Promise<UnderAdmissionResponse> => {
  const params = new URLSearchParams({
    en_zkz: testId,
    en_sfz: id,
    en_xm: name,
    en_code: captcha,
  });

  console.log("Getting params", params);

  const response = await fetch(
    "http://bkzsw.nenu.edu.cn/col_000018_000169_action_Entrance.html",
    {
      method: "POST",
      headers: {
        Cookie: getCookieHeader(cookies),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const content = await response.text();

  const errorResult =
    /<script language="javascript">alert\("(.*)"\);history.back\(-1\);<\/script>/.exec(
      content,
    );

  if (errorResult)
    return {
      status: "failed",
      msg: errorResult[1],
    };

  // eslint-disable-next-line no-irregular-whitespace
  const province = /<td align="right">省　　份：<\/td>\s*?<td>(.*?)<\/td>/.exec(
    content,
  )![1];
  const [, school, major] =
    /<td colspan="3" align="center"><font color="#FF0000" style="font-size:16px;"><p>恭喜你，你已经被我校 <\/p><p>(.*?)&nbsp;&nbsp;(.*?)&nbsp;&nbsp;专业录取！<\/p><\/font><\/td>/.exec(
      content,
    )!;
  const address =
    /<td align="right">通讯书邮寄地址：<\/td>\s*?<td colspan="2" align="left">(.*?)<\/td>/.exec(
      content,
    );
  const postCode =
    /<td align="right">邮政编码：<\/td>\s*?<td align="left">(.*?)<\/td>/.exec(
      content,
    );
  const receiver =
    /<td align="right">收&nbsp;&nbsp;件&nbsp;&nbsp;人：<\/td>\s*?<td align="left">(.*?)<\/td>/.exec(
      content,
    );
  const phone =
    /<td align="right">联系电话：<\/td>\s*?<td align="left">(.*?)<\/td>/.exec(
      content,
    );
  const expressNumber = /id="emsdh">(.*?)<\/a>/.exec(content);

  const info = [
    {
      text: "姓名",
      value: name,
    },
    {
      text: "考生号",
      value: testId,
    },
    {
      text: "省份",
      value: province,
    },
    {
      text: "录取专业",
      value: major,
    },
    {
      text: "所在学院",
      value: school,
    },
    {
      text: "录取通知书单号",
      value: expressNumber ? expressNumber[1] : "暂无",
    },
  ];

  if (address)
    info.push({
      text: "通讯地址",
      value: address[1],
    });

  if (postCode)
    info.push({
      text: "邮政编码",
      value: postCode[1],
    });

  if (receiver)
    info.push({
      text: "收件人",
      value: receiver[1],
    });

  if (phone)
    info.push({
      text: "联系电话",
      value: phone[1],
    });

  return {
    status: "success",
    info,
  };
};

export const underAdmissionHandler: RequestHandler = async (req, res) => {
  try {
    if (req.method === "GET") res.json(await getCaptcha());
    else if (req.method === "POST")
      res.json(await getInfo(<UnderAdmissionPostOptions>req.body));
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      status: "failed",
      msg: message,
    });
  }
};
