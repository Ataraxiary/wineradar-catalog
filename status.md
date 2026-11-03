# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 89 |
| 已发现候选商品数 | 220 |
| 历史已验证详情商品数 | 89 |
| 历史已验证库存 SKU 数 | 196 |
| 本轮成功更新 | 10 |
| 本轮详情成功率 | 83.3% |
| 本轮运行耗时 | 313 秒 |
| 本轮已验证库存 SKU 数 | 22 |
| 本轮失败 | 2 |
| 当前库存未知商品数 | 79 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/3 16:02:12 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/3 16:02:12 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/3 16:02:12 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/4 10:02:12 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/41599655872) |

## 本轮失败记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 194377 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/3 15:59:30 +08:00 |
| 195117 | ERR_ASSERTION | Missing wine details for product 125909 | 2026/11/3 16:00:44 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 15 | 无 |
| 普通商城 | 117 | 无 |
| 首页专题活动 | 4 | 无 |
| 分类·法国 | 23 | 无 |
| 分类·意大利 | 16 | 无 |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 32 |
| 意大利 | 29 |
| 澳大利亚 | 7 |
| 西班牙 | 6 |
| 德国 | 5 |
| 新西兰 | 4 |
| 智利 | 3 |
| 匈牙利 | 1 |
| 南非 | 1 |
| 阿根廷 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
