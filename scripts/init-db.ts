/**
 * 本地开发数据库启动脚本（幂等）
 *
 * 只负责两件事： 1. 确保 Docker MariaDB 容器运行（不存在则通过 docker compose 创建） 2. 确保 `innenu-service` 数据库存在
 *
 * 表结构 / 字段 / 初始查阅数据的补全由服务启动时的 `src/utils/migrate.ts` 自动完成， 本脚本不再重复建表逻辑。
 *
 * 用法：node scripts/init-db.ts 也会被 Vitest globalSetup 自动调用。
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const COMPOSE_FILE = path.join(PROJECT_ROOT, "database", "docker-compose.yml");

const CONTAINER = "innenu-mariadb";
const DB_NAME = "innenu-service";
const ROOT_PASSWORD = "innenu-service-root";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * 执行命令并返回 stdout（失败抛错）
 *
 * @param cmd 命令
 * @param args 参数
 * @returns 命令 stdout
 */
const run = (cmd: string, args: string[]): string => {
  const result = spawnSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  if (result.status !== 0) {
    throw new Error(
      `命令执行失败: ${cmd} ${args.join(" ")}\n${(result.stderr ?? "").trim() || (result.stdout ?? "").trim()}`,
    );
  }

  return result.stdout ?? "";
};

/**
 * 在容器内以 root 执行 SQL
 *
 * @param sql 待执行的 SQL
 */
const mariadbRoot = (sql: string): void => {
  const result = spawnSync(
    "docker",
    ["exec", "-e", `MYSQL_PWD=${ROOT_PASSWORD}`, "-i", CONTAINER, "mariadb", "-uroot"],
    { encoding: "utf8", input: sql, stdio: ["pipe", "pipe", "pipe"] },
  );

  if (result.status !== 0) {
    throw new Error(
      `SQL 执行失败: ${(result.stderr ?? "").trim() || (result.stdout ?? "").trim()}`,
    );
  }
};

/** 确保本地 MariaDB 容器运行且数据库存在。 表结构完整性由服务启动时的 migrate 自动补齐。 */
export const ensureDatabase = async (): Promise<void> => {
  console.log("[init-db] 检查 Docker 环境...");
  run("docker", ["info"]);

  console.log(`[init-db] 检查容器 ${CONTAINER}...`);
  const allContainers = new Set(
    run("docker", ["ps", "-a", "--format", "{{.Names}}"])
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const runningContainers = run("docker", ["ps", "--format", "{{.Names}}"])
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (allContainers.has(CONTAINER) && runningContainers.includes(CONTAINER)) {
    console.log(`[init-db] 容器 ${CONTAINER} 已在运行`);
  } else if (allContainers.has(CONTAINER)) {
    console.log(`[init-db] 启动已存在的容器 ${CONTAINER}...`);
    run("docker", ["start", CONTAINER]);
  } else {
    console.log(`[init-db] 容器不存在，通过 docker compose 创建并启动...`);
    run("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d"]);
  }

  console.log("[init-db] 等待 MariaDB 就绪...");
  let ready = false;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      run("docker", [
        "exec",
        "-e",
        `MYSQL_PWD=${ROOT_PASSWORD}`,
        CONTAINER,
        "mariadb",
        "-uroot",
        "-e",
        "SELECT 1",
      ]);

      ready = true;

      break;
    } catch {
      // oxlint-disable-next-line eslint/no-await-in-loop -- 轮询等待需在循环内进行
      await sleep(2000);
    }
  }

  if (!ready) throw new Error("MariaDB 启动超时");

  console.log(`[init-db] 确保数据库 ${DB_NAME} 存在...`);
  mariadbRoot(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );

  console.log("[init-db] 数据库就绪（表结构/字段/查阅数据由服务启动时的 migrate 自动补齐）");
};

// 作为独立脚本运行时直接执行
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const main = async (): Promise<void> => {
    try {
      await ensureDatabase();
      console.log("[init-db] 完成");
    } catch (err: unknown) {
      console.error("[init-db] 失败:", err instanceof Error ? err.message : String(err));
      // oxlint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  };

  // oxlint-disable-next-line unicorn/prefer-top-level-await -- 脚本需保持同步退出
  void main();
}
