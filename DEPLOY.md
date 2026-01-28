# 🚀 安全发布指南 (Secure Deployment Guide)

为了保护你的 API Key 不被盗用，并防止陌生人消耗你的额度，我们采用了 **"后端代理 + 访问密码"** 的安全架构。

## ⚠️ 核心变化
- **本地开发 (Dev)**: 前端直接调用 OpenRouter，使用 `.env.local` 中的 Key 和密码。
- **线上环境 (Prod)**: 前端请求发给 Vercel 后端 (`/api/chat`)，后端验证密码后再调用 OpenRouter。**Key 永远不会暴露给浏览器**。

---

## 第一步：推送到 GitHub

1.  **提交代码**:
    ```bash
    git add .
    git commit -m "Security Upgrade: Add Backend Proxy and Lock Screen"
    git push
    ```

---

## 第二步：在 Vercel 设置环境变量 (关键!)

由于架构升级，你需要去 Vercel 控制台更新环境变量。

1.  登录 [Vercel Dashboard](https://vercel.com/dashboard)。
2.  进入你的项目 -> **Settings** -> **Environment Variables**。
3.  **添加/修改以下变量** (注意：不要带 `VITE_` 前缀，这是给后端用的)：

| Variable Name | Value (示例) | 说明 |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | `sk-or-v1-......` | 你的 OpenRouter 完整 Key。**这是给后端用的，绝对安全。** |
| `SITE_PASSWORD` | `123456` | 设置一个你的专属访问密码。用户必须输入此密码才能使用 AI。 |

4.  **重要：删除旧变量** (如果有)
    *   如果你之前设置了 `VITE_OPENROUTER_API_KEY`，建议在 Vercel 上**删除它**。生产环境不需要它了，留着反而有风险。

---

## 第三步：重新部署 (Redeploy)

环境变量修改后，通常需要重新部署才会生效。

1.  在 Vercel 项目页面，点击 **Deployments** 标签。
2.  找到最近的一次部署（或者点击右上角三个点 -> **Redeploy**）。
3.  等待部署完成。

---

## ✅ 验证是否成功

1.  打开你的 Vercel 网址。
2.  你应该会看到一个 **"Access Required" (需要访问权限)** 的锁屏界面。
3.  输入你在 Vercel 设置的 `SITE_PASSWORD` (例如 `123456`)。
4.  进入后，尝试发送一条消息。
    *   如果成功回复，说明 **后端代理** 运作正常！
    *   此时，你的 API Key 是隐藏在 Vercel 服务器上的，黑客无法从浏览器通过 F12 偷走它。
