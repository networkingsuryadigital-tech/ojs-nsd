import { config } from "dotenv";
import path from "path";

if (!process.env.CI) {
  config({ path: path.resolve(__dirname, "../.env") });
}
