# inNENU Service 自动化测试方案（草稿，待审核）

> 目标：对整个项目做自动化集成测试，覆盖所有可测 API 端点，验证各个功能是否能正常工作。
> 文档状态：**草稿** —— 请先审核理解是否正确，再开工。

---

## 一、项目理解（关键点）

### 1.1 架构

inNENU Service 是一个 Express.js 网关服务，代理学校各子系统（统一认证、融合门户、本科教务、研究生系统、OA、服务大厅、学工等），负责登录、抓取、格式转换。测试时**本地起服务**（`localhost:8080`），测试脚本通过 HTTP 调用，与小程序前端调用方式完全一致。

### 1.2 登录与二次认证（本方案的核心）

所有需登录系统共享同一套「统一身份认证」流程：

```
GET  /auth/init?id=<学号>            → 拿到 salt + params + JSESSIONID cookie
POST /auth/init {id,password,salt,params,appId,openid}   → 若需二次认证返回 NeedReAuth + cookie
GET  /auth/re-auth?id=<学号>         → 发送短信（手机收到 6 位验证码）
POST /auth/re-auth {smsCode,id,password,openid,appId}    → 校验成功返回 authToken + cookies
```

**关键洞察：二次认证产物是 `authToken`**（即 `MULTIFACTOR_USERS` cookie 的值，有效期到 2092 年）。拿到它之后，所有系统登录都可直接用：

```
POST /<system>/login {id, password, authToken}   → 返回该系统专属 cookies（无需再二次认证）
```

因此**只要一次性完成「本科 + 研究生」两个账号的短信二次认证**，把 `authToken` 持久化到 git 忽略文件，后续所有自动化测试都能复用，无需重复输入短信。

> 注：`appId`/`openid` 在认证流程中仅用于写入 `token` 表（upsert，无副作用），可用占位值（如 `appId: "wx0009f7cdfeefa3da"`、`openid: "test"`）。

### 1.3 系统登录中间件模式（已确认所有系统一致）

各系统的 `loginToXxx` 中间件逻辑统一：

- body 里有 `{id, password, authToken}` → 内部重新登录，成功后用新 cookie 覆盖请求头
- 否则读取请求头 cookie，没有则返回 `MissingCredential`

所以测试两种用法都可行，我们采用：**先调 `/login` 拿系统 cookies，再带 cookie 调业务端点**（避免每个请求都重新登录，减轻学校侧压力）。

---

## 二、整体设计

### 2.1 分两个阶段

| 阶段                      | 脚本                        | 交互性 | 说明                                                                                             |
| ------------------------- | --------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| **Provision（身份获取）** | `scripts/test/provision.ts` | 交互式 | 读 git 忽略的账号文件 → 自动触发 2FA → 终端提示输入短信码 → 保存 authToken 到 git 忽略的状态文件 |
| **Run（自动化测试）**     | `scripts/test/*.test.ts`    | 全自动 | 读状态文件 → 自动登录各系统 → 批量测试所有端点                                                   |

Provision 只在**首次**（或 token 失效时）需要人工输入短信；之后每次跑测试直接复用。

### 2.2 文件规划

```
temp/                      # 已在 .gitignore 中，全部测试状态放这里
├── accounts.json          # 账号（git 忽略）：{ undergrad: {id,password}, grad: {id,password} }
└── auth-state.json        # 登录态（git 忽略）：两个账号的 authToken + cookies

scripts/test/
├── provision.ts           # 交互式 2FA 脚本
├── client.ts              # 测试 HTTP 客户端（CookieStore 封装、断言工具）
├── state.ts               # 读写 temp/ 状态文件
├── config.ts              # 端点清单、跳过清单、系统登录映射
├── public.test.ts         # 无需登录的端点
├── auth.test.ts           # 统一认证相关
├── action.test.ts         # 融合门户
├── under-study.test.ts    # 本科教务（新）
├── under-system.test.ts   # 本科教务（旧）
├── grad-system.test.ts    # 研究生系统
├── my.test.ts             # 服务大厅
├── oa.test.ts             # OA（info 可测，email-apply 跳过）
├── who.test.ts            # 学工
└── index.ts               # 汇总入口 / 测试调度

package.json               # 新增脚本：pnpm test:provision / pnpm test
```

### 2.3 运行流程

```bash
# 1. 起数据库（首次自动初始化）
docker compose -f database/docker-compose.yml up -d

# 2. 构建并起服务
pnpm build && node dist/index.js

# 3. 首次：人工二次认证（两个账号各输一次短信码）
pnpm test:provision

# 4. 自动化测试（之后每次直接跑这步）
pnpm test
```

---

## 三、测试端点清单

### 3.1 无需登录（公开端点，直接可测）

| 端点                                                                 | 方法                 | 断言要点                                         |
| -------------------------------------------------------------------- | -------------------- | ------------------------------------------------ |
| `/`                                                                  | GET                  | 200 + HTML                                       |
| `/health`                                                            | GET                  | `success:true`，`database.healthy`，服务健康列表 |
| `/library/people`                                                    | GET                  | `success:true`，含 `benbu/jingyue`               |
| `/official/info-list`、`/academic-list`、`/notice-list`              | GET/POST             | `success:true` + `data[]` + `current/total`      |
| `/official/info-detail`、`/academic-detail`、`/notice-detail`        | POST `{url}`         | `success:true` + `title/content`                 |
| `/official/under-major-plan`                                         | GET/POST             | `success:true` + `{name,url}[]`                  |
| `/enroll/under-history-score`、`/under-plan`                         | POST `{type:"info"}` | `success:true`                                   |
| `/enroll/grad-plan`、`/grad-recommend-plan`                          | POST                 | `success:true`（走静态页 + cache 兜底）          |
| `/enroll/under-admission`                                            | POST                 | 查询通道关闭时可能 `Closed`（可接受）            |
| `/weather`、`/tools/weather`                                         | GET                  | **直接返回 WeatherData，无 `success` 包装**      |
| `/test/connect`、`/test/get`、`/test/post`、`/test/301`、`/test/302` | 各方法               | 回显/重定向                                      |
| `/auth/encrypt`                                                      | POST                 | 纯函数返回密文                                   |
| `/auth/auth-captcha`                                                 | GET/POST             | 限流 5 次/分，谨慎调用                           |

### 3.2 需登录端点（本科 + 研究生账号覆盖）

| 模块                               | 端点                                                                                                                                                 | 用哪个账号 | 备注                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| **统一认证**                       | `/auth/init` GET                                                                                                                                     | 均可       | provision 阶段已覆盖                                                 |
| **融合门户** `/action`             | login/check + borrow-books、card-balance、recent-email、notice-list、notice-detail、email-page                                                       | 本科       | email-page 注意返回 URL                                              |
| **服务大厅** `/my`                 | login/check + info、identity                                                                                                                         | 本科       | `my/email` 是 stub（返回"已迁移至 OA"），验证不 500 即可             |
| **OA** `/oa`                       | login/check + info                                                                                                                                   | 本科       | **email-apply 跳过**（一次性）                                       |
| **本科教务（新）** `/under-study`  | login/check + info、grade-list、grade-detail、special-exam、course-table、course-commentary(list/view)、select/{category,info,search,class,selected} | 本科       | **select/process、commentary submit 跳过**（选课/评教副作用）        |
| **本科教务（旧）** `/under-system` | login/check + info、course-table、change-major-plan、exam-place、student-archive(get)、test-query                                                    | 本科       | **create-archive、student-archive(register) 跳过**（建立学籍副作用） |
| **学工** `/who`                    | login + info                                                                                                                                         | 本科       |                                                                      |
| **研究生系统** `/grad-system`      | login + info、information                                                                                                                            | **研究生** | 无 mock，必须真登录                                                  |
| **认证中心** `/auth-center`        | login/check + avatar                                                                                                                                 | 本科       | avatar 有已知 bug（无 cookie 挂起），测试带超时                      |

### 3.3 跳过清单（不可/不宜自动化测试）

| 端点                                          | 原因                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `/auth/activate` 全部                         | 账户激活，一次性                                                       |
| `/auth/reset-password`、`/auth/reset-captcha` | 密码重置，强副作用                                                     |
| `/auth/init` POST                             | 登录主流程，provision 已覆盖，且会真实写库                             |
| `/oa/email-apply`                             | 申请邮箱，一次性                                                       |
| `/under-system/create-archive` 全部           | 建立学籍，一次性                                                       |
| `/under-system/student-archive` register      | 注册学籍，一次性                                                       |
| `/under-study/select/process`                 | 选/退课，副作用                                                        |
| `/under-study/course-commentary` submit       | 提交评教，副作用                                                       |
| `/mp/*` 全部                                  | 依赖微信开放平台（code/openid/回调），普通账号无法测                   |
| `/vpn/cas-login`                              | 真实 VPN 登录，无 mock 且会增加学校侧负担（可在 provision 后顺带验证） |

---

## 四、断言与容错策略

1. **通用断言**：HTTP 200 + JSON 为合法对象 + `success === true`。
2. **结构断言**：按清单校验 `data` 的形状（数组非空、关键字段为字符串/数字）。
3. **特殊键**：`under-system/info`、`grad-system/information`、`change-major-plan` 成功键是 `info`/`header` 而非 `data`；`weather` 无 `success` 包装。
4. **可接受失败**（不判失败，记为「跳过/已知」）：
   - 学校系统时段性关闭 → `Restricted` / `Forbidden`
   - 假期无数据（成绩、课表、选课、评教为空）
   - 招生通道关闭 → `Closed`
   - 邮箱 stub 返回 `Unknown`（"已迁移至 OA"）
5. **不触发任何写操作**：所有测试只读；副作用端点一律在清单中跳过。
6. **限流规避**：`/auth/*` 每账号每分钟 3~5 次，provision 阶段串行、间隔执行；业务端点无限流但同样串行并加小间隔，避免触发学校侧风控。
7. **输出**：每个端点一行结果（PASS / FAIL / SKIP），最终汇总各模块统计 + 失败明细。

---

## 五、风险与注意

- **学校系统不稳定**：网络/时段性故障会导致偶发失败，需与代码 bug 区分（看错误类型 `msg`）。
- **测试账号频率**：反复登录可能触发学校账号冻结/风控，provision 尽量低频。
- **数据时效性**：课表/成绩/选课等数据随学期变化，断言只查结构不查具体值。
- **auth-center/avatar 已知 bug**：无 cookie 时挂起（handler 缺 `res.json`），测试需设超时并在报告中标注。
- **token 失效**：若学校侧使 token 失效，需重跑 provision（重新输短信）。

---

## 六、待确认问题

1. 本科、研究生两个真实账号的 `id`/`password` 需要你提供（写入 `temp/accounts.json`，git 忽略，**不要**发在聊天里，直接写入文件即可）。
2. 两个账号的短信都会发到对应绑定的手机号，provision 时你需要在终端手动输入验证码（每次一个账号）。
3. `appId`/`openid` 使用占位值是否可接受？（我理解 token 表只用于小程序绑定，测试不影响）
4. 服务跑在 `localhost:8080`、数据库用 Docker MariaDB 11.8（`127.0.0.1:3306`），端口如有冲突请告知。

---

_若以上理解无误，我就按此开工：先建 `temp/accounts.json` 骨架与 provision 脚本，跑通两个账号的二次认证，再写各模块测试并逐项验证。_
