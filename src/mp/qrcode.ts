import type { RequestHandler } from "express";
import { toBuffer } from "qrcode";

import {
  InvalidArgResponse,
  UnknownResponse,
  appIDInfo,
} from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";
import { getWechatAccessToken } from "../utils/index.js";

export interface WechatQRCodeOptions {
  appID: "wx33acb831ee1831a5" | "wx2550e3fd373b79a8";
  page: string;
  scene: string;
}

export interface QQQRCodeOptions {
  appID: "1109559721";
  page: string;
}

export type QRCodeOptions = WechatQRCodeOptions | QQQRCodeOptions;

export interface WechatQRCodeError {
  errcode: number;
  errmsg: string;
}

export interface QRCodeSuccessResponse {
  success: true;
  image: string;
}

export type QRCodeResponse = QRCodeSuccessResponse | CommonFailedResponse;

const getWechatQRCode = async (
  accessToken: string,
  page: string,
  scene: string,
): Promise<Buffer | WechatQRCodeError> => {
  const response = await fetch(
    `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
    {
      method: "POST",
      body: JSON.stringify({
        page,
        scene,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        auto_color: true,
      }),
    },
  );

  const image = Buffer.from(await response.arrayBuffer());

  if (image.byteLength < 1024)
    return JSON.parse(image.toString()) as WechatQRCodeError;

  return image;
};

const getQQQRCode = async (appID: number, page: string): Promise<Buffer> =>
  toBuffer(`https://m.q.qq.com/a/p/${appID}?s=${encodeURI(page)}`);

export const mpQrCodeHandler: RequestHandler<
  Record<never, never>,
  Record<never, never>,
  Record<never, never>,
  QRCodeOptions
> = async (req, res) => {
  try {
    const { appID, page } = req.query;

    console.log("Requesting qrcode with", req.query);

    if (!appIDInfo[appID]) return res.json(InvalidArgResponse("appID"));

    if (Number.isNaN(Number(appID))) {
      const wechatAccessToken = await getWechatAccessToken(
        appID as "wx33acb831ee1831a5" | "wx2550e3fd373b79a8",
      );

      const image = await getWechatQRCode(
        wechatAccessToken,
        page,
        (req.query as WechatQRCodeOptions).scene,
      );

      if (image instanceof Buffer) {
        res.set({
          "Content-Disposition": "qrcode.jpg",
          "Content-Type": "image/jpeg",
        });

        return res.end(image);
      }

      return res.json(UnknownResponse(image.errmsg));
    }

    const image = await getQQQRCode(Number(appID), page);

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
