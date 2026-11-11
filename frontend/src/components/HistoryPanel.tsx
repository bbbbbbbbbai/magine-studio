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
    <section className="archive-page" id="history" aria-label="作品档案">
      <div className="archive-page-heading">
        <div>
          <span className="eyebrow">ARCHIVE · 03</span>
          <h1>作品档案</h1>
          <p>这里只显示真实生成过的图片。</p>
        </div>
        <span>{String(items.length).padStart(2, "0")} WORKS</span>
      </div>

      {items.length === 0 ? (
        <div className="archive-empty">
          <ImageIcon size={34} />
          <strong>还没有作品</strong>
          <p>回到创作台输入一句描述，生成第一张图片。</p>
        </div>
      ) : (
        <div className="archive-grid">
          {items.map((item, index) => {
            const busy =
              item.status === "pending" || item.status === "processing";
            return (
              <article
                key={item.id}
                className={`archive-item ${activeId === item.id ? "active" : ""}`}
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              >
                <button
                  className="archive-image-button"
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-label={`查看作品：${item.prompt}`}
                >
                  {item.status === "completed" && item.image_url ? (
                    <img src={item.image_url} alt="" loading="lazy" />
                  ) : (
                    <span className="archive-placeholder">
                      {busy ? <i /> : <ImageIcon size={24} />}
                    </span>
                  )}
                  {busy && <span className="archive-status">生成中</span>}
                  {item.status === "failed" && (
                    <span className="archive-status failed">生成失败</span>
                  )}
                </button>
                <div className="archive-item-footer">
                  <button
                    className="archive-item-title"
                    type="button"
                    onClick={() => onSelect(item.id)}
                  >
                    {item.prompt}
                  </button>
                  <div className="archive-item-actions">
                    {item.status === "completed" && item.image_url && (
                      <a
                        href={item.image_url}
                        download={`imagine-${item.id.slice(0, 8)}.png`}
                        aria-label="下载图片"
                      >
                        <Download size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      aria-label="删除作品"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("确定删除这幅作品吗？")) {
                          void onDelete(item.id);
                        }
                      }}
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
