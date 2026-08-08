import { stdin, stdout } from "node:process";
/**
 * 交互式登录态获取脚本（二次认证）
 *
 * 流程： GET /auth/init?id=<学号> → 获取 salt/params + cookie POST /auth/init
 * {id,password,salt,params,...} → 触发二次认证 NeedReAuth + cookie GET /auth/re-auth?id=<学号> → 发送短信
 * （人工在终端输入 6 位短信验证码） POST /auth/re-auth {smsCode,...} → 校验成功返回 authToken + cookies
 *
 * 产物 authToken（MULTIFACTOR_USERS，有效期至 2092）保存到 temp/auth-state.json， 可复用于所有系统登录，之后无需再次短信验证。
 *
 * 用法：pnpm test:provision [--force] （--force 强制重新获取，忽略已有登录态）
 */
import { createInterface } from "node:readline/promises";

import { ApiClient } from "./client.js";
import type { ApiResponse } from "./client.js";
import { TEST_APP_ID, TEST_OPENID } from "./config.js";
import type { AccountAuth, AccountCredentials } from "./state.js";
import { readAccounts, readAuthState, writeAuthState } from "./state.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const readSmsCode = async (prompt: string): Promise<string> => {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(prompt);

  rl.close();

  return answer.trim();
};

/** 完成单个账号的二次认证流程 */
const provisionAccount = async (
  label: string,
  account: AccountCredentials,
): Promise<AccountAuth> => {
  const client = new ApiClient();
  const { id, password } = account;

  console.log(`\n[${label}] 开始登录流程（学号 ${id}）`);

  // 1-2. 获取初始化信息并提交登录（触发二次认证），限流时自动等待重试
  let salt = "";
  let params: Record<string, string> = {};
  let loginResult: ApiResponse = { status: 0, body: {} };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const initInfo = await client.get(`/auth/init?id=${id}`);

    if (initInfo.body?.success !== true)
      throw new Error(`[${label}] 获取初始化信息失败: ${JSON.stringify(initInfo.body)}`);

    ({ salt, params } = initInfo.body);

    if (initInfo.body.needCaptcha) {
      throw new Error(
        `[${label}] 账号需要图形验证码（可能因频繁登录触发）。请稍后再试，或先在浏览器登录一次学校统一认证`,
      );
    }

    loginResult = await client.post("/auth/init", {
      id,
      password,
      authToken: "",
      salt,
      params,
      appId: TEST_APP_ID,
      openid: TEST_OPENID,
    });

    if (loginResult.body?.type === "too-frequent") {
      console.log(`[${label}] 登录过于频繁，等待 60 秒后重试...`);
      await sleep(60_000);

      continue;
    }

    break;
  }

  // 若已有有效登录态（如刚在其他端登录过），直接复用
  if (loginResult.body?.success === true) {
    const authToken = client.jar
      .getAllCookies()
      .find((cookie) => cookie.name === "MULTIFACTOR_USERS")?.value;

    if (authToken) {
      console.log(`[${label}] 检测到已有有效登录态，直接复用 authToken`);

      return {
        id,
        authToken,
        cookies: client.jar.getAllCookies().map((cookie) => cookie.toJSON()),
        provisionedAt: new Date().toISOString(),
      };
    }

    throw new Error(`[${label}] 登录成功但未取得 authToken`);
  }

  if (loginResult.body?.type !== "need-re-auth")
    throw new Error(`[${label}] 登录失败: ${JSON.stringify(loginResult.body)}`);

  console.log(`[${label}] 已触发二次认证`);

  // 3. 发送短信验证码（处理发送过于频繁）
  let hiddenCellphone = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const sms = await client.get(`/auth/re-auth?id=${id}`);

    if (sms.body?.success === true) {
      hiddenCellphone = sms.body.data?.hiddenCellphone ?? "你的手机";

      break;
    }

    if (sms.body?.type === "too-frequent" && typeof sms.body?.codeTime === "number") {
      console.log(`[${label}] 短信发送过于频繁，等待 ${sms.body.codeTime} 秒后重试`);
      await sleep(sms.body.codeTime * 1000);

      continue;
    }

    throw new Error(`[${label}] 短信发送失败: ${JSON.stringify(sms.body)}`);
  }

  if (!hiddenCellphone) throw new Error(`[${label}] 短信发送失败`);

  // 4. 人工输入验证码
  const smsCode = await readSmsCode(
    `\n[${label}] 验证码已发送至 ${hiddenCellphone}（学号 ${id}）\n请输入 6 位短信验证码: `,
  );

  // 5. 提交验证码，完成二次认证，取得 authToken
  const verify = await client.post("/auth/re-auth", {
    smsCode,
    id,
    password,
    openid: TEST_OPENID,
    appId: TEST_APP_ID,
  });

  if (verify.body?.success !== true)
    throw new Error(`[${label}] 二次认证失败: ${JSON.stringify(verify.body)}`);

  const { authToken, cookies } = verify.body;

  console.log(`[${label}] 二次认证成功`);

  return {
    id,
    authToken,
    cookies,
    provisionedAt: new Date().toISOString(),
  };
};

const main = async (): Promise<void> => {
  const force = process.argv.includes("--force");
  const accounts = readAccounts();
  const state = readAuthState();

  for (const [label, account] of [
    ["undergraduate", accounts.undergraduate],
    ["graduate", accounts.graduate],
  ] as const) {
    const existing = state[label];

    if (existing?.authToken && !force) {
      console.log(
        `[${label}] 已存在 authToken（获取于 ${existing.provisionedAt}），跳过。如需重新获取请加 --force`,
      );

      continue;
    }

    try {
      state[label] = await provisionAccount(label, account);
      writeAuthState(state);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;

      return;
    }
  }

  const saved = Object.entries(state).filter(([, value]) => value?.authToken).length;

  console.log(`\n登录态已保存到 temp/auth-state.json（${saved} 个账号），可以运行 pnpm test`);
};

// oxlint-disable-next-line unicorn/prefer-top-level-await -- 交互式脚本需保持同步退出
void main();
