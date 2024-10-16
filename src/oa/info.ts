import type { OALoginFailedResponse } from "./login.js";
import { OA_WEB_VPN_SERVER } from "./utils.js";
import { UnknownResponse } from "../config/index.js";
import type { CommonSuccessResponse } from "../typings.js";
import { request } from "../utils/index.js";

interface RawOAInfoData {
  /** 学号 */
  loginId: string;
  /** OA ID  */
  id: string;
  /** 姓，通常是空的 */
  firstName: "";
  /** 名，通常为完整姓名 */
  lastName: string;
  /** 资源 ID，对于学生用户同 OA ID */
  resourceId: string;
  /** 资源名称，对于学生用户同姓名 */
  resourceName: string;

  /** 安全级别 */
  secLevel: string;

  /** 公司名称 */
  subCompanyName: "东北师范大学";
  /** 公司 ID */
  subCompanyId: "1";
  /** 部门名称 */
  departmentName: "物理学院";
  /** 部门备注 */
  departmentMark: "物理学院";
  /** 部门 ID */
  departmentId: "60";
}

export interface OAInfoData {
  id: string;
  oaId: string;
  name: string;
  orgName: string;
  orgId: string;
}

export type OAInfoSuccessResponse = CommonSuccessResponse<OAInfoData>;

export type OAInfoResponse = OAInfoSuccessResponse | OALoginFailedResponse;

export const TEST_OA_INFO: OAInfoSuccessResponse = {
  success: true,
  data: {
    id: "1",
    oaId: "1",
    name: "测试姓名",
    orgName: "测试学院",
    orgId: "1",
  },
};

export const getOAInfo = async (
  cookieHeader: string,
): Promise<OAInfoResponse> => {
  const ecodeResponse = await fetch(`${OA_WEB_VPN_SERVER}/api/ecode/sync`, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
    },
  });

  const ecodeData = (await ecodeResponse.json()) as {
    status: boolean;
    _data: { _user: RawOAInfoData } | Record<never, never>;
  };

  if (ecodeData.status === false || !("_user" in ecodeData._data)) {
    console.error("获取 OA 信息失败", ecodeData);

    return UnknownResponse("获取 OA 信息失败");
  }

  const { id, loginId, resourceName, departmentName, departmentId } =
    ecodeData._data._user;

  return {
    success: true,
    data: {
      id: loginId,
      oaId: id,
      name: resourceName,
      orgName: departmentName,
      orgId: departmentId,
    },
  };
};

export const oaInfoHandler = request<OAInfoResponse>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_OA_INFO);

  return res.json(await getOAInfo(cookieHeader));
});
