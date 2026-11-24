# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 316 |
| 持久队列累计候选 ID 数 | 616 |
| 本轮页面观察到的唯一候选 ID 数 | 0 |
| 尚未验证详情的候选 ID 数 | 298 |
| 历史已验证详情商品数 | 316 |
| 历史已验证库存 SKU 数 | 614 |
| 本轮成功更新 | 10 |
| 本轮公开接口恢复成功 | 0 |
| 本轮详情成功率 | 90.9% |
| 本轮运行耗时 | 280 秒 |
| 本轮已验证库存 SKU 数 | 15 |
| 本轮失败 | 1 |
| 本轮不适合公开目录的商品 | 4 |
| 价格保密待复查候选 ID 数 | 63 |
| 当前库存未知商品数 | 306 |
| 历史库存已失效的商品数 | 306 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/24 08:58:01 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/24 08:58:01 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/24 08:58:01 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/25 02:58:01 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/45300710533) |

## 本轮失败或未入库记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 192729 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/24 08:54:38 +08:00 |
| 198063 | price_not_public | Public page does not display a product price | 2026/11/24 08:55:46 +08:00 |
| 198067 | price_not_public | Public page does not display a product price | 2026/11/24 08:55:58 +08:00 |
| 192743 | price_not_public | Public page does not display a product price | 2026/11/24 08:56:10 +08:00 |
| 198109 | price_not_public | Public page does not display a product price | 2026/11/24 08:56:43 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 0 | 无 |
| 普通商城 | 0 | discovery_navigation_failed |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 106 |
| 意大利 | 88 |
| 澳大利亚 | 29 |
| 新西兰 | 25 |
| 西班牙 | 22 |
| 智利 | 18 |
| 德国 | 16 |
| 美国 | 8 |
| 中国 | 5 |
| 匈牙利 | 4 |
| 南非 | 4 |
| 奥地利 | 2 |
| 斯洛伐克共和国 | 2 |
| 阿根廷 | 2 |
| 日本 | 1 |
| 葡萄牙 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
