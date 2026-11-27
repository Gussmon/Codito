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
| Metas sugeridas y 3 planes de ahorro mensual | ✅ |
| Resumen del mes: saldo, cifra diaria y cuándo llegas | ✅ |
| Consejos cuando el día a día queda ajustado | ✅ |
| Opciones rápidas: llevo táper, voy caminando, vivo con mi familia | ✅ |
| Bolsita: lo que no gastas va a tu meta o a un gusto | ✅ |
| Pantalla "¿Cómo funciona?" | ✅ |
| Registro desde la captura de Yape | ✋ Manual por WhatsApp (por ahora) |

## ¿Cómo funciona?

1. **Crea tu meta.** Elige qué quieres, cuánto cuesta, cuánto ganas, tus gastos fijos y cuánto apartas al mes. Codito te muestra tu saldo del mes y en cuánto tiempo llegas. Si no alcanza, te da consejos.
2. **Mira tu cifra del día.** "Hoy puedes gastar hasta S/ __". Es un máximo, no algo que tengas que gastar.
3. **Anota en 2 toques.** Monto, categoría y listo.
4. **Llena tu bolsita.** Lo que no gastas en la semana se junta. Lo mandas a tu meta para llegar antes o te das un gusto el domingo.

### La cuenta

### Cuánto puedes ahorrar de verdad

```
Lo que ganas                     S/ 1,500
− Gastos fijos                   S/   800
− Lo básico (menú 12 + pasajes 4) × 30  S/ 480
= Puedes ahorrar hasta           S/   220
```

### La cifra del día

```
Lo que ganas                     S/ 1,500
− Gastos fijos (alquiler, casa)  S/   600
− Lo que apartas para tu meta    S/   150
= Libre para el mes              S/   750
÷ 30 días = hoy puedes gastar    S/ 25    (menú S/ 10 + pasajes S/ 3 + S/ 12 libres)
```

Los gastos fijos son solo lo que pagas una vez al mes (alquiler, servicios, lo que das en casa). La comida y los pasajes del día salen de la cifra diaria.

Si un día gastas de más, la diferencia se reparte en los días que quedan de la semana. Si gastas de menos, va a tu bolsita.

## Hipótesis que probamos

Si Carlos ve cada día cuánto puede gastar y cómo avanza su meta, entonces anota sus gastos y controla los gastos pequeños.

## ¿Cómo se usa?

1. Entra a **https://gussmon.github.io/Codito/** desde tu celular (o abre `index.html`).
2. Crea tu cuenta.
3. Crea tu meta: para qué ahorras, cuánto necesitas, para cuándo, cuánto ganas y tus gastos fijos.
4. Mira cada día tu cifra "Hoy puedes gastar" y anota tus gastos.

## Tecnología

- HTML, CSS y JavaScript, sin frameworks.
- Los datos se guardan en el navegador del celular (`localStorage`). No hay servidor.
- El PIN se guarda cifrado (SHA-256). **Nunca pedimos claves del banco.**

> Es una versión de prueba (MVP): sirve para validar la idea con usuarios reales antes de construir la versión completa.
