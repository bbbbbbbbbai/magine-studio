import {
  ArrowRight,
  Copy,
  ExternalLink,
  Layers3,
  Shirt,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import {
  referenceThumb,
  type ReferenceKind,
  type ReferenceRecipe,
} from "../../reference-library";
import { ReferenceImage } from "./ReferenceImage";

const SLOT_META: Array<{
  kind: ReferenceKind;
  label: string;
  hint: string;
  icon: typeof UserRound;
}> = [
  { kind: "portrait", label: "人像", hint: "脸与发型", icon: UserRound },
  { kind: "costume", label: "服装", hint: "穿搭与材质", icon: Shirt },
  { kind: "pose", label: "姿势", hint: "动作与视角", icon: Layers3 },
];

const SOURCE_LINKS = [
  { label: "人像", href: "https://ai-portrait-gallery.pages.dev/" },
  { label: "服装", href: "https://ai-costume-gallery.pages.dev/" },
  { label: "姿势", href: "https://ai-pose-gallery.pages.dev/" },
];

interface RecipeDockProps {
  recipe: ReferenceRecipe;
  prompt: string;
  chosenCount: number;
  libraryReady: boolean;
  isMobile: boolean;
  copyLabel: string;
  onRemove: (kind: ReferenceKind) => void;
  onRandomize: () => void;
  onCopy: () => void;
  onUse: () => void;
}

export function RecipeDock({
  recipe,
  prompt,
  chosenCount,
  libraryReady,
  isMobile,
  copyLabel,
  onRemove,
  onRandomize,
  onCopy,
  onUse,
}: RecipeDockProps) {
  return (
    <aside className="recipe-dock" aria-label="角色配方">
      <div className="recipe-dock-heading">
        <div>
          <span className="eyebrow">RECIPE</span>
          <h2>角色配方</h2>
        </div>
        <span>{chosenCount} / 3</span>
      </div>
      <p className="recipe-intro">
        三项都可以独立选择。配方会自动整理成适合生图模型的中文提示词。
      </p>

      <div className="recipe-slots">
        {SLOT_META.map(({ kind, label, hint, icon: Icon }) => {
          const item = recipe[kind];
          return (
            <div
              className={`recipe-slot ${item ? "filled" : ""}`}
              data-nsfw={item?.nsfw ?? false}
              key={kind}
            >
              <div className="recipe-slot-preview">
                {item ? (
                  <ReferenceImage
                    src={referenceThumb(item, recipe.poseDepth)}
                    alt={item.title}
                  />
                ) : (
                  <Icon size={22} />
                )}
              </div>
              <div>
                <span>
                  {label}
                  <small>{hint}</small>
                </span>
                <strong>{item?.title || "尚未选择"}</strong>
              </div>
              {item && (
                <button
                  type="button"
                  aria-label={`移除${label}参考`}
                  onClick={() => onRemove(kind)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="recipe-randomize"
        onClick={onRandomize}
        disabled={!libraryReady}
      >
        <WandSparkles size={15} />
        随机搭配一套
      </button>

      <div className="recipe-prompt">
        <div>
          <span>生成提示词</span>
          <small>{prompt.length} 字</small>
        </div>
        <p>
          {chosenCount
            ? prompt
            : "先挑选人像、服装或姿势，提示词会在这里自动组装。"}
        </p>
      </div>

      <div className="recipe-actions">
        <button
          type="button"
          className="recipe-copy"
          onClick={onCopy}
          disabled={!chosenCount}
        >
          <Copy size={14} />
          {copyLabel}
        </button>
        <button
          type="button"
          className="recipe-use"
          onClick={onUse}
          disabled={!chosenCount}
        >
          送到创作台
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="recipe-sources">
        <strong>素材来源</strong>
        <p>
          素材索引与图片来自公开参考站，仅作为创作学习与视觉参考。
          各图片版权及使用条件归原作者所有。
        </p>
        {!isMobile && (
          <div>
            {SOURCE_LINKS.map(({ label, href }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer">
                {label}
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
