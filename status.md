# WineRadar 更新状态

本文件与 [完整商品目录](https://ataraxiary.github.io/wineradar-catalog/catalog.md)、[权威 JSON](https://ataraxiary.github.io/wineradar-catalog/catalog.json)、[机器状态](https://ataraxiary.github.io/wineradar-catalog/status.json) 来自同一份已保存快照。

| 字段 | 值 |
| --- | --- |
| 采集状态 | partial |
| 目录商品数 | 285 |
| 持久队列累计候选 ID 数 | 531 |
| 本轮页面观察到的唯一候选 ID 数 | 0 |
| 尚未验证详情的候选 ID 数 | 244 |
| 历史已验证详情商品数 | 285 |
| 历史已验证库存 SKU 数 | 573 |
| 本轮成功更新 | 3 |
| 本轮公开接口恢复成功 | 0 |
| 本轮详情成功率 | 50.0% |
| 本轮运行耗时 | 251 秒 |
| 本轮已验证库存 SKU 数 | 3 |
| 本轮失败 | 3 |
| 本轮不适合公开目录的商品 | 2 |
| 价格保密待复查候选 ID 数 | 32 |
| 当前库存未知商品数 | 282 |
| 历史库存已失效的商品数 | 282 |
| 保留历史数据 | 是 |
| 商品目录快照时间（北京时间） | 2026/11/20 16:39:37 +08:00 |
| 最近成功采集时间（北京时间） | 2026/11/20 16:39:37 +08:00 |
| 最近采集结束时间（北京时间） | 2026/11/20 16:39:37 +08:00 |
| 数据新鲜度界限（北京时间） | 2026/11/21 10:39:37 +08:00 |
| 最近采集运行链接 | [GitHub Actions](https://github.com/Ataraxiary/wineradar-catalog/actions/runs/44703619129) |

## 本轮失败或未入库记录

| 商品 ID | 代码 | 原因 | 时间（北京时间） |
| --- | --- | --- | --- |
| 197278 | price_not_public | Public page does not display a product price | 2026/11/20 16:36:20 +08:00 |
| 197942 | price_not_public | Public page does not display a product price | 2026/11/20 16:36:58 +08:00 |
| 167797 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/20 16:37:51 +08:00 |
| 197948 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/20 16:38:44 +08:00 |
| 197959 | request_failed | page.goto: Timeout 45000ms exceeded. | 2026/11/20 16:39:37 +08:00 |

## 本轮发现入口

| 入口 | 观察到的候选数 | 入口错误 |
| --- | --- | --- |
| 现货速发 | 0 | 无 |
| 普通商城 | 0 | discovery_navigation_failed |

## 已验证详情商品的产国

| 产国 | 商品数 |
| --- | --- |
| 法国 | 94 |
| 意大利 | 74 |
| 澳大利亚 | 27 |
| 新西兰 | 25 |
| 西班牙 | 21 |
| 智利 | 16 |
| 德国 | 15 |
| 美国 | 7 |
| 中国 | 5 |
| 匈牙利 | 3 |
| 南非 | 2 |
| 奥地利 | 2 |
| 阿根廷 | 2 |
| 日本 | 1 |
| 葡萄牙 | 1 |

候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。
