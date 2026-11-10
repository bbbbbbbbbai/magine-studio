import { Download, Image as ImageIcon, Trash2 } from "lucide-react";
import type { Generation } from "../types";

interface HistoryPanelProps {
  items: Generation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function HistoryPanel({
  items,
  activeId,
  onSelect,
  onDelete,
}: HistoryPanelProps) {
  return (
    <section className="history-section" aria-label="历史作品">
      <div className="history-heading">
        <div>
          <span className="section-kicker">
            <span>03</span>
            <span>最近创作</span>
          </span>
          <h2>灵感档案</h2>
        </div>
        <span className="history-count">{String(items.length).padStart(2, "0")} WORKS</span>
      </div>

      {items.length === 0 ? (
        <div className="history-empty">
          <ImageIcon size={19} />
          你的第一幅作品将在这里出现
        </div>
      ) : (
        <div className="history-grid">
          {items.map((item, index) => {
            const isBusy = item.status === "pending" || item.status === "processing";
            return (
              <article
                key={item.id}
                className={`history-card ${activeId === item.id ? "active" : ""}`}
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              >
                <button
                  className="history-preview"
                  onClick={() => onSelect(item.id)}
                  aria-label={`查看：${item.prompt}`}
                >
                  {item.status === "completed" && item.image_url ? (
                    <img src={item.image_url} alt="" loading="lazy" />
                  ) : (
                    <span className={`history-placeholder ${isBusy ? "is-loading" : ""}`}>
                      {isBusy ? <i /> : <ImageIcon size={21} />}
                    </span>
                  )}
                  {isBusy && <span className="card-status">生成中</span>}
                  {item.status === "failed" && (
                    <span className="card-status failed">未完成</span>
                  )}
                </button>
                <div className="history-meta">
                  <button className="history-title" onClick={() => onSelect(item.id)}>
                    {item.prompt}
                  </button>
                  <div className="history-actions">
                    {item.status === "completed" && item.image_url && (
                      <a
                        href={item.image_url}
                        download={`imagine-${item.id.slice(0, 8)}.png`}
                        aria-label="下载图片"
                        title="下载"
                      >
                        <Download size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm("确定删除这幅作品吗？此操作无法撤销。")) {
                          void onDelete(item.id);
                        }
                      }}
                      aria-label="删除记录"
                      title="删除"
                      disabled={isBusy}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
