# inNENU Service 项目改进建议

> 以下为尚未完成的改进建议，已完成的已移除。

---

## 🔴 高优先级

### 1. 提取统一的登录流程

当前 `action`、`my`、`oa`、`under-study`、`under-system`、`grad-system`、`who` 七个模块各自实现几乎相同的登录流程：

```
VPN CAS 登录 → 统一身份认证 → ticket 兑换 → session 验证 → Cookie 存储
```

建议将通用流程抽象为 `src/auth/login-pipeline.ts`，各模块传入差异化配置（服务器 URL、service 参数、额外验证步骤）即可。这将消除 ~500+ 行重复代码。

### 2. 添加请求参数校验

当前所有 handler 直接使用 `req.body` 和 `req.query`，没有任何校验。建议引入 [Zod](https://zod.dev/) 对每个接口的入参进行 schema 校验，避免因参数缺失/格式错误导致的运行时异常。

```typescript
import { z } from "zod";

const loginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(6).max(64),
  authToken: z.string().optional(),
});
```

---

## 🟡 中优先级

### 3. 测试账户数据管理

生产环境通过 `TEST_ID_NUMBER`（按当前学年动态生成）硬编码模拟一个测试账户，用于微信小程序审核。当前测试数据混在业务代码中（`src/config/test.ts` 和各 handler 的 `if` 分支）。建议：

- 将测试数据集中到 `src/config/test.ts`，统一管理测试账户的 mock 响应
- 为测试账户添加文档说明（微信审核专用）
- 考虑将测试账户 ID 和返回数据通过配置化管理

---

## 🟢 低优先级

### 4. 拆分 grade-list.ts

`src/under-study/grade-list.ts`（240 行）包含原始数据结构定义、数据转换函数、API 调用逻辑和 handler，建议拆分为 parser + handler。

### 5. 启用复杂度检查规则

`oxlint.config.ts` 中可尝试启用以下规则（`no-console` / `strict-boolean-expressions` / `no-non-null-assertion` 误报过多，不启用）：

| 规则                     | 当前 | 建议      |
| ------------------------ | ---- | --------- |
| `max-lines-per-function` | off  | warn(200) |
| `complexity`             | off  | warn(20)  |

### 6. 添加自动化测试

项目目前没有测试文件。已有 Postman 测试集，后续导出后可在此基础上补充：

- **单元测试**：`authLogin`、`authEncrypt`、字符串/HTML 解析函数
- **集成测试**：各 handler 的请求/响应流程
- **建议框架**：Vitest + supertest

### 7. API 文档

建议引入 [tsoa](https://tsoa-community.github.io/docs/) 或手写 OpenAPI 规范，生成 API 文档便于使用者查阅。

---

## 📋 总结

| 类别                         | 数量 |
| ---------------------------- | ---- |
| 高优先级（安全/稳定/正确性） | 2    |
| 中优先级（可维护性/可靠性）  | 1    |
| 低优先级（工程化/优化）      | 4    |

建议按优先级依次推进：登录流程统一 → 参数校验 → 测试账户 → 其他。
