// Copia o build UMD do @techstark/opencv-js para public/vendor/ como um
// asset estático servido diretamente pelo Next.js, fora do grafo de
// módulos do bundler.
//
// Por quê: o pacote exporta um `module.exports` que, ao final da sua
// própria inicialização (ver dist/opencv.js), vira uma Promise (chamada
// da factory async do Emscripten). O Turbopack (dev, Next 16) trata
// módulos CJS cujo `module.exports` resolvido é uma Promise como
// "async modules" e tenta adotá-la usando o protocolo genérico de
// thenable — mas o valor concreto entregue pela interop ESM/CJS é um
// Module namespace object (exótico, sem os internal slots de Promise),
// o que gera `TypeError: Method Promise.prototype.then called on
// incompatible receiver [object Module]` ao rodar `await import(...)`.
// Servir o arquivo como <script> estático evita completamente o
// sistema de módulos do bundler para este pacote.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const source = require.resolve("@techstark/opencv-js/dist/opencv.js");
const destDir = join(projectRoot, "public", "vendor");
const dest = join(destDir, "opencv.js");

await mkdir(destDir, { recursive: true });
await copyFile(source, dest);

console.log(`opencv.js copiado para ${dest}`);
