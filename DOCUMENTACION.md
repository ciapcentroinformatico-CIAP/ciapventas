# CIAP — Documentación del sistema

Tienda en línea de informática con panel de administración. Todo el contenido (productos, servicios, textos, logo, colores, contacto) se edita desde el panel, sin tocar código.

- **Tienda:** `https://ciap-5fkw.onrender.com/`
- **Panel:** `https://ciap-5fkw.onrender.com/admin/`
- **Código:** `https://github.com/NFTA677/CIAP` (rama `main`)

```
GitHub (código) ──► Render (ejecuta el servidor) ──► MongoDB Atlas (datos e imágenes)
                          ▲
              UptimeRobot (lo mantiene despierto)
```

## Índice

1. [Qué incluye](#1-qué-incluye)
2. [Publicar la tienda](#2-publicar-la-tienda)
3. [Mantener el sitio despierto](#3-mantener-el-sitio-despierto)
4. [Panel de administración](#4-panel-de-administración)
5. [La tienda pública](#5-la-tienda-pública)
6. [Cómo funciona un pedido](#6-cómo-funciona-un-pedido)
7. [Imágenes](#7-imágenes)
8. [Usuario y contraseña del panel](#8-usuario-y-contraseña-del-panel)
9. [Variables de entorno](#9-variables-de-entorno)
10. [Base de datos](#10-base-de-datos)
11. [Seguridad](#11-seguridad)
12. [Respaldos](#12-respaldos)
13. [Probar en tu computadora](#13-probar-en-tu-computadora)
14. [Solución de problemas](#14-solución-de-problemas)
15. [Notas para desarrolladores](#15-notas-para-desarrolladores)

---

## 1. Qué incluye

| Parte | Descripción |
|---|---|
| Tienda | Portada con banner, catálogo con buscador y categorías, servicios técnicos, Nosotros y Contacto |
| Carrito | Se guarda en el navegador del cliente; el pedido se envía por WhatsApp y queda registrado |
| Panel | Productos, categorías, servicios, pedidos, mensajes, datos de la tienda y usuario |
| Servidor | Node.js con Express; sirve la tienda y guarda los datos en MongoDB |

La tienda no tiene cobro en línea: el pago y la entrega se coordinan con el cliente por WhatsApp.

---

## 2. Publicar la tienda

Estos pasos se hacen una sola vez. Si la tienda ya está publicada, pasa al [punto 2.4](#24-publicar-cambios).

### 2.1 MongoDB Atlas (base de datos)

1. Entra a [cloud.mongodb.com](https://cloud.mongodb.com) y crea un clúster gratuito (**M0**).
2. **Security → Database & Network Access → Database Users:** crea un usuario con contraseña.
3. **IP Access List → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`). Es obligatorio: Render gratis no tiene IP fija. La base sigue protegida por usuario y contraseña.
4. **Database → Connect → Drivers:** copia la cadena de conexión y reemplaza `<db_password>` por la contraseña (sin los signos `<` y `>`):
   ```
   mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/?appName=Cluster0
   ```
   Si la contraseña tiene símbolos como `@ : / ? #`, escríbelos codificados (`@` → `%40`).

No hace falta crear la base ni las colecciones: se crean solas al arrancar el servidor.

### 2.2 GitHub (repositorio)

El repositorio ya existe y el remoto local se llama `CIAP`. Para un repositorio nuevo:

```
git remote add CIAP https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u CIAP main
```

### 2.3 Render (hosting)

1. Entra a [render.com](https://render.com) con tu cuenta de GitHub.
2. **New → Web Service** → elige el repositorio.
3. Configura:

   | Campo | Valor |
   |---|---|
   | Language | `Node` |
   | Branch | `main` |
   | Root Directory | vacío |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | `Free` |

4. En **Environment Variables** añade las del [punto 9](#9-variables-de-entorno).
5. Pulsa **Deploy web service** y espera a que termine.
6. Abre `https://TU-SITIO.onrender.com/healthz`. Debe responder `"db":"conectada"`.

También puedes usar **New → Blueprint**: Render lee `render.yaml` y solo te pide `MONGODB_URI` y `ADMIN_PASSWORD`.

### 2.4 Publicar cambios

Cada vez que cambie el código:

```
git push CIAP main
```

Render detecta el cambio y vuelve a publicar la tienda en un par de minutos. En Render → **Settings → Branch** debe decir `main`.

Los cambios hechos desde el panel (productos, textos, fotos) no necesitan publicación: se ven al momento.

---

## 3. Mantener el sitio despierto

El plan gratuito de Render apaga el servicio tras unos 15 minutos sin visitas, y la siguiente visita tarda cerca de un minuto. Para evitarlo, un monitor externo visita el sitio cada 5 minutos:

1. Crea una cuenta gratuita en [uptimerobot.com](https://uptimerobot.com).
2. **New monitor** con estos datos:

   | Campo | Valor |
   |---|---|
   | Monitor type | `HTTP(s)` |
   | URL | `https://ciap-5fkw.onrender.com/healthz` |
   | Monitoring interval | `5 minutes` |

3. Guarda. Si el sitio se cae, UptimeRobot avisa por correo.

A tener en cuenta:

- **Cupo de horas:** Render da un cupo mensual de horas gratuitas por cuenta, suficiente para un solo servicio encendido todo el mes. Si hay otro servicio gratuito activo en la misma cuenta, aplica el monitor solo a este, o el cupo se agotará y Render los suspenderá hasta el mes siguiente. Revisa el consumo en *Billing*.
- **Reinicios:** Render reinicia las instancias gratuitas de vez en cuando y en cada publicación. No se pierde nada: los datos y las fotos están en Atlas.
- **Alternativa de pago:** el plan *Starter* (Render → **Settings → Instance Type**) no se apaga nunca y no necesita monitor.

---

## 4. Panel de administración

Entra en `/admin/`. La primera vez, con el usuario `admin` y la contraseña definida en `ADMIN_PASSWORD`.

| Sección | Qué se hace |
|---|---|
| Resumen | Pedidos pendientes, mensajes sin leer, productos visibles y agotados |
| Pedidos | Ver los pedidos del carrito, cambiar su estado o borrarlos |
| Mensajes | Leer el formulario de contacto, marcar como leído y responder por WhatsApp |
| Productos | Crear, editar, ocultar o borrar |
| Categorías | Crear, ordenar, ocultar o borrar |
| Servicios | Crear, editar, ocultar o borrar |
| Datos de la tienda | Marca, colores, contacto, portada, textos y SEO |
| Mi usuario | Cambiar el usuario y la contraseña del panel |

### Productos

| Campo | Para qué sirve |
|---|---|
| Nombre, Categoría | Obligatorios |
| Precio | Obligatorio, mayor que cero |
| Precio anterior | Opcional. Si es mayor que el precio, se muestra tachado con el porcentaje de descuento en rojo |
| Etiqueta | Opcional. Texto corto sobre la foto: Nuevo, Oferta… |
| Stock | Con 0 el producto aparece como agotado y no se puede añadir al carrito |
| Orden | Los números menores salen primero |
| Descripción, Características | Se ven en el detalle del producto. Una característica por línea, máximo 8 |
| Foto | Opcional. Sin foto se muestra el ícono de la categoría |
| Destacado en la portada | El producto aparece como lámina del banner |
| Visible en la tienda | Desmarcado, el producto se oculta sin borrarse |

### Categorías

No se puede borrar una categoría que tiene productos: muévelos a otra u oculta la categoría. El ícono se elige de una lista.

### Pedidos

Estados: **pendiente → confirmado → entregado**, o **cancelado**. Cambiar el estado no modifica el inventario (ver [punto 6](#6-cómo-funciona-un-pedido)).

### Datos de la tienda

| Bloque | Qué se edita |
|---|---|
| Marca | Nombre, subtítulo, logo y símbolo de moneda |
| Colores | Color principal y de acento. El botón *Volver a los colores del logo* restaura `#26308f` y `#00adef` |
| Contacto | WhatsApp, teléfono, correo, horario y dirección |
| Portada | Etiqueta, título, texto, los dos botones y la imagen de la primera lámina |
| Beneficios de la portada | La franja bajo el banner (máximo 4) |
| Textos de la tienda | Aviso de la franja superior, ayuda del buscador, títulos de Servicios y Contacto |
| Nosotros | Título, texto, cifras y "por qué elegirnos" (máximo 4 de cada uno) |
| Google y pestaña | Título y descripción de la página |

- **WhatsApp:** con código de país y solo números (ej. `51987654321`). Ahí llegan los pedidos y los mensajes.
- **Textos vacíos:** un texto en blanco se oculta en la tienda.
- **Logo:** se usa en la cabecera, en la portada y como ícono de la pestaña. Si lo quitas, vuelve el logo original.

---

## 5. La tienda pública

La página no se desplaza: la cabecera queda fija y el menú cambia de vista.

| Vista | Contenido |
|---|---|
| Inicio | Banner (la tienda y los productos destacados), beneficios y accesos por categoría |
| Productos | Catálogo con categorías, orden y detalle de cada producto |
| Servicios | Servicios técnicos con precio "desde" y botón *Solicitar* |
| Nosotros | Historia, cifras y motivos para elegir la tienda |
| Contacto | Datos de contacto y formulario |

- **Buscador:** está en la cabecera. Al escribir, pasa al catálogo ya filtrado; el selector limita la búsqueda a una categoría.
- **Todas las categorías:** desplegable con el número de productos de cada una.
- **Carrito y favoritos:** se guardan en el navegador del cliente; no necesita registrarse.
- **Teléfono:** por debajo de 860 px de ancho el menú pasa a un botón hamburguesa y las vistas largas se desplazan dentro de su espacio.
- **Pantallas bajas:** por debajo de 720 px de alto se oculta la franja superior de contacto para que la portada quepa.

---

## 6. Cómo funciona un pedido

1. El cliente añade productos al carrito y pulsa **Pedir por WhatsApp**.
2. El servidor recalcula los precios desde la base de datos (nunca confía en el navegador), comprueba que haya stock y guarda el pedido con un folio como `CI-261013-KQ0J`.
3. Se abre WhatsApp con el detalle del pedido y el folio, dirigido al número de la tienda.
4. El pedido aparece en el panel como **pendiente**.

Los pedidos **no descuentan inventario**: muchos pedidos de WhatsApp no llegan a concretarse. Cuando una venta se cierra, ajusta el stock a mano en el producto.

Si el servidor no responde, el pedido igual se envía por WhatsApp, pero sin folio y sin quedar registrado.

---

## 7. Imágenes

- Toda imagen subida desde el panel (productos, logo, portada) se convierte a **WebP** y se reduce a 1400 px como máximo. El panel muestra el peso antes y después.
- Formatos aceptados: JPG, PNG y WEBP, hasta 8 MB. Los PNG conservan la transparencia.
- Las imágenes se guardan en la base de datos (colección `archivos`), no en el disco de Render, que se borra en cada publicación.
- Recomendado para productos: fondo blanco o transparente, cuadradas o 4:3, de 800 px o más.

---

## 8. Usuario y contraseña del panel

- **Primer acceso:** usuario `admin` (o el de `ADMIN_USER`) y la contraseña de `ADMIN_PASSWORD`.
- **Cambiarlos:** panel → **Mi usuario**. Pide siempre la contraseña actual. La nueva debe tener 8 caracteres o más.
- **Después del cambio:** el usuario y la contraseña se guardan cifrados en la base de datos y las variables `ADMIN_USER` y `ADMIN_PASSWORD` dejan de valer.
- **Sesiones:** duran 8 horas. Cambiar la contraseña cierra las sesiones abiertas en otros equipos.
- **Olvidé la contraseña:** en Atlas, borra el documento `admin` de la colección `usuarios`. El panel vuelve a aceptar las variables de Render en menos de un minuto.

El panel tiene un único usuario administrador.

---

## 9. Variables de entorno

Se definen en Render → **Environment**. En tu computadora, en el archivo `.env`.

| Variable | Obligatoria | Valor |
|---|---|---|
| `MONGODB_URI` | Sí | Cadena de conexión de Atlas, con la contraseña |
| `MONGODB_DB` | No | Nombre de la base. Por defecto `ciap` |
| `ADMIN_PASSWORD` | Sí | Contraseña inicial del panel, de 8 caracteres o más |
| `ADMIN_USER` | No | Usuario inicial del panel. Por defecto `admin` |
| `NODE_VERSION` | Recomendada | `22` |
| `PORT` | No | Render la define sola. En local, `3000` |

- Sin `MONGODB_URI` la tienda se muestra con los datos iniciales y no guarda nada.
- Sin `ADMIN_PASSWORD` el panel queda desactivado (salvo que ya exista una contraseña guardada desde *Mi usuario*).
- Estas contraseñas nunca van en el código ni en GitHub.

---

## 10. Base de datos

Todo vive en la base `ciap` de Atlas. Para verla: **Database → Browse Collections** y despliega `Cluster0` con la flecha.

| Colección | Contenido | Campos principales |
|---|---|---|
| `productos` | Catálogo | `id` (número único), `nombre`, `categoria`, `precio`, `precioAntes`, `etiqueta`, `destacado`, `stock`, `descripcion`, `specs`, `imagen`, `activo`, `orden` |
| `categorias` | Categorías | `slug` (único), `nombre`, `icono`, `activo`, `orden` |
| `servicios` | Servicios técnicos | `id` (texto único), `nombre`, `icono`, `desde`, `texto`, `incluye`, `activo`, `orden` |
| `configuracion` | Documento `tienda` | `marca`, `colores`, `contacto`, `moneda`, `portada`, `textos`, `seo`, `nosotros`, `estadisticas`, `beneficios`, `valores` |
| `pedidos` | Pedidos del carrito | `folio` (único), `fecha`, `estado`, `items`, `total` |
| `mensajes` | Formulario de contacto | `nombre`, `telefono`, `asunto`, `mensaje`, `leido`, `fecha` |
| `archivos` | Imágenes subidas | `tipo`, `tamano`, `datos`, `fecha` |
| `usuarios` | Documento `admin` | `usuario`, `sal`, `hash`, `actualizado` |

- `mensajes`, `archivos` y `usuarios` aparecen cuando se usan por primera vez.
- **Datos iniciales:** están en `src/seed.js` y solo se cargan en colecciones vacías. Cambiar ese archivo no modifica una base que ya tiene datos.
- **Editar en Atlas:** es posible, pero no hace falta. Un cambio hecho directamente en Atlas tarda hasta un minuto en verse en la tienda.

---

## 11. Seguridad

- **Contraseña del panel:** se guarda con scrypt y una sal aleatoria, nunca en texto legible.
- **Bloqueo:** 5 intentos fallidos desde una misma IP bloquean el acceso 15 minutos. También cuenta la contraseña actual mal escrita en *Mi usuario*.
- **Sesión:** cookie firmada, no accesible desde JavaScript, válida solo en el propio sitio y con caducidad de 8 horas.
- **Peticiones del panel:** solo se aceptan si vienen del mismo sitio.
- **Datos del panel:** el servidor limpia cada campo (tipo y largo) antes de guardarlo; lo que no reconoce se descarta.
- **Precios del pedido:** se calculan en el servidor.
- **Formularios públicos:** máximo 8 envíos por minuto por IP y un campo trampa contra bots.
- **Imágenes:** se comprueba el contenido real del archivo y se vuelve a codificar antes de guardarlo.
- **Secretos:** la cadena de Atlas y la contraseña inicial solo están en Render y en `.env`, que no se sube a GitHub.

---

## 12. Respaldos

El sistema no tiene respaldo automático propio. Opciones:

- **MongoDB Compass** (gratuito): conéctate con la cadena de Atlas, abre cada colección y usa **Export Data** (JSON). Para restaurar, **Add Data → Import**.
- **`mongodump`** (línea de comandos):
  ```
  mongodump --uri "TU_CADENA_DE_ATLAS" --db ciap --out respaldo
  ```
  Y para restaurar: `mongorestore --uri "TU_CADENA_DE_ATLAS" respaldo`.

La colección `archivos` contiene las fotos; inclúyela en el respaldo. Recomendado: una copia al mes y antes de cambios grandes.

El código está respaldado en GitHub.

---

## 13. Probar en tu computadora

Necesitas [Node.js](https://nodejs.org) 20.12 o superior.

```
npm install
npm start
```

- Tienda: `http://localhost:3000`
- Panel: `http://localhost:3000/admin/`

Copia `.env.example` como `.env` y completa `MONGODB_URI` y `ADMIN_PASSWORD`. Si usas la misma cadena que Render, estarás viendo y modificando **los datos reales** de la tienda; para pruebas, pon otro nombre en `MONGODB_DB` (por ejemplo `ciap_pruebas`).

`npm run dev` reinicia el servidor al guardar un archivo.

---

## 14. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `/healthz` responde `"db":"sin configurar"` | Falta `MONGODB_URI` en Render |
| `/healthz` responde `"db":"error"` | Mira los *Logs* de Render y busca la línea `[db] No se pudo conectar` |
| Log: `SSL alert number 80` o `tlsv1 alert internal error` | Atlas rechaza la IP de Render: falta `0.0.0.0/0` en *IP Access List* |
| Log: `bad auth` o `Authentication failed` | Usuario o contraseña incorrectos en `MONGODB_URI` |
| "Cannot GET /admin/" | Render tiene una versión antigua: haz `git push CIAP main` y revisa que la rama sea `main` |
| El panel dice que no está activado | Falta `ADMIN_PASSWORD` en Render o tiene menos de 8 caracteres |
| "Demasiados intentos" al entrar | Espera 15 minutos |
| Olvidé la contraseña del panel | Ver [punto 8](#8-usuario-y-contraseña-del-panel) |
| La tienda tarda un minuto en abrir | El servicio estaba dormido: configura el monitor del [punto 3](#3-mantener-el-sitio-despierto) |
| Render suspendió el servicio | Se agotó el cupo de horas gratuitas del mes |
| No se sube una imagen | Supera los 8 MB o no es JPG, PNG ni WEBP |
| En Atlas no veo colecciones | Despliega `Cluster0` con la flecha: la base se llama `ciap` |
| Un producto no aparece | Está marcado como oculto en el panel |
| No llegan los pedidos por WhatsApp | Revisa el número en *Datos de la tienda → Contacto* |
| "No se pudo cargar la tienda" | El servidor no responde: revisa los *Logs* de Render |

---

## 15. Notas para desarrolladores

### Estructura

```
├── server.js               Servidor: rutas públicas, portada y archivos estáticos
├── src/
│   ├── db.js               Conexión a MongoDB, lectura de la tienda, mensajes y pedidos
│   ├── admin.js            API del panel (/api/admin) e imágenes
│   ├── auth.js             Acceso al panel: credenciales, sesión y bloqueo
│   └── seed.js             Datos iniciales
├── public/                 Lo que recibe el navegador
│   ├── index.html          Tienda
│   ├── assets/css/styles.css
│   ├── assets/js/app.js
│   ├── assets/img/         Logo e íconos de la pestaña
│   └── admin/              Panel: index.html, admin.css, admin.js
├── img/                    Logo original
├── render.yaml             Configuración del servicio en Render
├── .env.example            Plantilla de variables de entorno
├── README.md
└── DOCUMENTACION.md        Este documento
```

Dependencias: `express`, `mongodb` y `sharp` (conversión de imágenes). No hay paso de compilación: el navegador recibe los archivos de `public/` tal cual.

### Rutas

| Ruta | Qué hace |
|---|---|
| `GET /` | Tienda, con título, descripción, color e ícono tomados de la configuración |
| `GET /api/tienda` | Datos públicos: configuración, categorías, productos y servicios visibles |
| `POST /api/mensajes` | Guarda un mensaje de contacto |
| `POST /api/pedidos` | Registra un pedido y devuelve el folio |
| `GET /media/:id` | Imagen guardada en la base |
| `GET /healthz` | Estado del servicio y de la base |
| `GET /api/admin/sesion` | Si el panel está activado y si hay sesión |
| `POST /api/admin/login`, `/logout` | Entrar y salir |
| `GET /api/admin/datos` | Todo lo que muestra el panel |
| `POST`, `PUT`, `DELETE /api/admin/{productos,servicios,categorias}` | Altas, cambios y bajas |
| `PUT /api/admin/configuracion` | Datos de la tienda |
| `PATCH`, `DELETE /api/admin/pedidos/:folio` | Estado o borrado de un pedido |
| `PATCH`, `DELETE /api/admin/mensajes/:id` | Leído o borrado de un mensaje |
| `POST /api/admin/imagenes` | Sube una imagen y la convierte a WebP |
| `PUT /api/admin/usuario` | Cambia el usuario o la contraseña |

### Cómo está hecho

- **Tienda de una sola página:** `app.js` pide `/api/tienda` y dibuja todo. Las vistas son secciones que se muestran u ocultan según el `#` de la dirección.
- **Caché:** `tienda()` guarda los datos 60 segundos en memoria; cualquier cambio desde el panel la vacía. Si Atlas deja de responder, se sirve lo último leído.
- **Configuración:** `configuracion()` en `db.js` mezcla lo guardado con los valores de `seed.js`, campo a campo. Para añadir un ajuste nuevo: valor por defecto en `seed.js`, limpieza en `limpiarConfiguracion()` (`src/admin.js`), campo en la vista `tienda` del panel y uso en `app.js`.
- **Campos nuevos de producto o servicio:** añádelos en `LIMPIAR` (`src/admin.js`) y en `TIPOS` (`public/admin/admin.js`). MongoDB no necesita migración.
- **Colores:** `--blue` y `--cyan` en `styles.css`; los tonos derivados se calculan con `color-mix`. `app.js` los sobrescribe con los del panel.
- **Íconos:** trazos SVG definidos en `ICONS` (`app.js`). Para añadir uno, agrégalo ahí y a `ICONOS` en `admin.js`.
- **Sesión:** cookie `ciap_admin` con caducidad y firma HMAC. La firma incluye la versión de la contraseña, por eso cambiarla invalida las demás sesiones.
- **Atribución de IP:** `trust proxy` está en 1 porque Render pone un proxy delante.
