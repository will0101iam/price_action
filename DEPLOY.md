# 🚀 如何免费发布你的应用 (Deployment Guide)

要将这个应用发布到互联网上，最简单且免费的方式是使用 **Vercel**。它完美支持 Vite + React 项目，并且提供免费的 SSL 证书和全球 CDN。

## ⚠️ 安全警告
你的 API Key 非常敏感！**千万不要**把它直接提交到 GitHub 公开仓库。
我已经帮你把 Key 移到了 `.env.local` 文件中，并且在 `.gitignore` 中配置了忽略。这样你在本地开发时依然可用，但上传代码时不会泄露 Key。

---

## 第一步：准备代码 (Push to GitHub)

1.  **初始化 Git 仓库** (如果你还没做):
    ```bash
    git init
    git add .
    git commit -m "Initial commit - Ready for deployment"
    ```

2.  **创建 GitHub 仓库**:
    *   登录 [GitHub](https://github.com)。
    *   点击右上角 "+" -> "New repository"。
    *   输入仓库名 (例如 `pa-trainer`)。
    *   **建议选择 Private (私有)**，虽然我们做了安全措施，但私有仓库更保险。
    *   点击 "Create repository"。

3.  **上传代码**:
    *   按照 GitHub 页面上的提示，执行以下命令（替换你的仓库地址）:
    ```bash
    git remote add origin https://github.com/你的用户名/pa-trainer.git
    git branch -M main
    git push -u origin main
    ```

---

## 第二步：发布到 Vercel (One-Click Deploy)

1.  **注册/登录 Vercel**:
    *   访问 [vercel.com](https://vercel.com)。
    *   使用 GitHub 账号登录（最方便）。

2.  **导入项目**:
    *   在 Vercel 控制台点击 **"Add New..."** -> **"Project"**.
    *   在列表中找到你刚才创建的 GitHub 仓库 (`pa-trainer`)，点击 **"Import"**。

3.  **配置环境变量 (Environment Variables)**:
    *   在 "Configure Project" 页面，找到 **"Environment Variables"** 区域。
    *   添加你的 API Key：
        *   **Key**: `VITE_OPENROUTER_API_KEY`
        *   **Value**: `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`
    *   点击 **"Add"**。

4.  **点击 Deploy**:
    *   点击蓝色的 **"Deploy"** 按钮。
    *   等待约 1 分钟，烟花绽放，你的应用就上线了！🎉

---

## 常见问题

*   **更新代码怎么办？**
    *   只需要在本地修改代码，然后 `git push` 到 GitHub，Vercel 会自动检测并重新部署更新的版本。
*   **语音输入在手机上能用吗？**
    *   Vercel 提供的域名是 `https` 的，这满足了浏览器的安全要求。但是，请确保你的手机网络能访问 Google 服务（因为使用了 Chrome 语音识别），否则语音功能可能在手机上无法使用。文本输入功能则不受影响。
