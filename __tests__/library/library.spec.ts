/** 图书馆 /library 端点测试（无需登录） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../client.js";
import { expectDataObject, expectSuccess } from "../helpers.js";

const client = new ApiClient();

describe("图书馆 /library", () => {
  it("在馆人数 GET /library/people", async () => {
    const res = await client.get("/library/people");

    expectSuccess(res, "/library/people");
    expectDataObject(res, ["benbu", "benbuMax", "jingyue", "jingyueMax"], "/library/people");

    const { benbu, benbuMax, jingyue, jingyueMax } = res.body.data;

    expect(benbu, "benbu 应为数字").toBeTypeOf("number");
    expect(jingyue, "jingyue 应为数字").toBeTypeOf("number");
    expect(benbu).toBeGreaterThanOrEqual(0);
    expect(jingyue).toBeGreaterThanOrEqual(0);
    expect(benbuMax, "benbuMax 应大于 0").toBeGreaterThan(0);
    expect(jingyueMax, "jingyueMax 应大于 0").toBeGreaterThan(0);
  });
});
