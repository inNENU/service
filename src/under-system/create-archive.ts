import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp } from "../utils/index.js";

const nextLinkRegExp =
  /<input\s+type="button"\s+class="button"\s+onclick="window.location.href='([^']+)';"\s+value=" 下一步 "\/>/;
const pathRegExp = /<form action="([^"]+)"/;
const infoRowRegExp =
  /<tr height="25px"\s*><td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<\/tr>/g;
const info2RowRegExp =
  /<tr height="25px"\s*><td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<td[^>]+>(.*?)<\/td>\s*<\/tr>/g;
const requiredRegExp = /<font color="red">\*<\/font>/;
const readonlyRegExp = /<font[^>]+>ø<\/font>/;
const inputRegExp = /<input[^>]*name="(.*?)"[^>]*value="(.*?)"[^>]*\/>/;
const checkBoxRegExp =
  /<input type="checkbox" value="(.*?)" id="gx" name="(.*?)"[^>]+\/>/;
const selectRegExp = /<select[^>]+name="(.*?)"/;
const optionRegExp = /<option value="([^"]+)">([^<]*?)<\/option>/g;
const fieldsRegExp =
  /<input\s+type="text"[^>]+name="(.*?)"\s+id=".*?"\s+value="(.*?)"[^>]+\/>/g;
const hiddenFieldsRegExp =
  /<input\s+type="hidden"[^>]+name="(.*?)"\s*value="(.*?)"\s*\/>/g;
const studyDataRegExp = /"brjl"\s*:\s*(\[.*?\])/;
const familyDataRegExp = /"jtcy"\s*:\s*(\[.*?\])/;

export interface UnderArchiveFieldInfo {
  name: string;
  value: string;
}

export interface ReadonlyUnderArchiveInfo {
  text: string;
  value: string;
  remark: string;
}

export interface InputUnderArchiveInfo {
  name: string;
  text: string;
  value: string;
  remark: string;
  required: boolean;
}

export interface SingleSelectUnderArchiveInfo {
  name: string;
  text: string;
  defaultValue: string;
  checkboxName: string;
  checkboxValue: string;
  options: { text: string; value: string }[];
  remark: string;
}

export interface MultiSelectUnderArchiveInfo {
  name: string;
  text: string;
  defaultValue: string;
  checkboxName: string;
  checkboxValue: string;

  remark: string;

  category: { text: string; value: string }[];
  values: { text: string; value: string }[][];
}

export interface UnderCreateStudentArchiveGetInfoOptions
  extends Partial<LoginOptions> {
  type: "get-info";
}

export interface GetUnderCreateStudentArchiveInfoSuccessResponse {
  success: true;
  readonly: ReadonlyUnderArchiveInfo[];
  editable: (SingleSelectUnderArchiveInfo | MultiSelectUnderArchiveInfo)[];
  fields: UnderArchiveFieldInfo[];
  path: string;
}

export type GetUnderCreateStudentArchiveInfoResponse =
  | GetUnderCreateStudentArchiveInfoSuccessResponse
  | AuthLoginFailedResult
  | (CommonFailedResponse & { type?: "created" });

export const getUnderStudentArchiveInfo = async (
  cookieHeader: string,
): Promise<GetUnderCreateStudentArchiveInfoResponse> => {
  const welcomePageResponse = await fetch(
    `${UNDER_SYSTEM_SERVER}/ggxx/xj/bdzcsm.jsp?tktime=${getIETimeStamp()}`,
    {
      headers: {
        Cookie: cookieHeader,
        Referer: `${UNDER_SYSTEM_SERVER}/framework/new_window.jsp?lianjie=&winid=win1`,
        "User-Agent": IE_8_USER_AGENT,
      },
    },
  );

  const welcomePageContent = await welcomePageResponse.text();

  if (welcomePageContent.includes("您已经提交了报到"))
    return {
      success: false,
      type: "created",
      msg: "学籍已建立",
    };

  const link = welcomePageContent.match(nextLinkRegExp)?.[1];

  if (!link)
    return {
      success: false,
      msg: "未找到注册学籍链接",
    };

  const infoResponse = await fetch(`${UNDER_SYSTEM_SERVER}${link}`, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${UNDER_SYSTEM_SERVER}/ggxx/xj/bdzcsm.jsp`,
      "User-Agent": IE_8_USER_AGENT,
    },
  });

  const infoContent = await infoResponse.text();

  if (infoContent.includes("不在控制范围内！"))
    return {
      success: false,
      type: "created",
      msg: "学籍已建立",
    };

  const info = Array.from(infoContent.matchAll(infoRowRegExp)).map(
    ([, ...matches]) =>
      matches.map((item) => item.replace(/&nbsp;/g, " ").trim()),
  );

  const readonlyFields = info.filter(([, , editable]) =>
    readonlyRegExp.test(editable),
  );

  const editableFields = info
    .filter(([, , editable]) => !readonlyRegExp.test(editable))
    .map(([text, defaultValue, checkBox, inputOrSelect, remark]) => {
      const [, checkboxValue, checkboxName] = checkBoxRegExp.exec(checkBox)!;

      const name = selectRegExp.exec(inputOrSelect)![1];

      const options = Array.from(inputOrSelect.matchAll(optionRegExp))
        .map(([, value, text]) => ({ value, text }))
        .filter(({ value }) => value);

      if (text === "火车到站") {
        const validOptions = options.filter(({ value }) => Number(value) > 100);

        const { category, values } = validOptions.reduce(
          (result, current) => {
            const trimmedText = current.text.trim();

            if (current.text === trimmedText) {
              result.category.push(current);
              result.values.push([current]);
            } else {
              result.values[result.values.length - 1].push({
                value: current.value,
                text: trimmedText,
              });
            }

            return result;
          },
          {
            category: <{ value: string; text: string }[]>[],
            values: <{ value: string; text: string }[][]>[],
          },
        );

        return {
          text,
          defaultValue,
          name,
          checkboxName,
          checkboxValue,
          category,
          values: values.map((item) => [
            { text: "请选择", value: "" },
            ...item.sort((a, b) => a.text.localeCompare(b.text)),
          ]),
          remark,
        };
      }

      return {
        text,
        defaultValue,
        name,
        checkboxName,
        checkboxValue,
        options,
        remark,
      };
    });

  const hiddenFields = Array.from(infoContent.matchAll(hiddenFieldsRegExp)).map(
    ([, name, value]) => ({ name, value }),
  );

  return {
    success: true,
    readonly: readonlyFields.map(([text, value, , , remark]) => {
      const realValue = /<font[^>]*>(.*)<\/font>/.exec(value)?.[1] || value;

      return {
        text,
        value: realValue,
        remark,
      };
    }),
    editable: editableFields,
    fields: [
      ...readonlyFields
        .map(([, , , input]) => {
          const result = inputRegExp.exec(input);

          if (result) return { name: result[1], value: result[2] };

          return null;
        })
        .filter(
          (item): item is { name: string; value: string } => item !== null,
        ),
      ...hiddenFields,
    ],
    path: pathRegExp.exec(infoContent)![1],
  };
};

export interface UnderCreateStudentArchiveSubmitInfoOptions
  extends Partial<LoginOptions> {
  type: "submit-info";
  fields: UnderArchiveFieldInfo[];
  path: string;
}

export interface UnderCreateStudentArchiveSubmitInfoSuccessResponse {
  success: true;
  inputs: InputUnderArchiveInfo[];
  fields: UnderArchiveFieldInfo[];
  path: string;
}

export type UnderCreateStudentArchiveSubmitInfoResponse =
  | UnderCreateStudentArchiveSubmitInfoSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const submitUnderStudentArchiveInfo = async (
  cookieHeader: string,
  { path, fields }: UnderCreateStudentArchiveSubmitInfoOptions,
): Promise<UnderCreateStudentArchiveSubmitInfoResponse> => {
  const submitResponse = await fetch(`${UNDER_SYSTEM_SERVER}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      "User-Agent": IE_8_USER_AGENT,
    },
    body: new URLSearchParams(
      Object.fromEntries(fields.map(({ name, value }) => [name, value])),
    ),
  });

  const content = await submitResponse.text();

  const inputs = Array.from(content.matchAll(info2RowRegExp))
    .map(([, ...matches]) =>
      matches.map((item) => item.replace(/&nbsp;/g, " ").trim()),
    )
    .map(([text, input, remark]) => {
      const [, name, value] = Array.from(input.matchAll(fieldsRegExp))[0];
      const required = requiredRegExp.test(input);

      return {
        text,
        name,
        value,
        remark,
        required,
      };
    });

  const newFields = Array.from(content.matchAll(hiddenFieldsRegExp)).map(
    ([, name, value]) => ({ name, value }),
  );

  return {
    success: true,
    inputs,
    fields: newFields,
    path: pathRegExp.exec(content)![1],
  };
};

export interface UnderCreateStudentArchiveSubmitAddressOptions
  extends Partial<LoginOptions> {
  type: "submit-address";
  fields: UnderArchiveFieldInfo[];
  path: string;
}

export interface UnderCreateStudentArchiveSubmitAddressSuccessResponse {
  success: true;
  fields: UnderArchiveFieldInfo[];
  study: UnderStudyOptions[];
  path: string;
}

export type UnderCreateStudentArchiveSubmitAddressResponse =
  | UnderCreateStudentArchiveSubmitAddressSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const submitUnderStudentArchiveAddress = async (
  cookieHeader: string,
  { path, fields }: UnderCreateStudentArchiveSubmitAddressOptions,
): Promise<UnderCreateStudentArchiveSubmitAddressSuccessResponse> => {
  const submitResponse = await fetch(`${UNDER_SYSTEM_SERVER}${path}`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": IE_8_USER_AGENT,
    },
    body: new URLSearchParams(
      Object.fromEntries(fields.map(({ name, value }) => [name, value])),
    ),
  });

  const content = await submitResponse.text();

  const existingData = studyDataRegExp.exec(content)?.[1];

  const study = existingData
    ? (<
        {
          qsrq: string;
          zzrq: string;
          szdw: string;
          gznr: string;
          zmr: string;
        }[]
      >JSON.parse(existingData)).map(({ qsrq, zzrq, szdw, gznr, zmr }) => ({
        startTime: qsrq,
        endTime: zzrq,
        school: szdw,
        title: gznr,
        witness: zmr,
      }))
    : [];

  if (!study.length)
    study.push({
      startTime: "",
      endTime: "",
      school: "",
      title: "",
      witness: "",
    });

  const newFields = Array.from(content.matchAll(hiddenFieldsRegExp))
    .map(([, name, value]) => ({ name, value }))
    .filter((item) => item.name !== "jls");

  return {
    success: true,
    study,
    fields: newFields,
    path: pathRegExp.exec(content)![1],
  };
};

export interface UnderStudyOptions {
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 地点 */
  school: string;
  /** 职务 */
  title: string;
  /** 证明人 */
  witness: string;
}

export interface UnderCreateStudentArchiveSubmitStudyOptions
  extends Partial<LoginOptions> {
  type: "submit-study";
  fields: UnderArchiveFieldInfo[];
  path: string;
  study: UnderStudyOptions[];
}

export interface UnderCreateStudentArchiveSubmitStudySuccessResponse {
  success: true;
  family: UnderFamilyOptions[];
  fields: UnderArchiveFieldInfo[];
  path: string;
}

export type UnderCreateStudentArchiveSubmitStudyResponse =
  | UnderCreateStudentArchiveSubmitStudySuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const submitUnderStudentArchiveStudy = async (
  cookieHeader: string,
  { path, fields, study }: UnderCreateStudentArchiveSubmitStudyOptions,
): Promise<UnderCreateStudentArchiveSubmitStudyResponse> => {
  if (study.length === 0) throw new Error("至少有1条学习与工作经历记录");
  if (study.length > 15) throw new Error("最多只能添加15条学习与工作经历记录");
  const params: Record<string, string> = Object.fromEntries(
    fields.map(({ name, value }) => [name, value]),
  );

  study.forEach(({ startTime, endTime, school, title, witness }, index) => {
    if (startTime === "" || endTime === "" || school === "" || witness === "")
      throw new Error(
        `第${
          index + 1
        }条学习与工作经历信息不完整。所有项目均为必填项，没有职务请填无。`,
      );

    if (!/^\d{8}$/.test(startTime) || !/^\d{8}$/.test(endTime))
      throw new Error(
        `第${index + 1}条学习与工作经历时间格式不正确，格式应为 20010101`,
      );

    params[`qsrq${index + 1}`] = startTime;
    params[`zzrq${index + 1}`] = endTime;
    params[`szdw${index + 1}`] = school;
    params[`gznr${index + 1}`] = title;
    params[`zmr${index + 1}`] = witness;
  });

  params.jls = `,${study.map((_, index) => index + 1).join(",")}`;

  const submitResponse = await fetch(`${UNDER_SYSTEM_SERVER}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      "User-Agent": IE_8_USER_AGENT,
    },
    body: new URLSearchParams(params),
  });

  const content = await submitResponse.text();

  const existingData = familyDataRegExp.exec(content)?.[1];

  const family = existingData
    ? (<
        {
          gxm: string;
          cyxm: string;
          gzdw: string;
          cym: string;
          gzdwxq: string;
        }[]
      >JSON.parse(existingData)).map(({ gxm, cyxm, gzdw, cym, gzdwxq }) => ({
        relation: gxm,
        name: cyxm,
        office: gzdw,
        title: cym,
        phone: gzdwxq,
      }))
    : [];

  if (!family.length)
    family.push({
      relation: "",
      name: "",
      office: "",
      title: "",
      phone: "",
    });

  const newFields = Array.from(content.matchAll(hiddenFieldsRegExp))
    .map(([, name, value]) => ({ name, value }))
    .filter((item) => item.name !== "jls");

  return {
    success: true,
    family,
    fields: newFields,
    path: pathRegExp.exec(content)![1],
  };
};

export interface UnderFamilyOptions {
  /** 姓名 */
  name: string;
  /** 与本人关系 */
  relation: string;
  /** 工作单位 */
  office: string;
  /** 职务 */
  title: string;
  /** 联系电话 */
  phone: string;
}

export interface UnderCreateStudentArchiveSubmitFamilyOptions
  extends Partial<LoginOptions> {
  type: "submit-family";
  fields: UnderArchiveFieldInfo[];
  path: string;
  family: UnderFamilyOptions[];
}

export interface UnderCreateStudentArchiveSubmitFamilySuccessResponse {
  success: true;
}

export type UnderCreateStudentArchiveSubmitFamilyResponse =
  | UnderCreateStudentArchiveSubmitFamilySuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const submitUnderStudentArchiveFamily = async (
  cookieHeader: string,
  { path, fields, family }: UnderCreateStudentArchiveSubmitFamilyOptions,
): Promise<UnderCreateStudentArchiveSubmitFamilyResponse> => {
  if (family.length === 0) throw new Error("至少有1条家庭成员记录");
  if (family.length > 15) throw new Error("最多只能添加15条家庭成员记录");

  const params: Record<string, string> = Object.fromEntries(
    fields.map(({ name, value }) => [name, value]),
  );

  family.forEach(({ name, relation, office, title, phone }, index) => {
    if (name === "") throw new Error(`第${index + 1}条家庭成员记录姓名缺失。`);
    if (relation === "")
      throw new Error(`第${index + 1}条家庭成员记录与本人关系缺失。`);
    if (office === "")
      throw new Error(`第${index + 1}条家庭成员记录工作地点缺失。`);

    params[`gxm${index + 1}`] = relation;
    params[`cyxm${index + 1}`] = name;
    params[`gzdw${index + 1}`] = office;
    params[`cym${index + 1}`] = title;
    params[`gzdwxq${index + 1}`] = phone;
  });

  params.jls = `,${family.map((_, index) => index + 1).join(",")}`;

  const submitResponse = await fetch(`${UNDER_SYSTEM_SERVER}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      "User-Agent": IE_8_USER_AGENT,
    },
    body: new URLSearchParams(params),
  });

  const content = await submitResponse.text();

  if (content.includes("你已完成报到工作。"))
    return {
      success: true,
    };

  console.log(content);

  return {
    success: false,
    msg: "未知错误",
  };
};

export const underCreateStudentArchiveHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  | UnderCreateStudentArchiveGetInfoOptions
  | UnderCreateStudentArchiveSubmitInfoOptions
  | UnderCreateStudentArchiveSubmitStudyOptions
  | UnderCreateStudentArchiveSubmitFamilyOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await underSystemLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(UNDER_SYSTEM_SERVER);
    }

    if (req.body.type === "get-info")
      return res.json(await getUnderStudentArchiveInfo(cookieHeader));

    if (req.body.type === "submit-info")
      return res.json(
        await submitUnderStudentArchiveInfo(cookieHeader, req.body),
      );
    if (req.body.type === "submit-study")
      return res.json(
        await submitUnderStudentArchiveStudy(cookieHeader, req.body),
      );
    if (req.body.type === "submit-family")
      return res.json(
        await submitUnderStudentArchiveFamily(cookieHeader, req.body),
      );

    return res.json({
      success: false,
      msg: "未知操作",
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
