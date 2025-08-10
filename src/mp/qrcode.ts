import { toBuffer } from "qrcode";

import type { WechatMpCodeError } from "@/utils/index.js";
import { getWechatMPCode, request } from "@/utils/index.js";

import type { ActionFailType } from "../config/index.js";
import {
  MissingArgResponse,
  UnknownResponse,
  appIdInfo,
} from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";

export interface WechatMpCodeOptions {
  appId: "wx33acb831ee1831a5" | "wx2550e3fd373b79a8";
  page: string;
  scene: string;
}

export interface QQMpCodeOptions {
  appId: 1109559721;
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

const getQQMpCode = async (appId: number, page: string): Promise<Buffer> =>
  toBuffer(`https://m.q.qq.com/a/p/${appId}?s=${encodeURI(page)}`);

export const mpQrCodeHandler = request<
  MpCodeResponse,
  MpCodeOptions,
  MpCodeOptions
>(async (req, res) => {
  const options = req.method === "GET" ? req.query : req.body;

  console.info("Requesting MP QRCode with", options);

  const { appId, page } = options;

  if (!appIdInfo[appId]) return res.json(MissingArgResponse("appId"));

  // This is a Wechat Mini Program
  if ("scene" in options) {
    const image = await getWechatMPCode(appId as string, page, options.scene);

    if (image instanceof Buffer) {
      res.set({
        "Content-Disposition": "qrcode.png",
        "Content-Type": "image/png",
      });

      return res.end(image);
    }

    return res.json(UnknownResponse((image as WechatMpCodeError).errmsg));
  }

  const image = await getQQMpCode(appId as number, page);

  res.set({
    "Content-Disposition": `qrcode.png`,
    "Content-Type": "image/png",
  });

  return res.end(image);
});
