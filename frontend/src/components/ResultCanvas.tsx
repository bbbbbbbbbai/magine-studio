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
}

function formatProvider(provider: string) {
  if (provider === "pollinations") return "Pollinations";
  if (provider === "openai") return "OpenAI Images";
  return "OpenAI compatible";
}

export function ResultCanvas({ generation }: ResultCanvasProps) {
  const isLoading =
    generation?.status === "pending" || generation?.status === "processing";
  const isFailed = generation?.status === "failed";

  return (
    <section className="result-panel" id="stage" aria-live="polite">
      <div className="result-panel-heading">
        <div>
          <span className="eyebrow">OUTPUT · 02</span>
          <h2>生成结果</h2>
        </div>
        <span className={`result-state ${isLoading ? "working" : ""}`}>
          {isLoading && <LoaderCircle size={13} className="spin" />}
          {!generation
            ? "等待输入"
            : isLoading
              ? "正在生成"
              : isFailed
                ? "生成失败"
                : "已完成"}
        </span>
      </div>

      <div className="result-media">
        {!generation && (
          <div className="result-empty">
            <div className="empty-frame-mark" aria-hidden="true">
              <span />
              <span />
              <Sparkles size={28} />
            </div>
            <strong>生成后的图片会出现在这里</strong>
            <p>在左侧输入画面描述，选择模型和画幅，然后开始生成。</p>
          </div>
        )}

        {isLoading && (
          <div className="result-loading">
            <div className="loading-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <strong>正在生成图片</strong>
            <p>整理画面细节与光影，通常需要 15 至 45 秒。</p>
            <div className="progress-track" aria-hidden="true">
              <span />
            </div>
          </div>
        )}

        {isFailed && (
          <div className="result-error">
            <span className="failed-icon">
              <AlertCircle size={24} />
            </span>
            <strong>这次没有生成成功</strong>
            <p>{generation.error_message || "图片服务暂时不可用，请稍后重试。"}</p>
            <button
              type="button"
              onClick={() =>
                document.querySelector("#composer")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              <RotateCw size={15} />
              返回修改
            </button>
          </div>
        )}

        {generation?.status === "completed" && generation.image_url && (
          <img src={generation.image_url} alt={generation.prompt} />
        )}
      </div>

      <div className="result-details">
        <div>
          <span>
            {generation
              ? `${generation.style} · ${generation.aspect_ratio}`
              : "尚未生成作品"}
          </span>
          <h3>{generation?.prompt || "输入提示词后开始创作"}</h3>
          {generation && (
            <p>
              {formatProvider(generation.provider)} · {generation.model} ·{" "}
              {generation.width} × {generation.height}
            </p>
          )}
        </div>
        {generation?.status === "completed" && generation.image_url && (
          <div className="result-actions">
            <a
              href={generation.image_url}
              target="_blank"
              rel="noreferrer"
            >
              <Maximize2 size={15} />
              查看大图
            </a>
            <a
              href={generation.image_url}
              download={`imagine-${generation.id.slice(0, 8)}.png`}
            >
              <Download size={15} />
              下载
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
