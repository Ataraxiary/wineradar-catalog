# WineRadar Catalog

酒云网公开葡萄酒商品的有限样本目录。静态 HTML 和 JSON 直接包含真实酒款、年份、规格价格、实时 SKU 库存及观测时间，可供浏览器、HTTP 客户端及 ChatGPT 读取。

公开地址（发布后）：

- https://ataraxiary.github.io/wineradar-catalog/
- https://ataraxiary.github.io/wineradar-catalog/catalog.json
- https://ataraxiary.github.io/wineradar-catalog/status.json

## 数据口径

沿用酒款 `wines`、销售条目 `listings`、规格 `skus` 三层模型；`items` 是用于阅读和筛选的汇总视图。价格为人民币规格总价，组合装不是单瓶价。年份缺失时保持未知；可见商品名称中明确标示的年份会记录来源。

实时 SKU 库存优先；与同 SKU 静态库存不同时标记差异。请求失败一律不等于售罄。失败条目保留旧数据，并将当前状态标为未知；整轮失败不替换上一份有效 catalog.json，status.json 记录失败阶段、时间及新鲜度。18 小时新鲜度边界以 `dataStaleAfter` 给出。

## 范围与频率

每轮目标 40 个真实商品，最多尝试 50 个销售条目；按 ID 去重，串行执行，商品之间至少间隔 8 秒，单条超时后再等待 30 秒。发现入口来自普通商城首页、可见分类入口及活动卡片，同时保留用户指定的回归商品 197683。不枚举 ID、不全站遍历、不登录、不领取优惠券、不加购或下单。

访问控制或 robots 禁止时立即停止，后续自动采集保持暂停，等待人工复核。连接失败连续 3 次即停止本轮；没有自动重试目标商品。无效分类入口会在 coverage 中明确显示 0，不宣称已覆盖全站。

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
