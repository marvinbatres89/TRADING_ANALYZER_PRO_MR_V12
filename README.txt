TRADING ANALYZER PRO MR V13.0.0 — DIGIT CORE
================================================

ARQUITECTURA OFICIAL
- Trading Analyzer = cerebro: analiza, predice y emite la orden estructurada.
- BOT V1 MR = ejecutor: recibe la señal, sincroniza y ejecuta.
- Dataset Histórico = memoria de pruebas para backtesting y calibración.

FUNCIONAMIENTO
1. CONECTAR a Deriv.
2. INICIAR MOTOR.
3. El análisis trabaja continuamente en segundo plano.
4. PREDICCIÓN solicita una decisión rápida.
5. El Explorador, Validador, Consenso, Timing y Filtro de Calidad evalúan la señal.
6. Si supera filtros, se muestra una sola señal y se envía al canal de sincronización del BOT.
7. Se registra automáticamente el contexto técnico/estadístico de la prueba.
8. La ventana de ejecución mantiene el protocolo por reloj absoluto heredado de V12.

DIGIT INTELLIGENCE V13
- Memoria: hasta 1200 precios y 1200 dígitos.
- Ventanas estadísticas: 20, 50, 100, 250, 500 y 1000 ticks.
- Even/Odd por ventana y acuerdo entre horizontes.
- Distribución de 0 a 9.
- Over/Under comparando barreras 2 a 7.
- Transiciones del último dígito.
- Dígito de activación EXPERIMENTAL para recopilar evidencia de timing.
- Las ventanas 250/500/1000 actúan como confirmación de Even/Odd y Over/Under cuando tienen muestra suficiente.

DATASET HISTÓRICO
- Hasta 1000 pruebas locales.
- Guarda mercado, estrategia, modo, dirección, score, precio/dígito de señal, timing y resultado.
- V13 agrega contexto de Digit Intelligence e indicadores para preparar el futuro backtester.
- COPIAR exporta el registro en JSON.

IMPORTANTE
- El dígito de activación todavía NO ordena al BOT; primero debe validarse con pruebas DEMO.
- La frecuencia histórica de dígitos no garantiza el siguiente resultado.
- Probar primero en cuenta DEMO y usar el dataset para medir efectividad antes de automatizar nuevas reglas.

INSTALACIÓN / GITHUB PAGES
- Extraiga el ZIP.
- Suba todos los archivos de la carpeta a la raíz del repositorio.
- Active GitHub Pages desde main / root.
- Al cambiar desde una versión anterior, recargue la página para que la caché V13 se actualice.
