"use client";

import { THEME_SCRIPT } from "@/lib/theme";

/**
 * Last resort when the root layout itself fails. It renders its own document without the app's
 * styles or providers, so it is self-contained and follows the saved theme on its own.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <title>Aptitude Teacher · Something went wrong</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <style>{`
          :root { --bg:#fbfaf7; --card:#fff; --ink:#17171f; --soft:#62636f; }
          :root[data-theme="dark"] { --bg:#0c0c11; --card:#15151c; --ink:#f2f1f7; --soft:#a6a6b6; }
          body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--bg); color:var(--ink);
                 font-family: system-ui, -apple-system, "Segoe UI", sans-serif; padding:16px; }
          .card { max-width:420px; background:var(--card); border-radius:32px; padding:40px 32px; text-align:center;
                  box-shadow:0 32px 72px -24px rgb(0 0 0 / .25); }
          h1 { font-size:28px; margin:0 0 8px; letter-spacing:-.02em; }
          p { color:var(--soft); line-height:1.5; margin:0 0 24px; }
          button { border:0; border-radius:999px; padding:12px 24px; font-weight:600; font-size:15px; color:#fff; cursor:pointer;
                   background:linear-gradient(100deg,#5b5bf5,#9b5cf6 35%,#ff6b5c 70%,#ffc53d); }
        `}</style>
      </head>
      <body>
        <div className="card">
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected problem. Your progress is safe. Try again, and if it keeps happening, reload the page.</p>
          <button onClick={() => retry()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
