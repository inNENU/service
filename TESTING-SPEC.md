# inNENU Service 自动化测试细则（供核对）

> 本文档是自动化测试的**详细设计**，包含：每个端点的请求参数、预期响应的精确键名（逐字核对源码）、空列表/良性失败的判定规则，以及我在测试中做出的**业务逻辑推断**。请重点核对第三、四节，判断测试是否写得准确。
> 文档状态：**待你核对**。确认后我再按此实现 Vitest 测试。

---

## 一、测试原则（严格性分级）

1. **HTTP 200 + 合法 JSON** 是基础前提。
2. **严格性分级**（核心规则）：
   - **S 级（必须非空/有值）**：测试账号**必然有数据**的接口（如成绩、课表、个人信息）。返回空或缺失 → **直接失败**。
   - **A 级（强业务断言）**：字段必须有值且符合业务预期（如校园卡余额 > 0、图书馆白天人数 > 0），且**非空时逐元素严格校验键名**。
   - **B 级（可为空，非空则严格校验）**：确实可能为空的接口（如借书列表、特殊考试、四六级记录）。空 = 通过；非空 = 逐元素校验键名。
   - **C 级（时期/时段依赖）**：如选课（仅选课期）、评教（仅评教期）、考场安排（仅考试周）。时期不对时空/跳过视为预期。
3. **对象 → 严格校验键名**：data（或 info）对象必须包含预期键名。
4. **良性失败 = 通过但记警告**：学校系统时段性关闭、数据未发布等特定失败类型，记为「已知场景」不算失败（见第四节各端点标注）。
5. **绝不触发副作用**：激活、重置密码、申请邮箱、建学籍、选课、评教提交等一律跳过。

> **关键原则（你的要求）**：默认从严——除明确列为 B 级（如借书）的接口外，都假定字段**必须有值**。空成绩、空课表 = 失败。

---

## 二、测试框架与运行流程

- **测试框架**：Vitest 4.x（已安装），测试文件位于 `scripts/test/tests/*.test.ts`，**串行执行**（`fileParallelism: false`），避免并发请求冲击学校服务器。
- **前置自动化**（vitest `globalSetup`）：① 执行 `init-db`（确保 Docker MariaDB 容器运行 + 数据库存在）→ ② 确保本地服务运行（未启动则自动 build + 启动）→ ③ 检查 `temp/auth-state.json` 登录态（缺失则提示先跑 `pnpm test:provision`）。
- **数据库结构补全**：由服务启动时的 `src/utils/migrate.ts` 自动完成（建表/补列/补查阅数据），测试脚本不再重复做这件事。
- **每个系统的测试流程**：`POST /<system>/login`（用已保存的 authToken，无需再次短信）→ `POST /<system>/check`（校验会话有效）→ 业务接口逐个测试。
- **登录态**：`temp/auth-state.json`（git 忽略），由 `pnpm test:provision` 交互式二次认证生成。
- **账号**：本科 `2025013495`（学号第 5 位 `0` → 本科），研究生 `2024102351`（第 5 位 `1` → 研究生）。研究生账号只测 `grad-system`，其余系统用本科账号。

---

## 三、业务逻辑推断与严格性总表（重点核对）

> 这些是代码里没有显式写明、我在测试中做的推断，请逐条确认。

### 3.0 严格性分级总表（每个被测端点）

| 端点                                        | 级别              | 规则                                                                                        | 推断依据                                           |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `/under-study/grade-list`                   | **S**             | **必须非空**，否则失败；非空则逐元素校验                                                    | 测试账号不可能一学期没课；成绩按学期可查（见 3.1） |
| `/under-study/grade-detail`                 | **S**             | 由 grade-list 第一条 gradeCode 驱动，必须成功且有数据                                       | 有成绩必有详情                                     |
| `/under-study/course-table`                 | **S**             | 课表必须有课程（table 非空且含课程）                                                        | 测试账号每学期都有课                               |
| `/under-study/info`                         | **S**             | 对象必须含全部预期键且 id/name 有值                                                         | 登录后必有个人信息                                 |
| `/under-study/special-exam`                 | **B**             | 可为空（可能无特殊考试）；非空逐元素校验                                                    | 补考/缓考不必然存在                                |
| `/under-study/course-commentary list`       | **C**             | 仅评教期有数据；空通过                                                                      | 评教按学期开放                                     |
| `/under-study/select/*`                     | **C**             | 仅选课期有 allowed；非选课期跳过 info/search/selected                                       | 选课按学期开放                                     |
| `/under-system/info`                        | **S**             | 对象必须含全部预期键                                                                        | 登录后必有学籍信息                                 |
| `/under-system/course-table`                | **S**             | 课表必须有课程                                                                              | 同新教务                                           |
| `/under-system/change-major-plan`           | **B**             | plans 可为空（可能暂无转专业计划）；非空逐元素校验                                          | 转专业计划按年发布                                 |
| `/under-system/exam-place`                  | **C**             | 仅考试周前有安排；空通过                                                                    | 考场安排按考试周期发布                             |
| `/under-system/student-archive`             | **S**             | get 必须返回完整档案 info                                                                   | 学籍档案已建立                                     |
| `/under-system/test-query`                  | **B**             | apply/result 可为空；非空逐元素校验                                                         | 四六级报名/成绩记录非必然存在                      |
| `/grad-system/info`                         | **S**             | 对象必须含全部预期键                                                                        | 研究生必有信息                                     |
| `/grad-system/information`                  | **S**             | 对象必须含全部预期键                                                                        | 同上                                               |
| `/my/info`                                  | **S**             | 对象必须含全部预期键                                                                        | 登录后必有                                         |
| `/my/identity`                              | **S**             | 必须返回合法 type（bks/yjs/lxs/jzg）                                                        | 身份必有                                           |
| `/my/email`                                 | stub              | 仅校验 JSON 信封不 500                                                                      | 占位 stub（已迁移至 OA）                           |
| `/oa/info`                                  | **S**             | 对象必须含全部预期键                                                                        | OA 账号必有信息                                    |
| `/who/info`                                 | **S**             | 对象必须含全部预期键，且 id 与请求一致                                                      | 学工信息必有                                       |
| `/auth-center/avatar`                       | **S**             | 必须返回 avatar 字符串                                                                      | 认证中心必有头像                                   |
| `/action/borrow-books`                      | **B**             | **唯一明确允许空**：没借书可能；非空逐元素校验 10 键                                        | 你明确指定                                         |
| `/action/card-balance`                      | **A**             | 必须为 number 且 **> 0**（划成 0 基本不可能）                                               | 你明确指定                                         |
| `/action/recent-email`                      | **A**             | unread 为 number；emails **应非空**（测试账号必有邮件），空时记警告不算失败；非空逐元素校验 | 长期活跃账号必有邮件（推断，可上调为 S）           |
| `/action/notice-list`                       | **S**             | **必须非空**（学校通知持续发布）；非空逐元素校验                                            | 推断                                               |
| `/action/notice-detail`                     | **S***            | 从 notice-list 取第一条 id/url；列表空则跳过                                                | 依赖列表                                           |
| `/action/email-page`                        | **S**             | 必须返回 URL 字符串                                                                         | 必有邮箱页面                                       |
| `/official/*-list`                          | **B**             | 官网内容一般非空但允许空；非空逐元素校验                                                    | 学校官网持续更新（推断）                           |
| `/official/*-detail`                        | **S***            | 从列表取 url；列表空则跳过                                                                  | 依赖列表                                           |
| `/library/people`                           | **A（时间感知）** | 白天(08:00-21:00) `benbu > 0`；夜间允许 0（仍须 number ≥ 0）                                | 你明确指定（8 点到晚 9 点应有读者）                |
| `/enroll/under-history-score`、`under-plan` | **B**             | info 为嵌套对象，非空校验                                                                   | 招生数据按年发布                                   |
| `/enroll/grad-plan`、`grad-recommend-plan`  | **B**             | 数组非空则逐元素校验；`Closed` 良性                                                         | 官网静态页 + 缓存兜底                              |
| `/weather`                                  | **S**             | 必须含 air/dayForecast 等顶层字段（无 success 包装）                                        | 天气数据必有                                       |
| `/health`                                   | **S**             | 必须含 status/timestamp/system/database/services/summary                                    | 必有                                               |
| `/auth/login`                               | **S**             | 用已保存 authToken，必须成功；`TooFrequent` 良性                                            | 登录态应有效                                       |
| `/auth/encrypt`                             | **S**             | 必须返回密文字符串                                                                          | 纯函数                                             |

### 3.1 学期与成绩可用性

| 学期      | 代码中的学期标识 | 成绩确定可查时间          | 当前(2026-08-05)是否可查 |
| --------- | ---------------- | ------------------------- | ------------------------ |
| 2025 秋季 | `2025-2026-1`    | 次年 2 月（2026-02 已过） | ✅ 可查                  |
| 2026 春季 | `2025-2026-2`    | 当年 8 月 1 日之后        | ✅ 可查（已过 8/1）      |

**测试策略（S 级）**：成绩查询主用 `2025-2026-2`；若为空，fallback `2025-2026-1`；**两个都为空 → 直接失败**（测试账号不可能没成绩）。非空则逐元素校验 14 个键。

### 3.2 教务系统课表年份限制（源码已确认）

| 系统                               | 限制                               | 源码位置                    |
| ---------------------------------- | ---------------------------------- | --------------------------- |
| 新教务 `under-study/course-table`  | `time` 年份 **< 2023 → Forbidden** | `handler.ts` 第 201 行      |
| 旧教务 `under-system/course-table` | `time` 年份 **≥ 2024 → Forbidden** | `course-table.ts` 第 214 行 |

**测试参数**：新教务用 `2025-2026-2`；旧教务用 `2023-2024-2`。课表 **S 级必须含课程**；返回 `Forbidden` 记良性（年份限制逻辑生效）。

### 3.3 时间感知断言（你指定的两个例子）

1. **图书馆人数**：当前时间在 `08:00–21:00` → 断言 `benbu > 0`（白天必有读者）；其他时段允许 0，但仍须为 number ≥ 0。净月校区同理。
2. **校园卡余额**：断言为 number 且 `> 0`（划成 0 基本不可能）。

### 3.4 选课可用性（C 级）

- `select/category` 仅选课期 `allowed` 有内容；非选课期 `allowed` 为空。
- 测试：`category` 必须 success 且 allowed/disallowed 均为数组；**allowed 为空 → 跳过** info/search/selected（记「非选课期」）；有元素 → 用 `allowed[0].link` 测试并严格校验。

### 3.5 评教可用性（C 级）

- `course-commentary list` 仅评教期有数据；空通过。list 非空时取第一条 `commentaryCode` 测 view。

### 3.6 依赖链规则（S* 级）

- `notice-detail` ← `notice-list` 第一条的 id/url；`grade-detail` ← `grade-list` 第一条 gradeCode；`official/*-detail` ← 列表第一条 url。**上游列表空 → 跳过下游**（避免无谓失败）。

### 3.7 招生通道推断

- 本科招生（`under-admission`）招生季外可能 `Closed`；`grad-plan`/`grad-recommend-plan` 走静态页 + 缓存，通常可用，允许 `Closed`。

---

## 四、逐端点测试细则（含预期键名）

### 4.1 公开端点（无需登录）

| 端点                          | 方法/参数                | 预期 `data` 结构                                                    | 数组元素键名                                                 | 良性失败     |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------ | ------------ |
| `/`                           | GET                      | HTML 字符串                                                         | —                                                            | —            |
| `/health`                     | GET                      | `{status, timestamp, system, database, services[], summary}`        | `services[]`: `{name, url, healthy}`                         | —            |
| `/library/people`             | GET                      | `{benbu, benbuMax, jingyue, jingyueMax}`（均为 number）             | —                                                            | —            |
| `/official/info-list`         | POST `{type:"news"}`     | `OfficialInfoItem[]` + `current/total`                              | `{title, time, pageView, description, url}`（`cover?` 可选） | —            |
| `/official/notice-list`       | POST                     | `OfficialNoticeInfoItem[]` + `current/total`                        | `{title, time, pageView, from, url}`                         | —            |
| `/official/academic-list`     | POST                     | `OfficialAcademicInfoItem[]` + `current/total`                      | `{subject, person, time, location, pageView, url}`           | —            |
| `/official/under-major-plan`  | POST                     | `{name, url}[]`                                                     | `{name, url}`                                                | —            |
| `/official/info-detail`       | POST `{url}`（从列表取） | `{title, time, pageView, content}`（`from?/author?/editor?` 可选）  | —                                                            | 列表空则跳过 |
| `/official/notice-detail`     | POST `{url}`             | `{title, time, pageView, content}`（`from?` 可选）                  | —                                                            | 列表空则跳过 |
| `/enroll/under-history-score` | POST `{type:"info"}`     | 嵌套对象 `Record<省, Record<年, Record<类型, string[]>>>`           | —                                                            | —            |
| `/enroll/under-plan`          | POST `{type:"info"}`     | 同上嵌套对象                                                        | —                                                            | —            |
| `/enroll/grad-plan`           | POST                     | `GradEnrollSchoolPlan[]`                                            | `{name, code, site, contact, phone, mail, majors[]}`         | `Closed`     |
| `/enroll/grad-recommend-plan` | POST                     | `GradRecommendSchoolPlan[]`                                         | `{name, code, site, contact, phone, mail, majors[]}`         | `Closed`     |
| `/weather`                    | GET                      | **无 `success` 包装**，直接 `WeatherData`：顶层含 `air, alarm, ...` | —                                                            | —            |
| `/test/post`                  | POST                     | `{success:true, ...}`                                               | —                                                            | —            |
| `/test/301` `/test/302`       | POST                     | 状态码 301/302                                                      | —                                                            | —            |
| `/auth/encrypt`               | POST `{password, salt}`  | `{success:true, data:string}`                                       | —                                                            | —            |

### 4.2 融合门户 `/action`（本科账号，登录+check 后）

| 端点                    | 参数                                    | 预期 `data` 结构                            | 数组元素键名                                                                                                  | 良性失败                 |
| ----------------------- | --------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `/action/borrow-books`  | —                                       | `BorrowBookData[]`                          | `{name, author, year, status, barcode, loanDate, dueDate, location, shelfNumber, renew}`（`renewTime?` 可选） | `Expired`/`Restricted`   |
| `/action/card-balance`  | —                                       | `number`                                    | —                                                                                                             | 同上                     |
| `/action/recent-email`  | —                                       | `{unread: number, emails[]}`                | `emails[]`: `{subject, receivedDate, name, email, mid, unread}`                                               | 同上                     |
| `/action/notice-list`   | `{type:"notice"}`                       | `NoticeInfo[]` + `current/total/size/count` | `{title, from, time}`（`id?/url?` 可选）                                                                      | 同上                     |
| `/action/notice-detail` | `{noticeID? 或 noticeUrl?}`（从列表取） | `{title, from, time, pageView, content[]}`  | —                                                                                                             | 列表空跳过；`MissingArg` |
| `/action/email-page`    | —                                       | `string`（URL）                             | —                                                                                                             | `Expired`/`Restricted`   |

### 4.3 本科教务（新）`/under-study`（本科账号）

| 端点                             | 参数                      | 预期结构                      | 数组元素键名                                                                                                                                                               | 良性失败              |
| -------------------------------- | ------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `/under-study/info`              | —                         | `UnderStudyInfo` 对象         | —（对象键：`id,name,idCard,org,orgId,major,majorId,inYear,grade,type,typeId,people,gender,genderId,birth,location`）                                                       | —                     |
| `/under-study/grade-list`        | `{time: "2025-2026-2"}`   | `UnderStudyGradeResult[]`     | `{time, cid, name, grade, gradeCode, gradeText, gradeType, courseType, shortCourseType, hours, point, mark, office, examType}`                                             | `Expired`             |
| `/under-study/grade-detail`      | `{gradeCode}`（从列表取） | `UnderScoreDetail[]`          | `{name, score, percent}`                                                                                                                                                   | 列表空跳过            |
| `/under-study/special-exam`      | —                         | `UnderSpecialExamResult[]`    | `{semester, time, name, grade, gradeCode}`                                                                                                                                 | `Expired`             |
| `/under-study/course-table`      | `{time: "2025-2026-2"}`   | `{table, startTime}`          | `table` 为三层嵌套数组，最内层元素 `{name, teachers[], time, weeks[], locations[], classIndex}`                                                                            | `Expired`/`Forbidden` |
| `/under-study/course-commentary` | `{type:"list", time}`     | `UnderCourseCommentaryItem[]` | `{term, endDate, name, courseCode, teacherName, teacherCode, teachingLinkName, commentaryCode}`                                                                            | `Expired`             |
| `/under-study/select/category`   | —                         | `{allowed[], disallowed[]}`   | `allowed[]`: `{name, link, term, canSelect, isPublic, stage, canRemove, startTime, endTime}`；`disallowed[]`: `{name, link, term, canSelect, description}`                 | `Expired`             |
| `/under-study/select/info`       | `{link}`（从 allowed 取） | `UnderSelectInfo` 对象        | 公共键：`term,name,canSelect,grades[],areas[],majors[],offices[],types[],categories[],currentArea,currentMajor,currentGrade`；允许时加 `canCancel,stage,startTime,endTime` | 非选课期跳过          |
| `/under-study/select/search`     | `{link}`                  | `UnderSelectCourseInfo[]`     | `{name, office, shortType, type, category, point, hours, id, code}`                                                                                                        | 同上                  |
| `/under-study/select/selected`   | `{link}`                  | `UnderSelectClassInfo[]`      | `{name, office, shortType, type, category, point, hours, id, code, teacher, place, time, capacity, current, classCode, classId}`（`className?/target?` 可选）              | 同上                  |

> ⚠️ `select/process`（选/退课）和 `course-commentary submit` 有副作用，**跳过不测**。

### 4.4 本科教务（旧）`/under-system`（本科账号）

| 端点                              | 参数                    | 预期结构                                                                                                     | 数组元素键名                                                                                                                                                      | 良性失败              |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `/under-system/info`              | —                       | ⚠️ 键是 **`info`**：`UnderStudentInfo`                                                                       | 对象键：`name,gender,idCard,politicalType,birth,people,id,grade,school,major,majorType,inDate,language,candidateId,candidateType,province,cultivateType,category` | —                     |
| `/under-system/course-table`      | `{time: "2023-2024-2"}` | `{table, startTime}`                                                                                         | 同新教务 course-table                                                                                                                                             | `Expired`/`Forbidden` |
| `/under-system/change-major-plan` | —                       | ⚠️ 无 `data`，键是 **`header` + `plans[]`**                                                                  | `plans[]`: `{school, major, subject, examType, time, location, plan, current, requirement, contact, phone}`                                                       | `Expired`             |
| `/under-system/exam-place`        | —                       | `{name, exams[]}[]`                                                                                          | 外层元素 `{name, exams[]}`；内层 `exams[]`: `{course, time, campus, building, classroom}`                                                                         | `Expired`             |
| `/under-system/student-archive`   | `{type:"get"}`          | ⚠️ 键是 **`info`**：`{archiveImage, examImage, basic[], study[], family[], canRegister, isRegistered, path}` | `basic[]`: `{text, value}`；`study[]`: `{startTime, endTime, school, title, witness, remark}`；`family[]`: `{name, relation, office, title, phone, remark}`       | `Expired`             |
| `/under-system/test-query`        | —                       | ⚠️ 无 `data`，键是 **`apply[]` + `result[]`**                                                                | `apply[]`: `{url, name, time, type}`；`result[]`: `{name, time, type, status}`                                                                                    | `Expired`             |

> ⚠️ `create-archive` 全部、`student-archive register` 有副作用（建立学籍），**跳过不测**。

### 4.5 研究生系统 `/grad-system`（研究生账号，无 /check 端点）

| 端点                       | 参数 | 预期结构                                                                                                                                                           | 良性失败    |
| -------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `/grad-system/info`        | —    | ⚠️ 键是 **`data`**：`GradStudentInfo`（键：`name,gender,genderId,idCard,politicalType,birth,people,id,grade,org,orgId,major,majorId,type,typeId,inYear,location`） | `Forbidden` |
| `/grad-system/information` | —    | ⚠️ 键是 **`info`**，字段集与 info 不同：`name,gender,idCard,politicalType,birth,people,id,grade,school,major,majorCode,type,category,inDate`                       | `Forbidden` |

### 4.6 服务大厅 `/my`（本科账号）

| 端点           | 预期结构                                                                                                                                                                                                                | 良性失败                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `/my/info`     | `data`：`MyInfo`（键：`id,name,idCard,org,orgId,major,majorId,inYear,grade,type,typeId,code,politicalStatus,people,peopleId,gender,genderId,birth,location`；实际可能多一个 `school` 键，只校验"包含"不校验"无多余键"） | —                                       |
| `/my/identity` | `data`：`{type: "bks"\|"yjs"\|"lxs"\|"jzg"}`                                                                                                                                                                            | —                                       |
| `/my/email`    | **stub**，只验证返回合法 JSON 信封（`success` 字段存在）不 500                                                                                                                                                          | 返回 `Unknown`（"已迁移至 OA"）视为正常 |

### 4.7 OA `/oa`（本科账号）

| 端点              | 预期结构                                                  | 备注 |
| ----------------- | --------------------------------------------------------- | ---- |
| `/oa/info`        | `data`：`{id, oaId, name, orgName, orgId}`（均为 string） | —    |
| `/oa/email-apply` | **跳过**（申请邮箱一次性）                                | —    |

### 4.8 学工 `/who`（本科账号，无 /check）

| 端点        | 参数         | 预期结构                                                                                                                                                        |
| ----------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/who/info` | `{id: 学号}` | `data`：`WhoInfoData`（键：`id,name,org,orgId,major,majorId,inYear,grade,type,typeId,idCard,people,gender,genderId,birth,location`），且 `data.id === 请求学号` |

### 4.9 认证中心 `/auth-center`（本科账号）

| 端点                  | 预期结构                   | 备注                                                                                             |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `/auth-center/avatar` | `data`：`{avatar: string}` | 已知 bug：无 cookie 时 handler 会挂起（缺 `res.json`），测试始终带登录 cookie，并设 20s 请求超时 |

### 4.10 统一认证 `/auth`

| 端点                          | 预期                                                              | 备注                                                           |
| ----------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `/auth/login`                 | `{success:true, cookies, location}`                               | 用已保存 authToken；`TooFrequent`（限流 3 次/分/学号）记为良性 |
| `/auth/encrypt`               | `{success:true, data:string}`                                     | 已在公开端点                                                   |
| `/auth/init`、`/auth/re-auth` | provision 阶段已覆盖，测试阶段**不再调用**（限流敏感 + 会发短信） | —                                                              |

---

## 五、跳过清单（不可/不宜自动化测试）

| 端点/操作                                     | 原因                                                 |
| --------------------------------------------- | ---------------------------------------------------- |
| `/auth/activate` 全部                         | 账户激活，一次性                                     |
| `/auth/reset-password`、`/auth/reset-captcha` | 密码重置，强副作用                                   |
| `/auth/init` POST、`/auth/re-auth`            | 登录主流程，provision 已覆盖；re-auth 会发真实短信   |
| `/oa/email-apply`                             | 申请邮箱，一次性                                     |
| `/under-system/create-archive` 全部           | 建立学籍，一次性                                     |
| `/under-system/student-archive` register      | 注册学籍，一次性                                     |
| `/under-study/select/process`                 | 选/退课，副作用                                      |
| `/under-study/course-commentary` submit       | 提交评教，副作用                                     |
| `/mp/*` 全部                                  | 依赖微信开放平台（code/openid/回调），普通账号无法测 |
| `/vpn/cas-login`                              | 真实 VPN 登录，增加学校侧负担                        |

---

## 六、已知注意事项（测试实现时处理）

1. **响应键不统一**：`under-system/info`、`grad-system/information`、`student-archive` 用 `info` 键；`change-major-plan` 用 `header`/`plans`；`test-query` 用 `apply`/`result`；`weather` 无 `success` 包装。
2. **限流**：`/auth/*` 每学号每分钟 3~5 次，测试阶段仅 provision 和一次 `/auth/login` 会触发，`TooFrequent` 记良性。
3. **数据时效性**：只校验结构（键名/类型），不校验具体数值。
4. **请求超时**：统一 20s；`auth-center/avatar` 等有已知挂起风险，靠超时兜底。
5. **登录态缺失**：`globalSetup` 直接报错并提示先运行 `pnpm test:provision`。

---

## 七、待你确认的问题

1. **严格性分级**（S/A/B/C）是否符合你的预期？尤其：
   - 成绩、课表、通知列表设为 **S 级必须非空**；
   - `recent-email.emails` 设为 **A 级（应非空，空时警告）**，可上调为 S；
   - 特殊考试、转专业计划、四六级记录、招生数据设为 **B 级可为空**；
   - 选课、评教、考场安排设为 **C 级时期依赖**。
2. **时间感知断言**：图书馆人数白天窗口用 `08:00–21:00` 是否准确？校园卡余额断言 `> 0` 是否可接受？
3. **成绩查询**：主查 `2025-2026-2`、空则 fallback `2025-2026-1`，**两者皆空才判失败**，是否接受？
4. `select/info` 在 `allowed` 为空时跳过整组选课测试，是否接受？
5. `my/info` 实际多返回一个 `school` 键，只查“必须包含”、不查“无多余键”，是否接受？
6. 各端点的“良性失败”白名单（`Expired`/`Restricted`/`Forbidden`/`Closed`/`MissingArg`）是否合理？

_确认后我将：① 精简 `scripts/init-db.ts`（去掉与 migrate 重复的建表逻辑）② 用 Vitest 重写全部测试并按本文档实现 S/A/B/C 严格校验与时间感知断言。_
