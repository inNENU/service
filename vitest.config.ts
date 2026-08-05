import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.spec.ts"],
    globalSetup: ["__tests__/setup.ts"],
    // 串行执行测试文件，避免并发请求冲击学校服务器
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
