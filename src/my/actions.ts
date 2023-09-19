import { MY_SERVER } from "./utils.js";

interface RawCompleteActionData {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPage: number;
  data: {
    appId: string;
    applyPerson: string;
    applyPersonName: string;
    appName: string;
    appRedirectUrl: string;
    approveResult: string;
    currentNode: string;
    flowId: string;
    flowName: string;
    keyWord: string;
    lastApproveTime: string;
    pcRedirectUrl: string;
    serviceId: string;
    serviceName: string;
    serviceType: string;
    startTime: string;
    status: string;
  }[];
}

export interface CompleteActionResult {
  appId: string;
  flowId: string;
  flowName: string;
  serviceId: string;
  serviceName: string;
  apply: string;
  approve: string;
}

export const queryCompleteActions = async (
  cookieHeader: string,
): Promise<CompleteActionResult[]> => {
  const completeActionsResponse = await fetch(
    `${MY_SERVER}/taskCenter/queryMyApplicationComplete`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: new URLSearchParams({
        _search: "false",
        nd: Date.now().toString(),
        limit: "100",
        page: "1",
        sidx: "",
        sord: "asc",
      }),
    },
  );

  const completeActionsResult = <RawCompleteActionData>(
    await completeActionsResponse.json()
  );

  return completeActionsResult.data.map(
    ({
      appId,
      flowName,
      flowId,
      serviceId,
      serviceName,
      startTime,
      lastApproveTime,
    }) => ({
      appId,
      flowId,
      flowName,
      serviceId,
      serviceName,
      apply: startTime,
      approve: lastApproveTime,
    }),
  );
};
