# CLAUDE.md

## 项目概览

**inNENU Service** 是东北师范大学 (NENU) "inNENU" 小程序的 Express.js TypeScript 后端服务。它作为统一 API 网关，代理学校各子系统的请求，处理认证、数据抓取和格式转换。

- **运行时**: Node.js ^22.22.0 / ^24.18.0 / ^26.3.0
- **包管理器**: pnpm 11.17.0（由 `devEngines` 强制）
- **构建工具**: [tsdown](https://github.com/tsdown-js/tsdown)（基于 Rollup 的零配置 TS 构建）
- **Lint**: oxlint + oxfmt（无 ESLint/Prettier）
- **框架**: Express 5.2.1
- **数据库**: MySQL 2（通过 `mysql2/promise` 连接池）
- **端口**: 默认 8080（通过 `PORT` 环境变量配置）

## 构建与运行

```bash
# 开发模式（watch）
pnpm dev

# 构建生产环境
pnpm build

# 调试模式（开发构建 + 运行，带 --expose-gc）
pnpm debug

# Lint + 格式化
pnpm lint

# Lint 检查（不修复）
pnpm lint:check
```

构建输出到 `dist/` 目录。`lib/encrypt.js` 独立构建（target ES2017），其余代码基于 `src/index.ts` 入口构建。

## 项目结构

```
src/
├── index.ts              # 主入口：Express 应用创建、路由挂载、错误处理
├── home.ts               # 首页 HTML（含内联 CSS/JS 健康状态展示）
├── tools/                # 工具模块
│   └── weather/          #   天气数据代理（腾讯天气 API，含限流）
├── typings.ts            # 共享类型定义
├── auth/                 # 统一身份认证（authserver.nenu.edu.cn）
│   ├── activate/         #   账户激活（信息验证 → 短信 → 设密码）
│   ├── init/             #   首次登录（获取登录信息 → 提交凭证 → 获取用户详情）
│   ├── re-auth/          #   二次认证（短信验证）
│   ├── reset/            #   密码重置
│   ├── captcha.ts        #   滑块验证码
│   ├── encrypt.ts        #   AES 加密（crypto-js）
│   ├── login.ts          #   核心登录函数 authLogin()
│   └── get-password-rule.ts / check-password.ts
├── auth-center/          # 统一认证中心（头像、个人信息验证）
├── action/               # 融合门户（m-443.webvpn.nenu.edu.cn）
│   ├── borrow-books/     #   借阅图书查询
│   ├── card-balance.ts   #   校园卡余额
│   ├── email-page.ts     #   邮件页面重定向
│   ├── notice-list.ts    #   通知列表
│   └── notice-detail.ts  #   通知详情
├── enroll/               # 招生系统（本科招生、研究生招生）
├── grad-system/          # 研究生系统（pg.nenu.edu.cn）
├── health/               # 健康检查系统（数据库、8 个学校服务探活）
├── library/              # 图书馆（实时在馆人数）
├── middleware/           # Express 中间件
├── module/               # 模块复用导出
├── mp/                   # 小程序（登录、黑名单、客服消息、小程序码、身份码）
├── my/                   # 个人门户/网上服务大厅
├── oa/                   # OA 办公系统（邮箱申请、用户信息）
├── official/             # 学校官网（信息、通知、学术活动、专业方案）
├── under-study/          # 本科教务系统（bkjx.nenu.edu.cn）
│   ├── select/           #   选课子系统（分类、搜索、班级、选课/退选）
│   ├── course-table/     #   课程表
│   └── course-commentary/#   评教
├── under-system/         # 本科教学服务系统（旧版，dsjx.webvpn.nenu.edu.cn）
├── vpn/                  # WebVPN CAS 登录
├── who/                  # 学工系统
├── config/               # 全局配置（失败类型枚举、响应对象、常量）
├── utils/                # 工具函数（MySQL、请求封装、编码、黑名单等）
└── test/                 # 测试端点
```

## 核心架构模式

### 1. `request()` 包装器

所有 Express handler 必须包装在 `request()` 函数中，它提供自动 `try/catch` 错误转发：

```typescript
import { request } from "@/utils/index.js";

export const myHandler = request<ResponseType, RequestBodyType>(async (req, res) => {
  // req.body 类型自动推断为 RequestBodyType
  // 抛出的错误会自动传递到全局错误处理器
  return res.json({ success: true, data: ... });
});
```

类型参数顺序为 `<ResBody, ReqBody, ReqQuery, Params, Locals>`。

### 2. 统一认证流程

所有需要登录的系统遵循相同模式：

```
VPN CAS 登录 (webvpn.nenu.edu.cn)
  → 统一身份认证 (authserver.nenu.edu.cn)
    → ticket 兑换 (各子系统 SSO 端点)
      → session 验证 (302 重定向处理)
```

核心函数 `authLogin()` 在 `src/auth/login.ts`，所有子系统登录都调用它。

### 3. Cookie 管理

使用 `@mptool/net` 的 `CookieStore` 类管理跨重定向的 Cookie。关键方法：

- `cookieStore.set(cookie)` — 手动设置 Cookie
- `cookieStore.getHeader(server)` — 获取指定服务器的 Cookie 请求头
- `cookieStore.applyResponse(response, server)` — 从响应中提取 Set-Cookie

### 4. 数据库操作模式

使用手动连接管理（获取 → 使用 → 释放）：

```typescript
let connection: PoolConnection | null = null;
try {
  connection = await getConnection();
  // 执行查询...
} finally {
  releaseConnection(connection);
}
```

连接池配置在 `src/utils/mysql.ts`：`connectionLimit: 100`, `queueLimit: 300`。

### 5. 响应格式

所有 API 响应遵循统一格式：

```typescript
// 成功
{ success: true, data: T }
// 列表成功
{ success: true, data: T[], current: number, total: number }
// 失败
{ success: false, type: ActionFailType, msg: string }
```

`ActionFailType` 枚举包含约 30 种失败类型（`MissingCredential`、`WrongPassword`、`Expired`、`BlackList` 等）。

### 6. 测试模式

项目维护一个测试账户（学号按当前学年动态生成，常量 `TEST_ID_NUMBER`），用于微信小程序审核。通过检查 `options.id === TEST_ID_NUMBER` 或 cookie 中的 `TEST` 标识判断是否为测试请求，返回 `TEST_*` 预设数据。测试常量定义在 `src/config/test.ts`。

### 7. 路径别名

`@/` 映射到 `src/`，在 `tsconfig.json` 和 `tsdown.config.ts` 中均有配置。

## 关键文件说明

| 文件                                | 说明                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| `src/index.ts`                      | Express 应用启动、路由注册、全局错误处理                       |
| `src/auth/login.ts`                 | `authLogin()` — 所有子系统登录的核心依赖                       |
| `src/auth/init/info.ts`             | `getAuthInfo()` — 登录后获取用户信息，写入 student_info 表     |
| `src/utils/request.ts`              | `request()` 包装器和 `CustomRequestHandler` 类型               |
| `src/utils/mysql.ts`                | MySQL 连接池（单例）和连接管理函数                             |
| `src/utils/blackList.ts`            | `isInBlackList()` — 三层黑名单检查（ID、OpenID、条件规则）     |
| `src/config/actionFailType.ts`      | `ActionFailType` 枚举                                          |
| `src/config/response.ts`            | 预构建的常见失败响应对象                                       |
| `src/health/handler.ts`             | `/health` 端点 — 系统、数据库、服务健康状态                    |
| `src/middleware/applyMiddleware.ts` | 中间件装配（CORS、cookie-parser、compression、JSON、静态文件） |
| `src/middleware/morgan.ts`          | 自定义日志格式（含成功/失败着色）                              |

## 涉及的外部系统

| 系统         | 服务地址                  | WebVPN 地址                       |
| ------------ | ------------------------- | --------------------------------- |
| 统一身份认证 | authserver.nenu.edu.cn    | authserver-443.webvpn.nenu.edu.cn |
| 融合门户     | m-443.webvpn.nenu.edu.cn  | 同                                |
| 研究生系统   | pg.nenu.edu.cn            | 通过 WebVPN                       |
| 本科教务     | bkjx.nenu.edu.cn          | bkjx-443.webvpn.nenu.edu.cn       |
| 本科旧系统   | dsjx.webvpn.nenu.edu.cn   | 同                                |
| OA 系统      | oa.nenu.edu.cn            | oa-443.webvpn.nenu.edu.cn         |
| 个人门户     | my-443.webvpn.nenu.edu.cn | 同                                |
| 学校官网     | www.nenu.edu.cn           | —                                 |
| 图书馆       | library.nenu.edu.cn       | —                                 |
| 学工系统     | 通过 WebVPN               | —                                 |
| 研究生招生   | yz.nenu.edu.cn            | —                                 |
| 本科招生     | gkcx.nenu.edu.cn          | —                                 |

## 常见任务

### 添加新子系统模块

1. 在 `src/` 下创建新目录
2. 创建 `utils.ts`（服务器 URL 常量）、`login.ts`（登录流程）、业务 handler 文件
3. 创建 `router.ts`，遵循模式：`post("/login", loginHandler)` → `use(loginMiddleware)` → 各业务路由
4. 创建 `index.ts` 桶导出
5. 在 `src/index.ts` 中导入并挂载路由
6. 如有需要，在 `src/health/services.ts` 中添加健康检查

### 添加新的失败类型

1. 在 `src/config/actionFailType.ts` 的 `ActionFailType` 枚举中添加值
2. 在 `src/typings.ts` 的 `CommonFailedResponse` 联合类型中添加对应类型

### 数据库查询

```typescript
import { getConnection, releaseConnection } from "@/utils/index.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

let connection: PoolConnection | null = null;
try {
  connection = await getConnection();
  const [rows] = await connection.execute<RowDataPacket[]>("SELECT ...", [...params]);
  // 处理结果
} finally {
  releaseConnection(connection);
}
```

### 配置 oxlint 规则

编辑 `oxlint.config.ts`，使用 `defineHopeConfig` 包装器。常用配置：

```typescript
export default defineHopeConfig({
  node: true,           // Node.js 环境
  ignore: ["lib/"],     // 忽略目录
  rules: { ... },       // 自定义规则覆盖
});
```

## 注意事项

- `lib/encrypt.js` 是独立的 crypto-js 核心文件，作为独立入口构建（target ES2017），请勿随意修改
- `.env` 通过 `src/config/loadEnv.ts` 的副作用加载，在需要环境变量的文件中通过 `import "@/config/loadEnv.js"` 引入
- 环境变量参考 `.env.example`
- 编码转换使用 `iconv-lite` 处理 GBK，核心函数在 `src/utils/content.ts`

### 测试账户

生产环境维护一个测试账户（学号按当前学年动态生成，常量 `TEST_ID_NUMBER`），用于微信小程序审核时向审核人员展示完整功能。测试账户会跳过真实认证流程，返回 `src/config/test.ts` 中预设的 mock 数据。各 handler 中通过检查 cookie 是否包含 `TEST` 或 `options.id === TEST_ID_NUMBER` 触发测试模式。

### 路由结构约定

- 各子系统模块放在 `src/` 下独立目录，通过 `router.ts` 定义路由
- 路由模式：`post("/login", loginHandler)` → `use(loginMiddleware)` → 各业务路由
- 需要登录的端点使用自定义中间件统一处理 cookie 验证（如 `loginToUnderStudy`）
- 工具类模块放在 `src/tools/`，天气模块是第一个示例
