let d;
try { d = JSON.parse(response.body); } catch (e) { showToast("付款数据无效"); abort(); }
if (!d || !d.orderId) { showToast("当前没有待付款订单"); abort(); }
if (typeof d.orderId !== "string" || !/^\d{1,64}$/.test(d.orderId)) { showToast("付款订单号无效"); abort(); }
const now = Date.now();
const useUntil = Date.parse(d.useUntil);
const updatedAt = Date.parse(d.updatedAt);
if (!Number.isFinite(useUntil) || !Number.isFinite(updatedAt) || useUntil <= now || updatedAt > now + 60000 || useUntil <= updatedAt) { showToast("付款订单已失效"); abort(); }
openUrl("https://m.mcd.cn/mcp/jumpToApp?orderId=" + encodeURIComponent(d.orderId));
