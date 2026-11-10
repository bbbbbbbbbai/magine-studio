import {
  AlertCircle,
  Download,
  LoaderCircle,
  Maximize2,
  Paintbrush,
  RotateCw,
} from "lucide-react";
import type { Generation } from "../types";

interface ResultCanvasProps {
  generation: Generation | null;
  hasHistory: boolean;
}

function formatProvider(provider: string) {
  return provider === "pollinations" ? "Pollinations" : "OpenAI compatible";
}

export function ResultCanvas({ generation, hasHistory }: ResultCanvasProps) {
  if (!generation) {
    return (
      <section className="stage empty-stage">
        <div className="empty-art" aria-hidden="true">
          <span className="orb orb-one" />
          <span className="orb orb-two" />
          <span className="orb orb-three" />
          <Paintbrush size={34} />
        </div>
        <div className="empty-copy">
          <span className="section-kicker">02 / 等待灵感</span>
          <h1>让一句话，<br />成为一幅画。</h1>
          <p>
            {hasHistory
              ? "从右侧历史作品中选择一张，或开始新的创作。"
              : "在左侧描述你的想象，选择视觉风格，剩下的交给 Imagine。"}
          </p>
        </div>
      </section>
    );
  }

  const isLoading =
    generation.status === "pending" || generation.status === "processing";

  return (
    <section
      className={`stage result-stage ratio-${generation.aspect_ratio.replace(":", "-")}`}
      aria-live="polite"
    >
      <div className="result-topline">
        <span className="result-index">02 / 生成结果</span>
        <span className={`status-pill status-${generation.status}`}>
          {isLoading && <LoaderCircle size={12} className="spin" />}
          {generation.status === "completed"
            ? "已完成"
            : generation.status === "failed"
              ? "生成失败"
              : "正在绘制"}
        </span>
      </div>

      <div className="image-frame">
        {isLoading && (
          <div className="generating-state">
            <div className="generation-visual">
              <span />
              <span />
              <span />
            </div>
            <strong>构建光影与细节</strong>
            <p>复杂画面通常需要 15–45 秒</p>
            <div className="progress-track">
              <span />
            </div>
          </div>
        )}

        {generation.status === "failed" && (
          <div className="failed-state">
            <span className="failed-icon">
              <AlertCircle size={23} />
            </span>
            <strong>这次没有画出来</strong>
            <p>{generation.error_message || "图片服务暂时不可用，请稍后重试。"}</p>
          </div>
        )}

        {generation.status === "completed" && generation.image_url && (
          <img
            src={generation.image_url}
            alt={generation.prompt}
            className="result-image"
          />
        )}
      </div>

      <div className="result-footer">
        <div className="result-description">
          <span>{generation.style}</span>
          <h2>{generation.prompt}</h2>
          <p>
            {formatProvider(generation.provider)} · {generation.model} ·{" "}
            {generation.width} × {generation.height}
          </p>
        </div>
        {generation.status === "completed" && generation.image_url && (
          <div className="result-actions">
            <a
              href={generation.image_url}
              target="_blank"
              rel="noreferrer"
              className="secondary-button"
            >
              <Maximize2 size={16} />
              查看大图
            </a>
            <a
              href={generation.image_url}
              download={`imagine-${generation.id.slice(0, 8)}.png`}
              className="primary-small-button"
            >
              <Download size={16} />
              下载
            </a>
          </div>
        )}
        {generation.status === "failed" && (
          <button
            className="secondary-button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <RotateCw size={16} />
            调整后重试
          </button>
        )}
      </div>
    </section>
  );
}
