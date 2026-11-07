# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 181 |
| 持久队列累计候选 ID 数 | 351 |
| 本轮页面观察到的唯一候选 ID 数 | 0 |
| 尚未验证详情的候选 ID 数 | 168 |
| 历史已验证详情商品数 | 181 |
| 历史已验证库存 SKU 数 | 378 |
| 本轮成功更新 | 10 |
| 本轮公开接口恢复成功 | 0 |
| 本轮详情成功率 | 83.3% |
| 本轮运行耗时 | 318 秒 |
| 本轮已验证库存 SKU 数 | 21 |
| 本轮失败 | 2 |
| 本轮不适合公开目录的商品 | 1 |
| 价格保密待复查候选 ID 数 | 3 |
| 当前库存未知商品数 | 171 |
| 历史库存已失效的商品数 | 171 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/7 15:18:11 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/7 15:18:11 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/7 15:18:11 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/8 09:18:11 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/42350273237) |

## 本轮失败或未入库记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 197274 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/7 15:14:14 +08:00 |
| 194197 | price_not_public | Public page does not display a product price | 2026/11/7 15:15:04 +08:00 |
| 197551 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/7 15:17:49 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 0 | 无 |
| 普通商城 | 0 | discovery_navigation_failed |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 61 |
| 意大利 | 54 |
| 澳大利亚 | 24 |
| 新西兰 | 14 |
| 德国 | 9 |
| 西班牙 | 9 |
| 智利 | 6 |
| 中国 | 2 |
| 美国 | 2 |
| 阿根廷 | 2 |
| 匈牙利 | 1 |
| 南非 | 1 |
| 奥地利 | 1 |
| 日本 | 1 |
| 葡萄牙 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
