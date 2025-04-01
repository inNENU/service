import { appIdInfo } from "../config/index.js";
import type { AppID } from "../mp/index.js";

const currentAccessToken: Record<string, { token: string; timeStamp: number }> =
  {};

export const getWechatAccessToken = async (appId: string): Promise<string> => {
  if (
    appId in currentAccessToken &&
    Date.now() < currentAccessToken[appId].timeStamp
  ) {
    return Promise.resolve(currentAccessToken[appId].token);
  }

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appIdInfo[
      appId as AppID
    ]!}`,
  );

  const { access_token: accessToken, expires_in: expiresIn } =
    (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

  currentAccessToken[appId] = {
    token: accessToken,
    timeStamp: Date.now() + (expiresIn - 10) * 1000,
  };

  return accessToken;
};
