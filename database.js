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

    `);

    // Para la tabla videos, si ya existe pero con el esquema viejo, la recreamos
    try {
        const columns = await database.all("PRAGMA table_info(videos)");
        const hasInstagramLink = columns.some(c => c.name === 'instagram_link');
        if (!hasInstagramLink && columns.length > 0) {
            console.log('[Database] Detectado esquema antiguo en la tabla videos. Recreando...');
            await database.run("DROP TABLE IF EXISTS videos");
        }
    } catch (err) {
        console.error('[Database] Error al verificar tabla videos:', err);
    }

    await database.exec(`
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            poster TEXT,
            tag TEXT,
            name TEXT,
            instagram_link TEXT
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

    // 3. Semilla para la tabla videos
    try {
        const videoCountResult = await database.get('SELECT COUNT(*) as count FROM videos');
        if (videoCountResult.count === 0) {
            console.log('[Database] La tabla de videos está vacía. Iniciando siembra...');
            const defaultVideos = [
                {
                    tag: "Prensa",
                    name: "The Telegraph",
                    url: "whatsapp_video_2.mp4",
                    poster: "Captura de pantalla 2026-05-29 211828.png",
                    instagram_link: ""
                },
                {
                    tag: "Facial",
                    name: "Masaje de Autor",
                    url: "diseno_cejas_visagismo.mp4",
                    poster: "Captura de pantalla 2026-05-29 212043.png",
                    instagram_link: ""
                },
                {
                    tag: "Uñas",
                    name: "Diseño Élite",
                    url: "https://assets.mixkit.co/videos/preview/mixkit-woman-showing-her-beautifully-manicured-nails-43018-large.mp4",
                    poster: "nails_luxury.png",
                    instagram_link: ""
                },
                {
                    tag: "Mirada",
                    name: "Cejas de Autor",
                    url: "https://assets.mixkit.co/videos/preview/mixkit-skin-care-massage-on-a-woman-face-41711-large.mp4",
                    poster: "brows_luxury.png",
                    instagram_link: ""
                },
                {
                    tag: "Estética",
                    name: "Micropigmentación",
                    url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-touching-her-soft-skin-face-41714-large.mp4",
                    poster: "hotspots_bg.png",
                    instagram_link: ""
                },
                {
                    tag: "Bienestar",
                    name: "Spa Corporal",
                    url: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-woman-getting-a-massage-on-her-shoulder-and-neck-41709-large.mp4",
                    poster: "skincare_luxury.png",
                    instagram_link: ""
                },
                {
                    tag: "Cosmética",
                    name: "Lucy Luxury",
                    url: "https://assets.mixkit.co/videos/preview/mixkit-cosmetic-oil-dropper-bottle-on-stone-surface-43026-large.mp4",
                    poster: "lucy_profile.png",
                    instagram_link: ""
                }
            ];

            for (const video of defaultVideos) {
                await database.run(`
                    INSERT INTO videos (tag, name, url, poster, instagram_link)
                    VALUES (?, ?, ?, ?, ?)
                `, [video.tag, video.name, video.url, video.poster, video.instagram_link]);
            }
            console.log('[Database] Siembra de videos completada con éxito.');
        }
    } catch (error) {
        console.error('[Database] Error al sembrar la tabla de videos:', error);
    }

    // 4. Migración para base de datos persistentes: asegurar que los videos predeterminados tengan sus rutas
    try {
        await database.run(`
            UPDATE videos 
            SET url = 'whatsapp_video_2.mp4' 
            WHERE name = 'The Telegraph' AND (url IS NULL OR url = '')
        `);
        await database.run(`
            UPDATE videos 
            SET url = 'diseno_cejas_visagismo.mp4' 
            WHERE name = 'Masaje de Autor' AND (url IS NULL OR url = '')
        `);
        console.log('[Database] Migración de URLs de videos predeterminados realizada con éxito.');
    } catch (error) {
        console.error('[Database] Error al migrar URLs de videos vacías:', error);
    }

    // 5. Sincronización dinámica de nuevos servicios de services-data.js
    try {
        const SERVICES_DATA = require('./services-data.js');
        const dbServices = await database.all('SELECT id FROM services');
        const dbServiceIds = new Set(dbServices.map(s => s.id));

        for (const [id, data] of Object.entries(SERVICES_DATA)) {
            if (!dbServiceIds.has(id)) {
                console.log(`[Database] Detectado nuevo servicio faltante en BD: ${id}. Insertando...`);
                
                // Determinar categoría basada en el ID
                let category = 'mirada';
                if (id.startsWith('unas') || id.includes('poligel') || id.includes('soft') || id.includes('ruber') || id.includes('gel') || id.includes('vitamina')) {
                    category = 'unas';
                } else if (id.startsWith('facial') || id.includes('fibroblast')) {
                    category = 'faciales';
                }

                // Insertar servicio principal
                await database.run(`
                    INSERT INTO services (id, category, title, subtitle, price, duration, frequency, description, image, stripe_service_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id,
                    category,
                    data.title,
                    data.subtitle || '',
                    data.price || '',
                    data.duration || '',
                    data.frequency || '',
                    data.description || '',
                    data.image || '',
                    data.stripeServiceId || ''
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
        }
        console.log('[Database] Sincronización de servicios de services-data.js completada.');
    } catch (error) {
        console.error('[Database] Error al sincronizar nuevos servicios:', error);
    }
}

module.exports = {
    getDatabase,
    initDatabase
};
