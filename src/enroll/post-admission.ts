import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";

export interface PostAdmissionPostOptions {
  name: string;
  id: string;
}

export interface PostAdmissionSuccessResponse {
  success: true;
  info: { text: string; value: string }[];
}

export type PostAdmissionResponse =
  | PostAdmissionSuccessResponse
  | CommonFailedResponse;

const getInfo = async ({
  id,
  name,
}: PostAdmissionPostOptions): Promise<PostAdmissionResponse> => {
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

  console.log("Getting params", params);

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
      msg: "查询已关闭",
    };

  const content = await response.text();

  if (/<button type="submit" >查询<\/button>/.test(content))
    return {
      success: false,
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

  const info = [
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
    info,
  };
};

export const postAdmissionHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  PostAdmissionPostOptions
> = async (req, res) => {
  try {
    res.json(await getInfo(req.body));
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
