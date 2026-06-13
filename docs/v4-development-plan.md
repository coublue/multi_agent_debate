# V4 开发计划：Notion AI 风格前端视觉改造

本文档用于明确 `multi_agent_debate` 第四阶段开发范围、视觉方向、实现顺序和验收标准。V4 基于当前已有的多 Agent 辩论功能、文章库、快速话题辩论、辩论详情页、Markdown 导出和阶段可视化继续开发，目标不是新增复杂后端能力，而是把前端页面统一改造成更接近 `ui material` 文件夹中 Notion AI 参考图的暗色 AI 工作台风格。

## 一、版本目标

V4 的核心目标：

- 修复当前前端源码中的中文乱码问题，保证所有页面文案可读、准确、统一。
- 将现有浅色 SaaS 工具风整体升级为 Notion AI 参考图中的暗色、高对比、紫色强调风格。
- 重构首页首屏，让用户一进入页面就能看到清晰的产品定位、主要操作入口和 AI 编辑器式演示区域。
- 重构新建文章辩论和快速话题辩论页面，让表单更像 AI Assist 命令面板。
- 重构辩论详情页，让摘要、过程、报告、Agent 消息都符合暗色工作台风格。
- 统一按钮、卡片、输入框、标签页、筛选器、状态提示等基础 UI 元素。
- 在不影响现有功能的前提下，加入少量 Notion AI 式的紫色图标、魔法感符号和编辑器窗口视觉隐喻。

V4 不包含：

- 新增后端业务能力。
- 修改 LLM API、模型供应商或 Agent 底层编排逻辑。
- 新增用户登录、权限、多用户隔离。
- 新增 PDF 导出、联网搜索、OCR、多模态输入。
- 引入大型 UI 组件库。
- 直接复用或临摹 Notion 官方插画资源。可以借鉴风格，但应使用自制的轻量图形、CSS 装饰或项目内生成资产。

## 二、参考风格总结

`ui material` 文件夹中的 5 张参考图呈现出以下共同特征：

- 大面积黑色背景，页面整体接近 `#000000` 或 `#050505`。
- 主内容卡片使用深灰色，常见层级为黑色背景、深灰面板、稍亮的输入区。
- 标题使用高对比白色，大字号、较粗字重、排版留白充足。
- 紫色是主要强调色，用于按钮、图标、AI 标签、星光符号和少量手绘装饰。
- UI 核心隐喻是“编辑器窗口”和“AI 输入框”，包括窗口顶部圆点、深色输入框、蓝色 focus ring、Generate 按钮。
- 卡片圆角较小，边框克制，阴影很轻，整体干净直接。
- 装饰元素少而精准，例如星星、箭头、手绘线条、引号、光效符号。

## 三、全局视觉规范

### 3.1 色彩

建议建立统一的暗色 token，优先通过 Tailwind class 或 CSS 变量实现：

```text
page-bg:        #000000
surface-1:      #171717
surface-2:      #1f1f1f
surface-3:      #262626
border-muted:   #2f2f2f
text-primary:   #f5f5f5
text-secondary: #a3a3a3
text-muted:     #737373
accent-purple:  #a855f7
accent-purple-2:#c084fc
focus-blue:     #1d9bf0
danger:         #f87171
success:        #34d399
warning:        #fbbf24
```

原则：

- 页面不再使用 teal/blue 渐变作为主视觉。
- 紫色作为唯一主要品牌色，蓝色只用于输入框 focus ring 或少量状态提示。
- 不使用大面积彩色背景区分角色，避免破坏 Notion AI 式克制感。

### 3.2 字体与排版

- 沿用当前字体栈：`Inter`, `PingFang SC`, `Microsoft YaHei`, `Helvetica Neue`, `Arial`, `sans-serif`。
- 首页主标题应更接近参考图的大标题风格，桌面端可使用 `text-5xl` 到 `text-6xl`，移动端使用 `text-3xl` 到 `text-4xl`。
- 工具页、表单页、详情页不使用过大的 hero 字号，保持工作台密度。
- 正文行高保持舒适，中文正文建议 `leading-7`。

### 3.3 卡片与面板

- 常规卡片圆角使用 `rounded-md` 或 `rounded-lg`，不要过度圆润。
- 深色卡片默认使用 `border border-neutral-800 bg-neutral-900`。
- 卡片 hover 可以轻微提高边框亮度或背景亮度，不做夸张阴影。
- 不使用卡片套卡片式堆叠；页面区块尽量用深色面板或无框布局承载。

### 3.4 按钮与输入

- 主按钮：紫色背景，白字，例如 `bg-purple-600 hover:bg-purple-500`。
- 次按钮：深色背景、灰色边框、白字。
- 危险操作：仅在删除等操作中使用红色文字或红色边框。
- 输入框：深色背景、灰色边框、白色文字、focus 时蓝色描边。
- 表单选项卡：选中态使用紫色边框或紫色小点，不使用浅蓝背景。

## 四、必须优先处理：中文乱码修复

当前多个前端文件中存在中文乱码，例如首页、表单、详情页、Agent 消息卡片、阶段进度等。V4 需要先修复文案，再做视觉改造。

涉及文件包括但不限于：

```text
frontend/app/layout.tsx
frontend/app/page.tsx
frontend/app/debates/new/page.tsx
frontend/app/debates/topic/new/page.tsx
frontend/app/debates/[debateId]/page.tsx
frontend/components/article-form.tsx
frontend/components/topic-debate-form.tsx
frontend/components/agent-filter.tsx
frontend/components/agent-message-card.tsx
frontend/components/debate-stage.tsx
frontend/components/debate-stage-progress.tsx
frontend/components/debate-summary-panel.tsx
frontend/components/judge-report.tsx
frontend/components/report-actions.tsx
frontend/components/article-list.tsx
frontend/components/article-detail.tsx
```

修复要求：

- 所有用户可见中文文案恢复为自然中文。
- 文案应统一产品称呼，例如“多 Agent 辩论助手”、“文章辩论”、“话题辩论”、“裁判报告”。
- 修复后确认文件以 UTF-8 保存。
- 不改变 API 字段、枚举值和数据结构。

## 五、首页改造

涉及文件：

```text
frontend/app/page.tsx
frontend/app/globals.css
```

### 5.1 页面定位

首页从当前浅色工作台入口，改为暗色产品首屏 + 工作台入口。第一屏应模仿参考图 1 的结构：

- 顶部导航：
  - 左侧：`Multi Agent Debate` 或中文产品名。
  - 右侧：文章辩论、话题辩论、历史记录等入口。
  - 最右侧：紫色主按钮。
- 主标题：
  - 示例：`让多个 Agent 替你思考、交锋、裁判`
  - 副标题说明：输入文章或话题，系统自动组织正反方、多阶段交锋和裁判报告。
- 主操作按钮：
  - `开始文章辩论`
  - `快速话题辩论`
- 首屏视觉：
  - 一个深色编辑器窗口，模拟 AI Assist 输入和生成按钮。
  - 可以展示示例话题、阶段输出预览、可信度评分等。

### 5.2 首页编辑器窗口

建议新增一个首页内部组件，例如：

```text
HeroEditorPreview
```

视觉结构：

- 外层窗口：深灰卡片，顶部有红黄绿或灰色小圆点。
- 标题：`Debate Brief`
- 输入区：展示示例问题。
- 底部按钮：`Generate debate`
- 右侧或下方：展示 3 个轻量结果片段：
  - `正方论点`
  - `反方质疑`
  - `裁判结论`

### 5.3 功能卡片区

将当前流程动画改为参考图 3/5 式深色功能卡片：

- 文章深度辩论
- 快速话题辩论
- 正反方交锋
- 争议点地图
- 裁判报告
- Markdown 导出

每个卡片包含：

- 紫色小图标或符号。
- 一行标题。
- 一到两行说明。

### 5.4 工作台概览

保留现有统计能力，但视觉改为暗色概览面板：

- 辩论总数
- 进行中
- 已完成

不要使用浅色白卡片。

## 六、新建辩论页面改造

涉及文件：

```text
frontend/app/debates/new/page.tsx
frontend/app/debates/topic/new/page.tsx
frontend/components/article-form.tsx
frontend/components/topic-debate-form.tsx
```

### 6.1 页面结构

两类新建页面统一为暗色“AI Assist 命令面板”风格：

- 顶部返回导航使用灰色文字，hover 变白。
- 页面标题简洁，不做大面积营销式 hero。
- 表单外层使用深色编辑器窗口。
- 表单标题区包含紫色 AI 图标或 `AI Assist` 标签。

### 6.2 表单输入

输入框和 textarea 采用：

- 深灰背景。
- 灰色边框。
- 白色输入文字。
- 灰色 placeholder。
- focus 时蓝色 ring。

按钮：

- 提交按钮使用紫色。
- 取消、返回、切换模式使用深色描边按钮。

### 6.3 配置选项

辩论深度、输出风格、阶段模式建议从普通 radio 卡片改为暗色 option tile：

- 未选中：深灰背景、灰色边框。
- 选中：紫色边框、紫色小点或紫色图标。
- 描述文字使用灰色。

## 七、辩论详情页改造

涉及文件：

```text
frontend/app/debates/[debateId]/page.tsx
frontend/components/debate-summary-panel.tsx
frontend/components/debate-view-tabs.tsx
frontend/components/debate-stage-progress.tsx
frontend/components/debate-stage.tsx
frontend/components/agent-message-card.tsx
frontend/components/disagreement-map.tsx
frontend/components/judge-report.tsx
frontend/components/report-actions.tsx
```

### 7.1 顶部摘要区

摘要区改成暗色大面板，优先展示：

- 辩论标题。
- 类型：文章辩论 / 话题辩论。
- 状态。
- 阶段完成度。
- 裁判结论。
- 可信度评分。
- 主要操作：导出 Markdown、复制 Markdown、重新运行、删除。

状态提示使用克制的彩色小徽标，不使用大面积彩色背景。

### 7.2 标签页

`总览 / 完整过程 / 裁判报告` 改为暗色 segmented control：

- 外层深灰背景。
- 选中项紫色背景或更亮深灰背景 + 紫色文字。
- 未选中项灰色文字。

### 7.3 总览视图

总览视图包含：

- 左侧：文章内容或话题背景，使用深色阅读面板。
- 右侧：辩论概要、配置、时间信息。
- 下方：争议点地图，使用深色卡片或两栏对照结构。

文章阅读区应避免纯白背景，正文颜色使用浅灰，滚动区域边界清晰。

### 7.4 完整过程视图

阶段进度和 Agent 消息统一暗色：

- 阶段进度卡片使用深灰。
- 当前阶段使用紫色或蓝色描边。
- 已完成阶段使用轻量成功色点，不大面积绿色背景。
- 等待阶段使用灰色。

### 7.5 裁判报告视图

裁判报告应像参考图中的功能卡片和编辑器结果区：

- 顶部 3 个指标卡：结论方、可信度、核心主张。
- 下方分区展示正方强点、反方强点、可信部分、存疑部分、关键分歧、判定依据。
- 最终总结使用更宽的深色阅读面板。

## 八、Agent 消息卡片改造

涉及文件：

```text
frontend/components/agent-message-card.tsx
frontend/components/agent-filter.tsx
```

### 8.1 角色色彩策略

当前角色卡片使用蓝、绿、黄、红浅色背景。V4 建议统一暗色卡片，仅用细节区分角色：

```text
moderator: 紫色
pro:       蓝紫色
con:       淡紫灰
judge:     亮紫色
```

每条消息卡片：

- 背景统一深灰。
- 左侧 3-4px 角色色细条。
- 角色 badge 使用深色胶囊。
- 展开/收起按钮使用灰色或紫色文字。

### 8.2 内容展示

- 结构化字段 label 使用灰色小标题。
- 正文使用浅灰或白色。
- 列表 marker 可使用紫色或默认浅灰。
- 折叠摘要使用 `line-clamp`，保持紧凑。

### 8.3 筛选器

Agent 筛选器改为暗色按钮组：

- 外层深灰。
- 选中项紫色或亮深灰。
- 计数使用弱化颜色。

## 九、文章库与历史列表改造

涉及文件：

```text
frontend/app/articles/page.tsx
frontend/app/articles/[articleId]/page.tsx
frontend/app/debates/page.tsx
frontend/components/article-list.tsx
frontend/components/article-detail.tsx
frontend/components/debate-list.tsx
```

要求：

- 列表页不做营销 hero，保持工作台信息密度。
- 背景和卡片统一暗色。
- 搜索、筛选、排序控件使用暗色输入和按钮。
- 表格或列表 header 使用深灰背景。
- 空状态使用虚线深色边框和灰色文字。
- 删除操作仍使用红色，避免和紫色主操作混淆。

## 十、装饰与图形资产

V4 可以加入少量自制装饰，但要克制：

- 紫色星光符号。
- 轻量手绘箭头。
- 引号、火花、斜线。
- 首页编辑器窗口旁的黑白线稿式抽象人物或对话符号。

实现方式优先级：

1. CSS 伪元素和简单 HTML 元素。
2. 轻量 inline SVG，仅用于自制符号。
3. 生成 bitmap 资产，仅当确实需要更接近参考图的插画气质时使用。

限制：

- 不直接使用 Notion 官方图形作为项目资产。
- 不加入大面积渐变球、模糊光斑或复杂背景。
- 不让装饰遮挡正文和按钮。

## 十一、前端实现任务拆分

### 11.1 文案与编码修复

任务：

- 修复所有乱码中文。
- 统一产品术语。
- 检查 metadata 标题和描述。
- 检查确认弹窗、错误提示、空状态、按钮 loading 文案。

交付物：

- 所有页面中文正常显示。
- `npm run lint` 不因文案修改产生错误。

### 11.2 全局主题改造

任务：

- 修改 `frontend/app/globals.css`。
- 设置暗色 `color-scheme`。
- 替换 body 背景。
- 调整 selection 颜色。
- 移除或重写当前 teal 工作流动画色彩。

交付物：

- 全站默认暗色背景。
- 基础文字颜色不依赖单个页面重复设置。

### 11.3 首页改造

任务：

- 重构 `frontend/app/page.tsx`。
- 新增首页编辑器预览组件。
- 改造功能卡片区。
- 保留统计和主要入口。

交付物：

- 首页第一屏明显接近 Notion AI 参考图风格。
- 桌面和移动端均无文字重叠。

### 11.4 新建页面与表单改造

任务：

- 改造文章辩论新建页。
- 改造话题辩论新建页。
- 改造 `ArticleForm` 和 `TopicDebateForm`。
- 表单选项采用暗色 option tile。

交付物：

- 两类创建流程功能不变。
- 输入、选项、错误提示、loading 状态风格统一。

### 11.5 详情页改造

任务：

- 改造详情页容器和导航。
- 改造摘要面板。
- 改造标签页。
- 改造总览、过程、报告三个视图。
- 改造导出工具条。

交付物：

- 详情页完整保留现有功能。
- 运行中、失败、完成三种状态均有清晰暗色展示。

### 11.6 列表页和文章页改造

任务：

- 改造文章列表页。
- 改造文章详情页。
- 改造历史辩论列表页。
- 改造列表、空状态、删除按钮。

交付物：

- 所有工作台页面视觉一致。
- 列表仍保持高可读性。

## 十二、验证计划

前端验证：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run lint
npm run build
```

手动验证页面：

```text
/
/debates/new
/debates/topic/new
/debates
/articles
/articles/{articleId}
/debates/{debateId}
```

视觉检查重点：

- 桌面端首页首屏是否接近参考图气质。
- 移动端按钮和标题是否换行正常。
- 表单输入框 focus ring 是否清晰。
- 深色背景下正文对比度是否足够。
- Agent 消息卡片是否能区分角色，同时不破坏统一风格。
- 裁判报告和 Markdown 操作是否容易找到。
- 删除、失败等危险/异常状态是否仍然醒目。

## 十三、验收标准

V4 完成时应满足：

- 所有前端中文文案不再乱码。
- 全站主要页面完成暗色主题统一。
- 首页具有 Notion AI 参考图式的黑底、大标题、紫色按钮和编辑器窗口视觉。
- 新建辩论表单具有 AI Assist 命令面板风格。
- 辩论详情页的摘要、过程、报告、导出区域均适配暗色工作台风格。
- Agent 消息卡片统一为深色体系，仅用紫色系细节区分角色。
- 文章库、历史辩论列表、文章详情页不再出现浅色白卡片。
- 所有主操作按钮、次操作按钮、危险操作按钮样式清晰区分。
- 桌面端和移动端没有明显文字溢出、遮挡、重叠。
- `npm run lint` 通过。
- `npm run build` 通过。

## 十四、建议实施顺序

1. 修复中文乱码和 metadata。
2. 建立全局暗色主题和基础 token。
3. 重构首页首屏、编辑器窗口和功能卡片。
4. 改造新建文章辩论和快速话题辩论页面。
5. 改造辩论详情页摘要、标签页和导出工具条。
6. 改造阶段进度、Agent 筛选器、Agent 消息卡片。
7. 改造裁判报告和争议点地图。
8. 改造文章库、文章详情和历史辩论列表。
9. 补充少量紫色装饰符号。
10. 运行 lint/build。
11. 使用浏览器检查桌面和移动端视觉。
12. 补充 V4 交接文档。

## 十五、开发交接检查清单

V4 交接时建议说明：

- 修复了哪些乱码文件。
- 是否修改了全局主题或 Tailwind 使用方式。
- 首页新增或重构了哪些组件。
- 新建页面和表单是否保持原 API 行为。
- 详情页三种视图是否仍然保留原有功能。
- Markdown 导出和复制是否仍然可用。
- 删除、重新运行、失败提示等危险/异常路径是否验证。
- 已运行的前端 lint/build 结果。
- 已手动检查的页面和视口尺寸。
- 已知视觉限制和下一步建议。

## 十六、一句话总结

V4 的重点是把 `multi_agent_debate` 从“功能完整但偏默认的浅色工具界面”升级为“黑底、高对比、紫色强调、带 AI 编辑器气质的多 Agent 辩论工作台”，同时先解决中文乱码这个会直接影响产品质感的基础问题。
