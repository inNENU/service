/** 首页 / 端点测试（无需登录） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../client.js";

const client = new ApiClient();

describe("首页", () => {
  it("首页 GET /", async () => {
    const res = await client.get("/");

    expect(res.status).toBe(200);
    expect(res.body).toBeTypeOf("string");
    expect((res.body as string).length).toBeGreaterThan(0);
  });
});
