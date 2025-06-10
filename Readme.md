
# 🎮 Three.js un solo jugador

Este repositorio contiene la arquitectura base de una aplicación web interactiva en 3D desarrollada con **Three.js**, **React**, **Express**, y **MongoDB**, orientada a videojuegos educativos. En esta versión se incluye el flujo completo de frontend y backend.

---

## 🗂️ Estructura del Proyecto

```
threejs-multiplayer/
├── backend/
│   ├── app.js
│   ├── models/
│   │   └── Block.js
│   ├── routes/
│   │   └── blockRoutes.js
│   └── .env
│
├── game-project/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── network/
│   │   ├── World/
│   │   └── main.jsx
│   └── .env
```

---

## 🚀 Tecnologías Utilizadas

| Tecnología   | Rol                         |
|--------------|------------------------------|
| **Three.js** | Motor de renderizado 3D      |
| **React**    | Interfaz de usuario SPA      |
| **Express**  | API REST en Node.js          |
| **MongoDB**  | Base de datos para bloques   |
| **Cannon-es**| Motor físico para colisiones |
| **Howler.js**| Reproducción de sonidos      |

---

## ⚙️ Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone https://github.com/guswill24/game-proyect-1-player.git
cd game-proyect-1-player
```

---

### 2. Configurar el backend

```bash
cd backend
npm install
```

📄 Crea un archivo `.env` con el siguiente contenido:

```env
MONGO_URI=mongodb://127.0.0.1:27017/threejs_blocks
PORT=3001
API_URL=http://localhost:3001/api/blocks/batch
```

Ejecutar el servidor:

```bash
node app.js
```

---

### 3. Configurar el frontend

```bash
cd game-project
npm install
```

📄 Crea un archivo `.env` con la IP local del backend:

```env
VITE_API_URL=http://127.0.0.1:3001
```

Iniciar servidor de desarrollo:

```bash
npm run dev
```

---

## 🌐 Reglas de Firewall (Recomendado en Windows)

Para permitir acceso remoto desde otros dispositivos en red local:

1. Ir a **Configuración avanzada** de Firewall.
2. Crear una **nueva regla de entrada**.
3. Elegir **Puerto** → TCP → Puerto **3001** y/o **5173**.
4. Permitir la conexión → Nombre: `ThreeJS Game`.

---

## 📁 API REST

**GET /api/blocks**  
Obtiene todos los bloques registrados.

**POST /api/blocks**  
Agrega un nuevo bloque `{ x, y, z }`.

**POST /api/blocks/batch**  
Carga masiva de bloques.

---

## ✅ Estado Actual

- [x] Entorno 3D funcional
- [x] Modelos 3D cargados desde MongoDB
- [x] Interacción básica con obstáculos y premios
- [x] Controles en primera/tercera persona
- [x] HUD con menú circular, estado y temporizador

---

## 🔜 Próximamente

- [ ] Integración de **Socket.IO** para multijugador
- [ ] Sincronización de animaciones en tiempo real

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Puedes usarlo solo para fines educativos

