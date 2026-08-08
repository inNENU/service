/** 测试通用配置 */

/** 本地服务地址（可通过环境变量覆盖） */
export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:8080";

/** 单个请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 20_000;

/** 认证流程中使用的占位 appId / openid。 仅用于写入 `token` 表（upsert，无副作用），不影响真实登录。 */
export const TEST_APP_ID = "wx0009f7cdfeefa3da";
export const TEST_OPENID = "automated-test";

/** 当前月份（1-12） */
const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

/**
 * 本科新系统（bkjx）当前学期（xnxqdm 格式，如 202502 = 2025-2026 学年第 2 学期）
 *
 * 按当前月份动态生成： - 9-12 月 → 今年秋季学期（如 2026-09 → 202601） - 3-8 月 → 去年春季学期（如 2026-08 → 202502） - 1-2 月 →
 * 去年秋季学期（如 2026-01 → 202501）
 */
export const CURRENT_SEMESTER = ((): string => {
  if (CURRENT_MONTH >= 9) return `${CURRENT_YEAR}01`;
  if (CURRENT_MONTH >= 3) return `${CURRENT_YEAR - 1}02`;

  return `${CURRENT_YEAR - 1}01`;
})();

/** 备用学期（当前学期的上一个学期，主查学期无数据时 fallback） */
export const FALLBACK_SEMESTER = ((): string => {
  const year = Number(CURRENT_SEMESTER.slice(0, 4));

  return CURRENT_SEMESTER.endsWith("01") ? `${year - 1}02` : `${year}01`;
})();
