# Vídeo motion graphics — GlicoNexo

Vídeo institucional de 13 s (16:9, 60 fps) no estilo "glassmorphism" com a identidade do app
(azul-marinho `#14294B`, teal `#22C9A0`, azul `#1E9AF3`, Lexend + Geist).

Tudo é gerado por código, sem assets de terceiros:

- `scene.html` — animação determinística; `window.renderFrame(t)` desenha o quadro no tempo `t`;
- `audio.mjs` — trilha (~124 BPM) e efeitos sonoros sintetizados, sincronizados com as cenas;
- `render.mjs` — captura os quadros no Chromium headless e codifica o MP4 com ffmpeg.

Este pacote é isolado do app (dependências próprias, não entra no build do Next.js).

## Como gerar

```bash
cd marketing/video
npm install
npm run render      # out/gliconexo-motion.mp4 (1920x1080, 60 fps)
npm run render:4k   # out/gliconexo-motion-4k.mp4 (3840x2160)
npm run preview     # PNGs a cada 0,5 s em out/preview/ (conferência rápida de layout)
node render.mjs --preview 4.4,9.9   # quadros específicos
```

Opções: `--fps 60`, `--subframes 2` (quadros capturados por quadro final e mesclados
como motion blur; use `1` para desativar). Se o Chromium não estiver em
`/opt/pw-browsers/chromium`, defina `CHROMIUM_PATH` ou rode `npx playwright-core install chromium`.

## Roteiro

| Tempo | Cena |
| --- | --- |
| 0,0–0,8 s | Ponto teal floresce no símbolo GlicoNexo |
| 0,8–1,4 s | Card de vidro "Suas medições, organizadas." + chip "Sincronizado" |
| 1,4–2,0 s | Card gira em 3D com brilho especular |
| 2,0–3,0 s | Card vira cápsula bicolor que "enche" |
| 3,0–3,8 s | Botão "Registrar glicemia" + toque do cursor |
| 3,8–4,6 s | Ondas, visor da câmera, OCR lê "128 mg/dL", toque obrigatório em "Confirmar e salvar" |
| 4,6–5,6 s | Leque de medições + "Seu histórico, organizado." |
| 5,6–6,6 s | "Cada medição com data, horário e contexto." + "Funciona mesmo sem internet" |
| 6,6–9,0 s | Histórico, nova linha, "4 de 4 medições" → "Análises liberadas" |
| 9,0–10,0 s | Gráfico com faixa configurada, média/mín./máx. + "Entenda seus registros." |
| 10,0–13,0 s | "e muito mais" → símbolo → lockup GlicoNexo + aviso "Não substitui acompanhamento médico." |

## Regras de conteúdo respeitadas

- todos os valores, datas e horários são fictícios;
- o valor lido por OCR só é salvo após o toque em "Confirmar e salvar";
- nenhuma dose, diagnóstico, alerta, previsão ou promessa de resultado clínico;
- status sempre com texto e ícone ("dentro da faixa"), nunca só com cor;
- gráfico sem interpolação no dia sem dados e sem projeção de tendência;
- sem molduras de celular, glicosímetros reais ou marcas de terceiros;
- ícones desenhados com traços do Lucide (licença ISC, já usado no app).
