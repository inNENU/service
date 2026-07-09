import { getWechatAccessToken } from "./wechatAccessToken.js";

export interface WechatMpCodeError {
  errcode: number;
  errmsg: string;
}

export const getWechatMPCode = async (
  appId: string,
  page: string,
  scene: string,
  env: "release" | "trial" | "develop" = "release",
): Promise<Buffer | WechatMpCodeError> => {
  const accessToken = await getWechatAccessToken(appId);

  const response = await fetch(
    `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
    {
      method: "POST",
      body: JSON.stringify({
        page,
        scene,
        auto_color: true,
        env_version: env,
        is_hyaline: true,
      }),
    },
  );

  const image = Buffer.from(await response.arrayBuffer());

  if (image.byteLength < 1024) return JSON.parse(image.toString()) as WechatMpCodeError;

  return image;
};
