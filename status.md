# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 276 |
| 持久队列累计候选 ID 数 | 501 |
| 本轮页面观察到的唯一候选 ID 数 | 0 |
| 尚未验证详情的候选 ID 数 | 223 |
| 历史已验证详情商品数 | 276 |
| 历史已验证库存 SKU 数 | 564 |
| 本轮成功更新 | 7 |
| 本轮公开接口恢复成功 | 0 |
| 本轮详情成功率 | 77.8% |
| 本轮运行耗时 | 340 秒 |
| 本轮已验证库存 SKU 数 | 12 |
| 本轮失败 | 2 |
| 本轮不适合公开目录的商品 | 6 |
| 价格保密待复查候选 ID 数 | 29 |
| 当前库存未知商品数 | 269 |
| 历史库存已失效的商品数 | 269 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/18 05:53:05 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/18 05:53:05 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/18 05:53:05 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/18 23:53:05 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/44183367541) |

## 本轮失败或未入库记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 197392 | response_timeout | Timed out waiting for detail+inventory; no transport failure reported | 2026/11/18 05:48:44 +08:00 |
| 197810 | price_not_public | Public page does not display a product price | 2026/11/18 05:49:30 +08:00 |
| 197765 | price_not_public | Public page does not display a product price | 2026/11/18 05:49:42 +08:00 |
| 197830 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/18 05:50:46 +08:00 |
| 197910 | price_not_public | Public page does not display a product price | 2026/11/18 05:51:41 +08:00 |
| 197926 | price_not_public | Public page does not display a product price | 2026/11/18 05:51:54 +08:00 |
| 189889 | price_not_public | Public page does not display a product price | 2026/11/18 05:52:06 +08:00 |
| 187463 | price_not_public | Public page does not display a product price | 2026/11/18 05:52:32 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 0 | 无 |
| 普通商城 | 0 | discovery_navigation_failed |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 91 |
| 意大利 | 70 |
| 澳大利亚 | 27 |
| 新西兰 | 25 |
| 西班牙 | 20 |
| 智利 | 16 |
| 德国 | 14 |
| 美国 | 7 |
| 中国 | 5 |
| 匈牙利 | 3 |
| 南非 | 2 |
| 奥地利 | 2 |
| 阿根廷 | 2 |
| 日本 | 1 |
| 葡萄牙 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
