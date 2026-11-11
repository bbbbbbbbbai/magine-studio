import {
  AlertCircle,
  Download,
  LoaderCircle,
  Maximize2,
  RotateCw,
  Sparkles,
} from "lucide-react";
import type { Generation } from "../types";

interface ResultCanvasProps {
  generation: Generation | null;
  hasHistory: boolean;
}

function formatProvider(provider: string) {
  if (provider === "pollinations") return "Pollinations";
  if (provider === "openai") return "OpenAI Images";
  return "OpenAI compatible";
}

export function ResultCanvas({ generation, hasHistory }: ResultCanvasProps) {
  const isLoading =
    generation?.status === "pending" || generation?.status === "processing";
  const isFailed = generation?.status === "failed";
  const coverImage = generation?.image_url || "/assets/cover-01.jpg";
  const statusLabel = !generation
    ? hasHistory
      ? "选择作品"
      : "等待灵感"
    : isLoading
      ? "正在绘制"
      : isFailed
        ? "生成失败"
        : "已完成";

  function focusComposer() {
    document.querySelector("#composer")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section
      className={`stage cover-stage ${
        generation ? `ratio-${generation.aspect_ratio.replace(":", "-")}` : ""
      }`}
      aria-live="polite"
    >
      <div className="cover-canvas">
        <img
          className="cover-image"
          src={coverImage}
          alt={generation?.prompt || "原创轻小说封面人物插画"}
        />
        <div className="cover-image-mask" aria-hidden="true" />
        <div className="manga-lines" aria-hidden="true" />

        <div className="cover-series">
          <Sparkles size={11} />
          IMAGINE NOVELS · 青春创作社
        </div>

        <span
          className={`cover-status ${
            isLoading ? "working" : isFailed ? "failed" : ""
          }`}
        >
          {isLoading && <LoaderCircle size={11} className="spin" />}
          {statusLabel}
        </span>

        <span className="cover-volume">
          03<small>VOL.</small>
        </span>

        <div className="cover-title" aria-label="我的青春灵感果然没问题">
          <span className="prefix">我的</span>
          <span className="line">青春灵感</span>
          <span className="line coral">果然没问题</span>
        </div>

        <span className="cover-vertical-copy">放学后的恋爱喜剧 · 第三卷</span>

        <div className="cover-tagline">
          <strong>「这一次，灵感比告白先到。」</strong>
          天台的风、橘色夕阳，还有没来得及说出口的那句话。
        </div>

        <span className="cover-price">IMAGINE COMICS / 定価 ¥780</span>

        {isLoading && (
          <div className="cover-loading">
            <div className="loading-ink" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <strong>正在收集放课后的光</strong>
            <p>整理人物、构图与封面色彩中</p>
            <div className="progress-track">
              <span />
            </div>
          </div>
        )}

        {isFailed && (
          <div className="cover-failed">
            <span className="failed-icon">
              <AlertCircle size={23} />
            </span>
            <strong>这次没有画出来</strong>
            <p>{generation.error_message || "图片服务暂时不可用，请稍后重试。"}</p>
          </div>
        )}
      </div>

      <div className="cover-footer">
        <div className="result-description">
          <span>
            {generation
              ? `${generation.style} · ${generation.aspect_ratio}`
              : "青春恋爱插画 · 3:4"}
          </span>
          <h2>
            {generation?.prompt ||
              "放课后的天台，橘色夕阳落在少女肩头，微风翻动校服衣角。"}
          </h2>
          {generation ? (
            <p>
              {formatProvider(generation.provider)} · {generation.model} ·{" "}
              {generation.width} × {generation.height}
            </p>
          ) : (
            <p>IMAGINE V2 · 1536 × 2048 · SEED 1742</p>
          )}
        </div>
        {generation?.status === "completed" && generation.image_url && (
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
        {isFailed && (
          <button
            className="secondary-button"
            onClick={focusComposer}
          >
            <RotateCw size={16} />
            调整后重试
          </button>
        )}
        {!generation && (
          <button className="cover-cta" type="button" onClick={focusComposer}>
            <Sparkles size={14} />
            {hasHistory ? "选择一幅灵感" : "开始第一幅创作"}
          </button>
        )}
      </div>
    </section>
  );
}
