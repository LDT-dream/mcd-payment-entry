const firstEntry = /<entry\b[^>]*>([\s\S]*?)<\/entry>/i.exec(response.body);
const commitMatch = firstEntry && /<id>\s*tag:github\.com,2008:Grit::Commit\/([0-9a-fA-F]{40})\s*<\/id>/i.exec(firstEntry[1]);
if (!commitMatch) {
  setVariable("mcd_commit", "");
  showToast("订单更新信息无效");
  abort();
}
setVariable("mcd_commit", commitMatch[1].toLowerCase());
enqueueShortcut("b3e9d7c8-5a13-4a9e-95db-9f4f0e0ba6c1", { mcd_commit: commitMatch[1].toLowerCase() });
