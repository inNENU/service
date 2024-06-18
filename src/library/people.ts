import type { RequestHandler } from "express";

import { UnknownResponse } from "../config";
import type { CommonFailedResponse } from "../typings";

interface LibraryPeopleRawData {
  code: number;
  data: {
    AbleMainNum: number;
    JingYueNum: number;
    AbleJingYueNum: number;
    MainNum: number;
  };

  status: number;
}

export interface LibraryPeopleSuccessResponse {
  success: true;
  benbu: number;
  benbuMax: number;
  jingyue: number;
  jingyueMax: number;
}

export type LibraryPeopleResponse =
  | LibraryPeopleSuccessResponse
  | CommonFailedResponse;

export const libraryPeopleHandler: RequestHandler = async (_, res) => {
  try {
    const response = await fetch(
      "https://www.library.nenu.edu.cn/engine2/custom/nenu/onlineUserNum",
    );

    const data = (await response.json()) as LibraryPeopleRawData;

    if (data.code === 1 && data.status === 200) {
      const { MainNum, JingYueNum, AbleJingYueNum, AbleMainNum } = data.data;

      return res.json({
        success: true,
        benbu: MainNum,
        benbuMax: AbleMainNum,
        jingyue: JingYueNum,
        jingyueMax: AbleJingYueNum,
      });
    }

    throw new Error("Failed");
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
