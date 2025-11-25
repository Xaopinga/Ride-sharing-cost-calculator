## 目标
- 将 `index.html` 的界面改造成两套 UI：主分析页采用 `ui_index_demo.html` 风格，设置页采用 `ui_set_demo.html` 风格。
- 保留并无缝复用现有功能：本地持久化、计算逻辑、图表渲染、截图 OCR（`POST /ocr`）。

## 总体方案
- 仅编辑 `index.html`，在同一文件中实现两个视图（“分析页”和“设置页”），通过顶部导航进行视图切换。
- 引入 Tailwind CSS CDN 与对应字体资源，按 demo 的配色与排版搭建结构；为需要被 JS 使用的元素补充现有 ID，以保持逻辑不变。
- 后端 `functions/ocr.js` 不改动。

## 具体改动
1. 资源与基础结构
- 在 `<head>` 中加入 Tailwind CDN、Google Fonts 与 Material Symbols（参考 demo）；保留或移除旧的内联样式，根据新 UI 需要精简。
- 将页面根元素添加暗色类结构（`class="dark"`）与背景色类，匹配 demo 的主题。

2. 分析页（仿 `ui_index_demo.html`）
- 左侧输入卡：
  - 文本与布局采用 Tailwind 类，创建三输入框：`pickupDistance`、`totalDistance`、`fareIncome`，保持现有 ID。
  - 自动高速费区域：实现一个开关（默认开启）。当开启时，使用费率自动更新隐藏或次要的 `tollFee` 输入（保留 `id="tollFee"` 以兼容逻辑）；当用户手动编辑时打上 `data-manual` 标记。
  - 操作按钮：
    - 计算按钮：`id="calculateBtn"`
    - 截图识别按钮：`id="recognizeFromImageBtn"` + 隐藏文件框 `id="screenshotInput"`
    - 套用上一单：`id="applyLastOrderBtn"`（出现在“上一单”提示区域）
- 右侧结果卡：
  - 结果数值使用现有结果 ID：`pickupCost`、`mainTripCost`、`totalFuelCost`、`tollCost`、`totalCost`、`perKmIncome`、`perKmCost`、`perKmProfit`、`profit`、`profitIndicator`。
  - 在结果卡或下方保留三个图表容器：`costChart`、`scenarioChart`、`perKmChart`，复用现有 `render*Chart`。

3. 设置页（仿 `ui_set_demo.html`）
- 车辆成本参数：为输入控件增加与现有逻辑匹配的 ID：
  - 市区油耗：`id="cityConsumption"`
  - 高速油耗：`id="highwayConsumption"`
  - 高速费费率：新增设置 `id="tollFeeRate"`（滑条与文本框双向联动）。
- 应用偏好：保留 demo 的开关与切换按钮（可先不与逻辑绑定，或绑定“自动保存”到现有 `saveSettings` 行为）。
- 底部操作：
  - “恢复默认设置”“保存更改”触发 `loadSettings`/`saveSettings` 的扩展逻辑（支持 `tollFeeRate`）。

4. 视图切换
- 顶部导航“设置”按钮切换到设置页；设置页右上角“返回”按钮返回分析页。
- 用简单的 JS 切换两个 section 的可见性（`hidden` 类），不引入路由或新页面。

5. 逻辑保留与扩展
- 保持以下函数不变并复用：
  - `loadSettings`、`saveSettings`、`loadLastOrder`、`saveLastOrder`（`index.html:753`、`index.html:903`、`index.html:916`、`index.html:923`）
  - `recognizeFromImage`/`fillFromRecognizedText`（`index.html:776`、`index.html:813`）
  - `autoCalculateTollFee`、`calculateProfit`、`render*Chart`
- 扩展：`autoCalculateTollFee` 从设置中读取费率 `tollFeeRate`（默认 0.45），替代硬编码值；`saveSettings`/`loadSettings` 支持该新字段。

6. 验证计划
- 本地浏览器打开：
  - 输入与计算：检查各项结果与图表更新；单公里指标正负色展示。
  - 自动高速费：开关行为正确；手动编辑后维持 `data-manual`。
  - 截图识别：按钮流程到选择文件，再发起请求，能填入并计算（部署后端环境下验证）。
  - 上次订单：保存与套用工作正常。
  - 视图切换：导航切换无闪烁，设置页保存后返回分析页，费率生效。

7. 风险与兼容
- 移除旧样式需确保所有 ID 与事件绑定完整迁移；优先保留 ID 以减少 JS 改动面。
- CORS 与后端保持不变；无需新增文件或改动后端。

请确认以上方案，确认后我将开始具体改造并在 `index.html` 中交付两套 UI 视图与完整逻辑绑定。