import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CRITICAL FIX: Add JSON middleware BEFORE routes to ensure proper parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  // Add favicon handling BEFORE API routes to prevent HTML fallback
  app.use('/favicon.ico', express.static('public/favicon.ico', {
    maxAge: '1y',
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'image/x-icon');
    }
  }));

  app.use('/favicon.png', express.static('public/favicon.png', {
    maxAge: '1y',
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'image/png');
    }
  }));

  app.use('/favicon.svg', express.static('public/favicon.svg', {
    maxAge: '1y',
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }));

  // Register API routes AFTER favicon handling
  const server = await registerRoutes(app);
  
  // Add API-specific middleware AFTER routes are registered
  app.use('/api*', (req, res, next) => {
    // Skip if response already sent by API routes
    if (res.headersSent) return;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  // Setup Vite AFTER API routes to prevent interference
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handler for API routes
  app.use("/api/*", (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // General error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
