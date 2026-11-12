import {
  ArrowUpRight,
  Check,
  ImagePlus,
  Images,
  LoaderCircle,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  referenceThumb,
  selectedReferenceCount,
  type ReferenceRecipe,
} from "../reference-library";
import {
  MAX_REFERENCE_IMAGES,
  prepareReferenceImage,
  type AttachedReference,
} from "../reference-images";
import {
  DEFAULT_IMAGE_STYLE,
  IMAGE_STYLE_PRESETS,
} from "../image-styles";
import { FALLBACK_IMAGE_MODELS } from "../image-models";
import type {
  AspectRatio,
  GenerationCreate,
  PublicConfig,
} from "../types";

const RATIOS: Array<{ value: AspectRatio; label: string }> = [
  { value: "1:1", label: "方形" },
  { value: "4:3", label: "横向" },
  { value: "3:4", label: "竖向" },
  { value: "16:9", label: "宽屏" },
  { value: "9:16", label: "竖屏" },
];

interface CreationStudioProps {
  busy: boolean;
  config: PublicConfig | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  onOpenPromptLab: () => void;
  onOpenReference: () => void;
  referenceRecipe: ReferenceRecipe;
  onClearReferences: () => void;
  onSubmit: (input: GenerationCreate) => Promise<void>;
}

export function CreationStudio({
  busy,
  config,
  prompt,
  onPromptChange,
  onOpenPromptLab,
  onOpenReference,
  referenceRecipe,
  onClearReferences,
  onSubmit,
}: CreationStudioProps) {
  const [style, setStyle] = useState(DEFAULT_IMAGE_STYLE);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [imageModel, setImageModel] = useState("z-image-2.5");
  const [showSettings, setShowSettings] = useState(false);
  const [referenceImages, setReferenceImages] = useState<AttachedReference[]>(
    [],
  );
  const [preparingReferences, setPreparingReferences] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [draggingReferences, setDraggingReferences] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const referenceItems = [
    referenceRecipe.portrait,
    referenceRecipe.costume,
    referenceRecipe.pose,
  ].filter((item) => Boolean(item));
  const chosenReferenceCount = selectedReferenceCount(referenceRecipe);
  const referencesUnsupported =
    referenceImages.length > 0 && !selectedModel.supports_references;

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (
      busy ||
      prompt.trim().length < 3 ||
      !selectedModel.configured ||
      referencesUnsupported
    ) {
      return;
    }
    await onSubmit({
      prompt: prompt.trim(),
      style,
      aspect_ratio: aspectRatio,
      image_model: selectedModel.id,
      reference_images: referenceImages.map((item) => item.dataUrl),
      enhance_prompt: true,
    });
  }

  async function addReferenceFiles(files: File[]) {
    if (!files.length) return;
    const available = MAX_REFERENCE_IMAGES - referenceImages.length;
    if (available <= 0) {
      setReferenceError(`最多添加 ${MAX_REFERENCE_IMAGES} 张参考图`);
      return;
    }
    const selected = files.slice(0, available);
    setReferenceError(
      files.length > available
        ? `最多添加 ${MAX_REFERENCE_IMAGES} 张参考图，已选择前 ${available} 张`
        : null,
    );
    setPreparingReferences(true);
    const results = await Promise.allSettled(
      selected.map((file) => prepareReferenceImage(file)),
    );
    const prepared = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const rejected = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    );
    if (rejected) {
      setReferenceError(
        rejected.reason instanceof Error
          ? rejected.reason.message
          : "部分参考图读取失败",
      );
    }
    setReferenceImages((current) => [...current, ...prepared]);
    setPreparingReferences(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleReferenceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDraggingReferences(false);
    void addReferenceFiles(Array.from(event.dataTransfer.files));
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
        {chosenReferenceCount > 0 && (
          <div className="creation-reference-preview">
            <div className="creation-reference-heading">
              <span>
                <Images size={13} />
                已应用角色配方 · {chosenReferenceCount} 项
              </span>
              <button type="button" onClick={onClearReferences}>
                <X size={12} />
                清除参考
              </button>
            </div>
            <div className="creation-reference-list">
              {referenceItems.map((item) => (
                <div key={item?.key}>
                  {item && (
                    <>
                      <img
                        src={referenceThumb(item, referenceRecipe.poseDepth)}
                        alt={item.title}
                      />
                      <span>{item.title}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="creation-reference-uploader">
          <div className="creation-uploader-heading">
            <span>
              <ImagePlus size={14} />
              参考图
              <small>最多 {MAX_REFERENCE_IMAGES} 张</small>
            </span>
            <span>{referenceImages.length} / {MAX_REFERENCE_IMAGES}</span>
          </div>
          <input
            ref={fileInputRef}
            className="creation-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) =>
              void addReferenceFiles(Array.from(event.target.files || []))
            }
          />
          <div
            className={`creation-uploader-zone ${
              draggingReferences ? "dragging" : ""
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDraggingReferences(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDraggingReferences(false)}
            onDrop={handleReferenceDrop}
          >
            {referenceImages.map((item) => (
              <div className="creation-upload-thumb" key={item.id}>
                <img src={item.dataUrl} alt={item.name} />
                <button
                  type="button"
                  aria-label={`移除参考图 ${item.name}`}
                  onClick={() =>
                    setReferenceImages((current) =>
                      current.filter((image) => image.id !== item.id),
                    )
                  }
                >
                  <Trash2 size={12} />
                </button>
                <span>{item.name}</span>
              </div>
            ))}
            {referenceImages.length < MAX_REFERENCE_IMAGES && (
              <button
                type="button"
                className="creation-upload-add"
                disabled={preparingReferences}
                onClick={() => fileInputRef.current?.click()}
              >
                {preparingReferences ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <ImagePlus size={18} />
                )}
                <span>
                  {preparingReferences ? "正在处理" : "上传 / 拖入"}
                </span>
                <small>PNG · JPG · WebP</small>
              </button>
            )}
          </div>
          {referenceError && (
            <p className="creation-upload-error">{referenceError}</p>
          )}
          {referencesUnsupported && (
            <p className="creation-upload-error">
              {selectedModel.label} 不支持参考图，请切换 Z-image2.5。
            </p>
          )}
          <p className="creation-upload-note">
            参考图会在浏览器压缩后随任务保存，用于保持人物、服装或构图一致。
          </p>
        </div>

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
            onClick={onOpenReference}
          >
            <Images size={14} />
            打开角色图库
          </button>
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
                  请在服务器设置 GPT_IMAGE_API_KEY 或 IMAGE_API_KEY 后重启后端。
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
                    {IMAGE_STYLE_PRESETS.map((item) => (
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
              {IMAGE_STYLE_PRESETS.map(({ id, label, icon: Icon }) => (
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
            busy ||
            prompt.trim().length < 3 ||
            !selectedModel.configured ||
            referencesUnsupported
          }
        >
          {busy ? (
            <>
              <span className="button-spinner" />
              正在生成
            </>
          ) : !selectedModel.configured ? (
            <>请先配置 {selectedModel.label}</>
          ) : referencesUnsupported ? (
            <>当前模型不支持参考图</>
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
