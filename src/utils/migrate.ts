/**
 * 数据库结构自动校验与补全（migration）
 *
 * 在服务启动时自动执行：检查所有业务表是否完整，若存在缺失的表或缺失的字段， 则自动补齐（CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT
 * EXISTS）， 保证服务运行不出错。
 *
 * 设计原则：
 *
 * - 幂等：可重复执行，不会重复建表 / 加列 / 重复插入
 * - 安全：绝不删除或清空任何现有数据，仅做「补全」
 * - 环境：本地与服务器均为 MariaDB 11.8
 *
 * 启动时依次完成：
 *
 * 1. 缺失的表 → 创建（CREATE TABLE IF NOT EXISTS）
 * 2. 缺失的字段 → 补列（ADD COLUMN IF NOT EXISTS）
 * 3. 缺失的初始查阅数据（如 major_id / org_id）→ 补齐（INSERT IGNORE，不覆盖已有行）
 *
 * 期望表结构以 database/innenu-service.sql 为基准， 初始查阅数据由 scripts/gen-seed-data.ts 从该 SQL 生成到 seed-data.ts。
 */
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { getConnection, releaseConnection } from "./mysql.js";
import { SEED_DATA } from "./seed-data.js";

/** 表结构定义 */
interface TableSchema {
  /** 表名 */
  name: string;
  /** 字段：字段名 → 字段定义（类型 + 约束 + 注释） */
  columns: Record<string, string>;
  /** 主键字段（可选） */
  primaryKey?: string[];
  /** 其他索引定义（完整语句片段，可选） */
  indexes?: string[];
}

const SCHEMA: TableSchema[] = [
  {
    name: "admin",
    columns: {
      openid: "varchar(128) NOT NULL COMMENT 'OPENID'",
      remark: "varchar(60) NOT NULL COMMENT '备注'",
    },
    primaryKey: ["openid"],
  },
  {
    name: "condition_blacklist",
    columns: {
      id: "int(11) NOT NULL AUTO_INCREMENT",
      name: "varchar(20) DEFAULT NULL COMMENT '姓名'",
      type: "varchar(32) DEFAULT NULL COMMENT '类别'",
      grade: "smallint(6) DEFAULT NULL COMMENT '年级'",
      org: "varchar(32) DEFAULT NULL COMMENT '组织'",
      major: "int(32) DEFAULT NULL COMMENT '专业'",
      remark: "varchar(40) NOT NULL COMMENT '备注'",
    },
    primaryKey: ["id"],
  },
  {
    name: "contact",
    columns: {
      uuid: "char(36) NOT NULL COMMENT 'UUID'",
      appId: "varchar(36) NOT NULL COMMENT '小程序原始ID'",
      openid: "varchar(128) NOT NULL COMMENT '用户openid'",
      type: "varchar(36) NOT NULL COMMENT '事件类型'",
      content: "text COMMENT '文字内容'",
      createTime: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'",
    },
    primaryKey: ["uuid"],
  },
  {
    name: "id_blacklist",
    columns: {
      id: "int(11) NOT NULL COMMENT '学号'",
      remark: "varchar(200) NOT NULL COMMENT '备注'",
    },
    primaryKey: ["id"],
  },
  {
    name: "id_code",
    columns: {
      uuid: "char(24) NOT NULL COMMENT '短UUID'",
      openid: "varchar(128) DEFAULT NULL COMMENT 'OPEN ID'",
      id: "int(11) DEFAULT NULL COMMENT '学号'",
      remark: "varchar(40) DEFAULT NULL COMMENT '备注'",
      verifyId: "int(11) DEFAULT NULL COMMENT '验证人学号'",
      verifyRemark: "varchar(40) DEFAULT NULL COMMENT '验证备注'",
      createTime: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'",
      verifyTime: "timestamp NULL DEFAULT NULL COMMENT '验证时间'",
    },
    primaryKey: ["uuid"],
  },
  {
    name: "log",
    columns: {
      uuid: "char(36) NOT NULL COMMENT 'UUID'",
      createTime: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'",
      type: "varchar(16) DEFAULT NULL COMMENT '类型'",
      content: "json DEFAULT NULL COMMENT '文字'",
    },
    primaryKey: ["uuid"],
  },
  {
    name: "major_id",
    columns: {
      majorId: "varchar(64) NOT NULL COMMENT '专业 ID'",
      major: "varchar(64) NOT NULL COMMENT '专业名称'",
      orgId: "mediumint(9) NOT NULL COMMENT '机构 ID'",
    },
    primaryKey: ["majorId", "orgId"],
  },
  {
    name: "openid",
    columns: {
      openid: "varchar(128) NOT NULL COMMENT 'OPENID'",
      appId: "varchar(64) NOT NULL COMMENT 'App ID'",
      id: "int(11) NOT NULL COMMENT '学号'",
      createTime: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'",
    },
  },
  {
    name: "openid_blacklist",
    columns: {
      openid: "varchar(128) NOT NULL COMMENT 'openid'",
      remark: "varchar(200) NOT NULL COMMENT '备注'",
    },
    primaryKey: ["openid"],
  },
  {
    name: "org_id",
    columns: {
      orgId: "mediumint(11) NOT NULL COMMENT '机构代码'",
      org: "varchar(32) NOT NULL COMMENT '机构名称'",
    },
    primaryKey: ["orgId"],
  },
  {
    name: "student_avatar",
    columns: {
      id: "int(11) NOT NULL COMMENT '学号'",
      avatar: "mediumtext NOT NULL COMMENT '用户头像'",
    },
    primaryKey: ["id"],
  },
  {
    name: "student_info",
    columns: {
      id: "int(11) NOT NULL COMMENT '学号'",
      name: "varchar(20) NOT NULL COMMENT '姓名'",
      org: "varchar(32) NOT NULL COMMENT '组织'",
      orgId: "int(11) NOT NULL COMMENT '组织 ID'",
      major: "varchar(32) NOT NULL COMMENT '专业'",
      majorId: "varchar(64) NOT NULL COMMENT '专业 ID'",
      inYear: "smallint(6) NOT NULL COMMENT '入学年份'",
      grade: "smallint(6) NOT NULL COMMENT '年级'",
      type: "varchar(32) NOT NULL COMMENT '类型'",
      typeId: "varchar(16) NOT NULL COMMENT '类型代码'",
      code: "varchar(16) NOT NULL COMMENT '类别码'",
      politicalStatus: "varchar(32) NOT NULL COMMENT '政治面貌'",
      people: "varchar(16) NOT NULL COMMENT '民族'",
      peopleId: "smallint(6) NOT NULL COMMENT '民族代码'",
      gender: "varchar(2) NOT NULL COMMENT '性别'",
      genderId: "tinyint(4) NOT NULL COMMENT '性别代码'",
      birth: "char(10) NOT NULL COMMENT '出生日期'",
      location: "varchar(8) NOT NULL COMMENT '位置'",
      createTime: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'",
      updateTime: "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'",
    },
    primaryKey: ["id"],
  },
  {
    name: "token",
    columns: {
      authToken: "varchar(128) NOT NULL COMMENT '登录 token'",
      id: "int(11) NOT NULL COMMENT '学号'",
      appId: "varchar(64) NOT NULL COMMENT 'App ID'",
      openid: "varchar(128) DEFAULT NULL COMMENT 'Open ID'",
      updateTime: "timestamp NOT NULL COMMENT '更新时间'",
    },
    indexes: ["UNIQUE KEY `id` (`id`,`appId`)"],
  },
];

/**
 * 根据表定义生成幂等的建表语句
 *
 * @param table 表结构定义
 * @returns CREATE TABLE IF NOT EXISTS 语句
 */
const buildCreateSql = (table: TableSchema): string => {
  const columnLines = Object.entries(table.columns).map(
    ([name, definition]) => `  \`${name}\` ${definition}`,
  );
  const primaryKeyLines = table.primaryKey?.length
    ? [`  PRIMARY KEY (\`${table.primaryKey.join("`, `")}\`)`]
    : [];

  return `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n${[
    ...columnLines,
    ...primaryKeyLines,
    ...(table.indexes ?? []),
  ].join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
};

/** 校验并补全数据库结构（幂等）。 - 缺失的表 → 创建 - 缺失的字段 → 补列 - 失败仅告警，不影响服务启动（健康检查会反映数据库状态） */
export const migrateDatabase = async (): Promise<void> => {
  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();

    for (const table of SCHEMA) {
      // 1. 表缺失 → 创建
      // oxlint-disable-next-line eslint/no-await-in-loop -- 迁移需串行执行保证顺序
      await connection.query(buildCreateSql(table));

      // 2. 字段缺失 → 补齐
      for (const [column, definition] of Object.entries(table.columns)) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- 迁移需串行执行保证顺序
        await connection.query(
          `ALTER TABLE \`${table.name}\` ADD COLUMN IF NOT EXISTS \`${column}\` ${definition}`,
        );
      }

      // 3. 初始查阅数据缺失 → 补齐（仅当数据不完整时，INSERT IGNORE 不覆盖已有行）
      const seed = SEED_DATA[table.name];

      if (seed?.rows.length) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- 迁移需串行执行保证顺序
        const [countRows] = await connection.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS count FROM \`${table.name}\``,
        );

        if (Number(countRows[0]?.count ?? 0) < seed.rows.length) {
          const placeholders = seed.rows
            .map(() => `(${seed.columns.map(() => "?").join(",")})`)
            .join(",");

          // oxlint-disable-next-line eslint/no-await-in-loop -- 迁移需串行执行保证顺序
          await connection.query(
            `INSERT IGNORE INTO \`${table.name}\` (\`${seed.columns.join("`,`")}\`) VALUES ${placeholders}`,
            seed.rows.flat(),
          );
        }
      }
    }

    console.log(`[migrate] 数据库结构校验完成（${SCHEMA.length} 张表）`);
  } catch (err) {
    console.error("[migrate] 数据库结构校验失败（服务继续启动）:", err);
  } finally {
    releaseConnection(connection);
  }
};
