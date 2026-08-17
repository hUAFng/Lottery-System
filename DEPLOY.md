# 部署说明（DEPLOY.md）

本项目是**纯前端静态网页**，无需后端。只需把整个项目目录放到任意**静态托管**上，获得一个 HTTPS 链接，即可在**微信**内打开、抽奖并转发。

---

## 0. 发布前必须改的配置

打开 `js/app.js` 顶部：

```js
var CONFIG = {
  IS_DEV: true,   // ← 正式版请改为 false（隐藏"退出登录"按钮）
  ...
};
```

把 `IS_DEV` 改成 `false` 后再部署。

> 注意：`13925599313`（老爸）与 `19868735951`（测试）是**写死**的，正式版无需改动。
> 若想调整"第5次起手机进池"或"初始次数"，改 `PHONE_DRAW_START` / `INIT_TIMES`。

---

## 1. 部署到静态托管（三选一）

### 方案 A：GitHub Pages（免费、推荐）
1. 在 GitHub 新建仓库（可私有后改公有）。
2. 将项目文件提交推送：
   ```bash
   git init
   git add .
   git commit -m "抽奖系统"
   git branch -M main
   git remote add origin <你的仓库地址>
   git push -u origin main
   ```
3. 仓库 `Settings → Pages → Source → main 分支 /root` → Save。
4. 等 1~2 分钟，得到形如 `https://<用户名>.github.io/<仓库名>/` 的地址，访问 `index.html`。

### 方案 B：腾讯云 COS / 阿里云 OSS（需备案域名可选）
1. 开通对象存储，新建公有读 Bucket。
2. 把 `index.html`、`css/`、`js/` 上传到根目录。
3. 开启**静态网站托管**，得到默认域名或绑定自定义域名（HTTPS）。

### 方案 C：自有服务器 / Nginx
```bash
# 将项目放到 /var/www/lottery
cp -r index.html css js /var/www/lottery/
```
Nginx 配置：
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    root /var/www/lottery;
    index index.html;
    # 配置 SSL 证书（微信要求 HTTPS）
}
```

> **微信要求**：在微信内分享/打开需 **HTTPS** 域名。GitHub Pages / 对象存储默认带 HTTPS，最省事。

---

## 2. 在手机上使用

1. 用**微信**扫部署地址的二维码，或把链接发到自己的微信里点开。
2. 微信内置浏览器打开后即为完整抽奖页（已做手机适配、无缩放）。
3. 转发：用户点页面"分享给好友"按钮 → 系统提示"已复制链接" → 用户把链接转发给朋友、10 秒后次数 +1。

---

## 3. 上线前核对清单

- [ ] `js/app.js` 中 `CONFIG.IS_DEV = false`
- [ ] 打开 `index.html` 能正常登录、抽奖、轮盘与弹窗一致
- [ ] 用普通号码确认只能中话费券/感谢参与
- [ ] 用 `13925599313` 确认第 5 次起才有 1/8 概率中手机、中后封抽
- [ ] 用 `19868735951`（测试号）确认可中手机且不封
- [ ] 部署地址为 **HTTPS**
- [ ] 手机端（微信）打开无横向滚动、轮盘/按钮可点、字号清晰

## 4. 常见问题
- **退出后重进不记得账号** → 检查是否用了隐私/无痕浏览器，localStorage 会被清。
- **转发不加次数** → 转发逻辑依赖本地 pending，倒计时中若清缓存会丢失；正常使用不受影响。
- **想改手机型号/文案** → 奖品 SVG 在 `js/app.js` 顶部 `svgPhone` 等函数，文案在 `index.html`。
