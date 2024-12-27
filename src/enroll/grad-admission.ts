import type { ActionFailType } from "../config/index.js";
import { UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { request } from "../utils/index.js";

export interface GradAdmissionOptions {
  name: string;
  id: string;
}

export type GradAdmissionSuccessResponse = CommonSuccessResponse<
  { text: string; value: string }[]
>;

export type GradAdmissionResponse =
  | GradAdmissionSuccessResponse
  | CommonFailedResponse<ActionFailType.Closed | ActionFailType.Unknown>;

export const gradAdmissionHandler = request<
  GradAdmissionResponse,
  GradAdmissionOptions
>((_req, res) => {
  return res.json(UnknownResponse("暂不支持"));
});
