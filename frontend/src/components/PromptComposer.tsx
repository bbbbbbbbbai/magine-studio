import {
  ArrowUpRight,
  Camera,
  Check,
  Clapperboard,
  Image as ImageIcon,
  Palette,
  PenTool,
  Shapes,
  Sparkles,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AspectRatio, GenerationCreate } from "../types";

const STYLES = [
  { id: "cinematic", label: "电影感", icon: Clapperboard },
  { id: "photography", label: "摄影", icon: Camera },
  { id: "illustration", label: "插画", icon: PenTool },
  { id: "3d", label: "3D 渲染", icon: Shapes },
  { id: "watercolor", label: "水彩", icon: Palette },
  { id: "graphic", label: "极简图形", icon: ImageIcon },
];

const RATIOS: Array<{ value: AspectRatio; label: string }> = [
  { value: "1:1", label: "方形" },
  { value: "4:3", label: "横向" },
  { value: "3:4", label: "竖向" },
  { value: "16:9", label: "宽屏" },
  { value: "9:16", label: "竖屏" },
];

interface PromptComposerProps {
  busy: boolean;
  onSubmit: (input: GenerationCreate) => Promise<void>;
}

export function PromptComposer({ busy, onSubmit }: PromptComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!prompt.trim() || busy) return;
    await onSubmit({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim() || undefined,
      style,
      aspect_ratio: aspectRatio,
      enhance_prompt: enhancePrompt,
    });
  }

  return (
    <section className="composer" aria-label="创作参数">
      <div className="section-kicker">
        <span>01</span>
        <span>描述你的想象</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="prompt-field">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="一座漂浮在云海上的未来图书馆，玻璃穹顶洒下金色晨光……"
            maxLength={2000}
            rows={5}
            aria-label="图片提示词"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                void handleSubmit();
              }
            }}
          />
          <span className="char-count">{prompt.length} / 2000</span>
        </div>

        <div className="control-group">
          <div className="control-heading">
            <span>视觉风格</span>
            <span className="optional">选择一种基调</span>
          </div>
          <div className="style-grid">
            {STYLES.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={`style-option ${style === id ? "selected" : ""}`}
                onClick={() => setStyle(id)}
                aria-pressed={style === id}
              >
                <Icon size={16} />
                {label}
                {style === id && <Check className="style-check" size={12} />}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <div className="control-heading">
            <span>画面比例</span>
            <span className="optional">{aspectRatio}</span>
          </div>
          <div className="ratio-row">
            {RATIOS.map((ratio) => (
              <button
                type="button"
                key={ratio.value}
                className={`ratio-option ${aspectRatio === ratio.value ? "selected" : ""}`}
                onClick={() => setAspectRatio(ratio.value)}
                aria-pressed={aspectRatio === ratio.value}
                title={ratio.label}
              >
                <span
                  className="ratio-shape"
                  style={{
                    aspectRatio: ratio.value.replace(":", "/"),
                  }}
                />
                {ratio.value}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          <span>高级设置</span>
          <span>{showAdvanced ? "收起" : "展开"}</span>
        </button>

        {showAdvanced && (
          <div className="advanced-panel">
            <label htmlFor="negative-prompt">排除内容</label>
            <input
              id="negative-prompt"
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              placeholder="例如：文字、水印、模糊、多余人物"
              maxLength={1000}
            />
            <label className="switch-row" htmlFor="enhance-toggle">
              <span>
                <strong>智能扩写提示词</strong>
                <small>由 {enhancePrompt ? "AI" : "原始提示词"} 完成最终构图</small>
              </span>
              <input
                id="enhance-toggle"
                type="checkbox"
                checked={enhancePrompt}
                onChange={(event) => setEnhancePrompt(event.target.checked)}
              />
              <span className="switch" />
            </label>
          </div>
        )}

        <button
          className="generate-button"
          type="submit"
          disabled={busy || prompt.trim().length < 3}
        >
          {busy ? (
            <>
              <span className="button-spinner" />
              正在构思画面
            </>
          ) : (
            <>
              <Sparkles size={18} />
              生成图片
              <ArrowUpRight className="button-arrow" size={18} />
            </>
          )}
        </button>
        <p className="shortcut-hint">
          <kbd>⌘</kbd> <span>+</span> <kbd>Enter</kbd> 快速生成
        </p>
      </form>
    </section>
  );
}
