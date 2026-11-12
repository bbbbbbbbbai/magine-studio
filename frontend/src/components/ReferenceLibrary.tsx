import {
  ImageOff,
  Layers3,
  LoaderCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Shirt,
  UserRound,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  buildReferencePrompt,
  loadReferenceLibrary,
  selectedReferenceCount,
  type ReferenceItem,
  type ReferenceKind,
  type ReferenceLibraryData,
  type ReferenceRecipe,
} from "../reference-library";
import { useIsMobile } from "../use-mobile";
import { RecipeDock } from "./reference/RecipeDock";
import { ReferenceCard } from "./reference/ReferenceCard";
import { ReferenceLightbox } from "./reference/ReferenceLightbox";

interface ReferenceLibraryProps {
  recipe: ReferenceRecipe;
  isRoot: boolean;
  onRecipeChange: (recipe: ReferenceRecipe) => void;
  onUseRecipe: (prompt: string) => void;
}

const TABS: Array<{
  id: ReferenceKind;
  label: string;
  eyebrow: string;
  icon: typeof UserRound;
}> = [
  {
    id: "portrait",
    label: "人像",
    eyebrow: "PORTRAIT",
    icon: UserRound,
  },
  {
    id: "costume",
    label: "服装",
    eyebrow: "COSTUME",
    icon: Shirt,
  },
  {
    id: "pose",
    label: "姿势",
    eyebrow: "POSE",
    icon: Layers3,
  },
];

const PAGE_SIZE = 30;

function isSelected(recipe: ReferenceRecipe, item: ReferenceItem) {
  return recipe[item.kind]?.key === item.key;
}

export function ReferenceLibrary({
  recipe,
  isRoot,
  onRecipeChange,
  onUseRecipe,
}: ReferenceLibraryProps) {
  const isMobile = useIsMobile();
  const [library, setLibrary] = useState<ReferenceLibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReferenceKind>("portrait");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [safeMode, setSafeMode] = useState(true);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("复制提示词");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadReferenceLibrary()
      .then((data) => {
        if (active) {
          setLibrary(data);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "无法加载角色素材库",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sourceItems = useMemo(() => {
    if (!library) return [];
    if (tab === "portrait") return library.portraits;
    if (tab === "costume") return library.costumes;
    return library.poses;
  }, [library, tab]);

  const effectiveSafeMode = !isRoot || safeMode;
  const safeItems = useMemo(
    () =>
      effectiveSafeMode
        ? sourceItems.filter((item) => !item.nsfw)
        : sourceItems,
    [effectiveSafeMode, sourceItems],
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    safeItems.forEach((item) => {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], "zh-CN"),
    );
  }, [safeItems]);

  const filtered = useMemo(() => {
    return safeItems.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!deferredQuery) return true;
      const text = [
        item.id,
        item.title,
        item.subtitle,
        item.category,
        item.promptText,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(deferredQuery);
    });
  }, [category, deferredQuery, safeItems]);

  const visibleItems = filtered.slice(0, shown);
  const viewerIndex = viewerKey
    ? filtered.findIndex((item) => item.key === viewerKey)
    : -1;
  const viewerItem = viewerIndex >= 0 ? filtered[viewerIndex] : null;
  const hiddenAdultCount = sourceItems.filter((item) => item.nsfw).length;
  const totalCount = library
    ? library.counts.portrait + library.counts.costume + library.counts.pose
    : 0;
  const chosenCount = selectedReferenceCount(recipe);
  const prompt = buildReferencePrompt(recipe);

  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [tab, category, deferredQuery, safeMode]);

  useEffect(() => {
    if (!isRoot) setSafeMode(true);
  }, [isRoot]);

  useEffect(() => {
    if (!viewerItem) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerKey(null);
      } else if (event.key === "ArrowLeft") {
        const previous =
          filtered[(viewerIndex - 1 + filtered.length) % filtered.length];
        if (previous) setViewerKey(previous.key);
      } else if (event.key === "ArrowRight") {
        const next = filtered[(viewerIndex + 1) % filtered.length];
        if (next) setViewerKey(next.key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filtered, viewerIndex, viewerItem]);

  useEffect(() => {
    if (!viewerItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerItem]);

  function chooseTab(nextTab: ReferenceKind) {
    setTab(nextTab);
    setCategory("all");
    setQuery("");
  }

  function toggleItem(item: ReferenceItem) {
    onRecipeChange({
      ...recipe,
      [item.kind]: isSelected(recipe, item) ? null : item,
    });
  }

  function removeSlot(kind: ReferenceKind) {
    onRecipeChange({ ...recipe, [kind]: null });
  }

  function handleSafeMode(next: boolean) {
    if (!isRoot) return;
    setSafeMode(next);
    if (!next) return;
    onRecipeChange({
      ...recipe,
      portrait: recipe.portrait?.nsfw ? null : recipe.portrait,
      costume: recipe.costume?.nsfw ? null : recipe.costume,
      pose: recipe.pose?.nsfw ? null : recipe.pose,
      poseDepth: recipe.poseDepth,
    });
  }

  function randomizeRecipe() {
    if (!library) return;
    const pool = (items: ReferenceItem[]) =>
      effectiveSafeMode ? items.filter((item) => !item.nsfw) : items;
    const pick = (items: ReferenceItem[]) => {
      const choices = pool(items);
      return choices[Math.floor(Math.random() * choices.length)] || null;
    };
    onRecipeChange({
      portrait: pick(library.portraits),
      costume: pick(library.costumes),
      pose: pick(library.poses),
      poseDepth: recipe.poseDepth,
    });
  }

  async function copyPrompt() {
    if (!chosenCount) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyLabel("已复制");
      window.setTimeout(() => setCopyLabel("复制提示词"), 1400);
    } catch {
      setCopyLabel("复制失败");
    }
  }

  function useCurrentRecipe() {
    if (!chosenCount) return;
    onUseRecipe(prompt);
  }

  return (
    <section className="reference-library" aria-label="人像服装姿势素材库">
      <div className="reference-hero">
        <div className="reference-hero-copy">
          <span className="eyebrow">CHARACTER ATLAS · REFERENCE</span>
          <h1>
            先选参考，
            <br className="reference-mobile-break" />
            再开始创作。
          </h1>
          <p>
            从人像、服装和姿势中自由组合角色配方。选中素材后会自动生成结构化提示词，
            送入创作台继续调整画风、画幅和模型。
          </p>
        </div>
        <div className="reference-stats" aria-label="素材库统计">
          <div>
            <strong>{library?.counts.portrait ?? "—"}</strong>
            <span>人像参考</span>
          </div>
          <div>
            <strong>{library?.counts.costume ?? "—"}</strong>
            <span>服装造型</span>
          </div>
          <div>
            <strong>{library?.counts.pose ?? "—"}</strong>
            <span>姿势视角</span>
          </div>
        </div>
      </div>

      <div className="reference-layout">
        <div className="reference-browser">
          <div className="reference-toolbar">
            <div className="reference-tabs" role="tablist" aria-label="素材类型">
              {TABS.map(({ id, label, eyebrow, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={tab === id ? "active" : ""}
                  onClick={() => chooseTab(id)}
                >
                  <Icon size={16} strokeWidth={2.2} />
                  <span>{label}</span>
                  <small>{eyebrow}</small>
                </button>
              ))}
            </div>
            <div className="reference-meta">
              <span>{totalCount ? `${totalCount} 条索引` : "正在读取索引"}</span>
              {isRoot && (
                <button
                  type="button"
                  className={`safe-mode-toggle ${safeMode ? "active" : ""}`}
                  onClick={() => handleSafeMode(!safeMode)}
                  aria-pressed={safeMode}
                  title="切换安全内容过滤"
                >
                  <ShieldCheck size={14} />
                  安全模式 {safeMode ? "开" : "关"}
                </button>
              )}
            </div>
          </div>

          <div className="reference-searchbar">
            <label className="reference-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === "portrait"
                    ? "搜索发型、发长、风格或 ID…"
                    : tab === "costume"
                      ? "搜索款式、颜色、材质或英文词条…"
                      : "搜索姿势名称、动作分类、编号或视角…"
                }
                aria-label="搜索参考素材"
              />
              {query && (
                <button
                  type="button"
                  aria-label="清空搜索"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            {tab === "pose" && (
              <div className="depth-switch" aria-label="姿势预览模式">
                <button
                  type="button"
                  className={!recipe.poseDepth ? "active" : ""}
                  onClick={() =>
                    onRecipeChange({ ...recipe, poseDepth: false })
                  }
                >
                  白模
                </button>
                <button
                  type="button"
                  className={recipe.poseDepth ? "active" : ""}
                  onClick={() =>
                    onRecipeChange({ ...recipe, poseDepth: true })
                  }
                >
                  深度图
                </button>
              </div>
            )}
          </div>

          <div className="reference-filter-row">
            <div className="reference-categories" aria-label="分类筛选">
              <button
                type="button"
                className={category === "all" ? "active" : ""}
                onClick={() => setCategory("all")}
              >
                全部 <small>{safeItems.length}</small>
              </button>
              {categories.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  className={category === name ? "active" : ""}
                  onClick={() => setCategory(name)}
                >
                  {name} <small>{count}</small>
                </button>
              ))}
            </div>
            <span className="reference-result-count">
              {filtered.length} 个结果
            </span>
          </div>

          {effectiveSafeMode && hiddenAdultCount > 0 && (
            <p className="safe-mode-note">
              <ShieldCheck size={13} />
              已隐藏 {hiddenAdultCount} 条成人向人体与服装参考。
            </p>
          )}

          {loading && (
            <div className="reference-loading" role="status">
              <LoaderCircle className="spin" size={27} />
              <strong>正在装载 6,000+ 条角色参考</strong>
              <p>首次打开需要读取约 4 MB 素材索引，之后会由浏览器缓存。</p>
            </div>
          )}

          {!loading && error && (
            <div className="reference-error">
              <ImageOff size={30} />
              <strong>素材库没有加载成功</strong>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  void loadReferenceLibrary()
                    .then((data) => {
                      setLibrary(data);
                      setLoading(false);
                    })
                    .catch((reason: unknown) => {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "无法加载角色素材库",
                      );
                      setLoading(false);
                    });
                }}
              >
                <RotateCcw size={14} />
                重新加载
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="reference-empty">
              <Search size={30} />
              <strong>没有找到匹配的参考</strong>
              <p>换一个关键词，或重置当前筛选条件。</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                重置筛选
              </button>
            </div>
          )}

          {!loading && !error && visibleItems.length > 0 && (
            <>
              <div className="reference-grid">
                {visibleItems.map((item, index) => {
                  return (
                    <ReferenceCard
                      key={item.key}
                      item={item}
                      index={index}
                      selected={isSelected(recipe, item)}
                      poseDepth={recipe.poseDepth}
                      onOpen={() => setViewerKey(item.key)}
                      onToggle={() => toggleItem(item)}
                    />
                  );
                })}
              </div>
              {shown < filtered.length && (
                <button
                  type="button"
                  className="reference-load-more"
                  onClick={() => setShown((value) => value + PAGE_SIZE)}
                >
                  加载更多
                  <span>剩余 {filtered.length - shown} 条</span>
                </button>
              )}
            </>
          )}
        </div>

        <RecipeDock
          recipe={recipe}
          prompt={prompt}
          chosenCount={chosenCount}
          libraryReady={Boolean(library)}
          isMobile={isMobile}
          copyLabel={copyLabel}
          onRemove={removeSlot}
          onRandomize={randomizeRecipe}
          onCopy={() => void copyPrompt()}
          onUse={useCurrentRecipe}
        />
      </div>

      {viewerItem && (
        <ReferenceLightbox
          item={viewerItem}
          total={filtered.length}
          selected={isSelected(recipe, viewerItem)}
          recipe={recipe}
          isMobile={isMobile}
          onClose={() => setViewerKey(null)}
          onPrevious={() => {
            const previous =
              filtered[(viewerIndex - 1 + filtered.length) % filtered.length];
            if (previous) setViewerKey(previous.key);
          }}
          onNext={() => {
            const next = filtered[(viewerIndex + 1) % filtered.length];
            if (next) setViewerKey(next.key);
          }}
          onPoseDepthChange={(poseDepth) =>
            onRecipeChange({ ...recipe, poseDepth })
          }
          onToggle={() => toggleItem(viewerItem)}
        />
      )}
    </section>
  );
}
