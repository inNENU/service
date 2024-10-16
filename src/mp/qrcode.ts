import { toBuffer } from "qrcode";

import type { ActionFailType } from "../config/index.js";
import {
  MissingArgResponse,
  UnknownResponse,
  appIDInfo,
} from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";
import { getWechatMPCode, request } from "../utils/index.js";

export interface WechatMpCodeOptions {
  appID: "wx33acb831ee1831a5" | "wx2550e3fd373b79a8";
  page: string;
  scene: string;
}

export interface QQMpCodeOptions {
  appID: "1109559721";
  page: string;
}

export type MpCodeOptions = WechatMpCodeOptions | QQMpCodeOptions;

export interface MpCodeSuccessResponse {
  success: true;
  image: string;
}

export type MpCodeResponse =
  | MpCodeSuccessResponse
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

const getQQMpCode = async (appID: number, page: string): Promise<Buffer> =>
  toBuffer(`https://m.q.qq.com/a/p/${appID}?s=${encodeURI(page)}`);

export const mpQrCodeHandler = request<
  MpCodeResponse,
  MpCodeOptions,
  MpCodeOptions
>(async (req, res) => {
  const options = req.method === "GET" ? req.query : req.body;

  console.info("Requesting MP QRCode with", options);

  const { appID, page } = options;

  if (!appIDInfo[appID]) return res.json(MissingArgResponse("appID"));

  // This is a Wechat Mini Program
  if ("scene" in options) {
    const image = await getWechatMPCode(appID, page, options.scene);

    if (image instanceof Buffer) {
      res.set({
        "Content-Disposition": "qrcode.png",
        "Content-Type": "image/png",
      });

      return res.end(image);
    }

    return res.json(UnknownResponse(image.errmsg));
  }

  const image = await getQQMpCode(Number(appID), page);

  res.set({
    "Content-Disposition": `qrcode.png`,
    "Content-Type": "image/png",
  });

  return res.end(image);
});
