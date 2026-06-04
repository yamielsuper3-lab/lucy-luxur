const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');

// Asegurar que la carpeta 'data' exista
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

async function getDatabase() {
    if (db) return db;
    
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    return db;
}

async function initDatabase() {
    const database = await getDatabase();
    
    // 1. Crear tablas
    await database.exec(`
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            price TEXT,
            duration TEXT,
            frequency TEXT,
            description TEXT,
            image TEXT,
            stripe_service_id TEXT
        );
        
        CREATE TABLE IF NOT EXISTS service_benefits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id TEXT NOT NULL,
            benefit TEXT NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS service_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id TEXT NOT NULL,
            step_num INTEGER NOT NULL,
            title TEXT NOT NULL,
            desc TEXT,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS service_aftercare (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id TEXT NOT NULL,
            care_instruction TEXT NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            tag TEXT,
            name TEXT
        );
    `);
    
    // 2. Semilla (Seeding) si la base de datos está vacía
    const countResult = await database.get('SELECT COUNT(*) as count FROM services');
    if (countResult.count === 0) {
        console.log('[Database] La base de datos está vacía. Iniciando siembra (seeding) desde services-data.js...');
        
        try {
            const SERVICES_DATA = require('./services-data.js');
            
            for (const [id, data] of Object.entries(SERVICES_DATA)) {
                // Determinar categoría basada en el ID
                let category = 'mirada';
                if (id.startsWith('unas') || id.includes('poligel') || id.includes('soft') || id.includes('ruber') || id.includes('gel') || id.includes('vitamina')) {
                    category = 'unas';
                } else if (id.startsWith('facial')) {
                    category = 'faciales';
                }
                
                // Insertar servicio
                await database.run(`
                    INSERT INTO services (id, category, title, subtitle, price, duration, frequency, description, image, stripe_service_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id,
                    category,
                    data.title,
                    data.subtitle,
                    data.price,
                    data.duration,
                    data.frequency,
                    data.description,
                    data.image || '',
                    data.stripeServiceId
                ]);
                
                // Insertar beneficios
                if (data.benefits && Array.isArray(data.benefits)) {
                    for (const benefit of data.benefits) {
                        await database.run(`
                            INSERT INTO service_benefits (service_id, benefit)
                            VALUES (?, ?)
                        `, [id, benefit]);
                    }
                }
                
                // Insertar pasos (steps)
                if (data.steps && Array.isArray(data.steps)) {
                    for (let i = 0; i < data.steps.length; i++) {
                        const step = data.steps[i];
                        await database.run(`
                            INSERT INTO service_steps (service_id, step_num, title, desc)
                            VALUES (?, ?, ?, ?)
                        `, [id, i + 1, step.title, step.desc]);
                    }
                }
                
                // Insertar cuidados posteriores (aftercare)
                if (data.aftercare && Array.isArray(data.aftercare)) {
                    for (const care of data.aftercare) {
                        await database.run(`
                            INSERT INTO service_aftercare (service_id, care_instruction)
                            VALUES (?, ?)
                        `, [id, care]);
                    }
                }
            }
            
            console.log('[Database] Siembra (seeding) completada con éxito. Todos los servicios cargados.');
        } catch (error) {
            console.error('[Database] Error al sembrar la base de datos:', error);
        }
    } else {
        console.log('[Database] La base de datos ya contiene registros. Sincronizando campos de imagen vacíos con servicios predeterminados...');
        try {
            const SERVICES_DATA = require('./services-data.js');
            for (const [id, data] of Object.entries(SERVICES_DATA)) {
                if (data.image) {
                    await database.run(`
                        UPDATE services 
                        SET image = ? 
                        WHERE id = ? AND (image IS NULL OR image = '')
                    `, [data.image, id]);
                }
            }
            console.log('[Database] Sincronización de imágenes vacías completada con éxito.');
        } catch (error) {
            console.error('[Database] Error al sincronizar imágenes vacías en la base de datos:', error);
        }
    }
}

module.exports = {
    getDatabase,
    initDatabase
};
