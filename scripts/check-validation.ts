/**
 * 校验体系完整性核查脚本（接 lint:check 自动执行）
 *
 * 检查两件事：
 *
 * 1. 所有 POST 路由是否都接了 validate(schema) 中间件（防止新增接口漏接校验）
 * 2. 所有 schema 字段是否都在 src/utils/validate.ts 的 FIELD_NAMES 中有中文名（防止前端收到英文参数名）
 *
 * 说明：本脚本刻意不依赖 AST 解析库（typescript 7 为原生实现、无传统 API，unrun 亦无法正确 interop CJS），
 * 采用结构感知扫描：先剥离注释与字符串字面量，再做括号配对，提取 router.post 调用链与 z.object 字段。
 *
 * 用法：pnpm exec unrun scripts/check-validation.ts（由 lint:check 自动调用）
 */
// oxlint-disable eslint/eqeqeq, eslint/curly, eslint/id-length, eslint/prefer-destructuring, jsdoc/require-param, jsdoc/require-returns, typescript/no-confusing-void-expression, unicorn/prefer-spread -- 工具脚本，追求可读可维护而非严格风格
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(PROJECT_ROOT, "src");

/**
 * POST 路由中不需要接 validate 的白名单（按 "模块:路径" 匹配）。
 *
 * 豁免原则： - body 为空（无请求参数，如纯 cookie 操作、验证码、探活） - 仅依赖 cookie 会话，不读取 req.body
 */
const POST_SKIP_ROUTES = new Set([
  "*:/check", // body 为可空 cookies，无需校验
  "*:/health", // 公开探活端点
  "*:/category", // 选课分类，无请求参数
  "auth:/auth-captcha", // 验证码端点，无 body 参数
  "auth:/encrypt", // 纯加密工具，无 body 参数
  "auth:/reset-password", // 密码重置，无 body 参数
  "action:/email-page", // 仅用 cookie 会话，不读 body
  "action:/recent-email", // 仅用 cookie 会话，不读 body
  "oa:/info", // 仅用 cookie 会话，不读 body
  "under-study:/info", // 仅用 cookie 会话，不读 body
  "under-study:/special-exam", // 无请求参数
  "my:/email", // my/email 为 stub
  "my:/info", // 仅用 cookie 会话，不读 body
  "my:/identity", // 仅用 cookie 会话，不读 body
  "enroll:/grad-admission", // 暂不支持 stub，无实际逻辑
  "enroll:/grad-recommend-plan", // 无请求参数
]);

const walkFiles = (dir: string): string[] => {
  const results: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);

    if (statSync(full).isDirectory()) {
      results.push(...walkFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) {
      results.push(full);
    }
  }

  return results;
};

/** 剥离注释与字符串字面量，返回保留结构的可扫描文本。 用空格替换保长度，确保位置与括号配对不受影响。 采用 charCodeAt 字节级扫描，避免 Unicode 码点拆分导致的索引错位。 */
const stripCommentsAndStrings = (code: string): string => {
  const result = Array.from(code);

  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];
    const next = code[i + 1];
    const isLineComment = char === "/" && next === "/";
    const isBlockComment = char === "/" && next === "*";
    const isQuote = char === "'" || char === '"' || char === "`";

    if (isLineComment) {
      let j = i;

      while (j < code.length && code[j] !== "\n") {
        result[j] = " ";
        j += 1;
      }

      i = j - 1;
    } else if (isBlockComment) {
      let j = i + 2;

      result[i] = " ";
      result[i + 1] = " ";

      while (j < code.length && !(code[j] === "*" && code[j + 1] === "/")) {
        result[j] = " ";
        j += 1;
      }

      if (j < code.length) {
        result[j] = " ";
        result[j + 1] = " ";
        i = j + 1;
      } else {
        i = code.length;
      }
    } else if (isQuote) {
      let j = i + 1;

      result[i] = " ";

      while (j < code.length) {
        if (code[j] === "\\") {
          result[j] = " ";
          result[j + 1] = " ";
          j += 2;
          continue;
        }

        if (code[j] === char) {
          result[j] = " ";
          i = j;
          break;
        }

        result[j] = " ";
        j += 1;
      }
    }
  }

  return result.join("");
};

/** 仅剥离注释（保留字符串字面量，用于读取字段键） */
const stripCommentsOnly = (code: string): string => {
  const result = Array.from(code);

  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];
    const next = code[i + 1];
    const isLineComment = char === "/" && next === "/";
    const isBlockComment = char === "/" && next === "*";

    if (isLineComment) {
      let j = i;

      while (j < code.length && code[j] !== "\n") {
        result[j] = " ";
        j += 1;
      }

      i = j - 1;
    } else if (isBlockComment) {
      let j = i + 2;

      result[i] = " ";
      result[i + 1] = " ";

      while (j < code.length && !(code[j] === "*" && code[j + 1] === "/")) {
        result[j] = " ";
        j += 1;
      }

      if (j < code.length) {
        result[j] = " ";
        result[j + 1] = " ";
        i = j + 1;
      } else {
        i = code.length;
      }
    }
  }

  return result.join("");
};

/** 找到与 open 配对的闭合括号位置（支持 () {} []，假定已剥离注释字符串） */
const findMatchingBracket = (code: string, start: number, open: string, close: string): number => {
  let depth = 0;

  for (let i = start; i < code.length; i += 1) {
    const c = code[i];

    if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
};

/**
 * 检查单个 router.ts：返回未接 validate 的 POST 路由列表。
 *
 * 匹配形如 `xxxRouter.post("路径", handler1, validate(schema), handler2)` 的调用 （变量名以 Router 结尾，如 router /
 * actionRouter / underStudyRouter）， 只要该调用参数链中出现 `validate(` 或独立 `validate` 标识符即视为已接校验。
 *
 * @param filePath Router 文件路径
 * @param moduleName 所属模块名（用于白名单匹配）
 * @returns 未接 validate 的路由描述列表
 */
const checkRouter = (filePath: string, moduleName: string): string[] => {
  const raw = readFileSync(filePath, "utf8");
  // 需读取路由路径字符串，故仅剥离注释、保留字符串字面量
  const code = stripCommentsOnly(raw);
  const rel = path.relative(PROJECT_ROOT, filePath);
  const missing: string[] = [];
  const postPattern = /\w*Router\s*\.\s*post\s*\(/gu;

  let match: RegExpExecArray | null;

  while ((match = postPattern.exec(code)) !== null) {
    const callStart = match.index + match[0].length - 1; // 指向 '('
    const callEnd = findMatchingBracket(code, callStart, "(", ")");

    if (callEnd === -1) continue;

    const callBody = code.slice(callStart, callEnd + 1);
    // 提取路径参数（第一个字符串字面量）
    const pathMatch = /^\s*\(\s*(["'`])(.*?)\1/u.exec(callBody);

    if (!pathMatch) continue;

    const route = pathMatch[2];

    if (POST_SKIP_ROUTES.has(`*:${route}`) || POST_SKIP_ROUTES.has(`${moduleName}:${route}`)) {
      continue;
    }

    // 参数链是否含 validate 调用
    const hasValidate = /\bvalidate\s*\(/u.test(callBody) || /\bvalidate\b/u.test(callBody);

    if (!hasValidate) missing.push(`${rel} 的 ${route} 未接 validate 中间件`);
  }

  return missing;
};

/**
 * 提取 schemas.ts 中所有 `z.object({ ... })` 的顶层字段名。
 *
 * 匹配 `z.object(` 后直到配对 `)` 的对象字面量，提取其顶层属性键。
 */
const extractSchemaFields = (filePath: string): string[] => {
  const raw = readFileSync(filePath, "utf8");
  const code = stripCommentsAndStrings(raw);
  const fields: string[] = [];
  const objectPattern = /\bz\s*\.\s*object\s*\(/gu;

  let match: RegExpExecArray | null;

  while ((match = objectPattern.exec(code)) !== null) {
    const objStart = match.index + match[0].length - 1; // 指向 '('
    const objEnd = findMatchingBracket(code, objStart, "(", ")");

    if (objEnd === -1) continue;

    const objBody = code.slice(objStart + 1, objEnd);
    const braceStart = objBody.indexOf("{");

    if (braceStart === -1) continue;

    const braceEnd = findMatchingBracket(objBody, braceStart, "{", "}");

    if (braceEnd === -1) continue;

    const literalBody = objBody.slice(braceStart + 1, braceEnd);
    // 顶层属性键：`key:` 或 `"key":` 或 `'key':` 开头
    const keyPattern = /(?:^|,)\s*(?:["']?)([A-Za-z_$][\w$]*)(?:["']?)\s*:/gu;
    let keyMatch: RegExpExecArray | null;

    while ((keyMatch = keyPattern.exec(literalBody)) !== null) {
      fields.push(keyMatch[1]);
    }
  }

  return fields;
};

/** 从 validate.ts 提取 FIELD_NAMES 的键（需保留字符串键，故仅剥注释） */
const extractFieldNames = (filePath: string): Set<string> => {
  const raw = readFileSync(filePath, "utf8");
  const code = stripCommentsOnly(raw);
  const keys = new Set<string>();
  const nameStart = code.indexOf("FIELD_NAMES");

  if (nameStart === -1) return keys;

  const braceStart = code.indexOf("{", nameStart);

  if (braceStart === -1) return keys;

  const braceEnd = findMatchingBracket(code, braceStart, "{", "}");

  if (braceEnd === -1) return keys;

  const body = code.slice(braceStart + 1, braceEnd);
  // 兼容 `id:`（无引号标识符）与 `"id":`（带引号）两种键写法
  const keyPattern = /(?:^|,)\s*(?:(["'])([^"']+?)\1|([A-Za-z_$][\w$]*))\s*:/gu;
  let match: RegExpExecArray | null;

  while ((match = keyPattern.exec(body)) !== null) {
    keys.add(match[2] ?? match[3]);
  }

  return keys;
};

let exitCode = 0;
const errors: string[] = [];

// 核查 A：router 是否漏接 validate（只检查已纳入校验体系的模块，即存在 schemas.ts 的模块）
const validatePath = path.join(SRC_DIR, "utils", "validate.ts");
const allRouters = walkFiles(SRC_DIR).filter((f) => f.endsWith("router.ts"));
const schemaFiles = walkFiles(SRC_DIR).filter((f) => f.endsWith("schemas.ts"));

// 收集每个 schema 文件所属模块（src/<module>/schemas.ts 或 src/<module>/<sub>/schemas.ts → <module>）
const validatedModules = new Set<string>();

for (const schemaFile of schemaFiles) {
  const rel = path.relative(SRC_DIR, schemaFile);
  const [moduleName] = rel.split("/");

  validatedModules.add(moduleName);
}

for (const router of allRouters) {
  const rel = path.relative(SRC_DIR, router);
  const [moduleName] = rel.split("/");

  // 仅检查已纳入校验体系的模块；其余模块（test/mp/enroll/official 等）暂不强制
  if (validatedModules.has(moduleName)) {
    errors.push(...checkRouter(router, moduleName));
  }
}

// 核查 B：schema 字段是否缺中文名
const fieldNames = extractFieldNames(validatePath);

for (const schemaFile of schemaFiles) {
  const fields = extractSchemaFields(schemaFile);
  const rel = path.relative(PROJECT_ROOT, schemaFile);

  for (const field of fields) {
    if (!fieldNames.has(field)) {
      errors.push(`${rel} 的字段 "${field}" 未在 validate.ts 的 FIELD_NAMES 中配置中文名`);
    }
  }
}

if (errors.length > 0) {
  console.error("【校验体系核查失败】");
  errors.forEach((err) => console.error(`  - ${err}`));
  console.error("\n请在对应文件补上 validate 中间件或 FIELD_NAMES 中文名映射后重试。");
  exitCode = 1;
} else {
  console.log(
    `【校验体系核查通过】${validatedModules.size} 个模块已纳入校验，${schemaFiles.length} 个 schema 文件符合规范。`,
  );
}

// oxlint-disable-next-line unicorn/no-process-exit
process.exit(exitCode);
