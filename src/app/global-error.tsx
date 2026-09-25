"use client";

// The last resort when the root layout itself fails. It replaces the whole
// document, so it cannot rely on the app's stylesheet or fonts.
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "4rem 1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          background: "#faf8f4",
          color: "#1c1917",
        }}
      >
        <title>Something went wrong · Newslingo</title>
        <h1 style={{ fontFamily: "Georgia, serif" }}>Something went wrong</h1>
        <p>Newslingo couldn’t load. This is usually temporary.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{ minHeight: "2.75rem", padding: "0 1.25rem" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
