import type { RequestHandler } from "express";

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

export interface LibraryPeopleResponse {
  benbu: number;
  benbuMax: number;
  jingyue: number;
  jingyueMax: number;
}

export const libraryPeopleHandler: RequestHandler = async (_, res) => {
  try {
    const response = await fetch(
      "http://www.library.nenu.edu.cn/engine2/custom/nenu/onlineUserNum",
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

    res.status(500).end({
      success: false,
      msg: "获取失败",
    });
  }
};
