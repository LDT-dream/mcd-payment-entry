# 麦当劳付款桌面按钮

个人 Android 桌面入口。HTTP Shortcuts 每次点击读取 GitHub 上最新订单，再打开麦当劳官方 jumpToApp 链接。外出可用，不需要电脑常开、同一 Wi-Fi、服务器或 Tailscale。不启用 GitHub Pages，不创建订单、不代为付款。

## 手机首次设置

1. 安装 HTTP Shortcuts 官方版本：https://github.com/Waboodoo/HTTP-Shortcuts/releases/latest 。一般小米手机使用 arm64-v8a，不能确定时使用 universal。
2. 应用“导入 / 导出”选择从 URL 导入：https://raw.githubusercontent.com/LDT-dream/mcd-payment-entry/main/mcd-payment-shortcut.zip
3. 使用合并导入，保留已有快捷方式。导入后出现“麦当劳付款”。
4. 长按该快捷方式添加到桌面；也可在桌面添加小部件菜单选择 HTTP Shortcuts，绑定“麦当劳付款”。菜单位置随系统版本而异。
5. 空订单提示“当前没有待付款订单”。新订单就绪后点击按钮，手机浏览器打开官方页面并尝试唤起麦当劳 App；系统可能要求确认打开应用。

[尝试打开导入入口](https://http-shortcuts.rmy.ch/import?url=https%3A%2F%2Fraw.githubusercontent.com%2FLDT-dream%2Fmcd-payment-entry%2Fmain%2Fmcd-payment-shortcut.zip)。未唤起时使用应用内 URL 导入。

## 电脑更新订单

在本仓库运行：

```powershell
./publish-order.ps1 -OrderId '本单纯数字订单号'
./publish-order.ps1 -Clear
```

命令更新 latest.json，只提交该文件并推送 main。默认入口使用期 10 分钟，可用 -Minutes 15 修改（1–60 分钟）。使用期仅防止打开过旧链接，不表示麦当劳实际到期时间，不会取消或检测已付款订单。付款后可清空入口。

尚未接入自动下单工具。实际开单后需要运行更新命令，不能只更新本地而不推送。

## 公开范围与限制

用户已授权公开订单链接。只保存订单号、更新时间和入口使用期，不保存账号、地址、金额、凭据或明细。Git 历史仍保留旧订单号。

GitHub 原始文件的网络可达性可能影响手机读取；组件每次请求附加随机缓存参数；失败不会使用旧订单。导入格式与脚本按官方源码、文档核对，并在电脑验证；小米真机导入、桌面显示与 App 唤起仍待实测。

参考：[脚本文档](https://http-shortcuts.rmy.ch/scripting)、[导入文档](https://http-shortcuts.rmy.ch/import-export)、[官方样例](https://github.com/Waboodoo/HTTP-Shortcuts/blob/develop/HTTPShortcuts/app/src/test/resources/shortcuts-v90.json)。

