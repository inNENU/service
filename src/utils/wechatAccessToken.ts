import { appIDInfo } from "../config/index.js";
import type { AppID } from "../mp/login.js";

const currentAccessToken: Record<string, { token: string; timeStamp: number }> =
  {};

export const getWechatAccessToken = async (appid: string): Promise<string> => {
  if (
    appid in currentAccessToken &&
    Date.now() < currentAccessToken[appid].timeStamp
  ) {
    return Promise.resolve(currentAccessToken[appid].token);
  }

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${appIDInfo[
      appid as AppID
    ]!}`,
  );

  const { access_token: accessToken, expires_in: expiresIn } =
    (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

  currentAccessToken[appid] = {
    token: accessToken,
    timeStamp: Date.now() + (expiresIn - 10) * 1000,
  };

  return accessToken;
};
