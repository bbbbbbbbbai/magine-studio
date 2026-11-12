import { Sparkles, UserRound } from "lucide-react";

export type WorkspaceView = "studio" | "reference" | "prompt" | "archive";

interface HeaderProps {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  onOpenIdentity: () => void;
}

const NAV_ITEMS = [
  { id: "studio", label: "创作台" },
  { id: "reference", label: "角色图库" },
  { id: "prompt", label: "提示词工坊" },
  { id: "archive", label: "作品档案" },
];

export function Header({
  activeView,
  onNavigate,
  onOpenIdentity,
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
          <button
            className="avatar-button"
            type="button"
            aria-label="查看我的 UUID"
            title="我的 UUID"
            onClick={onOpenIdentity}
          >
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
            : activeView === "reference"
              ? "人像 · 服装 · 姿势"
            : activeView === "prompt"
              ? "标签组合 · 镜头参数"
              : "历史生成 · 作品管理"}
        </span>
      </nav>
    </>
  );
}
