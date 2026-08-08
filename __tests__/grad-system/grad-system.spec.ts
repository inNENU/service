/** 研究生系统 /grad-system 测试（研究生账号，无 /check 端点） */
// oxlint-disable vitest/no-disabled-tests -- 学校端欢迎页返回"程序不存在"，info/information 暂挂起
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import {
  expectDataObject,
  expectObjectKeys,
  expectSuccess,
  getAccount,
  loginSystem,
} from "../helpers.js";

const INFO_KEYS = [
  "name",
  "gender",
  "genderId",
  "idCard",
  "politicalType",
  "birth",
  "people",
  "id",
  "grade",
  "org",
  "orgId",
  "major",
  "majorId",
  "type",
  "typeId",
  "inYear",
  "location",
];
const INFORMATION_KEYS = [
  "name",
  "gender",
  "idCard",
  "politicalType",
  "birth",
  "people",
  "id",
  "grade",
  "school",
  "major",
  "majorCode",
  "type",
  "category",
  "inDate",
];

const account = getAccount("graduate");

describe("研究生系统 /grad-system", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少研究生登录态，请先运行 pnpm test:provision");

    client = await loginSystem("grad-system", account);
  });

  // TODO: 学校端 pg.nenu.edu.cn 欢迎页 `MainRun.php?WorkName=yjsy&WorkType=sh_欢迎页面`
  // 当前返回 "错误:程序不存在!"，getAction 匹配不到 xPageIDs → 这两个接口 500。
  // 学校端恢复后移除 skip 重新启用。
  it.skip("个人信息 POST /grad-system/info", async () => {
    const res = await client.post("/grad-system/info");

    expectDataObject(res, INFO_KEYS, "info", ["forbidden"]);
    expect(res.body.data?.id, "id 应为数字").toBeTypeOf("number");
  });

  it.skip("综合信息 POST /grad-system/information", async () => {
    const res = await client.post("/grad-system/information");

    if (!expectSuccess(res, "information", ["forbidden"])) return;

    expectObjectKeys(res.body.info, INFORMATION_KEYS, "information");
    expect(res.body.info?.id, "id 应为数字").toBeTypeOf("number");
  });
});
