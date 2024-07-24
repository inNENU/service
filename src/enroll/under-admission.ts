import type { RequestHandler } from "express";

import { ActionFailType, UnknownResponse } from "../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const QUERY_URL = "https://gkcx.nenu.edu.cn/api/user/admissionQuery";

export interface UnderAdmissionOptions {
  name: string;
  id: string;
  testId: string;
}

interface RawEnrollSuccessResult {
  // FIXME: Correct fields
  student: {
    name: string;
    institute: string;
    major: string;
    mailCode: string;
    hasMailed: string;
    admissionMethod: string;
  };
}

interface RawEnrollFailedResult {
  message: string;
  student: null;
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
      id_code: id,
      student_code: testId,
    };

    console.log("Getting params", params);

    const response = await fetch(QUERY_URL, {
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

    if (result.student === null)
      return res.json(UnknownResponse(result.message));

    const { institute, major, mailCode, hasMailed, admissionMethod } =
      result.student;

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
