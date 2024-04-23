import { appIDInfo } from "../config/appID.js";

export const getWechatAccessToken = (
  appid: keyof typeof appIDInfo,
): Promise<string> =>
  // eslint-disable-next-line @typescript-eslint/naming-convention
  fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${appIDInfo[
      appid
    ]!}`,
  )
    .then((response) => response.json() as Promise<{ access_token: string }>)
    // eslint-disable-next-line @typescript-eslint/naming-convention
    .then(({ access_token }) => access_token);
