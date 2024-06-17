import { MAIN_ACTIONS_URL, MAIN_URL } from "./utils.js";
import { ActionFailType } from "../config/actionFailType.js";
import type { CommonFailedResponse } from "../typings.js";

export interface GradAction {
  name: string;
  id: string;
}

export interface GradActionSuccessResponse {
  success: true;
  actions: GradAction[];
}

export type GradActionResponse =
  | GradActionSuccessResponse
  | CommonFailedResponse;

const ACTION_REG_EXP = /xPageIDs\s*=\s*'(.*?)';[^]+xPageAbc\s*=\s*'(.*?)';/;

export const getAction = async (
  cookieHeader: string,
): Promise<GradActionResponse> => {
  try {
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
  } catch (err) {
    const msg = (err as Error).message;

    console.error(err);

    return {
      success: false,
      type: ActionFailType.Unknown,
      msg,
    };
  }
};
