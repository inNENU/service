import type { RequestHandler } from "express";

import type { CommonFailedResponse } from "../typings.js";

export interface UnderAdmissionPostOptions {
  name: string;
  id: string;
  testId: string;
}

interface RawEnrollResult {
  name: string;
  institute: string;
  major: string;
  mailCode: string;
  hasMailed: string;
  admissionMethod: string;
}

export interface UnderAdmissionSuccessResponse {
  success: true;
  info: { text: string; value: string }[];
}

export type UnderAdmissionResponse =
  | UnderAdmissionSuccessResponse
  | CommonFailedResponse;

const getInfo = async ({
  testId,
  id,
  name,
}: UnderAdmissionPostOptions): Promise<UnderAdmissionResponse> => {
  const params = {
    name,
    idCode: id,
    stuCode: testId,
  };

  console.log("Getting params", params);

  const response = await fetch("http://bkzsw.nenu.edu.cn/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (response.status !== 200)
    return {
      success: false,
      msg: "查询通道已关闭",
    };

  const { institute, major, mailCode, hasMailed, admissionMethod } = <
    RawEnrollResult
  >await response.json();

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
      text: "招生方式",
      value: admissionMethod,
    },
    {
      text: "录取专业",
      value: major,
    },
    {
      text: "所在学院",
      value: institute,
    },
    {
      text: "录取通知书单号",
      value: mailCode,
    },
    {
      text: "是否已寄出",
      value: hasMailed ? "是" : "否",
    },
  ];

  return {
    success: true,
    info,
  };
};

export const underAdmissionHandler: RequestHandler = async (req, res) => {
  try {
    // TODO: Remove
    if (req.method === "GET")
      res.json({
        info: ["name", "id", "testId"],
        captcha: "",
      });
    else res.json(await getInfo(<UnderAdmissionPostOptions>req.body));
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
