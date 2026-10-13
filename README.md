# CIAP Informática

Tienda de informática con catálogo de productos, servicios técnicos, carrito, pedidos por WhatsApp y panel de administración.

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
3. Te pedirá dos valores:
   - **`MONGODB_URI`**: la cadena del paso 1 (con la contraseña).
   - **`ADMIN_PASSWORD`**: la contraseña del panel de administración, de 8 caracteres o más. Elige una distinta a la de la base de datos.
4. Espera a que termine el despliegue y abre `https://ciap-informatica.onrender.com` (Render puede añadir un sufijo al nombre si ya está en uso).
5. Comprueba la conexión en `https://TU-SITIO.onrender.com/healthz`. Debe responder `"db":"conectada"`.

Si creaste el servicio a mano (**New → Web Service**) en lugar de con Blueprint, añade esas variables en la pestaña **Environment**, junto con `MONGODB_DB` = `ciap` y `NODE_VERSION` = `22`.

Cada `git push` a la rama que Render tiene configurada vuelve a publicar la tienda automáticamente.

> **Plan gratuito de Render:** el sitio se "duerme" tras 15 minutos sin visitas y la siguiente visita tarda cerca de un minuto en despertar. Los datos no se pierden: están en Atlas.

## Panel de administración

Entra en `https://TU-SITIO.onrender.com/admin/` con el usuario `admin` y la contraseña que pusiste en `ADMIN_PASSWORD`.

| Sección | Qué se hace |
|---|---|
| Resumen | Pedidos pendientes, mensajes sin leer y productos agotados |
| Pedidos | Ver los pedidos del carrito y cambiar su estado: pendiente, confirmado, entregado o cancelado |
| Mensajes | Leer lo que llega del formulario de contacto y responder por WhatsApp |
| Productos | Crear, editar, ocultar o borrar. Precio, oferta, stock, características y foto |
| Categorías | Crear, ordenar u ocultar. No se puede borrar una categoría que tiene productos |
| Servicios | Crear y editar los servicios técnicos |
| Datos de la tienda | Logo, colores, WhatsApp y contacto, portada, beneficios, textos de cada sección, Nosotros y lo que muestra Google |

- Los cambios se ven en la tienda al momento.
- **Fotos:** toda imagen que se sube (productos, logo, portada) se convierte a WebP, se reduce a 1400 px como máximo y se guarda en la base de datos, así que pesa poco y no se pierde cuando Render reinicia.
- **Logo y colores:** el logo se usa en la cabecera, en la portada y como ícono de la pestaña. Los dos colores de la tienda se eligen en *Datos de la tienda*; el botón *Volver a los colores del logo* restaura el azul `#26308f` y el celeste `#00adef`.
- **Lo único que no se cambia desde el panel** es el usuario y la contraseña de acceso: van en las variables `ADMIN_USER` y `ADMIN_PASSWORD` de Render.
- **Destacado en la portada:** los productos marcados rotan en la ficha de la página de inicio.
- **Inventario:** los pedidos no descuentan stock. Quedan como `pendiente`, el cobro se coordina por WhatsApp y el stock se ajusta a mano en el producto.
- **Seguridad:** tras 5 intentos fallidos el acceso se bloquea 15 minutos, y la sesión dura 8 horas. Cambiar `ADMIN_PASSWORD` cierra todas las sesiones abiertas.
- Sin `ADMIN_PASSWORD` (o con menos de 8 caracteres) el panel queda desactivado.

## Base de datos

Todo vive en la base `ciap` de Atlas (**Database → Browse Collections**, desplegando `Cluster0`). No hace falta tocarla: se administra desde el panel.

| Colección | Contenido |
|---|---|
| `productos` | Catálogo |
| `categorias` | Categorías del catálogo |
| `servicios` | Servicios técnicos |
| `configuracion` | Documento `tienda`: marca, contacto y textos |
| `mensajes` | Formulario de contacto (aparece con el primer mensaje) |
| `pedidos` | Pedidos enviados desde el carrito |
| `archivos` | Fotos subidas desde el panel (aparece con la primera foto) |

Los datos iniciales están en `src/seed.js`. Solo se cargan cuando una colección está vacía: cambiar ese archivo no modifica una base que ya tiene datos.

## Probar en tu computadora

Necesitas [Node.js](https://nodejs.org) 20.12 o superior.

```
npm install
npm start
```

Abre `http://localhost:3000`.

Sin base de datos la tienda se muestra con los datos iniciales, pero no guarda mensajes ni pedidos y el panel no funciona. Para conectarla a Atlas y activar el panel, copia `.env.example` como `.env`, pega tu cadena de conexión en `MONGODB_URI` y escribe una contraseña en `ADMIN_PASSWORD`. El panel queda en `http://localhost:3000/admin/`.

## Estructura

```
├── server.js           Servidor: sirve la tienda y la API
├── src/
│   ├── db.js           Conexión a MongoDB, datos iniciales, mensajes y pedidos
│   ├── admin.js        API del panel (/api/admin) e imágenes
│   ├── auth.js         Acceso al panel: sesión y bloqueo por intentos
│   └── seed.js         Datos iniciales (productos, servicios, marca, contacto)
├── public/             La tienda (lo que ve el cliente)
│   ├── index.html
│   ├── assets/css/styles.css, assets/js/app.js
│   ├── assets/img/     Logo e íconos de la pestaña
│   └── admin/          Panel de administración (index.html, admin.css, admin.js)
├── render.yaml         Configuración del servicio en Render
├── .env.example        Plantilla de las variables de entorno
└── package.json
```

| Ruta | Qué hace |
|---|---|
| `GET /api/tienda` | Datos de la tienda (productos, categorías, servicios, marca, contacto) |
| `POST /api/mensajes` | Guarda un mensaje del formulario de contacto |
| `POST /api/pedidos` | Registra un pedido; los precios y el stock se validan en el servidor |
| `/api/admin/…` | Panel de administración (requiere sesión) |
| `GET /media/:id` | Fotos de producto guardadas en la base |
| `GET /healthz` | Estado del servicio y de la base de datos |

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `/healthz` responde `"db":"sin configurar"` | Falta la variable `MONGODB_URI` en Render (**Environment**) |
| `/healthz` responde `"db":"error"` | Revisa los *Logs* de Render. `bad auth`: usuario o contraseña incorrectos en la cadena. Tiempo de espera agotado: falta `0.0.0.0/0` en *Network Access* de Atlas |
| La tienda tarda cerca de un minuto en abrir | Plan gratuito de Render "despertando"; es normal |
| El panel dice que no está activado | Falta `ADMIN_PASSWORD` en Render, o tiene menos de 8 caracteres |
| "Demasiados intentos" al entrar al panel | Espera 15 minutos |
| En Atlas no veo colecciones | Despliega `Cluster0` con la flecha: la base se llama `ciap` |
| Cambié algo directamente en Atlas y no se ve | Espera un minuto y recarga: la tienda guarda los datos 60 segundos en memoria |
| Un producto no aparece | Está marcado como oculto en el panel |
