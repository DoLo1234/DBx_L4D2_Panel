# 上传到 GitHub 快速指南

## 📋 前置准备

项目已完成 Git 初始化和首次提交,包含:
- ✅ 完整的项目代码
- ✅ `.gitignore` 配置文件
- ✅ `README.md` 项目说明
- ✅ `LICENSE` MIT 许可证
- ✅ `.gitattributes` Git LFS 配置(可选)

## 🚀 上传步骤

### 1. 在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 填写仓库名称: `l4d2-manager`
3. 添加描述: `Left 4 Dead 2 服务器管理面板`
4. 选择 Public 或 Private
5. **不要** 勾选 "Initialize this repository with a README"
6. 点击 "Create repository"

### 2. 关联远程仓库并推送

在终端执行以下命令(替换为你的用户名):

```bash
# 添加远程仓库
git remote add origin https://github.com/你的用户名/l4d2-manager.git

# 推送到 GitHub
git push -u origin main
```

### 3. 验证上传

访问你的 GitHub 仓库页面,确认所有文件已上传成功。

## ⚠️ 关于大文件的处理

### 当前状态

项目包含以下大型文件:
- 地图文件 (`app/maps/*.vpk`, `*.zip`, `*.rar`)
- 插件二进制文件 (`*.smx`, `*.so`)

### 方案 A: 使用 Git LFS (推荐用于完整备份)

如果需要使用 Git LFS 跟踪大文件:

```bash
# 安装 Git LFS
# Windows: 从 https://git-lfs.github.com/ 下载安装
# macOS: brew install git-lfs
# Linux: sudo apt-get install git-lfs

# 初始化 Git LFS
git lfs install

# 提交 .gitattributes 配置
git add .gitattributes
git commit -m "chore: 配置 Git LFS"

# 重新推送(如果需要)
git push
```

### 方案 B: 排除大文件 (推荐用于开源项目)

当前的 `.gitignore` 已配置为排除大型游戏文件。如果你希望减小仓库体积:

```bash
# 从 Git 中移除已追踪的大文件(但保留本地文件)
git rm --cached app/maps/*.vpk
git rm --cached app/maps/*.zip
git rm --cached app/maps/*.rar
git rm --cached app/maps/*.7z

# 提交更改
git commit -m "chore: 从版本控制中移除大型地图文件"

# 推送
git push
```

**注意**: 你需要在 README 中说明用户需要自行下载地图文件。

## 🔒 安全提示

### 已处理的敏感信息

- ✅ `.env` 文件已被排除
- ✅ 创建了 `.env.example` 模板
- ✅ 日志文件已被排除

### 推送前检查

确保没有包含:
- ❌ 真实的密码和密钥
- ❌ 数据库连接字符串
- ❌ API 密钥
- ❌ 个人身份信息

## 📝 后续维护

### 日常提交流程

```bash
# 查看更改
git status

# 添加更改
git add .

# 提交
git commit -m "描述你的更改"

# 推送
git push
```

### 分支管理

```bash
# 创建新分支
git checkout -b feature/新功能名称

# 切换分支
git checkout main

# 合并分支
git merge feature/新功能名称
```

## 🆘 常见问题

### Q: 推送失败,提示认证错误?
A: 确保你已配置 GitHub 凭据:
```bash
git config --global user.name "你的用户名"
git config --global user.email "你的邮箱"
```

### Q: 仓库太大怎么办?
A: 
1. 使用 Git LFS 管理大文件
2. 或者从 Git 中移除大文件(见方案 B)
3. 考虑使用 `.gitignore` 排除不必要的文件

### Q: 如何更新已上传的仓库?
A: 直接修改文件后,执行 `git add`, `git commit`, `git push` 即可。

### Q: 如何回滚错误的提交?
A: 
```bash
# 回滚最后一次提交(保留更改)
git reset --soft HEAD~1

# 完全回滚(丢弃更改)
git reset --hard HEAD~1
```

## 📚 相关资源

- [Git 官方文档](https://git-scm.com/doc)
- [GitHub 帮助文档](https://docs.github.com/)
- [Git LFS 文档](https://git-lfs.github.com/)

---

**祝你上传顺利!** 🎉
