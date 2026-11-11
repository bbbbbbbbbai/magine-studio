import {
  BookOpen,
  CircleHelp,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import type { PublicConfig } from "../types";

interface HeaderProps {
  config: PublicConfig | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const NAV_ITEMS = [
  { id: "composer", label: "创作台" },
  { id: "prompt-output", label: "提示词工坊" },
  { id: "stage", label: "封面预览" },
  { id: "history", label: "灵感档案" },
];

export function Header({
  config,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const [activeNav, setActiveNav] = useState("composer");

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
        <span className="nav-caption">快速导航</span>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            className={`nav-link ${activeNav === item.id ? "active" : ""}`}
            href={`#${item.id}`}
            aria-current={activeNav === item.id ? "page" : undefined}
            onClick={() => setActiveNav(item.id)}
          >
            {item.label}
          </a>
        ))}
        <label className="nav-search">
          <span className="sr-only">搜索灵感碎片</span>
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索灵感，如：天台 / 逆光"
          />
        </label>
      </nav>
    </>
  );
}
