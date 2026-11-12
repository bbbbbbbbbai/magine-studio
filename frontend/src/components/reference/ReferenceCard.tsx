import { Check, Sparkles } from "lucide-react";
import {
  referenceThumb,
  type ReferenceItem,
} from "../../reference-library";
import { ReferenceImage } from "./ReferenceImage";

interface ReferenceCardProps {
  item: ReferenceItem;
  index: number;
  selected: boolean;
  poseDepth: boolean;
  onOpen: () => void;
  onToggle: () => void;
}

export function ReferenceCard({
  item,
  index,
  selected,
  poseDepth,
  onOpen,
  onToggle,
}: ReferenceCardProps) {
  return (
    <article
      className={`reference-card ${selected ? "selected" : ""}`}
      data-nsfw={item.nsfw}
      style={{ animationDelay: `${Math.min(index, 9) * 24}ms` }}
    >
      <button
        type="button"
        className="reference-card-media"
        onClick={onOpen}
        aria-label={`查看${item.title}大图`}
      >
        <ReferenceImage
          src={referenceThumb(item, poseDepth)}
          alt={item.title}
        />
        <span className="reference-card-code">
          {item.id.replace(/^(charadb|gia-anime|shisei)-/, "")}
        </span>
        {item.angle && (
          <span className="reference-card-angle">{item.angle}</span>
        )}
        {item.hot && <span className="reference-card-hot">热门</span>}
      </button>
      <div className="reference-card-copy">
        <strong title={item.title}>{item.title}</strong>
        <span title={item.subtitle}>{item.subtitle}</span>
      </div>
      <button
        type="button"
        className={`reference-pick ${selected ? "active" : ""}`}
        onClick={onToggle}
      >
        {selected ? <Check size={13} /> : <Sparkles size={13} />}
        {selected ? "已加入配方" : "加入配方"}
      </button>
    </article>
  );
}
