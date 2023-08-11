import { MAIN_ACTIONS_URL, MAIN_URL } from "./utils";
import type { AuthLoginFailedResult } from "../auth";
import type { CommonFailedResponse } from "../typings";

export interface PostAction {
  name: string;
  id: string;
}

export interface PostActionSuccessResponse {
  success: true;
  actions: PostAction[];
}

export type PostActionResponse =
  | PostActionSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

const ACTION_REG_EXP = /xPageIDs\s*=\s*'(.*?)';[\s\S]+xPageAbc\s*=\s*'(.*?)';/;

export const getAction = async (
  cookieHeader: string,
): Promise<PostActionResponse> => {
  const response = await fetch(MAIN_ACTIONS_URL, {
    headers: {
      Cookie: cookieHeader,
      Referer: MAIN_URL,
    },
  });

  const content = await response.text();

  const [, ids, names] = ACTION_REG_EXP.exec(content) ?? [];

  return {
    success: true,
    actions: ids.split(";").map((id, index) => ({
      name: names.split(",")[index],
      id,
    })),
  };
};
