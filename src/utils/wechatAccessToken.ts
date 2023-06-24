import { appIDInfo } from "../config.js";

export const getWechatAccessToken = (
  appid: keyof typeof appIDInfo
): Promise<string> =>
  // eslint-disable-next-line @typescript-eslint/naming-convention
  fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${appIDInfo[
      appid
    ]!}`
  )
    .then((response) => <Promise<{ access_token: string }>>response.json())
    // eslint-disable-next-line @typescript-eslint/naming-convention
    .then(({ access_token }) => access_token);
