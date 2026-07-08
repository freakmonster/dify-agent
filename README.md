# dify-agent

基于 [Dify](https://dify.ai) Chat API 构建的智能对话 Web 客户端，提供清爽的 Glassmorphism 毛玻璃界面。

## 功能特性

- **多轮对话** — 支持上下文连贯的多轮对话，自动管理会话历史
- **会话侧边栏** — 会话列表管理（新建、重命名、删除），支持展开/收起切换
- **流式输出** — SSE 实时渲染助手回复，打字机效果
- **消息复制** — 对话气泡一键复制内容
- **消息反馈** — 点赞 / 点踩，反馈同步至 Dify 后台
- **推荐问题** — 自动展示 Dify 应用配置的建议追问问题
- **Glassmorphism 毛玻璃设计** — 半透明背景、模糊效果、柔和渐变
- **国际化** — 中英文切换，自动跟随 Dify 应用的 `default_language`

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 3 + CSS Modules |
| 语言 | TypeScript 5 |
| Markdown 渲染 | react-markdown + remark-gfm + KaTeX |
| 国际化 | i18next + react-i18next |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/freakmonster/dify-agent.git
cd dify-agent
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
# Dify 应用 API Key（在 Dify 控制台 → 应用 → API 访问 中获取）
APP_KEY=app-yUtqtMZm2JsGeZzLfNrl7b49

# Dify API 地址（自托管则改为你的实例地址）
API_URL=https://api.dify.ai/v1
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 查看效果。

### 4. 构建生产版本

```bash
npm run build
npm run start
```

## 项目结构

```
app/
├── api/                       # Next.js Route Handlers（服务端代理 Dify API）
│   ├── chat-messages/         # 发送聊天消息（SSE 流式）
│   ├── conversations/         # 会话管理（列表、删除、重命名）
│   ├── messages/              # 消息历史、建议问题、反馈
│   └── parameters/            # 应用参数
├── components/
│   ├── index.tsx              # 根组件：初始化语言、应用参数
│   ├── chat-generation/       # 聊天主界面（流式对话、反馈等）
│   ├── conversation-sidebar/  # 会话列表侧边栏（展开/收起）
│   └── base/                  # 通用 UI 组件（Loading、Toast）
├── styles/
│   └── globals.css            # 全局样式与 Glassmorphism 主题变量
config/
└── index.ts                   # 全局配置与环境变量读取
types/
└── app.ts                     # TypeScript 类型定义
service/
├── index.ts                   # 服务层（封装所有 Dify API 调用）
└── base.ts                    # 基础请求封装（SSE 流式解析）
utils/
├── markdown.ts                # Markdown 工具函数
├── resolve-app-type.ts        # 应用类型检测
└── index.ts                   # 工具函数入口
i18n/                          # 国际化配置与语言包
```
