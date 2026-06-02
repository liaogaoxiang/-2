# 转介绍百万激励主页与PK擂台赛战报

这是一个转介绍激励门户，并包含 MOBA 风格的小组 PK 荣耀峡谷战报。

## 数据口径

- 业绩数据支持 CSV 或 XLSX，例如 `测试数据.xlsx`
- PK 分组：`队伍匹配.xlsx`
- 擂台成员按分组表中的 `成员*_小组长` 匹配业绩表的 `小组长_来自人员架构表`
- 战区仅保留 `学习顾问部` 与 `学习规划部`
- 三人 PK 独立展示三队，有 GMV 后按 GMV 前二标记胜利组
- 仓库默认不提交原始 CSV/XLSX，只提交生成后的 `data/report-data.js`

## 安装依赖

```bash
python3 -m pip install -r requirements.txt
```

## 更新数据

```bash
python3 scripts/build-arena-data.py input/测试数据.xlsx input/队伍匹配.xlsx
```

也可以用环境变量：

```bash
PK_DATA_PATH=input/测试数据.xlsx PK_GROUPING_PATH=input/队伍匹配.xlsx python3 scripts/build-arena-data.py
```

## 本地预览

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173/index.html
```

## 文件结构

- `index.html`：转介绍百万激励主页，包含四个激励入口
- `arena.html`：擂台赛战报详情页
- `glory.html`：沿用战报排版的“转介绍荣耀擂台战”MOBA 视觉版本
- `poster.html`：六月小组 PK 宣传海报
- `assets/glory.css`：荣耀峡谷主题视觉覆盖层
- `assets/home.css`：主页轻量视觉与响应式布局
- `assets/home.js`：主页滚动定位、模块提示与时钟
- `assets/styles.css`：科技风视觉、响应式布局
- `assets/app.js`：冠军擂主、榜单、筛选、图表渲染
- `scripts/build-arena-data.py`：CSV/XLSX 清洗与二人、三人 PK 聚合脚本
- `data/report-data.js`：生成后的前端数据
