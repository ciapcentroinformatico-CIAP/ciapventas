# CIAP — Centro Informático

Tienda en línea de informática con catálogo, servicios técnicos, carrito, pedidos por WhatsApp y panel de administración.

- **Tienda:** https://ciap-5fkw.onrender.com/
- **Panel:** https://ciap-5fkw.onrender.com/admin/
- **Hosting:** Render (Node.js) · **Base de datos:** MongoDB Atlas

La guía completa está en **[DOCUMENTACION.md](DOCUMENTACION.md)**: publicación, panel, pedidos, imágenes, base de datos, seguridad, respaldos y solución de problemas.

## Inicio rápido

```
npm install
npm start
```

Abre `http://localhost:3000`. Para conectar la base de datos y activar el panel, copia `.env.example` como `.env` y completa `MONGODB_URI` y `ADMIN_PASSWORD`.

## Publicar cambios

```
git push CIAP main
```

Render vuelve a publicar la tienda solo. Los cambios hechos desde el panel no necesitan publicación.

## Variables en Render

| Variable | Valor |
|---|---|
| `MONGODB_URI` | Cadena de conexión de Atlas, con la contraseña |
| `MONGODB_DB` | `ciap` |
| `ADMIN_PASSWORD` | Contraseña inicial del panel (8 caracteres o más) |
| `NODE_VERSION` | `22` |

> Nunca subas a GitHub el archivo `.env` ni la cadena de conexión con contraseña.
