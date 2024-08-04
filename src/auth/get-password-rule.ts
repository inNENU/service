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
