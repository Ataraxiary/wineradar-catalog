# WineRadar Catalog

酒云网公开葡萄酒商品的有限样本目录。静态 HTML 和 JSON 直接包含真实酒款、年份、规格价格、实时 SKU 库存及观测时间，可供浏览器、HTTP 客户端及 ChatGPT 读取。

公开地址（发布后）：

- https://ataraxiary.github.io/wineradar-catalog/
- https://ataraxiary.github.io/wineradar-catalog/catalog.json
- https://ataraxiary.github.io/wineradar-catalog/status.json
- https://ataraxiary.github.io/wineradar-catalog/catalog.md
- https://ataraxiary.github.io/wineradar-catalog/status.md

## 数据口径

沿用酒款 `wines`、销售条目 `listings`、规格 `skus` 三层模型；`items` 是用于阅读和筛选的汇总视图。价格为人民币规格总价，组合装不是单瓶价。年份缺失时保持未知；可见商品名称中明确标示的年份会记录来源。

实时 SKU 库存优先；与同 SKU 静态库存不同时标记差异。请求失败一律不等于售罄。失败条目保留旧数据，并将当前状态标为未知；整轮失败不替换上一份有效的 `data/catalog.json` 历史观测，`status.json` 记录失败阶段、时间及新鲜度。18 小时新鲜度边界以 `dataStaleAfter` 给出。

公开的 `catalog.json` 在失败时把未更新条目的当前库存设为 `null`、状态设为 `unknown`，同时保留带观测时间的 `lastKnownInventory`。仓库中的 `data/catalog.json` 保存历史观测值，供下一轮成功采集继续使用。人工勾选工作流的 `publish_only` 可在不访问酒云网的情况下重新发布已保留数据；这不会被计作一次成功采集。

组合商品若在详情 JSON 中缺少部分 Wine ID 的详细字段，只使用实时 SKU `product_list` 中实际返回的名称补全对应 Wine 记录；年份、产国、容量等没有返回的字段保持未知。`nameSource` 标记名称来源，汇总页对部分年份或产国缺失明确显示“部分未标示”。详情页已公开加载且确实发出详情 XHR、但该请求未收到响应时，允许一次受限的公开 API 恢复：先取消卡住的页面请求，间隔至少 8 秒后按页面实际请求的详情 URL 读取，再间隔至少 8 秒读取已验证的普通商品实时库存接口。恢复结果标记 `verificationMethod=public_api_recovery`，表示未完成页面可见价格交叉检查；接口响应和商品 ID 仍须通过结构校验。登录、验证码、401、403、429 均立即停止。

如果公开商品页明确显示“价格保密”或要求登录查看价格，即使接口返回数值也不发布该价格或商品。此类 ID 在候选队列中保留原因并冷却 7 天，之后才允许重新检查；不计作网络请求失败。页面没有显示价格且无明确保密提示时记为独立的页面价格异常，不使用接口值代替页面验证。

发布流程把同一份已保存的观测与状态投影为站点 HTML、`catalog.md`、`status.md`、`catalog.json`、`status.json`；公开仓库根目录同步提交这四个 Markdown/JSON 文件。`catalog.md` 每个 SKU 一行，包含商品 ID、名称、年份、规格价格、库存状态、库存最后验证时间和来源链接。`catalog.json` 是机器读取的权威结构化数据；Markdown 便于按文本读取，不能替代状态文件的新鲜度判断。构建检查逐字节对比这些输出与生成器，防止版本错位。

首页及筛选页有 canonical URL，首页导航和 sitemap 包含 Markdown。站点子目录的 `robots.txt` 可供检查；真正生效的 robots 规则位于域名根目录。索引是否发生由搜索服务决定，HTTP 200、sitemap 和 Markdown 均不能保证 ChatGPT 网页工具会读取。若该工具仍拒绝 GitHub Pages，可尝试公开仓库对应文件的 GitHub 页面或 Raw URL，并以实际可访问性为准。

## 范围与频率

当前扩容阶段每轮目标验证 10 个真实商品，最多尝试 15 个销售条目；按 ID 去重，串行执行，商品之间至少间隔 8 秒，单条超时后再等待 30 秒。`data/queue.json` 持久保存公开发现的候选 ID、验证时间与失败冷却期；每轮约五分之一的尝试名额留给最久未更新的历史商品，其余优先验证新候选。成功详情会在每条采集后写入目录检查点。发现入口来自普通商城首页、现货速发、可见分类入口及活动卡片。达到 100 款且连续两轮小批次成功后，发现预算逐步提高到最多 10 个公开入口、每入口最多滚动一次；商品采集规模仍维持 10 款，待新增入口验收后再提高。尚未验证覆盖所有分页或全部在售商品。不枚举 ID、不登录、不领取优惠券、不加购或下单。

`status.json` 的 `queue.discoveredCount` 是跨工作流保存的累计候选 ID；`coverage.totalUnique` 仅表示本轮页面观察到的唯一候选 ID，两者不能混用。队列合并保留旧 ID，即使本轮发现范围更小。批次至少尝试 8 款后若请求失败率达到 40%，或连续失败 3 款，立即停止本轮；内部 12 分钟预算保证工作流超时前保存检查点。

访问控制或 robots 禁止时立即停止，后续自动采集保持暂停，等待人工复核。连接失败连续 3 次即停止本轮；没有自动重试目标商品。无效分类入口会在 coverage 中明确显示 0，不宣称已覆盖全站。

云端诊断工作流 `diagnose-cloud.yml` 只手动读取最多 5 个已知公开商品，不修改目录。采集错误记录已脱敏的页面与关键请求阶段，便于区分页面未发起请求、传输失败和响应解析失败；不保存响应正文或请求头。发现频道的响应解析各有独立时间上限，不会因某个无关 API 长时间未结束而无限等待。浏览器不使用请求路由，保持首方页面脚本的 HTTP 缓存。失败候选在队列中冷却 12 小时，再按批次处理。

GitHub Actions 计划北京时间每天 **09:17 和 21:17**（UTC cron `17 1,13 * * *`）更新。GitHub 可能延迟调度，请看实际采样时间。可以通过手动工作流触发更新。

## 本地使用

Node.js 24：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx --no-install playwright install --with-deps chromium
npm test
npm run collect
npm run build
npm run check
```

Windows 默认使用已安装的 Edge。可用 `WINERADAR_PROXY` 指定本机已有网络代理；云端默认使用 Runner 网络，不配置备用代理。

源码不包含凭据。Actions 使用 GitHub 提供的短期 GITHUB_TOKEN 写入本站公开 data 文件，Pages 通过标准 OIDC 部署。不需要个人访问令牌。原始响应、浏览器状态、Cookie、截图和运行日志不进入公开仓库。

## 直接筛选

无需客户端 JavaScript。首页表格完整列出商品；`in-stock.html`、`under-200.html`、`france.html` 为静态筛选页。复杂条件可以读取 catalog.json 的 `items` 和三层结构进行筛选，同时读取 status.json 判断新鲜度。

目录不保证售后、结账库存、优惠和运费；最终交易条件以原商品页为准。WineRadar 与酒云网无隶属关系。
