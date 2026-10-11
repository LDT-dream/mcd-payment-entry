function stopPayment(message) {
  setVariable("mcd_commit", "");
  showToast(message);
  abort();
}

let d;
try { d = JSON.parse(response.body); } catch (e) { stopPayment("付款数据无效"); }
if (!d || !d.orderId) { stopPayment("当前没有待付款订单"); }
if (typeof d.orderId !== "string" || !/^\d{1,64}$/.test(d.orderId)) { stopPayment("付款订单号无效"); }
const now = Date.now();
const useUntil = Date.parse(d.useUntil);
const updatedAt = Date.parse(d.updatedAt);
if (!Number.isFinite(useUntil) || !Number.isFinite(updatedAt) || useUntil <= now || updatedAt > now + 60000 || useUntil <= updatedAt) { stopPayment("付款订单已失效"); }
setVariable("mcd_commit", "");
openUrl("https://m.mcd.cn/mcp/jumpToApp?orderId=" + encodeURIComponent(d.orderId));
