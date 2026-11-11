import {
  Camera,
  Copy,
  RotateCcw,
  Search,
  Send,
  Shuffle,
  Sparkles,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type OutputTab = "zh" | "en" | "negative";

interface PromptItem {
  zh: string;
  en: string;
}

interface PromptCategory {
  id: string;
  label: string;
  selection: "single" | "multiple";
  items: PromptItem[];
}

const CATEGORIES: PromptCategory[] = [
  {
    id: "subject",
    label: "人物",
    selection: "single",
    items: [
      { zh: "青年女性", en: "a young adult woman" },
      { zh: "青年男性", en: "a young adult man" },
      { zh: "双人组合", en: "two young adult characters" },
      { zh: "中性风人物", en: "an androgynous young adult" },
      { zh: "幻想角色", en: "an original fantasy character" },
    ],
  },
  {
    id: "hair",
    label: "发型",
    selection: "single",
    items: [
      { zh: "黑色长直发", en: "long straight black hair" },
      { zh: "波浪长发", en: "long wavy hair" },
      { zh: "短发波波头", en: "a short bob haircut" },
      { zh: "高马尾", en: "a high ponytail" },
      { zh: "双马尾", en: "twin ponytails" },
      { zh: "自然短发", en: "natural short hair" },
    ],
  },
  {
    id: "expression",
    label: "表情",
    selection: "multiple",
    items: [
      { zh: "平静", en: "a calm expression" },
      { zh: "微笑", en: "a soft smile" },
      { zh: "惊讶", en: "a surprised expression" },
      { zh: "认真", en: "a focused expression" },
      { zh: "若有所思", en: "a thoughtful expression" },
      { zh: "回望镜头", en: "looking back toward the camera" },
    ],
  },
  {
    id: "outfit",
    label: "服装",
    selection: "single",
    items: [
      { zh: "深色西装外套", en: "a dark tailored blazer" },
      { zh: "白色衬衫", en: "a clean white shirt" },
      { zh: "针织开衫", en: "a soft knit cardigan" },
      { zh: "风衣", en: "a long trench coat" },
      { zh: "休闲卫衣", en: "a relaxed hoodie" },
      { zh: "轻礼服", en: "a light formal dress" },
    ],
  },
  {
    id: "scene",
    label: "场景",
    selection: "single",
    items: [
      { zh: "城市天台", en: "a city rooftop" },
      { zh: "雨后的街道", en: "a street after rain" },
      { zh: "咖啡馆窗边", en: "beside a cafe window" },
      { zh: "图书馆", en: "a quiet library" },
      { zh: "海边车站", en: "a seaside station" },
      { zh: "樱花树下", en: "beneath cherry blossom trees" },
    ],
  },
  {
    id: "light",
    label: "光线",
    selection: "single",
    items: [
      { zh: "柔和自然光", en: "soft natural light" },
      { zh: "逆光轮廓", en: "backlit rim lighting" },
      { zh: "黄昏暖光", en: "warm sunset light" },
      { zh: "阴天漫射光", en: "diffused overcast light" },
      { zh: "霓虹灯", en: "colorful neon lighting" },
      { zh: "窗边侧光", en: "side light from a window" },
    ],
  },
  {
    id: "mood",
    label: "氛围",
    selection: "multiple",
    items: [
      { zh: "安静", en: "a quiet atmosphere" },
      { zh: "清新", en: "a fresh atmosphere" },
      { zh: "轻微怀旧", en: "a subtly nostalgic mood" },
      { zh: "浪漫", en: "a romantic mood" },
      { zh: "疏离感", en: "a faint sense of distance" },
      { zh: "电影感", en: "a cinematic mood" },
    ],
  },
  {
    id: "quality",
    label: "画面",
    selection: "multiple",
    items: [
      { zh: "清晰线稿", en: "clean line art" },
      { zh: "细腻光影", en: "delicate lighting and shadow" },
      { zh: "柔和色彩", en: "a soft color palette" },
      { zh: "胶片颗粒", en: "subtle film grain" },
      { zh: "漫画网点", en: "manga halftone texture" },
      { zh: "留白构图", en: "generous negative space" },
    ],
  },
];

interface CameraState {
  azimuth: number;
  elevation: number;
  distance: number;
  focal: number;
  roll: number;
}

const DEFAULT_CAMERA: CameraState = {
  azimuth: 18,
  elevation: 4,
  distance: 3,
  focal: 50,
  roll: 0,
};

const CAMERA_PRESETS: Array<{
  label: string;
  camera: CameraState;
}> = [
  { label: "正面", camera: { ...DEFAULT_CAMERA, azimuth: 0, elevation: 0 } },
  { label: "45° 侧", camera: { ...DEFAULT_CAMERA, azimuth: 45 } },
  { label: "侧面", camera: { ...DEFAULT_CAMERA, azimuth: 90 } },
  { label: "俯拍", camera: { ...DEFAULT_CAMERA, elevation: 32 } },
  { label: "仰拍", camera: { ...DEFAULT_CAMERA, elevation: -24 } },
  { label: "特写", camera: { ...DEFAULT_CAMERA, distance: 1.8, focal: 85 } },
];

interface PromptStudioProps {
  onUsePrompt: (prompt: string) => void;
}

function cameraPrompt(camera: CameraState) {
  const angle =
    Math.abs(camera.azimuth) < 8
      ? "正面视角"
      : camera.azimuth > 0
        ? `${camera.azimuth} 度右侧视角`
        : `${Math.abs(camera.azimuth)} 度左侧视角`;
  const height =
    camera.elevation > 8
      ? "轻微俯拍"
      : camera.elevation < -8
        ? "轻微仰拍"
        : "平视机位";
  return `${angle}，${height}，${camera.distance.toFixed(1)} 米距离，${camera.focal}mm 焦距，画面倾斜 ${camera.roll} 度`;
}

export function PromptStudio({ onUsePrompt }: PromptStudioProps) {
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<OutputTab>("zh");
  const [copyLabel, setCopyLabel] = useState("复制");
  const copyTimer = useRef<number | null>(null);

  const chosenItems = useMemo(
    () =>
      CATEGORIES.flatMap((category) =>
        (selection[category.id] ?? [])
          .map((value) =>
            category.items.find((item) => item.zh === value),
          )
          .filter((item): item is PromptItem => Boolean(item)),
      ),
    [selection],
  );

  const zhPrompt = `${chosenItems.map((item) => item.zh).join("，") || "一位年轻人物"}。${cameraPrompt(camera)}。细节清晰，构图完整，适合作为图片生成提示词。`;
  const enPrompt = `${chosenItems.map((item) => item.en).join(", ") || "a young adult character"}, ${camera.azimuth} degree azimuth, ${camera.elevation} degree elevation, ${camera.distance.toFixed(1)} meter camera distance, ${camera.focal}mm lens, ${camera.roll} degree roll, clean details, complete composition, high quality image prompt`;
  const negativePrompt =
    "低清晰度，畸变手指，多余肢体，错误透视，杂乱文字，水印，过度磨皮，重复人物，裁切面部";

  const output =
    activeTab === "zh"
      ? zhPrompt
      : activeTab === "en"
        ? enPrompt
        : negativePrompt;

  function toggleItem(category: PromptCategory, value: string) {
    setSelection((current) => {
      const selected = current[category.id] ?? [];
      if (category.selection === "single") {
        return {
          ...current,
          [category.id]: selected.includes(value) ? [] : [value],
        };
      }
      return {
        ...current,
        [category.id]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  }

  function randomize() {
    setSelection(
      Object.fromEntries(
        CATEGORIES.map((category) => {
          const count = category.selection === "single" ? 1 : 2;
          const shuffled = [...category.items].sort(() => Math.random() - 0.5);
          return [category.id, shuffled.slice(0, count).map((item) => item.zh)];
        }),
      ),
    );
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel("已复制");
    } catch {
      setCopyLabel("复制失败");
    }
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyLabel("复制"), 1400);
  }

  const previewStyle: CSSProperties = {
    transform: `perspective(900px) rotateX(${camera.elevation * -0.25}deg) rotateY(${camera.azimuth * 0.45}deg) rotateZ(${camera.roll}deg) scale(${Math.max(0.66, 1.5 / camera.distance)})`,
  };

  const filteredCategories = CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter((item) => {
      const normalized = query.trim().toLowerCase();
      return (
        !normalized ||
        item.zh.toLowerCase().includes(normalized) ||
        item.en.toLowerCase().includes(normalized)
      );
    }),
  })).filter((category) => category.items.length > 0);

  return (
    <section className="prompt-studio" aria-label="提示词工坊">
      <div className="prompt-studio-heading">
        <div>
          <span className="eyebrow">PROMPT STUDIO · 02</span>
          <h1>拼出更准确的画面描述</h1>
          <p>组合人物、场景和镜头参数，再把最终提示词送回创作台。</p>
        </div>
        <button className="secondary-action" type="button" onClick={randomize}>
          <Shuffle size={15} />
          随机组合
        </button>
      </div>

      <div className="prompt-lab-grid">
        <section className="pose-panel" aria-label="机位预览">
          <div className="panel-heading">
            <span>机位预览</span>
            <small>{camera.focal}mm</small>
          </div>
          <div className="pose-stage">
            <span className="pose-grid" aria-hidden="true" />
            <div className="pose-frame">
              <div className="pose-figure" style={previewStyle}>
                <svg viewBox="0 0 180 360" role="img" aria-label="通用人物机位示意图">
                  <circle cx="90" cy="54" r="34" />
                  <path d="M68 90 Q90 78 112 90 L132 174 Q112 196 90 196 Q68 196 48 174 Z" />
                  <path d="M61 170 L42 290" />
                  <path d="M119 170 L138 290" />
                  <path d="M74 184 L66 330" />
                  <path d="M106 184 L114 330" />
                </svg>
              </div>
            </div>
            <span className="pose-readout">
              {camera.azimuth}° / {camera.elevation}° /{" "}
              {camera.distance.toFixed(1)}m
            </span>
          </div>
          <div className="camera-presets">
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setCamera(preset.camera)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="camera-panel" aria-label="镜头参数">
          <div className="panel-heading">
            <span>镜头参数</span>
            <Camera size={15} />
          </div>
          {(
            [
              ["azimuth", "水平方位", -180, 180, "°"],
              ["elevation", "俯仰角度", -45, 60, "°"],
              ["distance", "机位距离", 1.2, 8, "m"],
              ["focal", "等效焦距", 18, 135, "mm"],
              ["roll", "画面倾斜", -25, 25, "°"],
            ] as const
          ).map(([key, label, min, max, unit]) => (
            <label className="camera-control" key={key}>
              <span>
                {label}
                <b>
                  {key === "distance"
                    ? camera[key].toFixed(1)
                    : camera[key]}
                  {unit}
                </b>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={key === "distance" ? 0.1 : 1}
                value={camera[key]}
                onChange={(event) =>
                  setCamera((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
          <button
            className="reset-camera"
            type="button"
            onClick={() => setCamera(DEFAULT_CAMERA)}
          >
            <RotateCcw size={13} />
            重置机位
          </button>
        </section>

        <section className="tag-library" aria-label="提示词标签">
          <div className="tag-toolbar">
            <label>
              <Search size={14} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标签"
              />
            </label>
            <span>{chosenItems.length} 项已选</span>
          </div>
          <div className="tag-categories">
            {filteredCategories.map((category) => (
              <div className="tag-category" key={category.id}>
                <div className="tag-category-heading">
                  <strong>{category.label}</strong>
                  <small>{category.selection === "single" ? "单选" : "多选"}</small>
                </div>
                <div className="tag-chip-list">
                  {category.items.map((item) => {
                    const selected = (selection[category.id] ?? []).includes(
                      item.zh,
                    );
                    return (
                      <button
                        type="button"
                        key={item.zh}
                        className={selected ? "selected" : ""}
                        aria-pressed={selected}
                        onClick={() => toggleItem(category, item.zh)}
                      >
                        {item.zh}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="prompt-result-panel" aria-label="最终提示词">
        <div className="prompt-result-toolbar">
          <div className="prompt-result-tabs">
            <button
              className={activeTab === "zh" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("zh")}
            >
              中文
            </button>
            <button
              className={activeTab === "en" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("en")}
            >
              English
            </button>
            <button
              className={activeTab === "negative" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("negative")}
            >
              负面词
            </button>
          </div>
          <button
            className="copy-prompt-button"
            type="button"
            onClick={() => void copyOutput()}
          >
            <Copy size={13} />
            {copyLabel}
          </button>
        </div>
        <p>{output}</p>
        <div className="prompt-result-actions">
          <span>
            <Sparkles size={13} />
            提示词会继续在创作台中编辑
          </span>
          <button type="button" onClick={() => onUsePrompt(zhPrompt)}>
            <Send size={14} />
            送到创作台
          </button>
        </div>
      </section>
    </section>
  );
}
