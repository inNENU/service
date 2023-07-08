import type { RequestHandler } from "express";
import { toBuffer } from "qrcode";

import { appIDInfo } from "./config.js";
import { getWechatAccessToken } from "./utils/wechatAccessToken.js";

export interface WechatQRCodeOptions {
  appID: "wx33acb831ee1831a5" | "wx9ce37d9662499df3";
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
  status: "success";
  image: string;
}

export interface QRCodeFailedResponse {
  status: "failed";
  msg: string;
}

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
    return <WechatQRCodeError>JSON.parse(image.toString());

  return image;
};

const getQQQRCode = async (appID: string, page: string): Promise<Buffer> =>
  toBuffer(`https://m.q.qq.com/a/p/${appID}?s=${encodeURI(page)}`);

export const qrCodeHandler: RequestHandler<
  Record<never, never>,
  Record<never, never>,
  Record<never, never>,
  QRCodeOptions
> = async (req, res) => {
  try {
    const { appID, page } = req.query;

    console.log("Requesting", req.query);

    if (!appIDInfo[appID])
      return res.json({
        status: "failed",
        msg: "AppID 非法",
      });

    if (Number.isNaN(Number(appID))) {
      const wechatAccessToken = await getWechatAccessToken(appID);

      const image = await getWechatQRCode(
        wechatAccessToken,
        page,
        (<WechatQRCodeOptions>req.query).scene,
      );

      if (image instanceof Buffer) {
        res.set({
          "Content-Disposition": `qrcode.jpg`,
          "Content-Type": "image/jpeg",
        });

        return res.end(image);
      }

      return res.json({
        status: "failed",
        msg: image.errmsg,
      });
    }

    const image = await getQQQRCode(appID, page);

    res.set({
      "Content-Disposition": `qrcode.png`,
      "Content-Type": "image/png",
    });

    return res.end(image);
  } catch (err) {
    res.json({
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};
