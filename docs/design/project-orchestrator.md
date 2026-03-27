# AI Development Harness 设计文档

> 从一句话意图到可交付产品的完整 AI 开发框架。

## 1. 问题定义

现有工具各覆盖一段链路，且存在重叠：

- **Superpowers**: session 级执行纪律（brainstorm → plan → TDD → review → finish）
- **OpenSpec**: 单次变更的规格设计（proposal → spec → design → tasks）

缺失的是完整的、项目级的编排能力。真实的需求链路：

```
"做一个多人射击游戏"
    ↓ 这一步两个工具都不管
拆成模块、排依赖、定优先级
    ↓ 这一步 OpenSpec 部分覆盖
单个 feature 的规格设计
    ↓ 这一步 Superpowers 覆盖
高质量实现
    ↓ 这一步两个工具都不管
产出回流、spec 更新、推进下一个
```

本 harness 覆盖完整链路。**替代 OpenSpec**（其规格管理和 archive 闭环被纳入），**包裹 Superpowers**（定制其入口和出口，使其成为 harness 的执行层）。

---

## 2. 核心原则

1. **地图，不是手册** — CLAUDE.md 是导航表，vision.md 不硬编码问题域，一切文档是轻量索引 + 渐进细化
2. **反馈回路驱动** — 不靠硬编码清单，靠 agent 自己生成→验证→发现缺口→追问的循环
3. **文件系统即状态** — 所有状态是 markdown 文件，git 友好，人可读可编辑
4. **渐进式细化** — 远期模块一句话，进入开发时才展开
5. **机械化强制** — golden principles 通过 hooks 执行，不靠 prompt 自觉
6. **项目类型无关** — 不绑定游戏/Web/CLI/嵌入式/ML，靠自适应对话和可插拔验证策略覆盖所有场景

---

## 3. 整体架构

```
┌─────────────────────────────────────────────────┐
│  项目编排层（本 harness）                         │
│                                                 │
│  Skills:                                        │
│    /project-init    初始化（greenfield/brownfield）│
│    /project-next    选取并准备下一个工作项         │
│    /project-status  全局进度与阻塞               │
│    /project-replan  动态调整路线图               │
│    /project-health  一致性与质量检查             │
│    /project-done    完成回流与推进               │
│                                                 │
│  Golden Principles（跨 skill 不变量）            │
│  Hooks（机械化强制）                             │
│  CLAUDE.md 体系（派生的导航文档）                 │
├─────────────────────────────────────────────────┤
│  执行层（定制 Superpowers）                      │
│                                                 │
│  入口：brainstorm 读 .current-work.md           │
│  过程：plan → 验证策略（非固定 TDD）→ review     │
│  出口：finish-branch 触发 /project-done 回流     │
│  门控：commit 检查任务完成度 + harness 不变量     │
├─────────────────────────────────────────────────┤
│  CLAUDE.md 体系                                 │
│                                                 │
│  根目录：导航表（~100行）指向 docs/project/       │
│  子目录：从 architecture + specs 派生的局部约定   │
│  保障：skill 刷新 → hook 门控 → health 兜底      │
└─────────────────────────────────────────────────┘
```

---

## 4. 工作项类型

不是所有工作都是"feature"。不同类型有不同生命周期：

| 类型 | 标记 | 生命周期 | 典型场景 |
|------|------|---------|---------|
| **feature** | `[feat]` | planned → in-progress → done | 新增角色控制器、实现支付 |
| **infra** | `[infra]` | planned → in-progress → done | CI/CD 搭建、部署配置、开发工具链 |
| **spike** | `[spike]` | planned → exploring → decision | 调研网络方案、评估框架选型 |
| **migration** | `[migration]` | audit → in-progress → verified → cutover → decommissioned | PHP→Go 迁移、数据库迁移 |
| **experiment** | `[experiment]` | hypothesis → implement → evaluate → decision | ML 模型调参、游戏手感调优 |
| **ops** | `[ops]` | recurring / triggered | 监控、数据管道维护、依赖更新 |

### 生命周期差异

**feature/infra**: 线性，brainstorm → plan → implement → verify → done。

**spike**: 目标是产出决策而非代码。结束时写入 `decisions/`，可能衍生出新的 feature/infra 工作项。

**migration**: 多阶段，每阶段有回滚方案。状态追踪比 feature 复杂——需要"旧系统中"、"迁移中"、"已迁移"、"已验证"、"已下线"。

**experiment**: 非线性。可能跑多轮，可能推翻假设重来。结束时产出决策，不一定产出保留的代码。

**ops**: 无"完成"状态。是持续的、周期性的活动。用 checklist 而非 checkbox 追踪。

### Roadmap 中的表示

```markdown
## M1: 核心引擎 [status: in-progress] [milestone: v0.1]

- [x] F1.1: 角色控制器 [feat, P0, deps: —]
- [ ] F1.2: 射击系统 [feat, P0, deps: F1.1]
- [ ] I1.1: headless 测试框架搭建 [infra, P0, deps: —]
- [decision: 用射线检测] S1.1: 射线检测 vs 物理子弹评估 [spike, deps: —]
- [ ] E1.1: 后坐力手感调优 [experiment, P1, deps: F1.2]
```

spike 完成后标记为 `[decision: 结论摘要]` 而非 `[x]`。
experiment 完成后标记为 `[result: 结论摘要]`。
ops 不出现在 roadmap 中，放在 `docs/project/ops/` 下单独管理。

---

## 5. 验证策略

TDD 不是万能的。每个工作项在 `.current-work.md` 中声明自己的验证方式：

| 策略 | 适用场景 | 验收形式 |
|------|---------|---------|
| **TDD** | 纯逻辑、库、后端服务、CLI | 测试全绿 |
| **integration-test** | API 集成、数据管道、数据库操作 | 对真实（或容器化）服务的集成测试通过 |
| **playtest** | 游戏手感、UX 流程、交互设计 | 人工体验确认 + 录屏/截图证据 |
| **experiment-eval** | ML 模型、A/B 测试、性能调优 | 指标达标（准确率、延迟、帧率） |
| **hardware-in-loop** | 嵌入式、IoT、传感器驱动 | 在目标硬件上运行并通过物理验证 |
| **visual-regression** | UI 组件、PDF 渲染、图表生成 | 截图对比无非预期差异 |
| **contract-test** | 微服务、API、brownfield 迁移 | 新实现满足旧系统的接口契约 |
| **manual-checklist** | 一次性配置、部署、研究型 spike | 人工确认清单全部完成 |

执行层（Superpowers）根据声明的验证策略调整其流程——不再强制 TDD，而是执行工作项指定的策略。

---

## 6. 文件结构

```
docs/project/
│
├── vision.md                          # 项目愿景与边界
├── roadmap.md                         # Module → 工作项索引（全局地图）
├── architecture.md                    # 系统架构（如项目需要）
├── quality.md                         # 质量评分与技术债追踪
│
├── specs/                             # 系统当前行为的规格（真相源）
│   ├── index.md
│   └── {domain}/{spec}.md
│
├── exec-plans/                        # 执行计划
│   ├── active/{module}.md
│   ├── completed/{module}.md
│   └── abandoned/{module}.md
│
├── decisions/                         # 关键决策记录
│   └── {date}-{topic}.md
│
├── assets/                            # 非代码产物追踪
│   ├── manifest.md                    # 资产总清单
│   └── {domain}/                      # 按领域组织的资产规格
│
├── ops/                               # 运维/持续性活动
│   └── {activity}.md
│
├── external-deps.md                   # 外部依赖追踪
│
├── .current-work.md                   # 当前工作项上下文（临时，执行层消费）
└── .system-map.md                     # brownfield 专用：已有系统的审计地图
```

### vision.md

项目的起点和边界。**内容不硬编码**——由 project-init 的生成-验证循环根据项目类型自适应产出。一个游戏项目会有视觉/音频方向、资产管线；一个 CLI 工具不会有这些。

### roadmap.md

全局地图。Module → 工作项（含类型标记）。格式见 §4。

### assets/manifest.md

非代码产物的追踪。每个 feature 可能关联需要的资产：

```markdown
# Asset Manifest

## 状态说明
- ○ 未生成
- ◐ placeholder
- ● final

## Combat 领域

| 资产 | 类型 | 关联工作项 | 状态 | 说明 |
|------|------|-----------|------|------|
| 枪口火焰 VFX | VFX | F1.2 | ◐ | GPU Particles 实现 |
| 射击音效 | SFX | F1.2 | ○ | "干脆、金属感" |
| AK-47 模型 | 3D Model | F1.3 | ○ | — |
```

### external-deps.md

外部系统依赖追踪（API 契约、硬件规格、第三方库版本约束、逆向工程目标的版本）：

```markdown
# External Dependencies

| 依赖 | 版本/契约 | 影响范围 | 最后验证 | 风险 |
|------|----------|---------|---------|------|
| Godot Engine | 4.3-stable | 全局 | 2026-03-26 | 大版本更新可能破坏 API |
| Steam SDK | v1.57 | M7 发布 | — | 未开始集成 |
```

### .system-map.md（brownfield 专用）

已有系统的审计地图。project-init 在 brownfield 模式下生成：

```markdown
# System Map: 现有 PHP 单体

## 模块清单
- user_auth — 用户认证，session-based，约 3000 行
- orders — 订单处理，耦合支付和库存，约 8000 行
- ...

## 数据库
- MySQL 5.7，47 张表，无外键约束
- 关键表：users, orders, products, payments

## API 契约
- REST，无文档，从路由文件推断
- 已知端点：GET /api/users, POST /api/orders, ...

## 当前部署
- 单机 LAMP，无 CI/CD，手动 FTP 部署

## 痛点
- orders 模块高耦合，改一处全局回归
- 无测试，全靠人工验证
```

---

## 7. Skill 定义

### 7.1 /project-init

**双模式**: greenfield（从零开始）或 brownfield（接手已有系统）。

**核心机制**: 生成-验证循环。

```
探索意图（对话）
    ↓
生成 vision.md 草稿
    ↓
用草稿尝试分解 Module/工作项
    ↓
分解遇到歧义 = 意图缺口 → 追问用户
    ↓
更新草稿 → 再分解
    ↓
分解成功无歧义 → 生成全部文件
```

**验收标准**: 一个全新的 agent 只读 vision.md 和 roadmap.md，能选取第一个工作项并开始执行，不会遇到无法决策的歧义。

**Greenfield 模式**:
1. 对话探索意图（不用固定清单，根据项目类型自适应）
2. 生成 vision.md → 验证 → 迭代
3. 分解出 roadmap.md（Module + 工作项，含类型标记）
4. 如有需要生成 architecture.md
5. 创建 specs/、exec-plans/、assets/ 等目录结构
6. 生成根目录 CLAUDE.md（导航表）

**Brownfield 模式**:
1. 审计已有系统：扫描代码结构、数据库、API、测试覆盖、部署方式
2. 生成 .system-map.md
3. 与用户对话：理解改造目标、约束、风险
4. 生成 vision.md（目标状态）+ roadmap.md（改造路径）
5. roadmap 中的工作项多为 migration 和 infra 类型
6. 生成 external-deps.md（已有系统作为外部依赖）
7. 生成 CLAUDE.md

### 7.2 /project-next

选取下一个可执行的工作项，准备上下文交给执行层。

1. 读取 roadmap.md，找出所有依赖已满足的未完成工作项
2. 按优先级排序，推荐 top 1-3
3. 用户确认
4. 如该 Module 无 active exec-plan → 生成
5. 生成 `.current-work.md`：

```markdown
# Current Work: F1.2 射击系统

## Type: feature
## Verification: TDD

## Description
射线检测射击，支持全自动/半自动/单发，含后坐力模型。

## Acceptance Criteria
- 射击产生射线，命中返回 hit 信息
- 后坐力使准星上移，连射时散布增大
- 三种射击模式可切换

## Related Specs
- [角色控制器](specs/core-engine/character-controller.md)

## Architecture Constraints
- Combat 领域，依赖 Core Engine
- 输出 Signal：weapon_fired, hit_registered

## Asset Manifest
| 资产 | 状态 | 说明 |
|------|------|------|
| 枪口火焰 VFX | 需 placeholder | GPU Particles |
| 射击音效 | 需 placeholder | "干脆、金属感" |

## Execution Plan
[M1-core-engine](exec-plans/active/M1-core-engine.md)
```

注意：对于不同工作项类型，`.current-work.md` 的结构会自适应：
- **spike**: 包含"要回答的问题"和"决策标准"，不含验收标准
- **experiment**: 包含"假设"和"评估指标"
- **migration**: 包含"当前行为"、"目标行为"、"回滚方案"

### 7.3 /project-status

全局进度展示。

1. 读取 roadmap.md → 统计各 Module 和 Milestone 完成度
2. 按工作项类型分别汇总（feature 进度、spike 待决策、experiment 进行中、ops 健康度）
3. 读取 exec-plans/active/ → 当前工作
4. 读取 assets/manifest.md → 资产完成度
5. 识别阻塞链
6. 读取 external-deps.md → 是否有外部依赖风险

### 7.4 /project-replan

动态调整路线图。支持的操作：

- 增删改工作项（任意类型）
- 增删改 Module
- 调整优先级、依赖、milestone 归属
- 拆分/合并工作项
- 类型转换（spike 产出决策后衍生 feature）
- 记录决策
- 切换项目模态（见 §8）

影响分析 → 用户确认 → 更新文件 → 检查 CLAUDE.md 是否需要刷新。

### 7.5 /project-health

一致性与质量检查。

| 检查项 | 说明 |
|--------|------|
| Spec 覆盖率 | 已完成的 feature 是否都有 spec？|
| Roadmap 一致性 | exec-plan 状态与 roadmap 标记是否一致？|
| 架构漂移 | 代码结构与 architecture.md 是否匹配？|
| CLAUDE.md 新鲜度 | 派生内容与真相源是否一致？|
| 资产完成度 | manifest 中的 placeholder 比例？|
| 外部依赖风险 | 依赖版本是否有更新？契约是否变化？|
| 技术债 | TODO/FIXME/HACK 扫描 |
| 依赖完整性 | 循环依赖？孤立工作项？|

输出更新 quality.md。

### 7.6 /project-done

完成回流。根据工作项类型有不同行为：

**feature/infra 完成**:
1. roadmap 标记 `[x]`
2. 更新 exec-plan
3. 生成/更新 specs/
4. 更新 assets/manifest.md（如有资产状态变化）
5. 刷新受影响的 CLAUDE.md
6. 检查 Module/Milestone 完成度
7. 推荐下一个工作项

**spike 完成**:
1. roadmap 标记 `[decision: 结论]`
2. 写入 decisions/
3. 如衍生新工作项 → 添加到 roadmap

**experiment 完成**:
1. roadmap 标记 `[result: 结论]`
2. 记录实验数据和结论到 exec-plan
3. 如结论导致设计变更 → 触发 /project-replan

**migration 阶段推进**:
1. 更新迁移状态（audit → in-progress → verified → cutover → decommissioned）
2. 每阶段验证回滚方案
3. cutover 阶段需要人工确认

---

## 8. 项目模态

项目不同阶段，工作模式不同：

### 构建模态（默认）

feature → done → next 的线性推进。roadmap 驱动。这是项目大部分生命周期的模式。

### 运维模态

项目成熟后，主要工作是：
- 响应 issue：issue → 分诊 → 修复 → 验证
- 定期维护：依赖更新、安全补丁、性能优化
- 监控驱动：告警 → 诊断 → 修复

`/project-replan` 可以切换模态。切换后：
- `/project-next` 的工作项来源从 roadmap 切换到 issue queue
- `/project-status` 展示运维指标而非 feature 进度
- `docs/project/ops/` 成为主要工作目录

### 混合模态

现实中常常两者并存——一边开发新 feature，一边维护已有功能。roadmap 中可以同时有 feature 和 ops 工作项。

---

## 9. 执行层：Fork Superpowers

**策略：Fork 源码直接改造，不做项目级覆盖。**

原因：
- `using-superpowers` 元技能用命名空间引用 skill（`superpowers-extended-cc:brainstorming`），覆盖拦截不了
- 两层 hook 执行顺序不可控
- 一个仓库、一套 skill、没有歧义

Fork 后重命名为本 harness 的名字，Superpowers 的执行纪律成为 harness 的内置层。

### 9.1 仓库结构（Fork 后）

```
harness/
├── .claude-plugin/plugin.json        # 重命名，更新元数据
├── hooks/
│   ├── hooks.json                    # 扩展 SessionStart 和 PreToolUse
│   ├── session-start                 # 改造：注入 harness 上下文
│   ├── pre-commit-check-tasks        # 改造：追加 harness 不变量检查
│   └── run-hook.cmd
├── skills/
│   ├── using-harness/SKILL.md        # 改造自 using-superpowers，更新引用
│   │
│   ├── # === 项目编排层（新增）===
│   ├── project-init/SKILL.md
│   ├── project-next/SKILL.md
│   ├── project-status/SKILL.md
│   ├── project-replan/SKILL.md
│   ├── project-health/SKILL.md
│   ├── project-done/SKILL.md
│   │
│   ├── # === 执行层（改造自 Superpowers）===
│   ├── brainstorming/SKILL.md        # 改造
│   ├── writing-plans/SKILL.md        # 改造
│   ├── executing-plans/SKILL.md      # 改造
│   ├── test-driven-development/SKILL.md  # 改造为 verification skill
│   ├── finishing-a-development-branch/SKILL.md  # 改造
│   ├── verification-before-completion/SKILL.md  # 保留
│   ├── requesting-code-review/SKILL.md  # 保留
│   ├── receiving-code-review/SKILL.md   # 保留
│   ├── using-git-worktrees/SKILL.md     # 保留
│   ├── dispatching-parallel-agents/SKILL.md  # 保留
│   ├── subagent-driven-development/SKILL.md  # 改造
│   ├── systematic-debugging/SKILL.md    # 保留
│   ├── writing-skills/SKILL.md          # 保留
│   │
│   ├── # === 共享约定 ===
│   └── shared/
│       ├── task-format-reference.md     # 保留（来自 Superpowers）
│       ├── claude-md-convention.md      # 新增
│       ├── work-item-types.md           # 新增
│       ├── verification-strategies.md   # 新增
│       ├── golden-principles.md         # 新增
│       └── file-structure.md            # 新增
├── agents/
│   └── code-reviewer.md                # 保留
├── commands/
│   ├── brainstorm.md                   # 保留
│   ├── write-plan.md                   # 保留
│   └── execute-plan.md                 # 保留
└── docs/project/                       # harness 文件结构模板
```

### 9.2 各 Skill 具体改造

#### using-harness（原 using-superpowers）

改动：
- 重命名所有 `superpowers-extended-cc:` 引用为新命名空间
- 在 skill 优先级流程图中加入项目编排层：收到用户消息 → 先检查是否有 `/project-*` 适用 → 再检查执行层 skill
- 指令优先级链更新：用户指令 > harness skill > 默认系统提示

保留：
- "1% 可能就必须调用 skill" 的强制纪律
- Red Flags 表
- 刚性/柔性 skill 区分

#### brainstorming

改动：
- **Checklist 第 0 步（新增）**：检查 `docs/project/.current-work.md` 是否存在
  - 存在 → 读取，将其中的描述、验收标准、相关 spec、架构约束作为 brainstorm 的起点。跳过"从零探索意图"阶段，直接进入"基于已有上下文的方案探索"
  - 不存在 → 走原有流程（从零开始）
- **设计文档保存路径**：从 `docs/superpowers/specs/` 改为 `docs/project/exec-plans/active/` 下对应模块的子目录，或按 `.current-work.md` 中指定的 exec-plan 路径
- **Scope 检查增强**：如果 `.current-work.md` 存在，brainstorm 范围受其约束——不要发散到工作项边界之外

保留：
- 一次一个问题的对话节奏
- 提出 2-3 方案的探索模式
- Visual Companion
- Spec self-review
- 设计文档 → writing-plans 的衔接

#### writing-plans

改动：
- **计划保存路径**：从 `docs/superpowers/plans/` 改为 `docs/project/exec-plans/active/{module}/` 下
- **.tasks.json 路径**：随计划文件
- **验证策略感知**：读取 `.current-work.md` 的 Verification 字段，在计划中使用声明的验证策略而非强制 TDD
  - TDD → 每个 task 的步骤包含红-绿-重构周期
  - playtest → 每个 task 的步骤包含实现 + playtest 清单
  - contract-test → 每个 task 先写契约测试再实现
  - experiment-eval → 每个 task 包含假设、实现、评估指标
  - 其他 → 按策略调整步骤结构

保留：
- Task 结构（Goal、Files、Acceptance Criteria、Verify、Steps）
- 无占位符原则
- Self-review
- Native Task 集成
- 执行方式选择（subagent / parallel session）

#### test-driven-development → verification

改动：
- **重命名**为 `verification`（或保留原名但扩展行为）
- **策略分发**：根据当前工作项的 Verification 字段选择策略
  - 如果是 TDD → 执行原有完整 TDD 流程（Iron Law、Red-Green-Refactor、所有纪律不变）
  - 如果是其他策略 → 执行对应流程（见 §5 验证策略表）
- **默认行为**：如果没有 `.current-work.md` 或未声明 Verification，默认 TDD（向后兼容）

保留（当策略为 TDD 时）：
- 全部 TDD 纪律，一字不改
- Iron Law、Red Flags、Common Rationalizations
- Verification Checklist

#### executing-plans

改动：
- **Step 0 路径变更**：从 `docs/superpowers/plans/` 改为 `docs/project/exec-plans/active/`
- **Worktree 检查**：保留
- **验证策略感知**：执行 task 中的验证步骤时，根据 task 声明的策略执行（不一定是跑测试，可能是 playtest checklist 或手动验证）

保留：
- Task 恢复机制（.tasks.json 双向同步）
- 执行顺序（按依赖解锁）
- 阻塞时停下来问

#### finishing-a-development-branch

改动：
- **Step 6（新增）：Harness 回流**：在原有 4 个选项执行完后
  1. 读取 `docs/project/.current-work.md` 确定完成的工作项
  2. 更新 `roadmap.md`（标记完成）
  3. 更新 exec-plan（标记 feature 状态）
  4. 生成/更新 `specs/` 下对应规格文件
  5. 刷新受影响的 CLAUDE.md
  6. 清理 `.current-work.md`
  7. 检查 Module/Milestone 完成度
  8. 推荐下一个工作项
  - （等效于自动执行 `/project-done` 的核心逻辑）
- **如果 `.current-work.md` 不存在**：跳过回流步骤，行为与原版一致（向后兼容）

保留：
- 4 个选项（merge/PR/keep/discard）
- 测试验证前置
- Worktree 清理
- 确认危险操作

#### subagent-driven-development

改动：
- **Implementer prompt 注入**：将 `.current-work.md` 中的架构约束和相关 spec 传递给 implementer subagent
- **Review prompt 扩展**：reviewer 检查实现是否符合架构约束

保留：
- Subagent dispatch 机制
- Review 循环
- Task 状态管理

### 9.3 Hooks 改造

#### session-start

改动：
- 读取并注入 `using-harness` 而非 `using-superpowers`
- 追加：如果 `docs/project/.current-work.md` 存在，注入其内容
- 追加：如果 `docs/project/architecture.md` 存在，注入其摘要（前 50 行或 ## 章节标题列表）
- 追加：如果 `docs/project/roadmap.md` 存在，注入当前 milestone 进度摘要

#### pre-commit-check-tasks

改动：
- 保留原有任务完成度检查
- 追加检查：
  - 如果 `docs/project/roadmap.md` 存在，检查已标记完成的 feature 是否有对应 `specs/` 文件
  - 如果 `docs/project/architecture.md` 存在，检查 CLAUDE.md 根目录导航表是否与 `docs/project/` 实际结构一致
- 任何检查失败 → 输出警告但不阻塞 commit（不变量违反是警告，不是硬门控，避免过度阻塞开发流程）
- 任务未完成 → 仍然阻塞 commit（保留原有行为）

### 9.4 向后兼容

所有改造遵守一个原则：**如果 `docs/project/` 不存在，行为与原版 Superpowers 完全一致。**

这意味着：
- 不使用 harness 项目编排层的用户，装了这个 fork 后体验不变
- 只有当 `/project-init` 创建了 `docs/project/` 后，harness 的增强行为才激活
- 渐进式采纳——用户可以先只用执行层，需要时再启用编排层

---

## 10. CLAUDE.md 体系

### 根目录 CLAUDE.md

纯导航表，~100 行。指向 docs/project/ 下的实际文件。`/project-init` 生成，后续几乎不用改（因为只是指针）。

### 子目录 CLAUDE.md

从 architecture.md + specs/ 派生的局部约定。内容由真相源决定，不手写。

- **创建时机**: /project-next 为某领域创建目录时
- **更新时机**: /project-done 完成该领域的工作项后
- **验证时机**: hook（commit 前）+ /project-health（定期）

### 三层保障

1. **Skill 内主动刷新** — 每个 skill 修改 architecture/specs 后检查并更新受影响的 CLAUDE.md
2. **Hook 门控** — PreToolUse hook 在 git commit 时验证一致性
3. **Health 兜底** — /project-health 全面扫描偏离

这是 golden principle，不是单个 skill 的逻辑。所有 skill 共享这个约定。

---

## 11. Golden Principles

跨 skill 的不变量，通过 hooks 和 /project-health 机械化强制：

| Principle | 含义 | 强制方式 |
|-----------|------|---------|
| **CLAUDE.md 是派生产物** | 内容从 architecture + specs 推导，不手写 | hook + health |
| **Spec 覆盖率** | 已完成的 feature 必须有对应 spec | hook + health |
| **Roadmap 一致性** | exec-plan 状态必须与 roadmap 标记一致 | skill 内 + health |
| **架构边界** | 代码结构必须符合 architecture.md 的领域划分 | hook + health |
| **决策有记录** | 重要的技术决策必须写入 decisions/ 或 exec-plan | skill 内引导 |
| **资产可追踪** | 非代码产物在 manifest 中有记录和状态 | skill 内 + health |

---

## 12. Brownfield 支持

`/project-init` 的 brownfield 模式：

```
"我们有一个 10 年的 PHP 单体，要渐进迁移到 Go 微服务"
    ↓
审计已有系统 → 生成 .system-map.md
    ↓
理解改造目标 → 生成 vision.md（目标状态，非现状）
    ↓
规划迁移路径 → roadmap 以 migration 类型工作项为主
    ↓
识别外部依赖 → external-deps.md
    ↓
每个迁移步骤有回滚方案
```

关键差异：
- vision.md 描述的是"要变成什么"，不是"要做什么"
- roadmap 中的工作项大多是 migration 和 infra 类型
- .system-map.md 是 brownfield 的额外产物，记录已有系统的审计结果
- 验证策略以 contract-test 为主（新实现必须满足旧系统的接口契约）
- 每个迁移工作项必须有回滚方案

---

## 13. 渐进式细化策略

| 阶段 | vision.md | roadmap.md | architecture.md | specs/ | exec-plans/ | CLAUDE.md |
|------|-----------|------------|-----------------|--------|-------------|-----------|
| init | 完整 | Module 有描述，工作项只有标题 | 骨架 | 空 | 空 | 根目录导航表 |
| 开始 M1 | 不变 | M1 工作项补充细节 | 补充 M1 约定 | 空 | active/M1.md | + M1 子目录 |
| M1 完成 | 不变 | M1 全部完成 | 不变 | M1 spec 生成 | M1→completed | 刷新 M1 子目录 |
| 进入运维 | 可能更新边界 | 新增 ops 工作项 | 不变 | 持续更新 | — | 不变 |

---

## 14. 共享约定（shared/）

所有 skill 引用的共享文件：

```
.claude/skills/shared/
├── claude-md-convention.md     # CLAUDE.md 派生规则
├── work-item-types.md          # 工作项类型定义与生命周期
├── verification-strategies.md  # 验证策略清单
├── golden-principles.md        # 不变量清单与强制方式
└── file-structure.md           # docs/project/ 文件结构约定
```

每个 skill 的 SKILL.md 不重复这些内容，只写一行引用：

```
完成后，按 shared/golden-principles.md 检查并执行所有受影响的不变量。
```

---

## 15. 不做的事情

- **不做 CI/CD** — 不生成 CI 配置，不管自动化部署（但 infra 工作项可以追踪这些的搭建）
- **不做跨仓库管理** — 一个项目一个 roadmap
- **不做需求管理系统** — 不是 Jira 替代品，是 agent 的导航地图
- **不做资产生成** — 追踪资产状态，不负责生成（AI 资产管线是外部工具的事）
- **不做运行时** — 不是 IDE 插件、不是 CI runner，只是一套 skill + hooks + 文件约定
