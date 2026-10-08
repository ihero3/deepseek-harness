# Agent Note: 携带密钥的 CI 针对 Threerouter 网关运行

Status: implemented

[English](2026-10-08-ci-external-gateway-endpoint.md) | 中文

## 问题

仓库中携带凭据的 CI 步骤使用 `DEEPSEEK_API_KEY_EXTERNAL` secret 认证，而该 secret 现在存放的是 Threerouter 密钥。映射该 secret 的两个工作流——[.github/workflows/e2e.yml](../../../../.github/workflows/e2e.yml) 与 [.github/workflows/build-exe-for-python-sdk.yml](../../../../.github/workflows/build-exe-for-python-sdk.yml)——仍把 `DEEPSEEK_BASE_URL` 固定为一方端点 `https://api.deepseek.com/anthropic`，即该 secret 还是官方密钥时记录的值（[当时的决策](2026-06-19-real-api-e2e-ci.zh.md)）。Threerouter 密钥无法在一方主机上通过认证，因此该固定值让每个携带凭据的步骤都指向一个会拒绝它自己密钥的端点：端点迁移属于密钥变更的同一批次，而不是后续跟进。

Python 黑盒冒烟测试带来第二个约束。它要求显式的 `DEEPSEEK_BASE_URL`（缺少时会拒绝运行），并驱动一个写死在脚本里的模型 id，因此仅移动端点并不能让它在新的主机上跑起来。

## 决策

两个携带密钥的工作流都把 `DEEPSEEK_BASE_URL` 固定到网关 `https://www.threerouter.com`。Python 冒烟测试新增 `DSH_SMOKE_MODEL` 环境变量覆盖——默认值仍为原先内置的 id——两个安装后 wheel 的 live 步骤把该变量固定为 `deepseek-v4.1-flash`。驱动一方 DeepSeek 接口的真实 API 套件检测到该固定值后会跳过自身。

### 网关无需路径后缀

[messages-api.ts](../../../../packages/llm/llm-deepseek/src/messages-api.ts) 会把 base URL 归一化为 `.../v1` 根，适配器再向 `/messages` 发起请求。因此裸的网关 origin 会解析为 `POST https://www.threerouter.com/v1/messages`，已实测线上返回 200——与适配器向一方 `/anthropic` base 发送的形态一致。请求其余部分不变；两种情况下线上协议都是 Anthropic Messages。

### 冒烟测试的模型 id 是固定值，而非假定值

冒烟测试原先硬编码 `deepseek-v4-flash`。网关拥有自己的模型目录，因此冒烟测试所需的 id 现在是显式的 CI 输入，而不是对第三方路由的假定。已实测该网关：内置的 `deepseek-v4-flash` 与固定的 `deepseek-v4.1-flash` 都返回 200 并完成一次 Anthropic `tool_use` 轮次，这正是冒烟测试两个使用工具轮次所需要的。该固定值与 base URL 的固定值出于同样的密封性理由——CI 边界声明它需要的模型，而不是继承某个模型。

### 一方 DeepSeek 套件跳过自身

五个 `*.e2e.ts` 文件断言的一方行为并非网关所能提供：[llm-deepseek `adapter.e2e.ts`](../../../../packages/llm/llm-deepseek/tests/adapter.e2e.ts)、[llm-deepseek `runtime.e2e.ts`](../../../../packages/llm/llm-deepseek/tests/runtime.e2e.ts)、[llm-pi-ai `adapter.e2e.ts`](../../../../packages/llm/llm-pi-ai/tests/adapter.e2e.ts)、[subagent-claude-code `real-deepseek.e2e.ts`](../../../../packages/subagent/subagent-claude-code/tests/real-deepseek.e2e.ts) 与 [subagent-codex `real-deepseek.e2e.ts`](../../../../packages/subagent/subagent-codex/tests/real-deepseek.e2e.ts)。每个文件都用同一个谓词门控其套件：

```ts
const OFFICIAL_ENDPOINT_CONFIGURED = process.env.DEEPSEEK_BASE_URL?.startsWith('https://api.deepseek.com') ?? true
```

当环境固定到其他主机时，这些套件会跳过，而不是针对一个会返回不同模型、不同来源块协议格式的网关运行——对于 subagent 冒烟测试，也避免把硬连线到一方 Messages URL 的、被启动的 agent SDK 重定向。跳过是诚实的：一方接口在该环境中未配置，正如缺少密钥时套件已经会跳过一样。未固定端点的本地运行仍得到 `undefined`，因此默认的 `true` 依然会执行它们。

这些套件中其余受 `DEEPSEEK_VISION_E2E` 门控的用例不受影响：网关对 `deepseek-v4-flash-vision-exp` 返回 404 `model_not_found`，但该 id 本就不在默认 CI 路径上。

### 恢复官方端点

该迁移可逆，且反转条件明确。如果仓库 secret 再次变成一方密钥——或新增一个独立的一方 secret 并映射进这些步骤——则把 `DEEPSEEK_BASE_URL` 恢复为一方端点、去掉 `DSH_SMOKE_MODEL` 固定值，并从五个套件中移除端点谓词。在那之前，`https://www.threerouter.com` 是本仓库密钥唯一能通过认证的主机，而 `ci-workflow.spec.ts` 的断言将其固定下来，使二者不会静默漂移。

## 曾考虑的替代方案

**只迁移 e2e 工作流，让安装后 wheel 冒烟测试留在一方端点。** 否决：两个步骤读取同一个 secret，因此其中一个会因同样的原因持续失败。拆开改动还会让同一个密钥下同时存在两个端点。

**把 e2e 套件里的每个模型 id 都改成网关提供的名字。** 否决：该套件的 id 数量远超单个变量所能覆盖，改写它们会让套件耦合到某个网关的目录。跳过一方套件并只固定冒烟测试的一个 id，把网关耦合限制在两处。

**删除一方套件而不是跳过它们。** 否决：它们是一方端点的证据，在一方端点被配置时始终有效；跳过保留了这一价值，而不假装网关运行是等价证据。

**保留官方固定值，另行加入网关密钥。** 否决：本仓库只持有一个外部 secret。两个 secret 会声称同一用途，并让两个工作流静默分叉。

## 后果

CI 的真实 API 覆盖率现在针对第三方网关运行：合并信号描述的是该网关与 harness 协作的行为，而非一方端点的行为。由此产生两个后果。第一，一方 DeepSeek 套件不再在 CI 中运行——它们在该固定值下跳过——因此一方端点特有的回归只能通过本地运行或恢复官方 secret 才能到达 CI；它们的单元覆盖仍以无密钥方式运行。第二，CI 依赖该网关保持可达并持续提供固定的模型 id，这是 base URL 不再隐藏的一项依赖。

该改动也让 secret 的作用范围变得清晰：两个工作流文件、冒烟测试的模型覆盖与一处 spec 断言是外部主机被点名的完整集合，而五个套件中的端点谓词是主动退出该端点的完整集合。
