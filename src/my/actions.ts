import { MY_SERVER } from "./utils.js";

interface RawCompleteApplyResult {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPage: number;
  data: {
    /** 事项名称 */
    SHIXIANG: string;
    /** 系统名称 */
    XTMC: string;
    /** 服务 Key */
    key: string;
    /** 单位代码 */
    unit: string;
    /** 单位名称 */
    unitName: string;

    /** 申请次数 */
    SQCS: number;
    /** 已办次数 */
    YBSL: number;
    /** 代办次数 */
    RN: number;
  }[];
}

export interface MyApplyResult {
  /** 事项名称 */
  name: string;
  /** 系统名称 */
  system: string;
  /** 服务 Key */
  key: string;
  /** 单位代码 */
  unit: string;
  /** 单位名称 */
  unitName: string;
  /** 申请次数 */
  applyCount?: number;
  /** 已办次数 */
  completeCount?: number;
  /** 代办次数 */
  delegateCount?: number;
}

const GET_APPLIES_URL = `${MY_SERVER}/PersonAnalysisController/getMyApplyAnalysis`;

export const queryMyApplies = async (
  cookieHeader: string,
): Promise<MyApplyResult[]> => {
  const appliesResponse = await fetch(GET_APPLIES_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
    },
    body: new URLSearchParams({
      _search: "false",
      loadType: "myApply",
      type: "3",
      nd: Date.now().toString(),
      limit: "100",
      page: "1",
      sidx: "",
      sord: "desc",
    }),
  });

  const appliesResult = <RawCompleteApplyResult>await appliesResponse.json();

  return appliesResult.data.map(
    ({ SHIXIANG, XTMC, key, unit, unitName, SQCS, YBSL, RN }) => ({
      name: SHIXIANG,
      system: XTMC,
      key,
      unit,
      unitName,
      applyCount: SQCS,
      completeCount: YBSL,
      delegateCount: RN,
    }),
  );
};

const GET_APPLY_DATA_URL = `${MY_SERVER}/AnalysisForPerson/loadMyApplyData`;

const BUILD_IN_COLUMNS = [
  "TASK_NAME_",
  "CREATE_TIME_",
  "END_TIME_",
  "END_ACT_ID_",
  "DELETE_REASON_",
  "PROC_DEF_ID_",
  "PROC_INST_ID_",
  "TASK_ID_",
  "ASSIGNEE_",
  "BIZID__",
  "CREATOR__",
  "PID__",
];
const FIELD_INFO_REGEXP = /var fieldinfo = \[([^\]]+)\];\s/;
const FIELD_REG_EXP =
  /{"LABEL":".*?","ORDER_TYPE":.*?,"ORDER_PRIORITY":.*?,"DATA_TYPE":.*?,"COLUMN_NAME":"(.*?)","QUERY_TYPE":null}/g;
const USER_ID_REG_EXP = /"LOGINNAME":"(\d+)",/;
const FORM_ID_REG_EXP = /"FORM_ID":"(.*?)",/;

export type MyActionItem<T extends Record<string, unknown>> = {
  PID__: null;
  END_ACT_ID_: string;
  TASK_NAME_: string;
  CREATE_TIME_: string;
  ASSIGNEE_: null;
  ID__: string;
  PROC_INST_ID_: string;
  DELETE_REASON_: null;
  CREATOR__: string;
  TASK_ID_: null;
  BIZID__: string;
  PROC_DEF_ID_: string;
  RN: number;
  END_TIME_: string;
} & T;

export interface RawMyActionData<T extends Record<string, unknown>> {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPage: number;
  data: MyActionItem<T>[];
}

export const queryMyActions = async <T extends Record<string, unknown>>(
  cookieHeader: string,
  key: string,
): Promise<MyActionItem<T>[]> => {
  const actionPageUrl = `${MY_SERVER}/AnalysisForPerson/viewExportPage?loadType=myApply&type=3&key=${key}`;
  const actionPage = await fetch(actionPageUrl, {
    headers: {
      Cookie: cookieHeader,
    },
  });

  const actionPageContent = await actionPage.text();

  const fieldsInfo = FIELD_INFO_REGEXP.exec(actionPageContent)![1];

  const fields = Array.from(fieldsInfo.matchAll(FIELD_REG_EXP)).map(
    ([, field]) => field,
  );

  const colNames = [
    ...fields,
    ...(fields.every((field) => field.toUpperCase() !== "ID__")
      ? ["ID__"]
      : []),
    ...BUILD_IN_COLUMNS,
  ].join(",");
  const userId = USER_ID_REG_EXP.exec(actionPageContent)![1];
  const formId = FORM_ID_REG_EXP.exec(actionPageContent)![1];

  const queryResponse = await fetch(GET_APPLY_DATA_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: actionPageUrl,
    },
    body: new URLSearchParams({
      tbName: key,
      colNames,
      userId,
      formId,
      tabId: "myApplyed",
      orderCol: "[]",
      type: "3",
      startTime: "",
      endTime: "",
      loadType: "myApply",
      wf_unusual: "",
      avg_time: "",
      end_status: "",
      proc_key: key,
      _search: "false",
      nd: new Date().getTime().toString(),
      limit: "100",
      page: "1",
      sidx: "CREATE_TIME_",
      sord: "desc",
    }),
  });

  const queryResult = <RawMyActionData<T>>await queryResponse.json();

  return queryResult.data;
};
