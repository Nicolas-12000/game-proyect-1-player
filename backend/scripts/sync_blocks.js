const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');

// 👇 patch para usar fetch en CommonJS con node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Leer JSON desde backend/data
const jsonPath = path.join(__dirname, '../data/toy_car_blocks.json');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Leer URL desde .env
const API_URL = process.env.API_URL;

if (!API_URL) {
    console.error('❌ ERROR: No se encontró API_URL en .env');
    process.exit(1);
}

fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jsonData)
})
    .then(async (res) => {
        const data = await res.json();
        console.log('✅ Bloques sincronizados:', data);
    })
    .catch((err) => {
        console.error('❌ Error al sincronizar:', err.message);
    });
