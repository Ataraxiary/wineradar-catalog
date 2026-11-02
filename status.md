# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 51 |
| 已发现候选商品数 | 169 |
| 历史已验证详情商品数 | 51 |
| 历史已验证库存 SKU 数 | 95 |
| 本轮成功更新 | 10 |
| 本轮已验证库存 SKU 数 | 30 |
| 本轮失败 | 4 |
| 当前库存未知商品数 | 41 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/3 07:39:12 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/3 07:39:12 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/4 01:39:12 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/41545860913) |

## 本轮失败记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 179645 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 07:34:29 +08:00 |
| 179992 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 07:35:52 +08:00 |
| 182658 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/3 07:37:27 +08:00 |
| 183617 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 07:38:21 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 13 | 无 |
| 普通商城 | 115 | 无 |
| 首页专题活动 | 5 | 无 |
| 分类·法国 | 23 | 无 |
| 分类·意大利 | 16 | 无 |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 20 |
| 意大利 | 14 |
| 西班牙 | 5 |
| 新西兰 | 4 |
| 德国 | 3 |
| 澳大利亚 | 3 |
| 南非 | 1 |
| 智利 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
