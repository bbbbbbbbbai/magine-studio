import {
  Check,
  Clipboard,
  KeyRound,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { isValidUserId } from "../user-identity";

interface IdentityDialogProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onRestore: (userId: string) => void;
}

export function IdentityDialog({
  open,
  userId,
  onClose,
  onRestore,
}: IdentityDialogProps) {
  const [copyState, setCopyState] = useState("复制 UUID");
  const [showRestore, setShowRestore] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  if (!open) return null;

  async function copyUserId() {
    try {
      await navigator.clipboard.writeText(userId);
      setCopyState("已复制");
      window.setTimeout(() => setCopyState("复制 UUID"), 1400);
    } catch {
      setCopyState("复制失败");
    }
  }

  function restoreIdentity(event: FormEvent) {
    event.preventDefault();
    const value = replacement.trim();
    if (!isValidUserId(value)) {
      setRestoreError("请输入有效的 UUID");
      return;
    }
    onRestore(value);
    setReplacement("");
    setRestoreError(null);
    setShowRestore(false);
  }

  return (
    <div
      className="identity-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="identity-dialog">
        <button
          className="identity-close"
          type="button"
          onClick={onClose}
          aria-label="关闭 UUID 提示"
        >
          <X size={17} />
        </button>

        <span className="identity-mark">
          <KeyRound size={24} />
        </span>
        <span className="eyebrow">YOUR IDENTITY</span>
        <h2 id="identity-title">保存你的专属 UUID</h2>
        <p>
          这个 UUID 是你的身份凭证，也是作品归属。以后换设备或清理浏览器前，
          请先保存它，否则将无法恢复当前作品。
        </p>

        <div className="identity-uuid">
          <code>{userId}</code>
          <button type="button" onClick={() => void copyUserId()}>
            {copyState === "已复制" ? (
              <Check size={14} />
            ) : (
              <Clipboard size={14} />
            )}
            {copyState}
          </button>
        </div>

        {showRestore ? (
          <form className="identity-restore" onSubmit={restoreIdentity}>
            <label htmlFor="restore-user-id">恢复已有 UUID</label>
            <div>
              <input
                id="restore-user-id"
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                placeholder="粘贴之前保存的 UUID"
                autoComplete="off"
              />
              <button type="submit">恢复</button>
            </div>
            {restoreError && <p>{restoreError}</p>}
          </form>
        ) : (
          <button
            type="button"
            className="identity-restore-link"
            onClick={() => setShowRestore(true)}
          >
            我有已保存的 UUID
          </button>
        )}

        <button className="identity-confirm" type="button" onClick={onClose}>
          <Check size={15} />
          我已保存 UUID
        </button>
      </div>
    </div>
  );
}
