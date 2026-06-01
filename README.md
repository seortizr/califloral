# CaliFloral MVC

Tienda ecommerce con arquitectura MVC, carrito persistente y flujo de checkout.

## Seguridad implementada

- Helmet para cabeceras HTTP seguras.
- Sesiones persistentes en base de datos con cookies `httpOnly`, `sameSite` y `secure` en produccion.
- Proteccion CSRF en formularios.
- Rate limiting global.
- Hash de contrasenas con bcrypt (`salt rounds = 12`).
- Rutas protegidas por autenticacion y roles.

## Base de datos

- SQLite con Sequelize (`data/califloral.sqlite`).
- Persistencia de usuarios, productos, carrito, items del carrito, pedidos e items de pedido.

## Ejecutar

1. Copia variables:
   - `copy .env.example .env` (Windows)
2. Instala dependencias:
   - `npm install`
3. Inicia:
   - `npm run dev`
4. Abre:
   - `http://localhost:3000`

## Usuario admin inicial

- Email: `admin@califloral.local`
- Password: `Admin1234!`
