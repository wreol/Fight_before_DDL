# SPEC.md — 大学地牢 (College Dungeon)

> 一个用 Roguelike 皮包裹的大学生存模拟器。玩家在随机生成的大学学期中探索、战斗、成长，从大一新生一路打到大四毕业。
>
> **Spec-Driven, Subagent-Built, Human-Owned.**

---

## 1. 问题陈述

### 1.1 要解决的问题

每个大学生都经历过早八、体测、小组作业、期末周——这些真实存在的"伤害源"。但没有一个游戏把它们做成可玩的体验。"大学地牢" 用回合制 Roguelike 的形式解构大学生活：每一次移动都是一次选择，每一场战斗都是一次渡劫，每一次死亡后玩家都会想"再开一把"——因为每次的大学生涯都不一样。

### 1.2 目标用户

- **核心用户**：在校大学生（本科/研究生），对游戏有轻度到中度兴趣
- **次要用户**：刚毕业的年轻人，愿意为"回忆大学生活"买单
- **用户特征**：碎片时间玩游戏（课间/午休），偏好有策略深度但操作简单的游戏

### 1.3 为什么值得做

- **反差幽默**：暗黑哥特式 UI × 奶茶/早八/挂科等日常琐事 → 每一帧都自带荒诞笑点。画面越严肃，道具越好笑——这正是《以撒的结合》级别的邪典传播基因
- **共鸣驱动**：每个大学生都经历过这些场景——天然的情感连接
- **社交传播**：每日种子排行榜 + 死亡分享卡片 → 校园群/朋友圈的天然分发。"我被早八连击破防了"比"HP归零"值得截图 100 倍
- **技术完整**：前后端分离 + 数据库 + 容器化 → 课程评分维度全面

---

## 2. 用户故事

遵循 INVEST 原则（Independent, Negotiable, Valuable, Estimable, Small, Testable）。

| # | 用户故事 | 验收简述 |
|---|---------|---------|
| US1 | 作为一个玩家，我想点击"开始游戏"就能进入一个随机生成的地牢，立即开始冒险 | 地图出现在 Canvas 上，< 1s |
| US2 | 作为一个玩家，我想用方向键移动角色，碰到敌人自动近战攻击，移动一步敌人也移动一步 | 回合制移动/战斗正常 |
| US3 | 作为一个玩家，我想探索房间和走廊，找到通往下一层的楼梯，体验逐渐增加的难度 | 5+ 房间，楼梯下降，新层生成 |
| US4 | 作为一个玩家，击败精英敌人后我想从 3 个随机增幅中选 1 个，让角色在本次 Run 中变强 | 弹窗 3 选 1，效果立即生效 |
| US5 | 作为一个玩家，我想捡起武器、护甲和药水，自动装备武器护甲，手动使用药水 | 拾取/装备/使用正确 |
| US6 | 作为一个玩家，当精力值降到 0 时角色永久死亡，查看 Run 统计并开始新一局 | 死亡画面正常，可重开 |
| US7 | 作为一个玩家，我想每天挑战和全球玩家相同的随机种子，看看我的排名 | 同种子的地图一致，排行榜可见 |
| US8 | 作为一个玩家，死亡后我想生成一张可分享的卡片，分享给朋友 | 生成唯一链接，显示 Run 摘要 |
| US9 | 作为一个玩家，我想关闭浏览器后回来继续未完成的 Run | 自动存档/读档正常 |
| US10 | 作为一个玩家，我想用死亡获得的灵魂点数解锁新的起始装备或能力 | 灵魂商店可解锁，下 Run 可用 |

---

## 3. 功能规约

### 3.1 地图生成模块 (MapGen)

| 项 | 描述 |
|----|------|
| **输入** | 随机种子 (string)，当前层数 (int) |
| **算法** | BSP 树分割 → 房间放置 → 走廊连接（最近邻） → 楼梯放置在最远离玩家的房间 |
| **产出** | `Tile[][]` 二维数组，每格为 WALL / FLOOR / STAIRS_DOWN / DOOR |
| **边界条件** | 最小房间数 ≥ 5，最大 ≤ 12；房间最小尺寸 4×4；走廊宽度 1-2 格 |
| **层数递进** | 每下降一层，房间数 +1，敌人数量 +2，敌人属性 ×1.15 |
| **错误处理** | 种子为空时用 `Date.now()` 生成；生成失败时重试最多 3 次，均失败则用预设固定地图兜底 |

### 3.2 游戏引擎模块 (Engine)

| 项 | 描述 |
|----|------|
| **回合管理** | 玩家行动（移动/使用物品/等待） → 处理战斗 → 所有敌人依次行动 → 回合结束 |
| **移动** | 方向键 → 检查目标格是否可行走（非墙、非敌人） → 移动或攻击 |
| **战斗** | 伤害 = max(1, attacker.atk - defender.def)；暴击：10% 概率 ×1.5；玩家先手 |
| **FOV 视野** | 圆形视野半径 7 格，未探索区域黑色，已探索但不在视野内的区域灰色 |
| **状态效果** | 支持回合制 buff/debuff（如减速、中毒），每回合 tick |
| **边界条件** | 地图边缘不可走出；敌人不会互相重叠；最后一层有 Boss |
| **错误处理** | 非法移动（墙/边界）→ 消耗回合但不移动，日志提示 |

### 3.3 实体系统 (Entities)

**玩家属性：**

| 属性 | 初始值 | 说明 |
|------|--------|------|
| HP / MaxHP | 100 | 精力值 |
| Attack | 10 | 基础攻击力 |
| Defense | 2 | 减伤 |
| Level | 1 | 大一→大四 (1-4) |
| XP / XPToNext | 0 / 50 | 经验值 |

**敌人表：**

| ID | 名称 | 类型 | HP | ATK | DEF | XP | 特殊 |
|----|------|------|----|-----|-----|----|------|
| e_morning_class | 早八点名 | normal | 25 | 10 | 1 | 15 | 30% 概率连击（再攻击一次） |
| e_canteen | 食堂饭菜 | normal | 20 | 5 | 0 | 10 | 命中后玩家移速减半 5 回合 |
| e_phys_test | 体测 1000m | normal | 30 | 14 | 3 | 20 | 玩家闪避率降为 0 持续 3 回合 |
| e_slacker | 划水队友 | elite | 40 | 6 | 2 | 35 | 每回合对玩家造成 4 点 DOT 直到战斗结束 |
| e_midterm | 期中考试 | elite | 50 | 18 | 5 | 50 | 无特殊 |
| e_final_week | 期末周 | boss | 80 | 25 | 8 | 100 | 多段攻击：连续攻击 2-4 次 |

**物品表：**

| ID | 名称 | 类型 | 效果 |
|----|------|------|------|
| i_coffee | 咖啡续命 | potion | 恢复 30 HP |
| i_milk_tea | 奶茶 | potion | 恢复 15 HP，+2 攻击持续 10 回合 |
| i_headphones | 降噪耳机 | weapon | +5 攻击 |
| i_notes | 学霸笔记 | weapon | +8 攻击 |
| i_thick_face | 厚脸皮 | armor | +3 防御 |
| i_makeup_exam | 补考机会 | armor | +5 防御 |
| i_dorm_delivery | 室友带饭 | potion | 恢复全部 HP |

### 3.4 增幅系统 (Augments)

| 项 | 描述 |
|----|------|
| **触发条件** | 击杀精英敌人或 Boss |
| **选择方式** | 弹出 3 个随机增幅，玩家选 1 个。精英给 common/rare，Boss 给 rare/legendary |
| **品质概率** | 精英：common 60%, rare 35%, legendary 5%；Boss：rare 60%, legendary 40% |
| **生效方式** | 选择后立即生效，本 Run 内永久有效，死亡即失去 |
| **堆叠** | 同类增幅可叠加（标记 `stackable: true`） |

**增幅池：**

| ID | 名称 | 效果 | 品质 | 可堆叠 |
|----|------|------|------|--------|
| a_early_sleep | 早睡早起 | +8 MaxHP | common | ✓ |
| a_notes_boost | 学霸笔记 | +3 攻击 | common | ✓ |
| a_thick_face | 厚脸皮+ | +2 防御 | common | ✓ |
| a_dorm_god | 室友带饭 | 击杀回复 4 HP | rare | ✗ |
| a_leave_slip | 请假条 | 15% 概率闪避攻击 | rare | ✗ |
| a_teacher_save | 老师捞人 | 致命伤害留 1 HP（一次性） | rare | ✗ |
| a_credit_transfer | 学分转换 | +20% XP 获取 | rare | ✗ |
| a_library_power | 图书馆之力 | 每 15 步 +3 HP | legendary | ✗ |
| a_full_scholarship | 满绩传说 | +5 所有属性 | legendary | ✗ |

### 3.5 存档系统 (Save)

| 项 | 描述 |
|----|------|
| **存储位置** | localStorage |
| **自动存档时机** | 每层开始时；玩家行动后（debounce 2s）；浏览器关闭/隐藏时 |
| **存档范围** | 当前 Run 状态（地图/实体/背包/增幅/种子） + 设置 + 灵魂点数/解锁记录 |
| **兼容性** | 存档版本号，读档时检查版本，不兼容时提示清除 |
| **读档** | 启动时检测存档，有则提示"继续上次冒险？"，选否则开始新游戏 |

### 3.6 UI 层 (UI)

**总体视觉方向：暗黑哥特 × 大学生存。** 画面越严肃，道具越好笑——暗黑地牢般的 UI 面板里写着"奶茶续命 +30"，每一帧都自带反差幽默。

| 组件 | 描述 |
|------|------|
| **Canvas 地图** | 暗底亮字 tile 渲染：未探索区纯黑 `#0a0a0f`，墙 `#1a1a2e` 用深蓝灰线框，地板 `#16213e` 带微弱网格线（像笔记本格线），玩家 `@` 青色高亮（`#00d4ff`），敌人用暗红/暗橙缩写标签，物品 `$` 金色闪烁，楼梯 `▼` 亮白色脉冲，FOV 已探索但不可见区覆盖半透明深灰纱 |
| **状态栏** | 顶栏暗色半透明 `rgba(10,10,15,0.9)`，左侧 HP 精力条（粗圆角，绿→黄→红渐变），中间等级徽章（大一→大四，铜→银→金→钻色变化），右侧层数/攻防数值（等宽字体 `JetBrains Mono`） |
| **背包面板** | 侧栏滑出，8 格暗底卡片 `#1e1f22`，武器槽金边，护甲槽银边，药水可点击使用（悬停发光 `box-shadow: 0 0 8px #5865f2`），空槽显示虚线边框 |
| **增幅弹窗** | 居中模态，标题"选择你的觉醒"用 `Feather Bold` 白色大字 + 下划线装饰；3 张暗底卡片按品质分框色：common 灰边、rare 蓝紫边（Discord Blurple `#5865f2`）、legendary 金边 + 微弱发光动画；悬停卡片微微放大 + 边框更亮；点击确认后卡片消失 + 属性更新动画 |
| **消息日志** | 底部滚动区域，暗色半透明底 `rgba(0,0,0,0.7)`，战斗消息用亮白 + 伤害数字红色，拾取消息金色，系统消息灰色；自动滚动到最新 |
| **死亡画面** | 全屏暗红渐变遮罩 `#1a0000 → #0a0a0f`，中央大标题"你破防了"/"已老实求放过"，Run 统计卡片（层数/击杀/GPA/死因/时长），三个暗底按钮：「分享卡片」「再来一局」「返回首页」。按钮悬停发光 |
| **主菜单** | 全屏暗色背景 + 顶部大标题"大学地牢"（`Feather Bold 56px` 白色 + 红色描边），右侧吉祥物区域（一个像素风的大学生角色），菜单项为大号暗底按钮垂直排列 |
| **排行榜** | 暗底表格 `#1e1f22`，表头白色大写，行交替 `#1e1f22` / `#26282d`，当前玩家行 Blurple 高亮背景，排名数字用 Discord 状态色（#1 金色、#2 银色、#3 铜色） |
| **灵魂商店** | 暗底卡片网格 3 列，每张卡片显示解锁项图标 + 名称 + 价格（灵魂点数），已解锁绿色 `#23a55a` 勾标记，可购买普通卡片，灵魂不足灰色禁用 + 锁图标 |

---

## 4. 非功能性需求

| 维度 | 要求 |
|------|------|
| **性能** | 地图生成 < 500ms；Canvas 稳定 60fps；首屏加载 < 2s（Lighthouse 90+） |
| **安全性** | 排行榜提交验证种子日期真实性；防重复提交；输入 sanitization |
| **可用性** | 方向键即玩，无需教程；30 秒内新玩家可理解基本操作 |
| **兼容性** | Chrome / Edge / Firefox 最新版正常运行 |
| **可观测性** | 后端结构化日志；关键操作 log（地图生成、战斗结果、存档） |
| **可维护性** | TypeScript strict 模式；ESLint + Prettier；模块接口清晰 |

---

## 5. 视觉设计规范

> **设计核心理念：暗黑哥特 × 大学生存 = 反差幽默。** 画面的严肃性越极致，内容的日常性越好笑。本节定义两个视觉域的设计 tokens —— UI 面板域（Discord 设计系统）和 Canvas 游戏域（自定义暗色终端美学）。

### 5.1 Open Design 设计系统选型

**选型：Discord（暗色主题）**

| 项 | 选择 | 理由 |
|----|------|------|
| 设计系统 | **[Discord](https://github.com/nexu-io/open-design)**（Open Design 71 选 1） | 原生暗色多层 surface、紧凑密度、状态色系统（绿/黄/红/灰）直接映射 HP/状态、Blurple 用作稀有 highlight |
| 适用 Open Design 技能 | `gamified-app`（增幅选择/等级系统/背包的 XP 化呈现）、`dashboard`（排行榜/灵魂商店表格卡片）、`frontend-design`（整体 UI 生成）、`canvas-design`（游戏标题画面/死亡画面的视觉插画）、`design-review`（UI 生成后 5 维自评） |
| 设计 tokens 文件 | `design-tokens.json`（Discord 提供完整的 CSS 变量集） |
| 配色策略 | Discord 暗色 surface 体系 + 自定义语义色（挂科红 `#f23f43`、及格绿 `#23a55a`、绩点金 `#faa61a`、奶茶棕 `#c47c4b`） |

**为什么不选其他系统：**

| 候选 | 拒绝理由 |
|------|---------|
| Duolingo | 亮白底 + owl-green，情绪完全不对——游戏化组件思路可借鉴但底色必须替换 |
| Linear | 极简暗色很美，但缺乏游戏所需的色彩层次和状态表达 |
| Apple | 亮色 Human Interface，无暗色版本 |
| Cursor | IDE 暗色不错但太"工具型"，缺少情感层 |

### 5.2 品牌 Tokens（自定义语义色）

在 Discord tokens 基础上扩展游戏专属语义色：

```css
/* === 游戏语义色 === */
--color-hp-full: #23a55a;        /* 精力充足（Discord 在线绿） */
--color-hp-mid: #f0b232;         /* 精力警告（Discord 闲置黄） */
--color-hp-low: #f23f43;         /* 精力危急（Discord DND 红） */
--color-xp: #faa61a;             /* 经验值金 */
--color-gpa: #ffd700;            /* 绩点金（更亮） */
--color-milk-tea: #c47c4b;       /* 奶茶棕 */
--color-coffee: #6f4e37;         /* 咖啡棕 */
--color-common: #80848e;         /* 普通品质灰 */
--color-rare: #5865f2;           /* 稀有品质蓝紫（Discord Blurple） */
--color-legendary: #faa61a;      /* 传说品质金 */

/* === Canvas 域专属色 === */
--color-canvas-bg: #0a0a0f;      /* 未探索区纯黑 */
--color-wall: #1a1a2e;           /* 墙深蓝灰 */
--color-floor: #16213e;          /* 地板深海蓝 */
--color-player: #00d4ff;         /* 玩家青色高亮 */
--color-enemy: #f23f43;          /* 敌人暗红 */
--color-elite: #f0b232;          /* 精英暗橙 */
--color-boss: #ff6b9d;           /* Boss 品红 */
--color-item: #ffd700;           /* 物品金色 */
--color-stairs: #ffffff;         /* 楼梯亮白 */
--color-fov-dim: rgba(10,10,15,0.7); /* FOV 阴影纱 */
```

### 5.3 Canvas 游戏域视觉规范

Canvas 渲染一个**类似终端/旧 CRT 显示器的暗色 tile 地图**，而非传统彩色像素画。

| 元素 | 渲染规范 |
|------|---------|
| **背景** | 纯黑 `#0a0a0f` |
| **墙** | `#1a1a2e` 深蓝灰填充，细边框 `#2a2a3e`，四角内嵌阴影模拟"格子内的块" |
| **地板** | `#16213e` 深海蓝填充，覆盖 1px 网格线 `rgba(255,255,255,0.03)` —— 模拟笔记本格线 |
| **玩家 @** | 青色 `#00d4ff`，`JetBrains Mono` 等宽字体，字号比 tile 略大，外围有微弱呼吸发光 `text-shadow: 0 0 8px rgba(0,212,255,0.6)` |
| **敌人** | 用其名称的前 1-2 个汉字渲染在 tile 内（如"早八""体测""高数"），颜色按类型：普通 `#f23f43`、精英 `#f0b232`、Boss `#ff6b9d`，等宽字体 |
| **物品** | 金色 `$` 符号 `#ffd700`，2 秒周期闪烁动画（透明度 0.6 ↔ 1.0） |
| **楼梯 ▼** | 亮白 `#ffffff`，3 秒周期脉冲动画（scale 1.0 → 1.15） |
| **FOV 已探索不可见** | 覆盖半透明深灰纱 `rgba(10,10,15,0.7)` |
| **FOV 未探索** | 纯黑 `#0a0a0f`，不渲染任何内容 |
| **战斗动画** | 攻击时玩家 tile 向目标方闪烁平移 50ms，伤害数字弹出（红色，上漂 + 淡出 400ms） |
| **移动动画** | 玩家 tile 从旧位置平滑滑动到新位置（`ease-out 80ms`） |

### 5.4 UI 面板域视觉规范（Discord 设计系统）

所有 UI 面板（状态栏、背包、弹窗、菜单）使用 Discord 设计系统的 tokens，确保一致的暗色体验。

**字体：**

| 角色 | 字体 | 来源 |
|------|------|------|
| 标题/按钮 | `Feather Bold`（或 fallback `'Helvetica Neue', sans-serif`） | Duolingo 的展示字体，借用于标题增加游戏感 |
| 正文/数据 | `gg sans`（或 fallback `'Helvetica Neue', Arial, sans-serif`） | Discord 系统字体 |
| 代码/数字 | `JetBrains Mono` | 等宽字体，用于属性数值/层数 |

**组件样式摘要（基于 Discord tokens）：**

| 组件类型 | 背景 | 边框 | 圆角 | 备注 |
|---------|------|------|------|------|
| 面板容器 | `#1e1f22` | 1px `#3f4147` | 8px | 背包/灵魂商店/排行榜的暗底卡片 |
| 弹窗 | `#2b2d31` + 80% 遮罩 | 1px `#3f4147` | 12px | 增幅选择/死亡画面 |
| 按钮 Primary | `#5865f2` | — | 4px | 悬停→ `#4752c4` |
| 按钮 Danger | `#da373c` | — | 4px | 删除/放弃操作 |
| 按钮 Success | `#23a55a` | — | 4px | 确认/开始游戏 |
| 进度条 | track `#1e1f22` fill `#23a55a` | 1px `#3f4147` | 9999px | HP 条/XP 条 |
| 输入框 | `#1e1f22` | 1px `#3f4147` focus→ `#5865f2` | 4px | 玩家昵称输入 |
| 状态标记 | 按类型着色 | — | 9999px (pill) | 品质标签/状态徽章 |

**间距：** 基础单位 4px，尺度：4, 8, 12, 16, 24, 32, 48

**动效：**
- UI 面板滑入/滑出：200ms `ease-out`
- 按钮 hover：150ms 背景色过渡
- 增幅卡片 hover：180ms `cubic-bezier(0.34, 1.56, 0.64, 1)`（微 overshoot）
- 消息日志滚动：即时滚动，无动画

### 5.5 作品防"AI Slop"机制

基于 Open Design 的内置质量机制：

| 检查点 | 方法 | 标准 |
|--------|------|------|
| **Brand-spec 抽取** | 实现前先确认一句话品牌调性："暗黑哥特 UI 表壳 × 大学生存内容的荒诞反差" | 所有 UI 屏幕都通过此一致性检验 |
| **5 维自评** | `design-review` 技能对每屏打分 | 一致性 ≥ 4/5、层次感 ≥ 4/5、对比度 ≥ 4/5、动效 ≥ 3/5、内容 ≥ 4/5 |
| **P0** | 必修复 | 可访问性（键盘操作正常）、色彩对比度（WCAG AA 3:1+）、移动端不可用（V1 豁免） |
| **P1** | 应修复 | 动效缺失、空格不一致、字体 fallback 未配置 |
| **P2** | 可优化 | 加载骨架屏、死亡画面的粒子特效、徽章动画细节 |

---

## 6. 系统架构

### 6.1 组件图

```
┌──────────────────────────────────────────────────┐
│                   浏览器                           │
│                                                    │
│  ┌──────────────┐  ┌───────────────────────┐     │
│  │  React UI     │  │  Canvas 游戏渲染        │     │
│  │  (shadcn/ui)  │  │  (Tile Map + Entities)  │     │
│  │               │  │                         │     │
│  │  • 状态栏     │  │  • 地图绘制              │     │
│  │  • 背包面板   │  │  • 玩家/敌人/物品       │     │
│  │  • 增幅弹窗   │  │  • FOV 视野遮罩         │     │
│  │  • 死亡画面   │  │  • 动画（移动/攻击）    │     │
│  │  • 排行榜     │  │                         │     │
│  │  • 主菜单     │  └───────────┬─────────────┘     │
│  │  • 灵魂商店   │              │                   │
│  └──────┬───────┘              │                   │
│         │                      │                   │
│         └──────────┬───────────┘                   │
│                    │                                │
│         ┌──────────▼──────────┐                    │
│         │   Zustand Store      │                    │
│         │   (GameState + UI)   │                    │
│         └──────────┬──────────┘                    │
│                    │                                │
│         ┌──────────▼──────────┐                    │
│         │   游戏引擎 (Engine)   │                    │
│         │   • 回合管理         │                    │
│         │   • 战斗/伤害计算    │                    │
│         │   • FOV 计算         │                    │
│         │   • 状态效果 tick    │                    │
│         └──────────┬──────────┘                    │
│                    │                                │
│    ┌───────────────┼───────────────┐               │
│    ▼               ▼               ▼               │
│ ┌──────┐    ┌──────────┐    ┌──────────┐          │
│ │MapGen│    │Entities   │    │Augments  │          │
│ │      │    │(属性定义) │    │(增幅池)  │          │
│ └──────┘    └──────────┘    └──────────┘          │
│                                                    │
└────────────────────┬─────────────────────────────┘
                     │ HTTP REST
┌────────────────────▼─────────────────────────────┐
│                  后端 (FastAPI)                     │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ /api/seed│  │/api/lead │  │/api/share│        │
│  │ 每日种子 │  │ 排行榜   │  │ 分享卡片 │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       └──────────────┼──────────────┘              │
│                      │                              │
│              ┌───────▼───────┐                      │
│              │    SQLite      │                      │
│              │  • daily_seed  │                      │
│              │  • leaderboard │                      │
│              │  • share_card  │                      │
│              └───────────────┘                      │
└─────────────────────────────────────────────────────┘
```

### 6.2 数据流

```
用户按键 (方向键 / 空格 / I)
         │
         ▼
   Engine.processTurn(action)
         │
         ├──→ 移动判定 → MapGen 地图数据
         ├──→ 战斗判定 → Entities 属性
         ├──→ 击杀检查 → Augments 弹窗触发
         └──→ 状态更新 → Zustand Store
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              Canvas 渲染  React UI   localStorage
              (地图更新)  (面板更新)  (自动存档)
```

---

## 7. 数据模型

### 7.1 前端实体

```typescript
interface Player {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;        // 1-4 (大一→大四)
  xp: number;
  xpToNext: number;
  floor: number;        // 当前层
  x: number;            // 地图坐标
  y: number;
  inventory: Item[];
  weapon: Item | null;
  armor: Item | null;
  augments: Augment[];
  statusEffects: StatusEffect[];
}

interface Enemy {
  id: string;
  name: string;
  type: 'normal' | 'elite' | 'boss';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  special: SpecialAbility | null;
  x: number;
  y: number;
}

interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion';
  effect: Effect;
  description: string;
}

interface Augment {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  effect: Effect;
  description: string;
  stackable: boolean;
}

interface Effect {
  stat: 'hp' | 'maxHp' | 'attack' | 'defense' | 'xpMultiplier' | 'dodgeChance' | 'lifesteal' | 'deathSave';
  value: number;
  duration?: number;     // undefined = permanent
}

interface StatusEffect {
  id: string;
  name: string;
  stat: 'speed' | 'dodgeChance' | 'attack';
  modifier: number;      // multiplier (0.5 = half)
  remainingTurns: number;
}

interface GameState {
  player: Player;
  enemies: Enemy[];
  items: Item[];         // 地上的物品
  map: Tile[][];
  seed: string;
  status: 'playing' | 'dead' | 'won';
  floor: number;
  messageLog: string[];
  turnCount: number;
}
```

### 7.2 数据库表

```sql
-- 每日种子表
CREATE TABLE daily_seed (
    date TEXT PRIMARY KEY,         -- '2026-06-13'
    seed TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 排行榜表
CREATE TABLE leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,     -- 匿名昵称
    seed TEXT NOT NULL,
    date TEXT NOT NULL,            -- 种子日期
    floor_reached INTEGER NOT NULL,
    enemies_killed INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    augments_collected INTEGER DEFAULT 0,
    run_duration_seconds INTEGER DEFAULT 0,
    died_to TEXT,                  -- 死因（敌人名 / "退学" / "精力耗尽"）
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(player_name, seed)     -- 同一人同一种子只保留一次提交
);

-- 分享卡片表
CREATE TABLE share_card (
    id TEXT PRIMARY KEY,           -- UUID
    run_data JSON NOT NULL,        -- Run 摘要
    created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 8. API 设计

### 基础信息
- **Base URL**: `http://localhost:8000/api`
- **Content-Type**: `application/json`

### 端点

#### GET /api/seed/today

获取今日种子。如果没有则自动生成一个。

**Response 200:**
```json
{
  "date": "2026-06-13",
  "seed": "a1b2c3d4e5f6"
}
```

#### GET /api/leaderboard

获取排行榜。

**Params:** `?date=2026-06-13&limit=50`

**Response 200:**
```json
{
  "date": "2026-06-13",
  "entries": [
    {
      "rank": 1,
      "player_name": "卷王之王",
      "floor_reached": 8,
      "enemies_killed": 42,
      "score": 9850,
      "died_to": "期末周"
    }
  ]
}
```

#### POST /api/leaderboard

提交成绩。

**Request:**
```json
{
  "player_name": "卷王之王",
  "seed": "a1b2c3d4e5f6",
  "date": "2026-06-13",
  "floor_reached": 8,
  "enemies_killed": 42,
  "score": 9850,
  "augments_collected": 5,
  "run_duration_seconds": 1247,
  "died_to": "期末周"
}
```

**Response 201:**
```json
{
  "id": 1,
  "rank": 5
}
```

**验证：** `seed` 必须与 `date` 当日的服务器种子一致，否则返回 400。

#### POST /api/share

创建分享卡片。

**Request:**
```json
{
  "run_data": {
    "player_name": "卷王之王",
    "floor_reached": 8,
    "enemies_killed": 42,
    "died_to": "期末周",
    "score": 9850,
    "seed": "a1b2c3d4e5f6"
  }
}
```

**Response 201:**
```json
{
  "card_id": "abc123-def456",
  "url": "/api/share/abc123-def456"
}
```

#### GET /api/share/{id}

查看分享卡片。

**Response 200:** `{ "run_data": {...} }`
**Response 404:** `{ "detail": "卡片不存在" }`

### 错误码

| HTTP 状态码 | 含义 |
|------------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |

---

## 9. 技术选型与理由

| 层 | 选择 | 理由 |
|----|------|------|
| **语言** | TypeScript (前端) + Python (后端) | TS 类型安全提升 Agent 输出质量；Python/FastAPI 做 API 轻量高效 |
| **前端框架** | React 18 + Vite | 生态最成熟，Agent 训练数据最多，shadcn/ui 原生支持 |
| **游戏渲染** | HTML5 Canvas API | tile-based 回合制不需要 WebGL；完全控制渲染管线；学习价值高 |
| **UI 组件** | shadcn/ui + Tailwind CSS | 满足课程 Open Design 要求；组件可直接用于背包/菜单/弹窗 |
| **状态管理** | Zustand | 轻量，游戏状态和 UI 状态天然分离，无 boilerplate |
| **后端框架** | FastAPI (Python) | 自动 OpenAPI 文档，Pydantic 验证，异步支持 |
| **数据库** | SQLite + SQLAlchemy | 单文件零配置，数据量小不需要 PostgreSQL；SQLAlchemy 方便测试 |
| **测试** | Vitest (前端) + pytest (后端) | Vite 原生集成；pytest 是 Python 测试标准 |
| **容器化** | Docker Compose (Nginx + FastAPI) | 前端静态文件由 Nginx 提供，后端 FastAPI + Uvicorn |
| **CI/CD** | GitHub Actions | 自动测试 + Docker 镜像构建 |

### Open Design 选型

- **设计系统**：选择 **Discord**（Open Design 71 选 1，暗色主题），理由：
  - 原生暗色多层 surface 体系（3 级深度：`#1e1f22` / `#2b2d31` / `#313338`）直接适配暗黑游戏 UI
  - 状态色系统（绿/黄/红/灰）天然映射 HP 精力值、敌人类型、品质分级
  - Blurple (`#5865f2`) 作为稀有/传奇增幅的 highlight 色，在暗底上足够突出
  - 紧凑密度适合在屏幕上同时容纳 Canvas + 多个 UI 面板而不过分拥挤
  - 完整的设计 tokens 文件（`design-tokens.json`）直接注入 Tailwind CSS
- **适用 Open Design 技能**：
  - `gamified-app` → 增幅选择的 3 卡片布局、等级徽章 XP 化、背包的 quest 化呈现
  - `dashboard` → 排行榜表格、灵魂商店卡片网格、数据面板布局
  - `frontend-design` → 基于 Discord 设计系统生成所有 UI 面板
  - `canvas-design` → 游戏标题画面、死亡画面的视觉插画/海报
  - `design-review` → 生成后 5 维自评（一致性/层次感/对比度/动效/内容）
- **品牌调性**：暗黑哥特 UI 表壳 × 大学生存内容的荒诞反差 —— "画面越严肃，奶茶越好笑"

---

## 10. 验收标准

### 功能性

| US | 验收标准 | 验证方法 |
|----|---------|---------|
| US1 | 点击开始 → 地图出现在 Canvas，玩家 @ 可见，< 1s | 手动测试 + Playwright e2e |
| US2 | 方向键移动 → 玩家移动一格，敌人同步移动；碰敌 → 自动攻击，日志显示伤害；HP ≤ 0 → 死亡 | 单测 + 手动 |
| US3 | 地图 ≥ 5 房间，走廊连通，楼梯可见；踩楼梯 → 新地图生成，敌人更强 | 单测（地图生成）+ 手动 |
| US4 | 击杀精英 → 弹窗 3 选项；选择 → 效果立即生效；3 选项各不相同 | 单测 + 手动 |
| US5 | 踩物品 → 自动拾取入背包；武器/护甲自动装备并更新属性；药水点击使用 | 单测 + 手动 |
| US6 | HP ≤ 0 → 死亡画面（统计正确）；不可再操作；"再来一局"→ 新 Run | 单测 + 手动 |
| US7 | 同种子 → 相同地图；排行榜显示前 50；成绩提交成功 | 单测(后端) + 手动 |
| US8 | 死亡画面点击"分享"→ 生成唯一 URL；打开 URL → 显示 Run 摘要 | 单测(后端) + 手动 |
| US9 | 关闭页面 → 重开 → 恢复状态；"新游戏"→ 清存档 | 单测 + 手动 |
| US10 | 死亡 → 获灵魂点数；商店可解锁；解锁后下 Run 可用 | 单测 + 手动 |

### 非功能性

| 维度 | 标准 | 验证方法 |
|------|------|---------|
| 性能 | 地图生成 < 500ms；Canvas 60fps | Vitest 性能断言 + Chrome DevTools |
| 兼容性 | Chrome/Edge/Firefox 最新版正常 | 手动跨浏览器 |
| 测试覆盖 | 引擎核心 ≥ 80%；后端 API 100% | vitest --coverage; pytest --cov |
| Docker | `docker compose up` 一条命令启动 | CI + 手动验证 |
| CI | push → 自动测试 + Docker 构建 | GitHub Actions |

---

## 11. 风险与未决问题

### 风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| **Canvas 渲染性能** | 低 | 中 | 回合制刷新率低；脏矩形更新；离屏 Canvas 预渲染 |
| **地牢生成算法 bug**（死区/不可达） | 中 | 高 | BSP 后验证所有房间可达（BFS）；不可达则重试 |
| **Subagent 在游戏逻辑上产出幻觉** | 中 | 中 | 每次 subagent 完成后运行现有测试套件验证；Review 文件 |
| **前后端状态同步** | 低 | 中 | 后端仅存种子/排行榜，不存游戏状态；前端是唯一真相源 |
| **每日种子生成并发问题** | 低 | 低 | 使用 SQLite 事务 + UNIQUE 约束 |
| **小程序 / 移动端不兼容** | 中 | 低 | V1 仅保证桌面浏览器；回应式设计留到 V2 |

### 未决问题

1. **排行榜匿名机制**：玩家输入昵称还是随机生成昵称？输入昵称可能带来不文明内容
2. **分享卡片有效期**：永久保存还是有 TTL？建议 7 天自动清理
3. **灵魂商店的平衡性**：灵魂点数计算公式如何避免"刷子"行为
4. **是否需要新手引导**：V1 不做，但在第一个房间放置提示牌（如 "按 ↑↓←→ 移动"）

---

## 12. 目录结构（目标）

```
college-dungeon/
├── client/                    # 前端 React 应用
│   ├── src/
│   │   ├── components/        # React UI 组件 (shadcn/ui)
│   │   │   ├── ui/            # shadcn/ui 基础组件
│   │   │   ├── StatusBar.tsx
│   │   │   ├── InventoryPanel.tsx
│   │   │   ├── AugmentModal.tsx
│   │   │   ├── DeathScreen.tsx
│   │   │   ├── MainMenu.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   └── SoulShop.tsx
│   │   ├── engine/            # 游戏引擎（纯逻辑）
│   │   │   ├── GameEngine.ts
│   │   │   ├── MapGenerator.ts
│   │   │   ├── CombatSystem.ts
│   │   │   ├── FOV.ts
│   │   │   ├── Entities.ts
│   │   │   └── AugmentPool.ts
│   │   ├── renderer/          # Canvas 渲染
│   │   │   ├── MapRenderer.ts
│   │   │   ├── EntityRenderer.ts
│   │   │   └── EffectsRenderer.ts
│   │   ├── store/             # Zustand stores
│   │   │   └── gameStore.ts
│   │   ├── api/               # 后端 API 调用
│   │   │   └── client.ts
│   │   ├── styles/             # 设计 tokens
│   │   │   └── tokens.css      # Discord 设计系统 CSS 变量 + 游戏语义色
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/
│   │   ├── engine/            # 引擎单测
│   │   └── components/        # 组件测试
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── server/                    # 后端 FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   └── routers/
│   │       ├── seed.py
│   │       ├── leaderboard.py
│   │       └── share.py
│   └── tests/
│       ├── test_seed.py
│       ├── test_leaderboard.py
│       └── test_share.py
├── Dockerfile.client
├── Dockerfile.server
├── docker-compose.yml
├── .github/workflows/
│   └── ci.yml
├── README.md
├── SPEC.md
├── PLAN.md
├── SPEC_PROCESS.md
├── AGENT_LOG.md
└── REFLECTION.md
```

---

*SPEC v1.1 — 2026-06-14 — 经 brainstorming 流程产出，补增 §5 视觉设计规范（Discord 设计系统 + 暗黑反差主题 + Open Design 技能引用），待冷启动验证后修订。*
