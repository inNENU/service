import type { RequestHandler } from "express";

import { LIBRARY_SERVER } from "./utils";
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
      `${LIBRARY_SERVER}/engine2/custom/nenu/onlineUserNum`,
    );

    const data = <LibraryPeopleRawData>await response.json();

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

    return res.json({
      success: false,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      msg: "获取失败",
    });
  }
};
