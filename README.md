# 🐷 Codito

> **Sé codito con tus gastos, no con tus metas.**

Codito es una app web para jóvenes que trabajan y quieren ahorrar para una meta (un viaje, una laptop, un celular) sin depender de un banco. Cada día te dice **cuánto puedes gastar hoy** para llegar a tu meta y te deja anotar tus gastos en 2 toques.

Proyecto del curso **Metodologías Ágiles para la Innovación** · Certus Arequipa · 2026
Autor: **Gustavo Alonso Condor Llanos**

## ¿Qué hace este MVP?

| Función | Estado |
|---|---|
| Crear cuenta e iniciar sesión (correo + PIN de 4 dígitos) | ✅ |
| Crear una meta y ver cuánto apartar por semana | ✅ |
| "Hoy puedes gastar S/ __" | ✅ |
| Anotar un gasto en 2 toques (monto + categoría) | ✅ |
| Barra de progreso de la meta y aportes | ✅ |
| Resumen de la semana (días que anotaste, gastitos) | ✅ |
| Registro desde la captura de Yape | ✋ Manual por WhatsApp (por ahora) |

## Hipótesis que probamos

Si Carlos ve cada día cuánto puede gastar y cómo avanza su meta, entonces anota sus gastos y controla los gastos pequeños.

## ¿Cómo se usa?

1. Abre `index.html` en el navegador (o el link de GitHub Pages).
2. Crea tu cuenta.
3. Crea tu meta: para qué ahorras, cuánto necesitas, para cuándo, cuánto ganas y tus gastos fijos.
4. Mira cada día tu cifra "Hoy puedes gastar" y anota tus gastos.

## Tecnología

- HTML, CSS y JavaScript, sin frameworks.
- Los datos se guardan en el navegador del celular (`localStorage`). No hay servidor.
- El PIN se guarda cifrado (SHA-256). **Nunca pedimos claves del banco.**

> Es una versión de prueba (MVP): sirve para validar la idea con usuarios reales antes de construir la versión completa.
