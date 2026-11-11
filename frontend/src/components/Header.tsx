import {
  BookOpen,
  CircleHelp,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { PublicConfig } from "../types";

export type WorkspaceView = "studio" | "prompt" | "archive";

interface HeaderProps {
  config: PublicConfig | null;
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
}

const NAV_ITEMS = [
  { id: "studio", label: "创作台" },
  { id: "prompt", label: "提示词工坊" },
  { id: "archive", label: "作品档案" },
];

export function Header({
  config,
  activeView,
  onNavigate,
}: HeaderProps) {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#composer" aria-label="Imagine Studio 创作台">
          <span className="brand-mark">
            <Sparkles size={17} strokeWidth={2.5} />
          </span>
          <span className="brand-copy">
            <strong>IMAGINE STUDIO</strong>
            <small>MAKE YOUTH VISIBLE</small>
          </span>
        </a>

        <div className="topbar-actions">
          <span className="model-status">
            <i className={config?.llm_configured ? "online" : ""} />
            {config?.llm_configured ? "DeepSeek 灵感引擎已连接" : "本地提示词模式"}
          </span>
          <button
            className="icon-button desktop-only"
            type="button"
            aria-label="查看使用提示"
            title="选择灵感碎片即可自动组合提示词"
          >
            <CircleHelp size={17} />
          </button>
          <a
            className="icon-button docs-button"
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            aria-label="打开 API 文档"
            title="API 文档"
          >
            <BookOpen size={17} />
          </a>
          <button className="avatar-button" type="button" aria-label="个人中心">
            <UserRound size={17} />
          </button>
        </div>
      </header>

      <nav className="main-nav" aria-label="工作台导航">
        <span className="nav-caption">工作区</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-link ${activeView === item.id ? "active" : ""}`}
            aria-current={activeView === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id as WorkspaceView)}
          >
            {item.label}
          </button>
        ))}
        <span className="nav-spacer" />
        <span className="nav-route-note">
          {activeView === "studio"
            ? "文字输入 · 图片输出"
            : activeView === "prompt"
              ? "标签组合 · 镜头参数"
              : "历史生成 · 作品管理"}
        </span>
      </nav>
    </>
  );
}
