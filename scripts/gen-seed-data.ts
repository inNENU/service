/**
 * 从 database/innenu-service.sql 提取初始查阅数据（major_id / org_id）， 生成 src/utils/seed-data.ts 供 migrate
 * 启动时初始化。
 *
 * 用法：node scripts/gen-seed-data.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SQL_FILE = path.join(PROJECT_ROOT, "database", "innenu-service.sql");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "src", "utils", "seed-data.ts");

/**
 * 提取指定表的 INSERT 数据为行数组
 *
 * @param sql SQL 文件内容
 * @param table 表名
 * @returns 行数组
 */
const extractRows = (sql: string, table: string): (string | number)[][] => {
  const match = new RegExp(`INSERT INTO \`${table}\`[\\s\\S]*?;`, "u").exec(sql);

  if (!match) throw new Error(`SQL 中未找到表 ${table} 的 INSERT 数据`);

  const rows: (string | number)[][] = [];

  for (const line of match[0].split("\n")) {
    const trimmed = line.trim();

    if (!trimmed.startsWith("(")) continue;

    // 去掉行首 ( 与行尾 ), 或 ;
    const content = trimmed
      .replace(/^\(/u, "")
      .replace(/\),?;?$/u, "")
      .trim();

    // 按不在引号内的逗号拆分
    const parts = content.split(/,(?=(?:[^']*'[^']*')*[^']*$)/u);

    rows.push(
      parts.map((part) => {
        const value = part.trim();

        if (value.startsWith("'")) return value.slice(1, -1);

        return Number(value);
      }),
    );
  }

  return rows;
};

const formatRows = (rows: (string | number)[][]): string =>
  rows
    .map(
      (row) =>
        `    [${row.map((value) => (typeof value === "string" ? JSON.stringify(value) : String(value))).join(", ")}],`,
    )
    .join("\n");

const sql = readFileSync(SQL_FILE, "utf8");
const majorIdRows = extractRows(sql, "major_id");
const orgIdRows = extractRows(sql, "org_id");

const content = `/* oxlint-disable eslint/max-lines -- 生成文件，行数取决于数据量 */
/**
 * 初始查阅数据（seed）
 *
 * 由 database/innenu-service.sql 中的 INSERT 数据自动生成，请勿手改。
 * 重新生成：node scripts/gen-seed-data.ts
 */

export interface SeedTableData {
  columns: string[];
  rows: (string | number)[][];
}

export const SEED_DATA: Record<string, SeedTableData> = {
  major_id: {
    columns: ["majorId", "major", "orgId"],
    rows: [
${formatRows(majorIdRows)}
    ],
  },
  org_id: {
    columns: ["orgId", "org"],
    rows: [
${formatRows(orgIdRows)}
    ],
  },
};
`;

writeFileSync(OUTPUT_FILE, content, "utf8");
console.log(`已生成 ${OUTPUT_FILE}`);
console.log(`  major_id: ${majorIdRows.length} 行`);
console.log(`  org_id: ${orgIdRows.length} 行`);
