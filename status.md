# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 255 |
| 持久队列累计候选 ID 数 | 482 |
| 本轮页面观察到的唯一候选 ID 数 | 156 |
| 尚未验证详情的候选 ID 数 | 225 |
| 历史已验证详情商品数 | 255 |
| 历史已验证库存 SKU 数 | 526 |
| 本轮成功更新 | 4 |
| 本轮公开接口恢复成功 | 0 |
| 本轮详情成功率 | 66.7% |
| 本轮运行耗时 | 401 秒 |
| 本轮已验证库存 SKU 数 | 5 |
| 本轮失败 | 2 |
| 本轮不适合公开目录的商品 | 9 |
| 价格保密待复查候选 ID 数 | 20 |
| 当前库存未知商品数 | 251 |
| 历史库存已失效的商品数 | 251 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/15 02:51:50 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/15 02:51:50 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/15 02:51:50 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/15 20:51:50 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/43628301012) |

## 本轮失败或未入库记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 183776 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/15 02:47:40 +08:00 |
| 180018 | price_not_public | Public page does not display a product price | 2026/11/15 02:48:25 +08:00 |
| 194439 | price_not_public | Public page does not display a product price | 2026/11/15 02:48:37 +08:00 |
| 195686 | price_not_public | Public page does not display a product price | 2026/11/15 02:48:49 +08:00 |
| 197824 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/15 02:50:15 +08:00 |
| 197825 | price_not_public | Public page does not display a product price | 2026/11/15 02:50:29 +08:00 |
| 197827 | price_not_public | Public page does not display a product price | 2026/11/15 02:50:42 +08:00 |
| 185232 | price_not_public | Public page does not display a product price | 2026/11/15 02:50:54 +08:00 |
| 197856 | price_not_public | Public page does not display a product price | 2026/11/15 02:51:06 +08:00 |
| 197857 | price_not_public | Public page does not display a product price | 2026/11/15 02:51:19 +08:00 |
| 197860 | price_not_public | Public page does not display a product price | 2026/11/15 02:51:31 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 13 | 无 |
| 普通商城 | 114 | 无 |
| 首页专题活动 | 4 | 无 |
| 分类·法国 | 17 | 无 |
| 分类·意大利 | 16 | 无 |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 83 |
| 意大利 | 65 |
| 澳大利亚 | 27 |
| 新西兰 | 24 |
| 西班牙 | 19 |
| 德国 | 14 |
| 智利 | 12 |
| 美国 | 7 |
| 中国 | 3 |
| 匈牙利 | 3 |
| 南非 | 2 |
| 奥地利 | 2 |
| 阿根廷 | 2 |
| 日本 | 1 |
| 葡萄牙 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
