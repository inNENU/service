import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import { ActionFailType, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
} from "../typings.js";

export interface GradAdmissionOptions {
  name: string;
  id: string;
}

export type GradAdmissionSuccessResponse = CommonSuccessResponse<
  { text: string; value: string }[]
>;

export type GradAdmissionResponse =
  | GradAdmissionSuccessResponse
  | CommonFailedResponse<ActionFailType.Closed | ActionFailType.Unknown>;

const getInfo = async ({
  id,
  name,
}: GradAdmissionOptions): Promise<GradAdmissionResponse> => {
  const cookieStore = new CookieStore();
  const mainPageResponse = await fetch("https://yzb.nenu.edu.cn/yjs/sslq/", {
    method: "GET",
  });

  cookieStore.applyResponse(mainPageResponse, "yzb.nenu.edu.cn");

  const mainContent = await mainPageResponse.text();

  const captchaID =
    /<input type="hidden" name="csrf_test_name" value="(.*?)" \/>/.exec(
      mainContent,
    )![1];

  const params = new URLSearchParams({
    csrf_test_name: captchaID,
    xm: name,
    zjhm: id,
  });

  const searchUrl = "https://yzb.nenu.edu.cn/yjs/sslq_result/2023";

  const response = await fetch(searchUrl, {
    method: "POST",
    headers: {
      Cookie: cookieStore.getHeader(searchUrl),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (response.status !== 200)
    return {
      success: false,
      type: ActionFailType.Closed,
      msg: "查询已关闭",
    };

  const content = await response.text();

  if (content.includes('<button type="submit" >查询</button>'))
    return {
      success: false,
      type: ActionFailType.Unknown,
      msg: "暂无信息",
    };

  const testID =
    /<li class="label_short">考生编号：<\/li>\s*<li class="bz">(.*?)<\/li>/.exec(
      content,
    )![1];

  const way =
    /<li class="label_short">获取方式：<\/li>\s*<li class="bz">(.*?)<\/li>/.exec(
      content,
    )![1];

  const address =
    /<li class="label_short">通信地址：<\/li>\s*<li class="bz" style="width:300px">(.*?)<\/li>/.exec(
      content,
    )![1];

  const phone =
    /<li class="label_short">移动电话：<\/li>\s*<li class="bz">(.*?)<\/li>/.exec(
      content,
    )![1];

  const others =
    /<li class="label_short">其他电话：<\/li>\s*<li class="bz">(.*?)<\/li>/.exec(
      content,
    )![1];

  const receiver =
    /<li class="label_short">收 件 人：<\/li>\s*<li class="bz">(.*?)<\/li>/.exec(
      content,
    )![1];

  const expressId =
    /<li class="label_short">详情单号：<\/li>\s*<li class="bz"><a href='http:\/\/www.ems.com.cn' target='_blank'>(.*?)<\/a><\/li>/.exec(
      content,
    )![1];

  const data = [
    {
      text: "考生姓名",
      value: name,
    },
    {
      text: "考生号",
      value: testID,
    },
    {
      text: "获取方式",
      value: way,
    },
    {
      text: "通信地址",
      value: address,
    },
    {
      text: "移动电话",
      value: phone,
    },
    {
      text: "其他电话",
      value: others,
    },
    {
      text: "收件人",
      value: receiver,
    },
    {
      text: "快递单号",
      value: expressId,
    },
  ];

  return {
    success: true,
    data,
  };
};

export const gradAdmissionHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  GradAdmissionOptions
> = async (req, res) => {
  try {
    res.json(await getInfo(req.body));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
