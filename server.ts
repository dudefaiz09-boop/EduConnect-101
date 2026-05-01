import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "EduConnect API is running" });
  });

  // API Route: AI Learning Insights (Proxied to Gemini via backend if needed, 
  // but skill says call Gemini from frontend ALWAYS. 
  // So backend is mainly for other logic or if we had a real SQL DB.)
  
  // Note: The user requested MySQL. If we were to use a real DB, we'd connect here.
  // Since we're in AI Studio, we'll use a mix of local storage or Firebase (pending).

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    console.log(`[Production] Serving static files from: ${distPath}`);

    // Serve static files with a specific check to avoid returning HTML for missing assets
    app.use(express.static(distPath, {
      index: false, // Don't automatically serve index.html for root here
    }));

    // Explicitly serve index.html for the root path
    app.get("/", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    // Fallback for SPA routing: ONLY if the request is NOT for a file (has no extension)
    // or if it's explicitly allowed for fallback.
    app.get("*", (req, res) => {
      // If the request looks like a file (has an extension), don't send index.html
      // This prevents "Unexpected token '<'" errors when a JS/CSS file is missing.
      if (req.path.includes(".") && !req.path.endsWith(".html")) {
        console.warn(`[Production] 404 - Static file not found: ${req.url}`);
        return res.status(404).send("Not Found");
      }

      console.log(`[Production] SPA Fallback: Serving index.html for ${req.url}`);
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
