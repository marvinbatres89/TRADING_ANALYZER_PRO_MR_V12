TRADING ANALYST PRO MR - HYBRID 11.4.0-H

OBJETIVO DE ESTA VERSIÓN
------------------------
Esta versión NO regresa completamente a V10 y NO continúa acumulando filtros
sobre FIX13.6/FIX13.7. Es una base híbrida limpia:

SE CONSERVA DE LOS AVANCES NUEVOS
- Puente Trading Analyzer -> BOT por BroadcastChannel/localStorage.
- Fases PREPARAR y TARGET.
- TARGET asociado al inicio del "10".
- Diagnóstico visible.
- Conteo 10, 9, 8... con reloj real.
- Separación entre predicción y ejecución.
- Evaluación automática de resultados.
- Voz española con pronunciación PAR / IMPAR / SUBE / BAJA / MÁS / MENOS / COINCIDENCIA.

SE RECUPERA DE LA BASE ESTABLE
- Modo rápido con 20 datos.
- Modo profundo con 40 datos.
- Motor Explorador + Motor Validador + Consenso.
- Menos puertas duras consecutivas.
- Fluidez de señal.

MEJORA NUEVA
- Al conectar se solicita histórico de Deriv para precargar hasta 100 ticks.
  Esto permite que el motor empiece a analizar inmediatamente en segundo plano.
- PREDICTION no vuelve a calcular todo: solo toma el estado vivo y hace
  una revalidación corta.
- STANDARD: revalidación 850 ms.
- 1S: revalidación 650 ms.

VOZ / CONTEO
------------
- Termina la explicación.
- Envía PREPARAR al BOT.
- Dice: "Tienes diez segundos para realizar la operación."
- Al terminar la frase espera 900 ms y comienza el "10".
- El TARGET enviado al BOT usa exactamente ese mismo instante.
- Después del "0" deja 800 ms antes de decir "Predicción finalizada",
  para evitar que las voces se monten.

ESTRATEGIAS
-----------
- Rise / Fall
- Even / Odd
- Over / Under
- Match (experimental; requiere pruebas propias y no opera 0 como candidato)

PRUEBA RECOMENDADA
------------------
1. Suba todos los archivos de este ZIP a una carpeta/repositorio NUEVO.
2. NO sobrescriba su respaldo estable.
3. Active GitHub Pages.
4. Abra la herramienta.
5. Seleccione R_50 + Even/Odd + Rápido.
6. Pulse CONECTAR.
7. Espere a que el histórico se precargue (normalmente muy rápido).
8. Pulse PREDICTION.
9. Haga las primeras pruebas únicamente en DEMO.
10. Registre ganadas/perdidas antes de cambiar umbrales.

IMPORTANTE
----------
La meta de 7-8 aciertos de 10 es un objetivo de calibración, no una garantía.
Evalúe series grandes antes de usar dinero real.
