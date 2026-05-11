import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");

dotenv.config({ path: envPath });
