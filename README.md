# 掐指神通 · 小六壬

道家掌诀演算器。iPhone 优先的网页应用（PWA），添加到主屏后全屏运行、断网可用。

## 在线版

GitHub Pages 托管，源码仓库：<https://github.com/JustinDoF/Tao>

启用 Pages 后访问地址为：

```
https://justindof.github.io/Tao/
```

iPhone 上用 **Safari** 打开该地址 → 分享 → 「添加到主屏幕」。

> 修改代码后推送到 `main` 分支，Pages 约 1 分钟自动重新部署。

## 一分钟上手

1. 用 **Safari** 打开本页（微信内打开无法安装）。
2. 点底部 **分享** 按钮 → **「添加到主屏幕」** → 右上角「添加」。
3. 主屏出现「掐指神通」图标，点开即全屏使用，不联网也能算。

## 三种起课方式

| 方式 | 说明 | 适用 |
|---|---|---|
| **时间起课** | 自动取当下农历月、日、时辰，大安起正月顺数 | 事发即占，最常用 |
| **报数起课** | 心中默事，随口报 1–3 个数 | 无明确时间，或需以数应事 |
| **随机起课** | 凝神默念后直接起课，取三随机数 | 临时起意 |

「另择时刻」里既可填公历时刻自动倒推农历，也可直接改农历月/日/时辰三项——后者等同于以数起课，适合推算已发生之事。

## 演算规则

六宫顺行不逆，至空亡复归大安：

```
大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡 →（回大安）
 1      2      3      4      5      6
```

- **三步起课**：大安起正月，顺数至当月 = 第一落宫；该宫起初一，顺数至当日 = 第二落宫；该宫起子时，顺数至当下时辰 = 第三落宫。
- **三宫含义**：天时（起因）· 地利（过程）· 人和（结果）。
- **报数**：一数落天时，二数落地利，三数落人和；只报一数直断，报两数首尾并参。
- **断法**：以末宫定成败，以首宫观起因。首尾皆吉则事顺；始吉终凶宜见好即收；首凶终吉则先难后易。

数学上等价于：`主宫序号 = (月 + 日 + 时 − 3) mod 6`（0 即大安）。此式已在 `tools/test-engine.js` 中以全部 4320 组月日时交叉验证。

## 收录内容

每宫含：断辞（宣纸卡）、象意、五行、六神、方位、色、数、应期，以及求财/婚姻/失物/出行/疾病/官讼/谋事/行人 八类分项断语。

## 本地运行

需要一个静态服务器（`file://` 打开时 Service Worker 与「添加到主屏」不生效）：

```bash
cd daoshu
python -m http.server 8791
```

然后在本机访问 `http://127.0.0.1:8791`。

**让 iPhone 访问**（同一 Wi-Fi 下）：

```bash
python -m http.server 8791 --bind 0.0.0.0
```

查本机局域网 IP（Windows）：

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' }
```

iPhone 的 Safari 里打开 `http://<电脑IP>:8791` 即可。注意：非 https 的局域网地址在 iOS 上**不能**添加到主屏（Safari 会隐藏该选项），要装到主屏需走 https 域名。

## 文件结构

```
daoshu/
├── index.html                页面骨架
├── manifest.webmanifest      PWA 清单
├── sw.js                     离线缓存
├── css/style.css             视觉样式
├── js/lunar.js               公历⇄农历（1900–2100）、时辰、干支
├── js/data.js                六宫数据（断辞·象意·分项断语）
├── js/engine.js              起课算法与组合总断
├── js/app.js                 界面与交互
├── icons/                    应用图标
└── tools/
    ├── gen-icons.js          重新生成图标（纯 Node，无依赖）
    └── test-engine.js        算法与农历自检
```

自检：

```bash
node daoshu/tools/test-engine.js
```

## 在线更新文件（含图片）

仓库里的文件可以直接在网页上改，不需要装 Git 客户端。

**改文字、改代码（纯文本）**

1. 打开 <https://github.com/JustinDoF/Tao>
2. 点进要改的文件（如 `js/data.js`），点右上角 **铅笔图标**
3. 改完 → 页面底部 **Commit changes** → 直接提交到 `main`

**换图标（PNG 等图片）**

1. 打开 <https://github.com/JustinDoF/Tao/tree/main/icons>
2. 点右上角 **Add file → Upload files**
3. 把 PNG 拖进虚线框，**文件名必须与原来一致**（如 `icon-180.png`），GitHub 会自动覆盖同名文件
4. 页面底部 **Commit changes**

> 注意：`icon-180.png` 是 iPhone 主屏图标，改完要在手机上**删掉主屏图标重新添加**才会生效（iOS 缓存图标很顽固）。尺寸必须是 180×180。

**换整套图标**：本地改 `tools/gen-icons.js` 里的配色或比例，跑 `node daoshu/tools/gen-icons.js` 重新生成，再按上面步骤覆盖上传。

## 说明

小六壬属道家民间掌诀，历代口诀流派互有出入，本作采通行本。所出断语为传统文化推演，非科学预测，仅供参详与自省，勿据以决大事、代医疗。

课录仅存于本机 localStorage，不上传、不联网。
