# 🧱 Backend API - Aplicativo Interactivo en Primera Persona

Este repositorio contiene el backend del proyecto interactivo en primera persona, desarrollado como una API RESTful utilizando **Node.js**, **Express** y **MongoDB**, y estructurado bajo el patrón arquitectónico **MVC (Modelo - Vista - Controlador)**.

El propósito de este backend es gestionar bloques en un entorno 3D desarrollado con **React** y **Three.js**, permitiendo la consulta y persistencia de coordenadas en MongoDB.

---

## 📐 Arquitectura

El backend aplica el patrón **MVC**, organizado de la siguiente manera:

```
📦 backend
├── 📁 controllers      # Lógica de negocio (blockController.js)
├── 📁 models           # Esquemas de datos (Block.js)
├── 📁 routes           # Definición de endpoints (blockRoutes.js)
├── app.js             # Punto de entrada principal
├── seed.js            # Script de carga de datos iniciales
├── .env               # Variables de entorno (no incluido)
└── package.json       # Dependencias y metadatos del proyecto
```

---

## 🌐 Endpoints disponibles

- `GET /blocks` → Obtiene todos los bloques (coordenadas X, Y, Z)
- `POST /blocks` → Inserta un nuevo bloque en la base de datos

---

## 💾 Base de Datos

- Motor: **MongoDB**
- Conexión: gestionada mediante **Mongoose**
- Las coordenadas se almacenan como objetos `{ x, y, z }` en la colección `blocks`.

---

## 🚀 Tecnologías utilizadas

| Componente     | Tecnología         |
|----------------|--------------------|
| Backend        | Node.js, Express   |
| Arquitectura   | MVC                |
| Base de datos  | MongoDB + Mongoose |
| API            | REST               |
| Frontend       | React + Three.js   |
| Despliegue     | Vercel             |

---

## ⚙️ Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tuusuario/tu-repo-backend.git
   cd tu-repo-backend
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Crear archivo `.env` y agregar la variable de conexión:
   ```
   MONGO_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/<db>
   ```

4. Ejecutar servidor:
   ```bash
   node app.js
   ```

5. (Opcional) Insertar datos iniciales:
   ```bash
   node seed.js
   ```

---

## 📦 Conexión con el Frontend

El frontend 3D desarrollado en React + Three.js se comunica con esta API para:

- Renderizar bloques en el espacio 3D a partir de los datos consultados
- Permitir al usuario agregar nuevos bloques que se guardan en MongoDB

---

## 🛡️ Buenas prácticas aplicadas

- Patrón MVC
- Modularización y separación de responsabilidades
- Variables de entorno con `.env`
- CORS habilitado para integración con frontend
- Script de `seed` para pruebas rápidas

---

## 🧑‍💻 Autor

Desarrollado por Gustavo Sánchez Rodríguez
email: guswillsan@gmail.com

---

## 🗂️ Licencia

Este proyecto está bajo la licencia ISC. Ver `LICENSE` para más información.


