import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, "../.env");
const localEnvPath = path.resolve(__dirname, ".env");

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: localEnvPath, override: false });
const { default: apiRoutes } = await import("./routes/index.js");
const { requestLogger } = await import("./middlewares/requestLogger.js");
const { errorHandler } = await import("./middlewares/errorHandler.js");
const { sendError } = await import("./utils/response.js");
const { env } = await import("./config/env.js");
const { prisma } = await import("./config/prisma.js");

const app = express();
const isDev = process.env.NODE_ENV !== "production";
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: isDev ? true : ["https://spinner-mittal-1.onrender.com"],
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/db-test", async (_req, res) => {
  try {
    const user = await prisma.user.findFirst({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ status: "ok", data: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err?.message || "DB test failed" });
  }
});

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Backend API is running 🚀",
  });
});

app.use("/api", apiRoutes);
app.use(/^\/api\/.*/, (_req, res) => sendError(res, "API route not found.", 404));

app.use(errorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("✅ Prisma Connected");
  } catch (error) {
    console.error("❌ Prisma connection failed:", error);
    throw error;
  }

  if (env.NODE_ENV === "production" && env.DATABASE_ENABLED) {
    try {
      const { ensureDefaultAdminUser } = await import("./services/authService.js");
      await ensureDefaultAdminUser();
    } catch (error) {
      throw error;
    }
  } else {
    console.log("[startup] Skipping default admin seed in development.");
  }
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});


