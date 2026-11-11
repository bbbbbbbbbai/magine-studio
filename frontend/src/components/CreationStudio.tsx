import {
  ArrowUpRight,
  Check,
  Clapperboard,
  Image as ImageIcon,
  Palette,
  PenTool,
  Shapes,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type {
  AspectRatio,
  GenerationCreate,
  ImageModelOption,
  PublicConfig,
} from "../types";

const STYLES = [
  { id: "illustration", label: "插画", icon: PenTool },
  { id: "cinematic", label: "电影感", icon: Clapperboard },
  { id: "watercolor", label: "水彩", icon: Palette },
  { id: "3d", label: "3D", icon: Shapes },
  { id: "graphic", label: "图形", icon: ImageIcon },
];

const RATIOS: Array<{ value: AspectRatio; label: string }> = [
  { value: "1:1", label: "方形" },
  { value: "4:3", label: "横向" },
  { value: "3:4", label: "竖向" },
  { value: "16:9", label: "宽屏" },
  { value: "9:16", label: "竖屏" },
];

const FALLBACK_IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "flux",
    label: "Flux",
    provider: "pollinations",
    model: "flux",
    requires_api_key: false,
    configured: true,
    description: "免费快速模型",
  },
  {
    id: "gpt-image-2.5",
    label: "GPT Image 2.5",
    provider: "openai",
    model: "gpt-image-2.5",
    requires_api_key: true,
    configured: false,
    description: "需要配置 API Key",
  },
  {
    id: "qwen-image-3-pro",
    label: "Qwen Image 3 Pro",
    provider: "openai",
    model: "qwen-image-3-pro",
    requires_api_key: true,
    configured: false,
    description: "中文语义与文字排版",
  },
  {
    id: "z-image-pro",
    label: "Z-Image Pro",
    provider: "openai",
    model: "z-image-pro",
    requires_api_key: true,
    configured: false,
    description: "写实人物与商业视觉",
  },
  {
    id: "anime-v4-5",
    label: "Anime V4.5",
    provider: "openai",
    model: "anime-v4-5",
    requires_api_key: true,
    configured: false,
    description: "通用日系动漫插画",
  },
  {
    id: "seedream-5-pro",
    label: "Seedream 5 Pro",
    provider: "openai",
    model: "seedream-5-pro",
    requires_api_key: true,
    configured: false,
    description: "电影感场景与海报",
  },
  {
    id: "anime-v5",
    label: "Anime V5",
    provider: "openai",
    model: "anime-v5",
    requires_api_key: true,
    configured: false,
    description: "角色表现与动漫质感",
  },
];

interface CreationStudioProps {
  busy: boolean;
  config: PublicConfig | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  onOpenPromptLab: () => void;
  onSubmit: (input: GenerationCreate) => Promise<void>;
}

export function CreationStudio({
  busy,
  config,
  prompt,
  onPromptChange,
  onOpenPromptLab,
  onSubmit,
}: CreationStudioProps) {
  const [style, setStyle] = useState("illustration");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [imageModel, setImageModel] = useState("flux");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (config?.default_image_model) {
      setImageModel(config.default_image_model);
    }
  }, [config?.default_image_model]);

  const imageModels =
    config?.available_image_models?.length
      ? config.available_image_models
      : FALLBACK_IMAGE_MODELS;
  const selectedModel =
    imageModels.find((item) => item.id === imageModel) ?? imageModels[0];

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (busy || prompt.trim().length < 3 || !selectedModel.configured) return;
    await onSubmit({
      prompt: prompt.trim(),
      style,
      aspect_ratio: aspectRatio,
      image_model: selectedModel.id,
      enhance_prompt: true,
    });
  }

  return (
    <section className="creation-panel" id="composer" aria-label="图片创作">
      <div className="creation-heading">
        <div>
          <span className="eyebrow">CREATION STUDIO · 01</span>
          <h2>描述你想生成的画面</h2>
        </div>
        <span className="creation-count">{prompt.length} / 2000</span>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          className="creation-textarea"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="例如：黄昏时分的海边车站，一位少女站在站台边，风吹动她的头发，电影感构图……"
          maxLength={2000}
          rows={9}
          aria-label="图片提示词"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />

        <div className="creation-actions-row">
          <button
            className="text-button"
            type="button"
            onClick={onOpenPromptLab}
          >
            <WandSparkles size={14} />
            不会写？去提示词工坊
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            aria-expanded={showSettings}
          >
            {showSettings ? "收起设置" : "生成设置"}
          </button>
        </div>

        {showSettings && (
          <div className="generation-settings">
            <div className="settings-block">
              <span className="settings-label">图片模型</span>
              <div className="compact-model-row">
                {imageModels.map((model) => (
                  <button
                    key={model.id}
                    className={`compact-model ${
                      imageModel === model.id ? "selected" : ""
                    }`}
                    type="button"
                    onClick={() => setImageModel(model.id)}
                  >
                    <span>{model.label}</span>
                    <small>
                      {model.configured ? "可用" : "待配置"}
                    </small>
                  </button>
                ))}
              </div>
              {!selectedModel.configured && (
                <p className="settings-warning">
                  请在服务器设置 GPT_IMAGE_API_KEY 后重启后端。
                </p>
              )}
            </div>

            <div className="settings-grid">
              <label>
                <span className="settings-label">风格</span>
                <span className="select-shell">
                  <select
                    value={style}
                    onChange={(event) => setStyle(event.target.value)}
                  >
                    {STYLES.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label>
                <span className="settings-label">画幅</span>
                <span className="select-shell">
                  <select
                    value={aspectRatio}
                    onChange={(event) =>
                      setAspectRatio(event.target.value as AspectRatio)
                    }
                  >
                    {RATIOS.map((ratio) => (
                      <option value={ratio.value} key={ratio.value}>
                        {ratio.value} · {ratio.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            </div>

            <div className="style-quick-row">
              {STYLES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={style === id ? "selected" : ""}
                  onClick={() => setStyle(id)}
                >
                  <Icon size={13} />
                  {label}
                  {style === id && <Check size={11} />}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className="creation-submit"
          type="submit"
          disabled={
            busy || prompt.trim().length < 3 || !selectedModel.configured
          }
        >
          {busy ? (
            <>
              <span className="button-spinner" />
              正在生成
            </>
          ) : !selectedModel.configured ? (
            <>请先配置 {selectedModel.label}</>
          ) : (
            <>
              <Sparkles size={17} />
              开始生成
              <ArrowUpRight size={17} />
            </>
          )}
        </button>
        <p className="creation-shortcut">
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 快速生成
        </p>
      </form>
    </section>
  );
}
