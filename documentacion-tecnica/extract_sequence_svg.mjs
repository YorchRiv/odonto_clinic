import fs from "node:fs";
import path from "node:path";
import sharp from "file:///C:/Users/luism/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs";

const base = path.resolve("documentacion-tecnica/diagramas");
const html = fs.readFileSync(path.join(base, "autenticacion.html"), "utf8");
const match = html.match(/<svg[\s\S]*?<\/svg>/);
if (!match) throw new Error("No se encontró el SVG del diagrama de autenticación");
let svg = match[0]
  .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
  .replace(/var\(--[^,]+,\s*([^\)]+)\)/g, "$1");
fs.writeFileSync(path.join(base, "autenticacion.svg"), svg, "utf8");
await sharp(Buffer.from(svg), { density: 220 })
  .flatten({ background: "#ffffff" })
  .png()
  .toFile(path.join(base, "autenticacion.png"));
