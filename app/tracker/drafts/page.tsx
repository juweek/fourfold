import { Suspense } from "react";
import DraftsContent from "./DraftsContent";

export const dynamic = "force-dynamic";

export default function DraftsPage() {
  return (
    <Suspense fallback={
      <main className="quest-board-page">
        <div className="quest-board-container drafts-container">
          <header className="quest-board-header">
            <h1>Draft Emails</h1>
          </header>
          <p className="drafts-loading">Loading...</p>
        </div>
      </main>
    }>
      <DraftsContent />
    </Suspense>
  );
}
