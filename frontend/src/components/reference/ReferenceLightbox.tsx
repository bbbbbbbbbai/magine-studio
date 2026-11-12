import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import {
  referenceImage,
  type ReferenceItem,
  type ReferenceRecipe,
} from "../../reference-library";
import { ReferenceImage } from "./ReferenceImage";

const KIND_LABEL = {
  portrait: "PORTRAIT",
  costume: "COSTUME",
  pose: "POSE",
} as const;

interface ReferenceLightboxProps {
  item: ReferenceItem;
  total: number;
  selected: boolean;
  recipe: ReferenceRecipe;
  isMobile: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPoseDepthChange: (poseDepth: boolean) => void;
  onToggle: () => void;
}

export function ReferenceLightbox({
  item,
  total,
  selected,
  recipe,
  isMobile,
  onClose,
  onPrevious,
  onNext,
  onPoseDepthChange,
  onToggle,
}: ReferenceLightboxProps) {
  return (
    <div
      className="reference-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title}详情`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="reference-lightbox-panel">
        <button
          type="button"
          className="reference-lightbox-close"
          aria-label="关闭预览"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="reference-lightbox-media">
          <ReferenceImage
            src={referenceImage(item, recipe.poseDepth)}
            alt={item.title}
          />
          {total > 1 && (
            <>
              <button
                type="button"
                className="lightbox-arrow previous"
                aria-label="上一张"
                onClick={onPrevious}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="lightbox-arrow next"
                aria-label="下一张"
                onClick={onNext}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
        <div className="reference-lightbox-copy">
          <div>
            <span className="reference-lightbox-kind">
              {KIND_LABEL[item.kind]}
            </span>
            <h3>{item.title}</h3>
            <p>{item.subtitle}</p>
          </div>

          {item.kind === "pose" && (
            <div className="depth-switch lightbox-depth">
              <button
                type="button"
                className={!recipe.poseDepth ? "active" : ""}
                onClick={() => onPoseDepthChange(false)}
              >
                素体白模
              </button>
              <button
                type="button"
                className={recipe.poseDepth ? "active" : ""}
                onClick={() => onPoseDepthChange(true)}
              >
                深度图
              </button>
            </div>
          )}

          <div className="reference-lightbox-tags">
            {item.tags.slice(0, 10).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="reference-lightbox-prompt">
            <span>Prompt 线索</span>
            <p>{item.promptText}</p>
          </div>
          {!isMobile && (
            <a
              className="reference-original-link"
              href={item.original}
              target="_blank"
              rel="noreferrer"
            >
              查看原图
              <ExternalLink size={13} />
            </a>
          )}
          {!isMobile && item.sourceUrl && (
            <a
              className="reference-original-link"
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {item.sourceName}
              <ExternalLink size={13} />
            </a>
          )}
          <button
            type="button"
            className={`reference-lightbox-pick ${selected ? "active" : ""}`}
            onClick={onToggle}
          >
            {selected ? <Check size={16} /> : <Sparkles size={16} />}
            {selected ? "已加入角色配方" : "加入角色配方"}
          </button>
        </div>
      </div>
    </div>
  );
}
