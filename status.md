# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 338 |
| 持久队列累计候选 ID 数 | 707 |
| 本轮页面观察到的唯一候选 ID 数 | 157 |
| 尚未验证详情的候选 ID 数 | 367 |
| 历史已验证详情商品数 | 338 |
| 历史已验证库存 SKU 数 | 646 |
| 本轮成功更新 | 5 |
| 本轮公开接口恢复成功 | 0 |
| 本轮详情成功率 | 83.3% |
| 本轮运行耗时 | 331 秒 |
| 本轮已验证库存 SKU 数 | 8 |
| 本轮失败 | 1 |
| 本轮不适合公开目录的商品 | 9 |
| 价格保密待复查候选 ID 数 | 66 |
| 当前库存未知商品数 | 333 |
| 历史库存已失效的商品数 | 333 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/28 17:01:21 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/28 17:01:21 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/28 17:01:21 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/29 11:01:21 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/46128047668) |

## 本轮失败或未入库记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 190491 | price_not_public | Public page does not display a product price | 2026/11/28 16:57:41 +08:00 |
| 197948 | price_not_public | Public page does not display a product price | 2026/11/28 16:57:53 +08:00 |
| 197959 | price_not_public | Public page does not display a product price | 2026/11/28 16:58:05 +08:00 |
| 197970 | price_not_public | Public page does not display a product price | 2026/11/28 16:58:18 +08:00 |
| 197982 | price_not_public | Public page does not display a product price | 2026/11/28 16:58:30 +08:00 |
| 197998 | price_not_public | Public page does not display a product price | 2026/11/28 16:58:53 +08:00 |
| 198002 | price_not_public | Public page does not display a product price | 2026/11/28 16:59:06 +08:00 |
| 197755 | price_not_public | Public page does not display a product price | 2026/11/28 16:59:18 +08:00 |
| 198028 | price_not_public | Public page does not display a product price | 2026/11/28 16:59:32 +08:00 |
| 198122 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/28 17:01:13 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 0 | 无 |
| 普通商城 | 112 | 无 |
| 首页专题活动 | 9 | 无 |
| 分类·法国 | 16 | 无 |
| 分类·意大利 | 12 | 无 |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 119 |
| 意大利 | 94 |
| 澳大利亚 | 30 |
| 新西兰 | 25 |
| 西班牙 | 22 |
| 智利 | 19 |
| 德国 | 16 |
| 美国 | 9 |
| 中国 | 5 |
| 匈牙利 | 4 |
| 南非 | 4 |
| 奥地利 | 2 |
| 斯洛伐克共和国 | 2 |
| 阿根廷 | 2 |
| 日本 | 1 |
| 葡萄牙 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
