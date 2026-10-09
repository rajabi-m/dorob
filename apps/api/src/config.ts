import { isIP } from "node:net";

export interface Config {
  databaseUrl: string;
  host: string;
  port: number;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const databaseUrl = env.DATABASE_URL;
  const invalidDatabase = () => new Error("DATABASE_URL must be a PostgreSQL URL with host, username, password, and database.");
  if (!databaseUrl) throw invalidDatabase();
  let url: URL;
  try { url = new URL(databaseUrl); } catch { throw invalidDatabase(); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname ||
      !url.username || !url.password || url.pathname.length < 2 || url.hash ||
      (url.port && (Number(url.port) < 1 || Number(url.port) > 65535))) throw invalidDatabase();

  const host = env.HOST ?? "127.0.0.1";
  if (!isIP(host) && !(host.length <= 253 && host.split(".").every(label =>
    /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label)))) {
    throw new Error("HOST must be an IP address or hostname.");
  }
  const portText = env.PORT ?? "3001";
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535.");
  }
  return { databaseUrl, host, port };
}
