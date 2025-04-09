import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { MAIN_ACTIONS_URL, MAIN_URL } from "./utils.js";

const ACTION_REG_EXP = /xPageIDs\s*=\s*'(.*?)';[^]+xPageAbc\s*=\s*'(.*?)';/;

export interface GradAction {
  name: string;
  id: string;
}

export type GradActionSuccessResponse = CommonSuccessResponse<{
  actions: GradAction[];
}>;

export type GradActionResponse =
  | GradActionSuccessResponse
  | CommonFailedResponse;

export const getAction = async (
  cookieHeader: string,
): Promise<GradActionResponse> => {
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
    data: {
      actions: ids.split(";").map((id, index) => ({
        name: names.split(",")[index],
        id,
      })),
    },
  };
};
