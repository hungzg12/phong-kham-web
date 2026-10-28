import { randomUUID } from "node:crypto";
import { z } from "zod";
import { transact } from "../src/lib/store.ts";
import { hashPassword } from "../src/lib/crypto.ts";

// Hosting always starts with its own database and private administrator.
// Existing accounts are preserved across deploys; this is not a password reset.
async function bootstrap() {
  if (!process.env.DATABASE_URL) throw new Error("Hosting requires DATABASE_URL.");
  if (process.env.DEMO_MODE !== "false") throw new Error("Set DEMO_MODE=false for public hosting.");
  if ((process.env.SESSION_SECRET?.length ?? 0) < 32) throw new Error("SESSION_SECRET must have at least 32 characters.");
  const admin = z.object({
    username: z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/),
    name: z.string().trim().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(12).max(128),
  }).parse({ username: process.env.ADMIN_USERNAME ?? "admin", name: process.env.ADMIN_NAME ?? "Quản trị viên", email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  const created = await transact(s => {
    const existing = s.users.find(u => u.username.toLowerCase() === admin.username.toLowerCase());
    if (existing) {
      if (existing.role !== "admin" || !existing.active) throw new Error("Bootstrap username is not an active administrator.");
      return false;
    }
    if (s.users.some(u => u.active && u.role === "admin")) return false;
    s.users.push({ id: randomUUID(), username: admin.username, name: admin.name, email: admin.email,
      role: "admin", active: true, version: 1, passwordHash: hashPassword(admin.password) });
    return true;
  });
  console.log(created ? "Hosting administrator created." : "Hosting administrator already exists; data preserved.");
}

bootstrap().then(() => process.exit(0)).catch(error => {
  // Validation errors may contain inputs; never log administrator credentials.
  console.error(error instanceof z.ZodError ? "Invalid ADMIN_USERNAME, ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD." : "Hosting bootstrap failed. Check database access and hosting environment variables.");
  process.exit(1);
});
