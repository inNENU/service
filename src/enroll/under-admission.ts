import type { RequestHandler } from "express";

import { ActionFailType, UnknownResponse } from "../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

export interface UnderAdmissionOptions {
  name: string;
  id: string;
  testId: string;
}

interface RawEnrollSuccessResult {
  name: string;
  institute: string;
  major: string;
  mailCode: string;
  hasMailed: string;
  admissionMethod: string;
}

interface RawEnrollFailedResult {
  code: -1;
}

type RawEnrollResult = RawEnrollSuccessResult | RawEnrollFailedResult;

export interface UnderAdmissionSuccessResponse {
  success: true;
  info: { text: string; value: string }[];
}

export type UnderAdmissionResponse =
  | UnderAdmissionSuccessResponse
  | CommonFailedResponse<ActionFailType.Closed | ActionFailType.Unknown>;

export const underAdmissionHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderAdmissionOptions
> = async (req, res) => {
  try {
    const { testId, id, name } = req.body;

    const params = {
      name,
      idCode: id,
      stuCode: testId,
    };

    console.log("Getting params", params);

    const response = await fetch("https://bkzsw.nenu.edu.cn/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (response.status !== 200)
      return res.json({
        success: false,
        type: ActionFailType.Closed,
        msg: "查询通道已关闭",
      });

    const result = (await response.json()) as RawEnrollResult;

    if ("code" in result) return res.json(UnknownResponse("查询失败"));

    const { institute, major, mailCode, hasMailed, admissionMethod } = result;

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

    return res.json({
      success: true,
      info,
    } as UnderAdmissionSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
