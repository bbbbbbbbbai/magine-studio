import {
  Download,
  Image as ImageIcon,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Generation } from "../types";

interface HistoryPanelProps {
  items: Generation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

const COVER_PRESETS = [
  {
    image: "/assets/cover-01.jpg",
    title: "放课后的天台",
    kicker: "放课后",
    accent: "风",
    volume: "01",
    time: "17:42",
  },
  {
    image: "/assets/cover-02.jpg",
    title: "雨停以后",
    kicker: "雨停",
    accent: "以后",
    volume: "02",
    time: "16:08",
  },
  {
    image: "/assets/cover-04.jpg",
    title: "夏日祭的烟火",
    kicker: "夏日祭",
    accent: "双人篇",
    volume: "03",
    time: "昨天",
  },
  {
    image: "/assets/cover-03.jpg",
    title: "无人广播站",
    kicker: "无人广播",
    accent: "站",
    volume: "04",
    time: "11.09",
  },
] as const;

function coverText(prompt: string) {
  const clean = prompt.replace(/\s+/g, "").split(/[，。,.！!？?]/)[0];
  return clean.length > 12 ? `${clean.slice(0, 12)}…` : clean;
}

export function HistoryPanel({
  items,
  activeId,
  onSelect,
  onDelete,
}: HistoryPanelProps) {
  return (
    <section className="history-section" id="history" aria-label="历史作品">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MEMORY ARCHIVE · 02</span>
          <h2>最近收集的青春切片</h2>
        </div>
        <div className="history-heading-copy">
          <span className="history-count">
            {String(items.length).padStart(2, "0")} WORKS
          </span>
          <p>每一张画片都保留提示词、画幅和随机种子，点击封面可以重新查看。</p>
        </div>
      </div>

      {items.length === 0 ? (
        <>
          <div className="history-empty-note">
            <Sparkles size={15} />
            还没有真实作品，先从这些封面方向挑一个灵感。
          </div>
          <div className="history-grid cover-gallery">
            {COVER_PRESETS.map((cover, index) => (
              <article
                className="history-card sample-cover"
                key={cover.volume}
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <div className="history-preview">
                  <img src={cover.image} alt={cover.title} loading="lazy" />
                  <span className="history-volume">{cover.volume}</span>
                  <span className="history-cover-title">
                    {cover.kicker}
                    <em>{cover.accent}</em>
                  </span>
                </div>
                <div className="history-meta">
                  <span className="history-sample-title">{cover.title}</span>
                  <small>{cover.time}</small>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="history-grid cover-gallery">
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
                  <span className="history-volume">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="history-cover-title">
                    {coverText(item.prompt)}
                    <em>{item.style}</em>
                  </span>
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
