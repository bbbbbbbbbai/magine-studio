import { BookOpen, Sparkles } from "lucide-react";
import type { PublicConfig } from "../types";

interface HeaderProps {
  config: PublicConfig | null;
}

export function Header({ config }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Sparkles size={17} strokeWidth={2.3} />
        </span>
        <span className="brand-name">IMAGINE</span>
        <span className="brand-suffix">STUDIO</span>
      </div>

      <div className="topbar-actions">
        <span className="model-status">
          <i className={config?.llm_configured ? "online" : ""} />
          {config?.llm_configured ? "DeepSeek 已连接" : "本地提示词模式"}
        </span>
        <a
          className="icon-button docs-button"
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          aria-label="打开 API 文档"
          title="API 文档"
        >
          <BookOpen size={18} />
        </a>
      </div>
    </header>
  );
}
