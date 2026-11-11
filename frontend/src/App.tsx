import { AlertTriangle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { CreationStudio } from "./components/CreationStudio";
import { Header, type WorkspaceView } from "./components/Header";
import { HistoryPanel } from "./components/HistoryPanel";
import { PromptStudio } from "./components/PromptStudio";
import { ResultCanvas } from "./components/ResultCanvas";
import type {
  Generation,
  GenerationCreate,
  PublicConfig,
} from "./types";

function isWorking(item: Generation) {
  return item.status === "pending" || item.status === "processing";
}

export default function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [items, setItems] = useState<Generation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("studio");
  const [draftPrompt, setDraftPrompt] = useState("");
  const pollInFlight = useRef(false);

  const refreshGenerations = useCallback(async (silent = false) => {
    if (!silent) setLoadingHistory(true);
    try {
      const response = await api.listGenerations();
      setItems(response.items);
      setActiveId((current) => {
        if (current && response.items.some((item) => item.id === current)) {
          return current;
        }
        return response.items[0]?.id ?? null;
      });
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "无法加载历史作品");
      }
    } finally {
      if (!silent) setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void refreshGenerations();
    api
      .config()
      .then(setConfig)
      .catch(() => {
        // The editor remains usable even if the lightweight config endpoint fails.
      });
  }, [refreshGenerations]);

  useEffect(() => {
    if (!items.some(isWorking)) return;

    const timer = window.setInterval(async () => {
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const response = await api.listGenerations();
        setItems(response.items);
      } catch {
        // Transient polling failures are ignored; the next poll can recover.
      } finally {
        pollInFlight.current = false;
      }
    }, 1800);

    return () => window.clearInterval(timer);
  }, [items]);

  async function handleGenerate(input: GenerationCreate) {
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createGeneration(input);
      setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setActiveId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交生成任务失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteGeneration(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setActiveId((current) => (current === id ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  const activeItem = items.find((item) => item.id === activeId) ?? null;

  return (
    <>
      <Header
        config={config}
        activeView={activeView}
        onNavigate={setActiveView}
      />
      <main className="app-shell">
        {activeView === "studio" && (
          <>
            <section className="studio-intro" aria-labelledby="page-title">
              <div>
                <span className="eyebrow">CREATE WITH TEXT</span>
                <h1 id="page-title">写下一句话，生成一张图。</h1>
              </div>
              <p>
                创作台只负责文字输入和图片输出。需要组合人物、场景和镜头时，
                请前往提示词工坊。
              </p>
            </section>

            <div className="studio-workspace">
              <CreationStudio
                busy={submitting}
                config={config}
                prompt={draftPrompt}
                onPromptChange={setDraftPrompt}
                onOpenPromptLab={() => setActiveView("prompt")}
                onSubmit={handleGenerate}
              />
              <div
                id="stage"
                className={loadingHistory ? "stage-loading" : ""}
              >
                <ResultCanvas generation={activeItem} />
              </div>
            </div>
          </>
        )}

        {activeView === "prompt" && (
          <PromptStudio
            onUsePrompt={(prompt) => {
              setDraftPrompt(prompt);
              setActiveView("studio");
            }}
          />
        )}

        {activeView === "archive" && (
          <HistoryPanel
            items={items}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              setActiveView("studio");
            }}
            onDelete={handleDelete}
          />
        )}

        <footer className="page-footer">
          <span>IMAGINE STUDIO © 2026</span>
          <span>创作台 · 提示词工坊 · 作品档案</span>
        </footer>
      </main>

      {error && (
        <div className="toast" role="alert">
          <span className="toast-icon">
            <AlertTriangle size={17} />
          </span>
          <div>
            <strong>操作未完成</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} aria-label="关闭提示">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
