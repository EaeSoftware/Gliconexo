// Módulo vazio usado para substituir `fs`/`path`/`crypto` no bundle do
// navegador (ver next.config.ts, `turbopack.resolveAlias`). O
// @techstark/opencv-js (código Emscripten) faz `require("fs")` dentro de
// um branch condicional (`if (ENVIRONMENT_IS_NODE)`) que nunca executa
// no navegador, mas o bundler ainda precisa conseguir resolver o import
// estaticamente — este módulo vazio satisfaz isso sem trazer os módulos
// nativos de Node para o bundle do cliente.
module.exports = {};
