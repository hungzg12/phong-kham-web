import { spawn } from "node:child_process";
import path from "node:path";
import { DomainError } from "./domain.ts";
import { normalizeLifecycle } from "./lifecycle.ts";
import { seedState } from "./seed.ts";
import type { State } from "./types.ts";

type Snapshot = { Payload: string; Revision: string };

function command<T>(input: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-File", path.join(process.cwd(), "scripts", "sqlserver-store.ps1")], {
      windowsHide: true, timeout: 20000, stdio: ["pipe", "pipe", "ignore"],
    });
    let text = "";
    child.stdout.setEncoding("utf8").on("data", chunk => { text += chunk; });
    child.on("error", reject);
    child.stdin.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error("Không thể kết nối hoặc lưu dữ liệu SQL Server."));
      try { resolve(JSON.parse(text) as T); } catch { reject(new Error("SQL Server trả dữ liệu không hợp lệ.")); }
    });
    child.stdin.end(JSON.stringify(input).replace(/[^\x00-\x7f]/g, character =>
      "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0")));
  });
}

export async function initializeSqlServer(state: State) {
  return command<number>({ action: "initialize", payload: JSON.stringify(state) });
}

export async function transactSqlServer<T>(
  fn: (s: State) => T | Promise<T>, write: boolean | "if-changed",
): Promise<T> {
  let snapshot = await command<Snapshot | null>({ action: "read" });
  if (!snapshot) {
    await initializeSqlServer(seedState());
    snapshot = await command<Snapshot | null>({ action: "read" });
  }
  if (!snapshot) throw new Error("SQL Server chưa khởi tạo kho dữ liệu.");
  const state = normalizeLifecycle(JSON.parse(snapshot.Payload) as State);
  const before = write === "if-changed" ? JSON.stringify(state) : "";
  const result = await fn(state);
  if (write === true || (write === "if-changed" && before !== JSON.stringify(state))) {
    const updated = await command<number>({ action: "write", revision: snapshot.Revision, payload: JSON.stringify(state) });
    if (updated !== 1) throw new DomainError("Dữ liệu vừa thay đổi. Tải lại trước khi lưu lại.", 409);
  }
  return result;
}
