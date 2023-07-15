import type { RequestHandler } from "express";

import { MAIN_URL } from "./utils.js";
import type { CommonFailedResponse } from "../typings.js";
import type { Node } from "../utils/index.js";
import { getRichTextNodes } from "../utils/index.js";

const contentRegExp = /<div id="vsb_content">([\s\S]+?)<\/div>/;

export interface MainStatusSuccessResponse {
  success: true;
  data: Node[];
}

export type MainStatusResponse =
  | MainStatusSuccessResponse
  | CommonFailedResponse;

export const mainStatusHandler: RequestHandler = async (_, res) => {
  try {
    const response = await fetch(`${MAIN_URL}/xxgk1/xqtj1.htm`);

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请求失败",
      });

    const text = await response.text();

    return res.json(<MainStatusSuccessResponse>{
      success: true,

      data: await getRichTextNodes(contentRegExp.exec(text)![1].trim()),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
