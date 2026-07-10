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

        CREATE TABLE IF NOT EXISTS hero_slides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slide_order INTEGER NOT NULL DEFAULT 0,
            image TEXT NOT NULL,
            subtitle TEXT,
            title TEXT NOT NULL,
            body TEXT,
            cta_text TEXT,
            cta_href TEXT
        );

        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT NOT NULL,
            goals TEXT NOT NULL,
            recommended_service TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Inicializar y sembrar tabla de métricas
    await database.exec(`
        CREATE TABLE IF NOT EXISTS metrics (
            name TEXT PRIMARY KEY,
            value INTEGER DEFAULT 0
        );
    `);
    
    try {
        const clickMetric = await database.get("SELECT * FROM metrics WHERE name = 'whatsapp_clicks'");
        if (!clickMetric) {
            await database.run("INSERT INTO metrics (name, value) VALUES ('whatsapp_clicks', 0)");
        }
    } catch (err) {
        console.error('[Database] Error al sembrar métrica de WhatsApp:', err);
    }
    
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
                    poster: "uploaded_1782233909633_573809370_18169437433328316_7310516336972803724_n.jpg",
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

    // 4. Migración para base de datos persistentes: asegurar que los videos predeterminados existan y tengan sus rutas
    try {
        const telegraph = await database.get("SELECT * FROM videos WHERE name = 'The Telegraph'");
        if (!telegraph) {
            console.log("[Database] Re-insertando video 'The Telegraph' faltante...");
            await database.run(`
                INSERT INTO videos (tag, name, url, poster, instagram_link)
                VALUES (?, ?, ?, ?, ?)
            `, ["Prensa", "The Telegraph", "whatsapp_video_2.mp4", "Captura de pantalla 2026-05-29 211828.png", ""]);
        } else if (!telegraph.url || telegraph.url === '') {
            await database.run(`
                UPDATE videos 
                SET url = 'whatsapp_video_2.mp4' 
                WHERE name = 'The Telegraph'
            `);
        }

        const masaje = await database.get("SELECT * FROM videos WHERE name = 'Masaje de Autor'");
        if (!masaje) {
            console.log("[Database] Re-insertando video 'Masaje de Autor' faltante...");
            await database.run(`
                INSERT INTO videos (tag, name, url, poster, instagram_link)
                VALUES (?, ?, ?, ?, ?)
            `, ["Facial", "Masaje de Autor", "diseno_cejas_visagismo.mp4", "Captura de pantalla 2026-05-29 212043.png", ""]);
        } else if (!masaje.url || masaje.url === '') {
            await database.run(`
                UPDATE videos 
                SET url = 'diseno_cejas_visagismo.mp4' 
                WHERE name = 'Masaje de Autor'
            `);
        }
        console.log('[Database] Migración de videos predeterminados finalizada.');
    } catch (error) {
        console.error('[Database] Error al migrar o restaurar videos predeterminados:', error);
    }

    // 4.5. Migración para dividir la categoría de Mirada y Micropigmentación de Autor
    try {
        // Actualizar servicios de micropigmentación a su nueva categoría
        const microServices = ['ceja-hiperrealista', 'aquarela-lips', 'full-lips', 'eyeliner'];
        for (const serviceId of microServices) {
            await database.run(`
                UPDATE services 
                SET category = 'micropigmentacion' 
                WHERE id = ?
            `, [serviceId]);
        }

        // Corregir Extensión de Pestañas Volumen Soft (que estaba en unas) a mirada
        await database.run(`
            UPDATE services 
            SET category = 'mirada' 
            WHERE id = 'pestanas-volumen-soft'
        `);

        console.log('[Database] Migración de categorías de servicios (Mirada vs Micropigmentación) finalizada.');
    } catch (error) {
        console.error('[Database] Error al migrar categorías de servicios:', error);
    }

    // 5. Semilla para la tabla hero_slides
    try {
        const slideCount = await database.get('SELECT COUNT(*) as count FROM hero_slides');
        if (slideCount.count === 0) {
            console.log('[Database] La tabla hero_slides está vacía. Iniciando siembra...');
            const defaultSlides = [
                {
                    slide_order: 1,
                    image: 'brows_luxury.png',
                    subtitle: 'El Arte de la Mirada',
                    title: 'Ceja Hiperrealista',
                    body: 'Diseño y micropigmentación orgánica de cejas y labios adaptada a la simetría y armonía única de tu rostro.',
                    cta_text: 'Agendar Valoración',
                    cta_href: '#servicios'
                },
                {
                    slide_order: 2,
                    image: 'nails_luxury.png',
                    subtitle: 'Esculpido de Autor',
                    title: 'Uñas Élite',
                    body: 'Esculpido fino de autor y extensiones premium diseñadas a medida con materiales de máxima calidad que respetan tu salud natural.',
                    cta_text: 'Ver Carta de Uñas',
                    cta_href: '#servicios'
                },
                {
                    slide_order: 3,
                    image: 'skincare_luxury.png',
                    subtitle: 'Tratamientos de Autor',
                    title: 'Faciales Clínicos',
                    body: 'Nutrición científica celular y aparatología avanzada de vanguardia para revelar la luminosidad real y juventud de tu piel.',
                    cta_text: 'Explorar Faciales',
                    cta_href: '#servicios'
                }
            ];
            for (const slide of defaultSlides) {
                await database.run(`
                    INSERT INTO hero_slides (slide_order, image, subtitle, title, body, cta_text, cta_href)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [slide.slide_order, slide.image, slide.subtitle, slide.title, slide.body, slide.cta_text, slide.cta_href]);
            }
            console.log('[Database] Siembra de hero_slides completada con éxito.');
        }
    } catch (error) {
        console.error('[Database] Error al sembrar hero_slides:', error);
    }

    // 6. Sincronización dinámica de nuevos servicios de services-data.js
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
                    if (id === 'pestanas-volumen-soft') {
                        category = 'mirada';
                    } else {
                        category = 'unas';
                    }
                } else if (id.startsWith('facial') || id.includes('fibroblast')) {
                    category = 'faciales';
                } else if (id.includes('lips') || id.includes('eyeliner') || id === 'ceja-hiperrealista') {
                    category = 'micropigmentacion';
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
