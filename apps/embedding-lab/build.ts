import { mkdir, copyFile } from "node:fs/promises";
const browser = await Bun.build({entrypoints:["src/ui/main.tsx"],outdir:"dist/public",target:"browser",minify:true,define:{"process.env.NODE_ENV":JSON.stringify("production")}});
if (!browser.success) throw new Error(String(browser.logs));
const server = await Bun.build({entrypoints:["src/server.ts", "src/cli.ts"],outdir:"dist",target:"bun"});
if (!server.success) throw new Error(String(server.logs));
await mkdir("dist/public",{recursive:true});
await copyFile("src/ui/index.html","dist/public/index.html");
