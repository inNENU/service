import { UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { middleware } from "../utils/index.js";

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

export const libraryPeopleHandler = middleware<LibraryPeopleResponse>(
  async (_, res) => {
    const response = await fetch(
      "https://www.library.nenu.edu.cn/engine2/custom/nenu/onlineUserNum",
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
