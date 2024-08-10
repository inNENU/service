import type { RequestHandler } from "express";
import { toBuffer } from "qrcode";

import {
  InvalidArgResponse,
  UnknownResponse,
  appIDInfo,
} from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";
import { getWechatMPCode } from "../utils/index.js";

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

export type MpCodeResponse = MpCodeSuccessResponse | CommonFailedResponse;

const getQQMpCode = async (appID: number, page: string): Promise<Buffer> =>
  toBuffer(`https://m.q.qq.com/a/p/${appID}?s=${encodeURI(page)}`);

export const mpQrCodeHandler: RequestHandler<
  Record<never, never>,
  Record<never, never>,
  Record<never, never>,
  MpCodeOptions
> = async (req, res) => {
  try {
    const { appID, page } = req.query;

    console.log("Requesting qrcode with", req.query);

    if (!appIDInfo[appID]) return res.json(InvalidArgResponse("appID"));

    if (Number.isNaN(Number(appID))) {
      const image = await getWechatMPCode(
        appID,
        page,
        (req.query as WechatMpCodeOptions).scene,
      );

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
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    res.json(UnknownResponse(message));
  }
};
