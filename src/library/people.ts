import { request } from "@/utils/index.js";

import { UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { LIBRARY_SERVER } from "./utils.js";

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

export interface LibraryPeopleData {
  benbu: number;
  benbuMax: number;
  jingyue: number;
  jingyueMax: number;
}

export type LibraryPeopleSuccessResponse =
  CommonSuccessResponse<LibraryPeopleData>;

export type LibraryPeopleResponse =
  | LibraryPeopleSuccessResponse
  | CommonFailedResponse;

export const libraryPeopleHandler = request<LibraryPeopleResponse>(
  async (_, res) => {
    const response = await fetch(
      `${LIBRARY_SERVER}/engine2/custom/nenu/onlineUserNum`,
    );

    const data = (await response.json()) as LibraryPeopleRawData;

    if (data.code === 1 && data.status === 200) {
      const { MainNum, JingYueNum, AbleJingYueNum, AbleMainNum } = data.data;

      return res.json({
        success: true,
        data: {
          benbu: MainNum,
          benbuMax: AbleMainNum,
          jingyue: JingYueNum,
          jingyueMax: AbleJingYueNum,
        },
      });
    }

    return UnknownResponse("获取人数失败");
  },
);
