# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 79 |
| 已发现候选商品数 | 195 |
| 历史已验证详情商品数 | 79 |
| 历史已验证库存 SKU 数 | 174 |
| 本轮成功更新 | 10 |
| 本轮已验证库存 SKU 数 | 25 |
| 本轮失败 | 4 |
| 当前库存未知商品数 | 69 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/3 08:09:18 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/3 08:09:18 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/3 08:09:18 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/4 02:09:18 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/41549535156) |

## 本轮失败记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 192355 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 08:02:30 +08:00 |
| 192491 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 08:03:54 +08:00 |
| 193962 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 08:06:31 +08:00 |
| 193966 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 08:07:55 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 0 | discovery_navigation_failed |
| 普通商城 | 0 | discovery_navigation_failed |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 29 |
| 意大利 | 26 |
| 澳大利亚 | 6 |
| 西班牙 | 6 |
| 新西兰 | 4 |
| 德国 | 3 |
| 智利 | 3 |
| 南非 | 1 |
| 阿根廷 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
