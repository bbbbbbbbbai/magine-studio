import {
  ArrowUpRight,
  Camera,
  Check,
  Clapperboard,
  Copy,
  Image as ImageIcon,
  Palette,
  PenTool,
  Shapes,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  AspectRatio,
  GenerationCreate,
  ImageModelOption,
  PublicConfig,
} from "../types";

const STYLES = [
  {
    id: "cinematic",
    label: "电影感",
    english: "cinematic photography",
    icon: Clapperboard,
  },
  {
    id: "photography",
    label: "日系写真",
    english: "Japanese film photography",
    icon: Camera,
  },
  {
    id: "illustration",
    label: "恋爱插画",
    english: "youth romance light-novel illustration",
    icon: PenTool,
  },
  {
    id: "3d",
    label: "3D 渲染",
    english: "stylized 3D render",
    icon: Shapes,
  },
  {
    id: "watercolor",
    label: "淡彩手绘",
    english: "soft watercolor illustration",
    icon: Palette,
  },
  {
    id: "graphic",
    label: "漫画网点",
    english: "manga halftone illustration",
    icon: ImageIcon,
  },
];

const RATIOS: Array<{ value: AspectRatio; label: string }> = [
  { value: "1:1", label: "方形" },
  { value: "4:3", label: "横向" },
  { value: "3:4", label: "竖向" },
  { value: "16:9", label: "宽屏" },
  { value: "9:16", label: "竖屏" },
];

const INSPIRATION_FRAGMENTS = [
  {
    id: "rooftop",
    label: "放学后的天台",
    zh: "放学后的天台",
    en: "a school rooftop after class",
    color: "#ff765f",
  },
  {
    id: "sunset",
    label: "橘色夕阳",
    zh: "橘色夕阳落在少女肩头",
    en: "orange sunset light resting on a girl's shoulder",
    color: "#ddf58b",
  },
  {
    id: "breeze",
    label: "微风吹动校服",
    zh: "微风吹动校服下摆",
    en: "a summer breeze moving the hem of a school uniform",
    color: "#18bda7",
  },
  {
    id: "heartbeat",
    label: "轻微心动",
    zh: "微妙又克制的轻微心动",
    en: "a subtle, restrained youthful heartbeat",
    color: "#ffacc7",
  },
  {
    id: "rain",
    label: "雨后初晴",
    zh: "雨后初晴的湿润空气",
    en: "the fresh air just after the rain",
    color: "#9bdff1",
  },
  {
    id: "clubroom",
    label: "社团活动室",
    zh: "安静的社团活动室",
    en: "a quiet school club room",
    color: "#c79a74",
  },
  {
    id: "festival",
    label: "夏日祭",
    zh: "夏日祭即将散场的人群",
    en: "a summer festival crowd at dusk",
    color: "#ff765f",
  },
  {
    id: "halftone",
    label: "漫画网点",
    zh: "细腻的漫画网点质感",
    en: "delicate manga halftone texture",
    color: "#08786f",
  },
  {
    id: "grain",
    label: "胶片颗粒",
    zh: "轻盈的胶片颗粒",
    en: "fine cinematic film grain",
    color: "#8c7d6c",
  },
] as const;

const STARTERS = [
  {
    label: "放学后的天台",
    ids: ["rooftop", "sunset", "breeze"],
  },
  {
    label: "无人广播站",
    ids: ["clubroom", "rain", "heartbeat"],
  },
  {
    label: "雨停之前",
    ids: ["rain", "halftone", "grain"],
  },
] as const;

const FALLBACK_IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "flux",
    label: "Flux",
    provider: "pollinations",
    model: "flux",
    requires_api_key: false,
    configured: true,
    description: "免费快速模型，适合草稿与日常创作",
  },
  {
    id: "gpt-image-2.5",
    label: "GPT Image 2.5",
    provider: "openai",
    model: "gpt-image-2.5",
    requires_api_key: true,
    configured: false,
    description: "高质量封面模型，需要配置独立 API Key",
  },
];

interface PromptComposerProps {
  busy: boolean;
  config: PublicConfig | null;
  searchQuery: string;
  onSubmit: (input: GenerationCreate) => Promise<void>;
}

function selectedItems(ids: readonly string[]) {
  return INSPIRATION_FRAGMENTS.filter((item) => ids.includes(item.id));
}

function buildChinesePrompt(
  ids: readonly string[],
  styleLabel: string,
  aspectRatio: AspectRatio,
) {
  const scene = selectedItems(ids)
    .map((item) => item.zh)
    .join("，");
  return `${scene || "放学后的校园里，一个安静而明亮的青春瞬间"}。${styleLabel}风格，柔和自然光，细腻服装褶皱，克制的面部表情，轻小说封面式分层构图，留白与手绘感并存，画面比例 ${aspectRatio}。`;
}

function buildEnglishPrompt(
  ids: readonly string[],
  styleLabel: string,
  aspectRatio: AspectRatio,
) {
  const scene = selectedItems(ids)
    .map((item) => item.en)
    .join(", ");
  return `${scene || "a quiet, luminous youth moment on a school campus after class"}, ${styleLabel}, youth light-novel cover illustration, soft natural light, delicate fabric folds, restrained expressions, layered book-cover composition, generous negative space with a hand-drawn finish, --ar ${aspectRatio}`;
}

export function PromptComposer({
  busy,
  config,
  searchQuery,
  onSubmit,
}: PromptComposerProps) {
  const initialIds = ["rooftop", "sunset", "breeze"];
  const [selectedIds, setSelectedIds] = useState<string[]>([...initialIds]);
  const [prompt, setPrompt] = useState(() =>
    buildChinesePrompt(initialIds, "恋爱插画", "3:4"),
  );
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState("illustration");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeOutput, setActiveOutput] = useState<"zh" | "en" | "negative">(
    "zh",
  );
  const [copyLabel, setCopyLabel] = useState("复制");
  const [imageModel, setImageModel] = useState("flux");
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    if (config?.default_image_model) {
      setImageModel(config.default_image_model);
    }
  }, [config?.default_image_model]);

  const visibleFragments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return INSPIRATION_FRAGMENTS;
    return INSPIRATION_FRAGMENTS.filter((item) =>
      `${item.label} ${item.zh} ${item.en}`.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const styleLabel =
    STYLES.find((item) => item.id === style)?.label ?? "恋爱插画";
  const styleEnglish =
    STYLES.find((item) => item.id === style)?.english ??
    "youth romance light-novel illustration";
  const englishPrompt = buildEnglishPrompt(
    selectedIds,
    styleEnglish,
    aspectRatio,
  );
  const outputText =
    activeOutput === "zh"
      ? prompt
      : activeOutput === "en"
        ? englishPrompt
        : negativePrompt ||
          "低清晰度，畸变手指，多余肢体，杂乱文字，水印，过度磨皮，不自然光影，重复人物，裁切面部";
  const imageModels =
    config?.available_image_models?.length
      ? config.available_image_models
      : FALLBACK_IMAGE_MODELS;
  const selectedModel =
    imageModels.find((item) => item.id === imageModel) ?? imageModels[0];

  function updateComposition(nextIds: string[]) {
    setSelectedIds(nextIds);
    setPrompt(buildChinesePrompt(nextIds, styleLabel, aspectRatio));
  }

  function toggleFragment(id: string) {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    updateComposition(nextIds);
  }

  function chooseStyle(nextStyle: string) {
    setStyle(nextStyle);
    const nextLabel =
      STYLES.find((item) => item.id === nextStyle)?.label ?? "恋爱插画";
    setPrompt(buildChinesePrompt(selectedIds, nextLabel, aspectRatio));
  }

  function chooseRatio(nextRatio: AspectRatio) {
    setAspectRatio(nextRatio);
    setPrompt(buildChinesePrompt(selectedIds, styleLabel, nextRatio));
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopyLabel("已复制");
    } catch {
      setCopyLabel("复制失败");
    }
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyLabel("复制"), 1400);
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!prompt.trim() || busy || !selectedModel.configured) return;
    await onSubmit({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim() || undefined,
      style,
      aspect_ratio: aspectRatio,
      image_model: selectedModel.id,
      enhance_prompt: enhancePrompt,
    });
  }

  return (
    <section className="composer" id="composer" aria-label="创作参数">
      <div className="composer-heading">
        <div>
          <span className="eyebrow">PROMPT LAB · 01</span>
          <h2>今天想画什么？</h2>
        </div>
        <span className="draft-count">
          {String(selectedIds.length).padStart(2, "0")} 已选
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field-heading">
          <span>灵感碎片</span>
          <small>点击拼成场景 · 可多选</small>
        </div>
        <div className="inspiration-list" aria-label="可选灵感碎片">
          {visibleFragments.map((fragment) => (
            <button
              type="button"
              key={fragment.id}
              className="inspiration-chip"
              style={
                {
                  "--chip-color": fragment.color,
                } as React.CSSProperties
              }
              aria-pressed={selectedIds.includes(fragment.id)}
              onClick={() => toggleFragment(fragment.id)}
            >
              {fragment.label}
            </button>
          ))}
          {visibleFragments.length === 0 && (
            <span className="fragment-empty">没有找到这个灵感，换个词试试。</span>
          )}
        </div>

        <div className="field-heading">
          <span>场景描述</span>
          <small>{prompt.length} / 2000</small>
        </div>
        <div className="prompt-field">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="放学后的天台，橘色夕阳落在少女肩头……"
            maxLength={2000}
            rows={5}
            aria-label="图片提示词"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                void handleSubmit();
              }
            }}
          />
        </div>

        <div className="starter-row" aria-label="快速起稿">
          <span>TRY →</span>
          {STARTERS.map((starter) => (
            <button
              key={starter.label}
              type="button"
              className="starter-button"
              onClick={() => updateComposition([...starter.ids])}
            >
              {starter.label}
            </button>
          ))}
        </div>

        <div className="control-group">
          <div className="control-heading">
            <span>图片模型</span>
            <span className="optional">随时切换</span>
          </div>
          <div className="model-picker" role="radiogroup" aria-label="图片模型">
            {imageModels.map((model) => (
              <button
                key={model.id}
                type="button"
                role="radio"
                aria-checked={imageModel === model.id}
                className={`model-option ${
                  imageModel === model.id ? "selected" : ""
                }`}
                onClick={() => setImageModel(model.id)}
              >
                <span className="model-copy">
                  <strong>{model.label}</strong>
                  <small>{model.model}</small>
                </span>
                <span
                  className={`model-state ${
                    model.configured ? "configured" : "unconfigured"
                  }`}
                >
                  {model.configured
                    ? model.requires_api_key
                      ? "已连接"
                      : "免密钥"
                    : "待设置"}
                </span>
              </button>
            ))}
          </div>
          <p className="model-description">{selectedModel.description}</p>
          {!selectedModel.configured && (
            <p className="model-settings-hint">
              在后端 <code>.env</code> 设置
              <code>GPT_IMAGE_API_KEY</code>，可选
              <code>GPT_IMAGE_API_BASE_URL</code>，然后重启后端。
            </p>
          )}
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
                onClick={() => chooseStyle(id)}
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
                onClick={() => chooseRatio(ratio.value)}
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

        <section className="prompt-output" id="prompt-output" aria-label="提示词输出">
          <div className="output-toolbar">
            <div className="output-tabs" role="group" aria-label="提示词语言">
              <button
                type="button"
                className={activeOutput === "zh" ? "active" : ""}
                aria-pressed={activeOutput === "zh"}
                onClick={() => setActiveOutput("zh")}
              >
                中文
              </button>
              <button
                type="button"
                className={activeOutput === "en" ? "active" : ""}
                aria-pressed={activeOutput === "en"}
                onClick={() => setActiveOutput("en")}
              >
                English
              </button>
              <button
                type="button"
                className={activeOutput === "negative" ? "active" : ""}
                aria-pressed={activeOutput === "negative"}
                onClick={() => setActiveOutput("negative")}
              >
                负面词
              </button>
            </div>
            <button
              className="copy-button"
              type="button"
              onClick={() => void copyOutput()}
            >
              <Copy size={11} />
              {copyLabel}
            </button>
          </div>
          <code className="prompt-output-text" aria-live="polite">
            {outputText}
          </code>
        </section>

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
          disabled={
            busy || prompt.trim().length < 3 || !selectedModel.configured
          }
        >
          {busy ? (
            <>
              <span className="button-spinner" />
              正在构思画面
            </>
          ) : !selectedModel.configured ? (
            <>
              <Sparkles size={18} />
              请先配置 {selectedModel.label}
            </>
          ) : (
            <>
              <Sparkles size={18} />
              生成这张青春画片
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
