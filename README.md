# KOLLU — Landing

Landing estilo Apple para **KOLLU**, galletas funcionales de llaska con camote.
La galleta 3D aparece al cargar y acompaña todo el scroll: se posa en cada
sección, se parte en dos para mostrar sus ingredientes, la rodean partículas
de llaska y responde al cursor. Paleta verde tierra, tipografía del sistema.

**Stack:** React · Vite · three.js · @react-three/fiber · @react-three/drei

## Levantar con Docker (recomendado)

```bash
cd kollu
docker compose up --build
```

Abre **http://localhost:5173**. Cambiaron las dependencias del código, así que
la primera vez usa `--build`. Para detener: `Ctrl+C` o `docker compose down`.

## Producción (VPS con Docker)

En el servidor, una sola vez (y cada vez que quieras actualizar):

```bash
curl -fsSL https://raw.githubusercontent.com/htacoav/kollu/main/deploy/deploy.sh | sudo bash
```

El script instala Docker si falta, clona o actualiza el repo en `/opt/kollu` y:

- si los puertos 80/443 están libres, levanta **Caddy** con HTTPS automático para `kollu.kamai.life`;
- si ya hay un **nginx** en el VPS, crea el sitio, lo apunta al contenedor (`127.0.0.1:8085`) y pide el certificado con certbot.

Requisito: un registro DNS **A** `kollu` → `77.93.153.105` en el dominio `kamai.life`.

Archivos: `Dockerfile` (build + nginx), `docker-compose.prod.yml`, `deploy/Caddyfile`, `deploy/nginx.conf`, `deploy/deploy.sh`.
Para desarrollo local se usa `Dockerfile.dev` con `docker-compose.yml`.

## Levantar sin Docker

```bash
cd kollu
npm install
npm run dev
```

## Cómo funciona la coreografía

Cada sección que "recibe" a la galleta tiene un `<Anchor>` (un div vacío).
La galleta se coloca sobre ese recuadro, con su tamaño, y viaja de uno a otro
según el scroll. Por eso sigue al diseño responsive sin tocar el 3D.

```jsx
<Anchor rx={1.4} split={1} leaves={0.5} size={0.62} />
```

- `rx` inclinación hacia ti (0 = de canto, 1.57 = de frente)
- `ry` giro extra sobre su eje
- `split` 0 = entera, 1 = partida en dos
- `leaves` 0–1 cantidad de partículas de llaska
- `size` qué fracción del recuadro ocupa

## Fondo interactivo

Cada sección declara su color con `data-bg` (y opcional `data-line="#hex/opacidad"`
para las curvas de nivel). El fondo dibuja curvas de nivel del altiplano que se
desplazan con el scroll, se abomban bajo el cursor y forman ondas de agua al
mover o hacer clic. Sin WebGL2 se usan los colores CSS de siempre.

## Paisaje del altiplano

`Scenery.jsx` dibuja en SVG (generado, siempre igual) las cordilleras con nieve,
el lago, las balsas de totora y la totora. Se colocan dentro de una sección con
`<Scene tone="light|dark">`. Todo lo que tenga `data-depth` se mueve con
parallax al hacer scroll y se mece con el cursor; `data-drift` hace que la
balsa cruce el lago mientras pasas por la sección.

## Estructura

```
public/cookie.glb               modelo 3D (escaneo)
src/App.jsx                     nav, canvas 3D fijo, loader, revelados
src/components/BackgroundFX.jsx fondo interactivo (WebGL2): curvas de nivel, ondas, luz del cursor
src/components/Scenery.jsx      ilustraciones: montañas, lago, balsas de totora, totora
src/components/Cookie.jsx       galleta: grosor, color, chispas, quiebre, hojas, cursor
src/lib/choreography.js         lee los anchors y calcula la pose por scroll
src/components/Anchor.jsx       reserva el espacio de la galleta en cada sección
src/components/Words.jsx        titulares que se revelan palabra por palabra
src/components/ScrubText.jsx    frase que se ilumina con el scroll
src/sections/Sections.jsx       contenido (11 secciones)
src/index.css                   sistema de diseño
```

## Pendientes (placeholders)

- Número de WhatsApp (`WHATSAPP` en `Sections.jsx`) y correo `hola@kollu.pe`.
- Precios, cantidades por pack, puntos de venta, sabor, vida útil, redes.
- Foto o render del pack individual.
- Texto del camote: confirmar con la ficha técnica.

Accesibilidad: respeta `prefers-reduced-motion` (sin giro ni partículas, textos
con fundido) y `prefers-reduced-transparency`.
