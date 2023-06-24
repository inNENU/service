import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";

export interface PostAdmissionPostOptions {
  name: string;
  id: string;
}

export interface PostAdmissionSuccessResponse {
  status: "success";
  info: { text: string; value: string }[];
}

export type PostAdmissionResponse =
  | PostAdmissionSuccessResponse
  | CommonFailedResponse;

const getInfo = async ({
  id,
  name,
}: PostAdmissionPostOptions): Promise<PostAdmissionResponse> => {
  const params = new URLSearchParams({
    xm: name,
    zjhm: id,
  });

  console.log("Getting params", params);
  const response = await fetch("http://yzb.nenu.edu.cn/yjs/sslq_result/2023", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const content = await response.text();

  if (/<button type="submit" >查询<\/button>/.test(content))
    return {
      status: "failed",
      msg: "暂无信息",
    };

  const testID =
    /<li class="label_short">考生编号：<\/li>s*<li class="bz">(.*?)<\/li>/.exec(
      content
    )![1];

  const way =
    /<li class="label_short">获取方式：<\/li>s*<li class="bz">(.*?)<\/li>/.exec(
      content
    )![1];

  const address =
    /<li class="label_short">通信地址：<\/li>s*<li class="bz" style="width:300px">(.*?)<\/li>/.exec(
      content
    )![1];

  const phone =
    /<li class="label_short">移动电话：<\/li>s*<li class="bz">(.*?)<\/li>/.exec(
      content
    )![1];

  const contact =
    /<li class="label_short">家庭成员电话：<\/li>s*<li class="bz">(.*?)<\/li>/.exec(
      content
    )![1];

  const receiver =
    /<li class="label_short">收 件 人：<\/li>s*<li class="bz">(.*?)<\/li>/.exec(
      content
    )![1];

  const expressId =
    /<li class="label_short">详情单号：<\/li>s*<li class="bz"><a href='http:\/\/www.ems.com.cn' target='_blank'>(.*?)<\/a><\/li>/.exec(
      content
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
      text: "家庭成员电话",
      value: contact,
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
    status: "success",
    info,
  };
};

export const postAdmissionHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  PostAdmissionPostOptions
> = async (req, res) => {
  res.json(await getInfo(req.body));
};
