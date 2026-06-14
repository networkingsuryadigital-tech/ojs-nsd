import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../.env") });

// Application use-cases (withTenant + SET LOCAL ROLE) need a session-capable connection.
// getSeedPrismaClient() applies buildSeedDatabaseUrl() internally for admin reset queries only.
const directUrl = process.env.DIRECT_URL?.trim();
if (directUrl) {
  process.env.DATABASE_URL = directUrl;
}

// Slow Supabase free-tier: allow longer tenant transactions during seed runs.
process.env.PRISMA_TENANT_TX_TIMEOUT_MS = "120000";
