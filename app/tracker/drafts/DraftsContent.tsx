"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type DraftEntry = {
  item: string;
  org: string;
  draft: string;
  updated_at: string;
};

export default function DraftsContent() {
  const searchParams = useSearchParams();
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const keyParam = searchParams.get("key");
    if (keyParam) {
      setPassword(keyParam);
      setAuthed(true);
      loadDrafts(keyParam);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  async function loadDrafts(key: string) {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`/api/drafts?key=${encodeURIComponent(key)}`);
      
      if (response.status === 401) {
        setError("Invalid password");
        setAuthed(false);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load drafts");
      }
      
      const data = await response.json();
      setDrafts(data.drafts || []);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim()) {
      loadDrafts(password.trim());
    }
  }

  if (!authed) {
    return (
      <main className="quest-board-page">
        <div className="quest-board-container drafts-container">
          <header className="quest-board-header">
            <h1>Draft Emails</h1>
            <p className="quest-board-subtitle">Password required to view saved drafts</p>
          </header>
          
          <div className="drafts-auth-form">
            <form onSubmit={handleAuth}>
              <input
                type="password"
                className="drafts-password-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button type="submit" className="draft-button draft-button-save">
                Access Drafts
              </button>
            </form>
            {error && <p className="draft-error">{error}</p>}
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="quest-board-page">
        <div className="quest-board-container drafts-container">
          <header className="quest-board-header">
            <h1>Draft Emails</h1>
          </header>
          <p className="drafts-loading">Loading drafts...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="quest-board-page">
        <div className="quest-board-container drafts-container">
          <header className="quest-board-header">
            <h1>Draft Emails</h1>
          </header>
          <p className="draft-error">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="quest-board-page">
      <div className="quest-board-container drafts-container">
        <header className="quest-board-header">
          <h1>Draft Emails</h1>
          <p className="quest-board-subtitle">{drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}</p>
        </header>

        {drafts.length === 0 ? (
          <div className="drafts-empty">
            <p>No drafts saved yet</p>
          </div>
        ) : (
          <div className="drafts-list">
            {drafts.map((draft, idx) => (
              <div key={idx} className="draft-card">
                <div className="draft-card-header">
                  <h3>{draft.org}</h3>
                  <time className="draft-card-time">
                    {new Date(draft.updated_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="draft-card-item">{draft.item}</p>
                <pre className="draft-card-content">{draft.draft}</pre>
              </div>
            ))}
          </div>
        )}
        
        <footer className="quest-board-footer">
          <span>gourmetdata</span>
        </footer>
      </div>
    </main>
  );
}
