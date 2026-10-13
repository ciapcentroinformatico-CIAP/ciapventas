# CIAP Informática

Tienda de informática con catálogo de productos, servicios técnicos, carrito y pedidos por WhatsApp.

- **Código:** GitHub
- **Hosting:** Render (Node.js, plan gratuito)
- **Base de datos:** MongoDB Atlas (plan gratuito)

```
GitHub (código) ──► Render (ejecuta el servidor) ──► MongoDB Atlas (productos, servicios, mensajes, pedidos)
```

## Publicar la tienda

Sigue los pasos en este orden. Solo se hace una vez.

### Paso 1 — MongoDB Atlas (base de datos)

1. Entra a [cloud.mongodb.com](https://cloud.mongodb.com) y crea una cuenta.
2. Crea un clúster gratuito (**M0**).
3. **Database Access → Add New Database User:** crea un usuario con contraseña (guárdala) y el rol *Read and write to any database*.
4. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`). Render gratis no tiene IP fija; el acceso sigue protegido por usuario y contraseña.
5. **Database → Connect → Drivers:** copia la cadena de conexión. Se ve así:
   ```
   mongodb+srv://USUARIO:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
   Reemplaza `<db_password>` por la contraseña. Si tiene símbolos como `@ : / ? #`, escríbelos codificados (`@` → `%40`).

No hace falta crear la base ni las colecciones: la tienda las crea sola al arrancar.

### Paso 2 — GitHub (repositorio)

1. En [github.com/new](https://github.com/new) crea un repositorio vacío llamado `ciap-informatica` (sin README ni .gitignore).
2. En esta carpeta, abre una terminal y ejecuta (cambia `TU_USUARIO`):
   ```
   git remote add origin https://github.com/TU_USUARIO/ciap-informatica.git
   git push -u origin main
   ```

El `.gitignore` ya excluye `node_modules/`, el archivo `.env` y la carpeta de referencia `CIAP/`.

### Paso 3 — Render (hosting)

1. Entra a [render.com](https://render.com) con tu cuenta de GitHub.
2. **New → Blueprint** → elige el repositorio `ciap-informatica`. Render lee `render.yaml` y crea el servicio.
3. Te pedirá el valor de **`MONGODB_URI`**: pega la cadena del paso 1 (con la contraseña).
4. Espera a que termine el despliegue y abre `https://ciap-informatica.onrender.com` (Render puede añadir un sufijo al nombre si ya está en uso).
5. Comprueba la conexión en `https://TU-SITIO.onrender.com/healthz`. Debe responder `"db":"conectada"`.

Cada `git push` vuelve a publicar la tienda automáticamente.

> **Plan gratuito de Render:** el sitio se "duerme" tras 15 minutos sin visitas y la siguiente visita tarda cerca de un minuto en despertar. Los datos no se pierden: están en Atlas.

## Editar productos, servicios y datos de la tienda

Los datos se editan en Atlas: **Database → Browse Collections → base `ciap`**. Los cambios se ven en la tienda en un minuto como máximo.

| Colección | Contenido | Campos |
|---|---|---|
| `productos` | Catálogo | `id` (número único), `nombre`, `categoria` (slug de `categorias`), `precio`, `precioAntes`, `etiqueta`, `destacado`, `stock`, `descripcion`, `specs` (lista), `imagen` (URL de la foto, opcional), `activo`, `orden` |
| `categorias` | Categorías | `slug` (único), `nombre`, `icono`, `activo`, `orden` |
| `servicios` | Servicios técnicos | `id` (texto único), `nombre`, `icono`, `desde` (precio), `texto`, `incluye` (lista), `activo`, `orden` |
| `configuracion` | Documento `tienda`: marca, contacto y textos | `marca`, `contacto` (incluye `whatsapp`), `moneda`, `estadisticas`, `beneficios`, `valores` |
| `mensajes` | Lo que llega del formulario de contacto | `nombre`, `telefono`, `asunto`, `mensaje`, `leido`, `fecha` |
| `pedidos` | Pedidos enviados desde el carrito | `folio`, `fecha`, `estado`, `items`, `total` |

- **Ocultar** un producto, categoría o servicio sin borrarlo: pon `activo` en `false`.
- **WhatsApp de la tienda:** `configuracion → tienda → contacto.whatsapp`, con código de país y solo números (ej. `51987654321`).
- **Íconos disponibles:** `laptop`, `desktop`, `cpu`, `keyboard`, `wifi`, `printer`, `wrench`, `shield`, `cloud`, `server`, `truck`, `card`, `headset`, `check`.
- Los datos iniciales están en `src/seed.js`. Solo se cargan cuando una colección está vacía: cambiar ese archivo no modifica una base que ya tiene datos.

Los pedidos **no descuentan inventario**: quedan registrados como `pendiente` y el cobro se coordina por WhatsApp. El `stock` se actualiza a mano en `productos`.

## Probar en tu computadora

Necesitas [Node.js](https://nodejs.org) 20.12 o superior.

```
npm install
npm start
```

Abre `http://localhost:3000`.

Sin base de datos la tienda se muestra con los datos iniciales, pero no guarda mensajes ni pedidos. Para conectarla a Atlas, copia `.env.example` como `.env` y pega tu cadena de conexión en `MONGODB_URI`.

## Estructura

```
├── server.js           Servidor: sirve la tienda y la API
├── src/
│   ├── db.js           Conexión a MongoDB, datos iniciales, mensajes y pedidos
│   └── seed.js         Datos iniciales (productos, servicios, marca, contacto)
├── public/             La tienda (lo que ve el cliente)
│   ├── index.html
│   └── assets/css/styles.css, assets/js/app.js
├── render.yaml         Configuración del servicio en Render
├── .env.example        Plantilla de las variables de entorno
└── package.json
```

| Ruta | Qué hace |
|---|---|
| `GET /api/tienda` | Datos de la tienda (productos, categorías, servicios, marca, contacto) |
| `POST /api/mensajes` | Guarda un mensaje del formulario de contacto |
| `POST /api/pedidos` | Registra un pedido; los precios y el stock se validan en el servidor |
| `GET /healthz` | Estado del servicio y de la base de datos |

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `/healthz` responde `"db":"sin configurar"` | Falta la variable `MONGODB_URI` en Render (**Environment**) |
| `/healthz` responde `"db":"error"` | Revisa los *Logs* de Render. `bad auth`: usuario o contraseña incorrectos en la cadena. Tiempo de espera agotado: falta `0.0.0.0/0` en *Network Access* de Atlas |
| La tienda tarda cerca de un minuto en abrir | Plan gratuito de Render "despertando"; es normal |
| Cambié un producto en Atlas y no se ve | Espera un minuto y recarga: los datos se guardan en memoria 60 segundos |
| Un producto no aparece | `activo` está en `false`, o su `id` está repetido |
