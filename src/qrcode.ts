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
  appID: 1109559721;
  page: string;
  params: Record<string, string>;
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
  scene: string
): Promise<ArrayBuffer | WechatQRCodeError> => {
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
    }
  );

  const image = Buffer.from(await response.arrayBuffer());

  if (image.byteLength < 1024)
    return <WechatQRCodeError>JSON.parse(image.toString());

  return image;
};

const getQQQRCode = async (
  appID: number,
  page: string,
  params: Record<string, string>
): Promise<Buffer> =>
  toBuffer(
    `https://m.q.qq.com/a/p/${appID}?s=${encodeURI(
      `${page}?${Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join("&")}`
    )}`
  );

export const qrCodeHandler: RequestHandler<QRCodeOptions> = async (
  req,
  res
) => {
  try {
    const { appID, page } = req.params;

    if (!appIDInfo[appID])
      return res.json({
        status: "failed",
        msg: "AppID 非法",
      });

    if (typeof appID === "number") {
      const image = await getQQQRCode(appID, page, req.params.params);

      res.set({
        "Content-Disposition": `小程序二维码.png`,
      });

      return res.end(image);
    }

    const wechatAccessToken = await getWechatAccessToken(appID);

    const image = await getWechatQRCode(
      wechatAccessToken,
      page,
      req.params.scene
    );

    if (image instanceof ArrayBuffer) {
      res.set({
        "Content-Disposition": `小程序二维码.png`,
      });

      return res.end(Buffer.from(image));
    }

    return res.json({
      status: "failed",
      msg: image.errmsg,
    });
  } catch (err) {
    res.json({
      status: "failed",
      msg: (<Error>err).message,
      details: (<Error>err).stack,
    });
  }
};
