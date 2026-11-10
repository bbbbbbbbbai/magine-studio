import { AlertTriangle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Header } from "./components/Header";
import { HistoryPanel } from "./components/HistoryPanel";
import { PromptComposer } from "./components/PromptComposer";
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
      <Header config={config} />
      <main className="app-shell">
        <div className="workspace">
          <PromptComposer busy={submitting} onSubmit={handleGenerate} />
          <div className={loadingHistory ? "stage-loading" : ""}>
            <ResultCanvas generation={activeItem} hasHistory={items.length > 0} />
          </div>
        </div>

        <HistoryPanel
          items={items}
          activeId={activeId}
          onSelect={setActiveId}
          onDelete={handleDelete}
        />

        <footer className="page-footer">
          <span>IMAGINE STUDIO © 2026</span>
          <span>POWERED BY LANGCHAIN + FASTAPI</span>
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
