# Open Wegram Bot - OWB

## 一个让人呼吸顺畅的 Telegram 双向私聊机器人 🤖（零费用）

这是一个基于 Cloudflare Worker 的 Telegram 双向私聊机器人，无需服务器、无需数据库、无需自己的域名即可轻松部署。

用户可以通过您的机器人向您发送消息，您可以直接回复这些消息，实现双向通信。

---

## ✨ 特色功能

- 🔄 **双向通信** — 接收和回复来自用户的消息
- 💾 **无需数据库** — 基于 KV 的轻量存储，仅用于黑名单和多 Bot 管理
- 🌐 **无需自己的域名** — 使用 Cloudflare Worker 提供的免费域名
- 🚀 **轻量部署** — 几分钟内完成设置
- 💰 **零成本运行** — Cloudflare 免费计划内使用
- 🔒 **安全可靠** — Telegram 官方 API + Secret Token 验证
- 🔌 **多机器人支持** — 一个 Worker 可注册多个 Bot（通过 KV）
- 🛠️ **管理命令** — 直接在 Telegram 中管理黑名单和 Bot
- 📝 **编辑消息处理** — 用户编辑消息后自动转发并标记

---

## 📁 项目结构

```
src/
├── index.js                # Worker 入口
├── config/
│   ├── env.js              # 环境变量读取
│   └── permissions.js      # 权限常量
├── core/
│   ├── router.js           # HTTP 路由（install / uninstall / webhook）
│   ├── dispatcher.js       # 消息分发（命令 / 普通消息）
│   └── command.js          # 命令路由
├── handlers/
│   ├── admin.js            # 安装/卸载 /addbot /delbot
│   ├── blacklist.js        # /ban /unban /banlist
│   ├── forward.js          # 消息转发 & 编辑消息
│   ├── help.js             # /help
│   └── chat.js             # /start
├── middleware/
│   ├── auth.js             # 管理员/owner 鉴权
│   └── blacklist.js        # 黑名单检查
├── services/
│   ├── kvService.js        # KV 操作封装
│   └── telegramService.js  # Telegram API 通信
└── utils/
    ├── constants.js        # KV key 生成函数
    ├── parse.js            # 输入校验
    ├── response.js         # HTTP Response 工具
    └── logger.js           # 日志
```

---

## 🛠️ 前置要求

- Cloudflare 账号
- Telegram 账号
- 一个科学工具（仅设置阶段需要，用于访问 Worker 默认域名，自绑域名无视）

---

## 📝 设置步骤

### 1. 获取 Telegram UID

向 [@userinfobot](https://t.me/userinfobot) 发送任意消息，它会告诉您自己的 UID。

请记下您的数字 ID（例如：`123456789`）。

### 2. 创建 Telegram Bot

1. 在 Telegram 中搜索并打开 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令
3. 按照提示设置您的机器人名称和用户名（用户名必须以 `bot` 结尾）
4. 成功后，BotFather 会发给您一个 Bot API Token（格式：`000000000:ABCDEFGhijklmnopqrstuvwxyz`）
5. 请安全保存这个 Bot API Token

### 3. 部署到 Cloudflare Workers

#### 方式一：GitHub 一键部署（推荐 ⭐）

1. Fork 本仓库到您的 GitHub 账户
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 导航到 **Workers & Pages** → **Create Application** → **Connect to Git**
4. 授权并选择您 fork 的仓库
5. 配置环境变量（见下方表格）
6. 点击 **Save and Deploy**

#### 方式二：Wrangler CLI

```bash
git clone https://github.com/wozulong/open-wegram-bot.git
cd open-wegram-bot
npm install
npx wrangler deploy
npx wrangler secret put SECRET_TOKEN
```

#### 方式三：Cloudflare Dashboard 手动部署

1. 在 Dashboard 创建 Worker
2. 将 `src/` 目录下所有文件内容复制到 Worker 中
3. 入口文件为 `src/index.js`
4. 配置环境变量

### 4. 配置环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `ADMIN` | ✅ | 系统管理员的 Telegram UID（如 `123456789`） |
| `BOT_TOKEN` | ✅ | 系统管理员的 Bot API Token，填入 BotFather 给的 Bot API Token |
| `SECRET_TOKEN` | ✅ | 安全令牌，至少 16 位，包含大小写字母和数字 |
| `PREFIX` | ❌ | 推荐填写，URL 前缀，默认 `public` |
| `BLACKLIST` | ❌ | 静态黑名单 UID（逗号分隔），无 KV 时生效 |

### 5. 配置 KV 命名空间（可选，推荐）

KV 用于动态黑名单管理和多 Bot 支持：

1. 在 cloudflare 首页 → **存储与数据库** → **Workers KV** → **Create Instance**
2. 在 **Worker 详情页** → **绑定** → **KV 命名空间** 中添加绑定：
   - 变量名称：`KV`
   - KV 命名空间：选择刚创建的

### 6. 注册 Bot

访问以下 URL 注册您的 Bot：

```
https://your-worker.workers.dev/public/install/YOUR_UID/YOUR_BOT_TOKEN
```

例如：

```
https://open-wegram-bot.xxx.workers.dev/public/install/123456789/000000000:ABCDEFGhijklmnopqrstuvwxyz
```

看到成功消息即注册完成。

### 7. (可选) 添加更多 Bot

如果配置了 KV，系统管理员可以通过 Telegram  命令添加更多 Bot（无需修改环境变量）

```
/addbot 222222222 BBBBBB:another_token
```

添加后通过 URL 安装，访问 `https://your-worker.workers.dev/public/install/222222222/BBBBBB:another_token` 安装。

---

## 📱 使用方法

### 接收消息

任何人给您的 Bot 发送消息，您都会收到转发，消息下方显示发送者信息和 UID。

### 回复消息

在 Telegram 中直接回复转发给您的消息，回复会自动发送给原始发送者。

### 编辑消息

用户编辑消息后，Bot 会自动重新转发编辑后的内容，并追加「对方已编辑」标记。

### 管理命令

在 Telegram 中向您的 Bot 发送以下命令：

| 命令 | 说明 | 权限 |
|---|---|---|
| `/ban <UID>` | 拉黑用户 | admin / bot_owner |
| `/unban <UID>` | 解封用户 | admin / bot_owner |
| `/banlist` 或 `/bans` | 查看黑名单 | admin / bot_owner |
| `/addbot <UID> <Token>` | 添加 Bot 到 KV 列表 | 仅 admin |
| `/delbot <Token>` | 从 KV 列表删除 Bot | 仅 admin |
| `/help` | 显示帮助 | admin / bot_owner |

**快捷拉黑：** 回复转发消息并输入 `/ban`，自动拉黑该发送者。或者通过指定 UID 拉黑

### 卸载 Bot

```
https://your-worker.workers.dev/public/uninstall/BOT_TOKEN
```

---

## 🔒 安全说明

- `SECRET_TOKEN` 用于验证 Telegram 回调请求的合法性，**请勿随意更改**，更改后所有已注册 Bot 需重新安装
- `ADMIN` 环境变量中的 UID 是超级管理员，拥有全部命令权限
- KV 列表中的 Bot owner 只能使用黑名单管理命令，无法执行 `/addbot` `/delbot`

---

## ⚠️ 使用限制

Cloudflare Worker 免费套餐有每日 10 万请求的限制，个人使用通常足够。

---

## 🔍 故障排除

- **消息未转发** — 检查 Bot 是否已注册，查看 Worker 日志
- **命令无响应** — 确认是否在 KV 中配置了命名空间绑定
- **回复消息失败***: 检查您是否正确使用 Telegram 的回复功能
- **注册失败** — 确保 URL 中的 UID 和 Token 与 `ADMIN` / `BOT_TOKEN` 匹配（或已在 KV 列表中）
- **无法访问注册 URL** — 使用科学工具或绑定自定义域名
- **GitHub 部署失败**: 检查环境变量是否正确设置，仓库权限是否正确
- **Worker 部署失败**: 检查 Wrangler 配置并确保您已登录到 Cloudflare

---

## 🎁 鸣谢

- [wozulong/open-wegram-bot](https://github.com/wozulong/open-wegram-bot)

---

## 📄 许可证

本项目基于 [GNU General Public License v3.0](LICENSE) 协议开源。

---

🎉🎉🎉希望这个工具能让您的 Telegram 私聊体验更加便捷！🎉🎉🎉
