import { getActivateUUID } from "./uuid.js";
import { UnknownResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { RESET_PREFIX } from "../utils.js";

export type ActivateGetQrCodeResponse =
  | CommonSuccessResponse<{ qrCode: string }>
  | CommonFailedResponse;

// Note: getQrcodeImg:
export const getActivateQrCode = async (
  cookieHeader: string,
  sign: string,
): Promise<ActivateGetQrCodeResponse> => {
  const uuid = await getActivateUUID(cookieHeader, sign);

  const response = await fetch(
    `${RESET_PREFIX}/realPersonAuth/getQrCodeByFace?uuid=${uuid}`,
    {
      headers: {
        Cookie: cookieHeader,
      },
    },
  );

  if (response.headers.get("content-type") !== "image/jpeg")
    return UnknownResponse("获取二维码失败");

  const content = await response.arrayBuffer();

  return {
    success: true,
    data: {
      qrCode: `data:image/jpeg;base64,${Buffer.from(content).toString("base64")}`,
    },
  };
};

interface RawActivateVerifyQrCodeResponse {
  datas: {
    codeStatus: "0" | "1" | "2";
  };
}

export type ActivateVerifyQrCodeResponse =
  | CommonSuccessResponse<{ verified: boolean }>
  | CommonFailedResponse;

// getQrCodeStatus:
export const verifyActivateQrCode = async (
  cookieHeader: string,
): Promise<ActivateVerifyQrCodeResponse> => {
  const response = await fetch(`${ACTIVATE_PREFIX}/realPersonAuth/getStatus`, {
    headers: {
      Cookie: cookieHeader,
    },
  });

  const data = (await response.json()) as RawActivateVerifyQrCodeResponse;

  return {
    success: true,
    data: {
      verified: data.datas.codeStatus === "1",
    },
  };
};
