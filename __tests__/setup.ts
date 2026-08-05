/**
 * Vitest globalSetup：测试前自动完成环境准备 1. 初始化数据库（容器 + 建库，表结构由服务启动时的 migrate 补齐） 2. 确保本地服务运行（未启动则自动 build
 * + 启动） 3. 检查登录态（缺失则提示先运行 pnpm test:provision）
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";

import { ensureDatabase } from "../scripts/init-db.js";
import { BASE_URL } from "./config.js";
import { readAuthState } from "./state.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isServiceHealthy = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    return response.ok;
  } catch {
    return false;
  }
};

/** 确保服务运行，返回停止函数 */
const ensureService = async (): Promise<() => void> => {
  if (await isServiceHealthy()) {
    console.log(`[setup] 服务已在运行（${BASE_URL}）`);

    return () => {};
  }

  if (!existsSync("dist/index.js")) {
    console.log("[setup] dist 不存在，先执行构建...");
    execFileSync("pnpm", ["build"], { stdio: "inherit" });
  }

  console.log("[setup] 启动服务 (node dist/index.js)...");
  const server = spawn("node", ["dist/index.js"], { stdio: "inherit" });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isServiceHealthy()) {
      console.log("[setup] 服务已就绪");

      return () => {
        if (server.exitCode == null && server.signalCode == null) server.kill("SIGTERM");
      };
    }

    await sleep(2000);
  }

  if (server.exitCode == null && server.signalCode == null) server.kill("SIGTERM");

  throw new Error("服务启动超时");
};

export default async function setup(): Promise<() => void> {
  console.log("=== [setup 1/3] 检查并初始化数据库 ===");
  await ensureDatabase();

  console.log("=== [setup 2/3] 检查本地服务 ===");
  const stop = await ensureService();

  console.log("=== [setup 3/3] 检查登录态 ===");
  const state = readAuthState();

  if (!state.undergraduate?.authToken && !state.graduate?.authToken) {
    stop();

    throw new Error("未找到登录态，请先运行 pnpm test:provision（需要短信二次认证）");
  }

  console.log(
    `[setup] 登录态: 本科 ${state.undergraduate?.authToken ? "✓" : "✗"} / 研究生 ${state.graduate?.authToken ? "✓" : "✗"}`,
  );

  return () => {
    stop();
  };
}
