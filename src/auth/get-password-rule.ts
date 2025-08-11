import { RESET_PREFIX } from "./utils";

const GET_PASSWORD_RULE = `${RESET_PREFIX}/getAllPwdRules`;

interface RawPasswordRuleResponse {
  code: "0";
  message: "SUCCESS";
  datas: string[];
}

export interface GetPasswordRuleResponse {
  success: true;
  data: string[];
}

export const getPasswordRule = async (
  cookieHeader: string,
): Promise<GetPasswordRuleResponse> => {
  const response = await fetch(GET_PASSWORD_RULE, {
    method: "POST",
    headers: {
      host: "authserver.nenu.edu.cn",
      "sec-ch-ua-platform": '"Windows"',
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "content-type": "application/json",
      dnt: "1",
      "sec-ch-ua-mobile": "?0",
      origin: "https://authserver.nenu.edu.cn",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer:
        "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: cookieHeader,
    },
    body: "{}",
  });

  const data = (await response.json()) as RawPasswordRuleResponse;

  return {
    success: true,
    data: data.datas,
  };
};
