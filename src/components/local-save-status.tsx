export function LocalSaveStatus() {
  return (
    <div className="local-save-status" title="数据保存在当前浏览器的本地数据库中，建议定期导出 Excel 或 JSON 备份。">
      <span className="local-save-dot" />
      <span>本地保存</span>
    </div>
  );
}
