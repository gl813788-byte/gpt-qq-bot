# 架构与目录职责

简体中文 | [English](ARCHITECTURE.md)

这份文档用于在修改项目前快速确认边界，避免每次都从 `src/server.js` 重新理解整个系统。

## 运行流程

```text
环境变量 + 运行路径
          |
          v
      应用初始状态
          |
          v
 HTTP Hub / 通道适配器 -----> QQ / OneBot
          |                   iMessage
          v
       领域服务 -----------> 记忆、人格、贴纸、联网搜索
          |
          v
       基础设施 -----------> Codex CLI、文件、进程、日志
```

`src/server.js` 是组合根，负责连接依赖、启动 HTTP 监听和关闭进程。它仍是渐进拆分中的大文件，不是新增子系统的默认位置。新的解析、校验、策略和持久化逻辑应放入职责明确的模块，只在组合根中接线。

## 目录地图

| 路径 | 职责 | 适合在这里修改 |
| --- | --- | --- |
| `src/app/` | 应用状态和启动组合 | 全局状态结构、启动生命周期 |
| `src/channels/qq/` | QQ / OneBot 传输边界 | 解析、校验和归一化 QQ 事件 |
| `src/config/` | 环境变量与运行默认值 | 新环境变量、默认值、范围约束 |
| `src/qq-enhancer/` | 可选 QQ 回复增强 | 图片、主动兴趣、回复风格 |
| `src/unified-memory/` | 跨通道统一记忆 | 召回、存储、提示词格式 |
| `src/*.js` | 现有领域与基础设施模块 | 修改对应能力并渐进迁移 |
| `modules/` | 平台客户端和可选集成 | macOS、启动器、系统控制、社交桥接 |
| `scripts/` | 部署与运维命令 | 检查、部署、日志和仓库 `ncc` |
| `test/` | Node.js 测试 | 每次行为调整或模块抽取 |
| `data/` | 本地持久状态 | 不是源码；升级时必须保留 |
| `runtime/` | 日志、回复和临时生成物 | 不是源码；排障时必须保留 |

## 依赖规则

1. 通道适配器先归一化不可信输入，应用策略不直接消费原始 OneBot payload。
2. 新环境变量必须进入 `createEnvironmentConfig`，再把归一化值传给功能模块。`server.js` 内剩余的直接读取是待迁移代码，不应照搬。
3. 可变初始状态由 `createInitialState` 创建，保证测试和未来嵌入式运行获得相互隔离的实例。
4. 领域模块不能自行启动监听器、安装信号处理器或结束进程。
5. 文件、子进程和网络副作用应藏在小型导出接口之后，让策略能在不执行副作用的情况下测试。
6. `data/` 与 `runtime/` 只存运行数据，不能作为源码导入。

## 配置生命周期

```text
进程环境 / config/local.env
              |
              v
    createEnvironmentConfig
              |
              v
         启动默认值
              |
              +---- data/settings.json 覆盖持久设置
              v
           应用状态
```

仓库的 `npm run ncc -- start` 会加载 `config/local.env`；直接执行 `npm start` 只继承当前进程已有的环境变量。`data/settings.json` 加载后会覆盖对应的启动默认值。密钥应留在环境中，详见[配置参考](CONFIGURATION_CN.md)。

## 运行边界

- **HTTP：**仪表盘和管理 API 提供公开状态、维护信息和日志；没有显式开启远程绑定与认证时拒绝非回环访问。
- **OneBot：**Webhook 先经过认证或回环限制、大小限制、归一化和去重，再进入 QQ 策略。
- **Codex：**子进程使用受控环境、并发限制和各通道模型配置。
- **存储：**设置、记忆和社交状态保存在本地文件，后续应按小步抽取到独立 repository。

## 新增功能的步骤

1. 选择最窄边界，优先放入 `src/channels/`、`src/app/` 或已有领域目录。
2. 在 `src/config/environment.js` 增加配置、默认值和范围限制，不再扩大 `server.js` 的直接环境读取。
3. 把纯解析/策略函数与带副作用函数分开导出。
4. 在 `src/server.js` 做少量接线。
5. 新增对应的 `test/<capability>.test.js`，运行 `npm run verify`。

## 渐进拆分路线

后续按行为不变的小切片继续缩小 `src/server.js`：

1. 仪表盘/API 路由移到 `src/channels/http/`。
2. iMessage 轮询和发送移到 `src/channels/imessage/`。
3. OneBot API 调用和 QQ 回复发送移到 `src/channels/qq/`。
4. Codex CLI 执行和额度发现移到 `src/infrastructure/codex/`。
5. 设置与记忆持久化移到 `src/infrastructure/storage/`。

每个切片都应保持公共接口兼容并带回归测试。避免一次性大规模移动文件，否则难以审查行为变化和回滚。

## 修改检查表

1. 明确边界及其不可信输入。
2. 保持持久化 schema 兼容，或提供兼容迁移。
3. 添加聚焦单测，并覆盖副作用与策略的连接处。
4. 运行 `npm run verify`。
5. 同步受影响的中英文文档；运维行为变化时同步仓库 Skill。
