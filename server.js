// Cargar variables de entorno desde .env (entorno local)
// En Easypanel las variables se configuran directamente en el panel del contenedor
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { initDatabase, getDatabase } = require('./database.js');

// Configuración de Multer para carga de imágenes en 'public'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const cleanName = file.originalname
            .replace(ext, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_');
        cb(null, `uploaded_${Date.now()}_${cleanName}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jfif',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'
    ];
    // Aceptar si está en el array de mimetypes o si su extensión indica que es video/imagen común
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    
    if (allowedTypes.includes(file.mimetype) || isAllowedExt) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no válido. Se admiten imágenes (JPG, PNG, GIF, WEBP) y videos (MP4, WEBM, MOV).'));
    }
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // Límite de 50MB para soportar videos de WhatsApp/Instagram
});

// Configuración de Stripe
// La clave secreta se lee desde la variable de entorno STRIPE_SECRET_KEY
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.error('[Stripe] ❌ CRÍTICO: No se encontró STRIPE_SECRET_KEY en las variables de entorno.');
    console.error('[Stripe] Variables disponibles:', Object.keys(process.env).filter(k => !k.includes('npm') && !k.includes('PATH')).join(', '));
} else {
    console.log(`[Stripe] ✅ Clave cargada correctamente. Prefijo: ${stripeKey.substring(0, 12)}...`);
}
const stripe = require('stripe')(stripeKey || 'sk_test_placeholder_no_configurado');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware esenciales
app.use(cors());
app.use(express.json());

// Middleware de Autenticación para el Panel de Administración y APIs de escritura
const basicAuth = (req, res, next) => {
    const isProtectedPage = req.path === '/editor' || req.path === '/editor.html';
    const isWriteApi = (req.path.startsWith('/api/services') && req.method !== 'GET') ||
                      (req.path.startsWith('/api/videos') && req.method !== 'GET') ||
                      (req.path.startsWith('/api/hero-slides') && req.method !== 'GET') ||
                      req.path.startsWith('/api/upload');
                      
    if (isProtectedPage || isWriteApi) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Delinearte"');
            return res.status(401).send('Authentication required.');
        }
        
        try {
            const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
            const username = auth[0];
            const password = auth[1];
            
            const expectedUsername = 'lucy';
            const expectedPassword = process.env.ADMIN_PASSWORD || 'Ludisaju0212';
            
            if (username === expectedUsername && password === expectedPassword) {
                return next();
            }
        } catch (e) {
            console.error('[Auth Error]', e);
        }
        
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Delinearte"');
        return res.status(401).send('Invalid credentials.');
    }
    
    next();
};

app.use(basicAuth);

// Servir archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.html') || filepath.endsWith('.js') || filepath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Tabla estática de precios de Stripe para garantizar compatibilidad con los valores del formulario
const SERVICE_PRICES = {
    "Uñas Esculturales (Aplicación)": 650,
    "Uñas Esculturales (Mantenimiento)": 450,
    "Poligel Premium (Aplicación)": 650,
    "Soft Gel (Aplicación)": 650,
    "Ruber Base (Aplicación)": 350,
    "Gel Semipermanente": 250,
    "Tratamiento Vitamina E": 150,
    "Facial Limpieza Profunda": 800,
    "Facial Hidratante": 1200,
    "Facial Despigmentante": 1200,
    "Facial Anti-Edad Premium": 1300,
    "Laminación de Cejas": 350,
    "Cejas HD": 250,
    "Lifting de Pestañas": 450,
    "Extensión de Pestañas Clásica": 650,
    "Extensión de Pestañas Volumen Soft": 750,
    "Extensión de Pestañas Volumen Intense": 850,
    "Extensión de Pestañas Volumen Ruso": 800,
    "Prueba de Sistema": 10,
    "Micropigmentación de Cejas": 0, // Valoración gratuita, se gestiona por WhatsApp sin pago
    "Plasma Fibroblast": 0,
    "Aquarela Lips": 0,
    "Full Lips": 0,
    "Eyeliner": 0
};

// ----------------------------------------------------
// RUTAS DE LA API
// ----------------------------------------------------

// 1. Obtener todos los servicios agrupados por categoría
app.get('/api/services', async (req, res) => {
    try {
        const db = await getDatabase();
        const services = await db.all('SELECT id, category, title, subtitle, price, duration, frequency, description, image, stripe_service_id FROM services');
        
        const grouped = {
            mirada: services.filter(s => s.category === 'mirada'),
            micropigmentacion: services.filter(s => s.category === 'micropigmentacion'),
            faciales: services.filter(s => s.category === 'faciales'),
            unas: services.filter(s => s.category === 'unas')
        };
        
        res.json(grouped);
    } catch (error) {
        console.error('[API Error] Error al obtener servicios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de servicios.' });
    }
});

// 2. Obtener un servicio específico con todos sus detalles (beneficios, pasos, cuidados)
app.get('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDatabase();
        
        const service = await db.get('SELECT * FROM services WHERE id = ?', [id]);
        if (!service) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }
        
        const benefits = await db.all('SELECT benefit FROM service_benefits WHERE service_id = ?', [id]);
        const steps = await db.all('SELECT title, desc FROM service_steps WHERE service_id = ? ORDER BY step_num ASC', [id]);
        const aftercare = await db.all('SELECT care_instruction FROM service_aftercare WHERE service_id = ?', [id]);
        
        res.json({
            ...service,
            benefits: benefits.map(b => b.benefit),
            steps: steps.map(s => ({ title: s.title, desc: s.desc })),
            aftercare: aftercare.map(a => a.care_instruction)
        });
    } catch (error) {
        console.error('[API Error] Error al obtener detalle del servicio:', error);
        res.status(500).json({ error: 'Error al obtener el detalle del servicio.' });
    }
});

// 2.5. Actualizar un servicio específico (Editor Admin)
app.put('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subtitle, price, duration, frequency, description, image, stripe_service_id, benefits, steps, aftercare } = req.body;
        
        const db = await getDatabase();
        
        // Verificar si el servicio existe
        const service = await db.get('SELECT id FROM services WHERE id = ?', [id]);
        if (!service) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }
        
        // Iniciar transacción para asegurar atomicidad
        await db.run('BEGIN TRANSACTION');
        
        // 1. Actualizar tabla principal
        await db.run(`
            UPDATE services 
            SET title = ?, subtitle = ?, price = ?, duration = ?, frequency = ?, description = ?, image = ?, stripe_service_id = ?
            WHERE id = ?
        `, [title, subtitle, price, duration, frequency, description, image, stripe_service_id, id]);
        
        // 2. Actualizar beneficios
        if (benefits && Array.isArray(benefits)) {
            await db.run('DELETE FROM service_benefits WHERE service_id = ?', [id]);
            for (const benefit of benefits) {
                if (benefit.trim()) {
                    await db.run('INSERT INTO service_benefits (service_id, benefit) VALUES (?, ?)', [id, benefit.trim()]);
                }
            }
        }
        
        // 3. Actualizar pasos
        if (steps && Array.isArray(steps)) {
            await db.run('DELETE FROM service_steps WHERE service_id = ?', [id]);
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (step.title && step.title.trim()) {
                    await db.run('INSERT INTO service_steps (service_id, step_num, title, desc) VALUES (?, ?, ?, ?)', [
                        id,
                        i + 1,
                        step.title.trim(),
                        step.desc ? step.desc.trim() : ''
                    ]);
                }
            }
        }
        
        // 4. Actualizar cuidados posteriores
        if (aftercare && Array.isArray(aftercare)) {
            await db.run('DELETE FROM service_aftercare WHERE service_id = ?', [id]);
            for (const care of aftercare) {
                if (care.trim()) {
                    await db.run('INSERT INTO service_aftercare (service_id, care_instruction) VALUES (?, ?)', [id, care.trim()]);
                }
            }
        }
        
        await db.run('COMMIT');
        res.json({ success: true, message: 'Servicio actualizado correctamente.' });
    } catch (error) {
        // Revertir en caso de fallo
        try {
            const db = await getDatabase();
            await db.run('ROLLBACK');
        } catch (_) {}
        console.error('[API Error] Error al actualizar servicio:', error);
        res.status(500).json({ error: 'Error al actualizar el servicio.', details: error.message });
    }
});

// 2.7. Obtener todos los videos del carrusel
app.get('/api/videos', async (req, res) => {
    try {
        const db = await getDatabase();
        const videos = await db.all('SELECT id, url, poster, tag, name, instagram_link FROM videos ORDER BY id ASC');
        res.json(videos);
    } catch (error) {
        console.error('[API Error] Error al obtener videos:', error);
        res.status(500).json({ error: 'Error al obtener los videos del carrusel.' });
    }
});

// 2.8. Obtener un video específico
app.get('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDatabase();
        const video = await db.get('SELECT * FROM videos WHERE id = ?', [id]);
        if (!video) {
            return res.status(404).json({ error: 'Video no encontrado.' });
        }
        res.json(video);
    } catch (error) {
        console.error('[API Error] Error al obtener video:', error);
        res.status(500).json({ error: 'Error al obtener detalles del video.' });
    }
});

// 2.9. Actualizar un video específico
app.put('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { url, poster, tag, name, instagram_link } = req.body;
        
        const db = await getDatabase();
        
        // Verificar si el video existe
        const video = await db.get('SELECT id FROM videos WHERE id = ?', [id]);
        if (!video) {
            return res.status(404).json({ error: 'Video no encontrado.' });
        }
        
        await db.run(`
            UPDATE videos 
            SET url = ?, poster = ?, tag = ?, name = ?, instagram_link = ?
            WHERE id = ?
        `, [url, poster, tag, name, instagram_link, id]);
        
        res.json({ success: true, message: 'Video actualizado correctamente.' });
    } catch (error) {
        console.error('[API Error] Error al actualizar video:', error);
        res.status(500).json({ error: 'Error al actualizar el video.', details: error.message });
    }
});

// 2.10. Agregar un nuevo video al carrusel
app.post('/api/videos', async (req, res) => {
    try {
        const { url, poster, tag, name, instagram_link } = req.body;
        
        const db = await getDatabase();
        
        const result = await db.run(`
            INSERT INTO videos (url, poster, tag, name, instagram_link)
            VALUES (?, ?, ?, ?, ?)
        `, [url, poster, tag, name, instagram_link]);
        
        res.json({ success: true, id: result.lastID, message: 'Video agregado correctamente.' });
    } catch (error) {
        console.error('[API Error] Error al agregar video:', error);
        res.status(500).json({ error: 'Error al agregar el video a la base de datos.' });
    }
});

// 2.11. Eliminar un video del carrusel
app.delete('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDatabase();
        
        // Verificar si el video existe
        const video = await db.get('SELECT id FROM videos WHERE id = ?', [id]);
        if (!video) {
            return res.status(404).json({ error: 'Video no encontrado.' });
        }
        
        await db.run('DELETE FROM videos WHERE id = ?', [id]);
        res.json({ success: true, message: 'Video eliminado correctamente.' });
    } catch (error) {
        console.error('[API Error] Error al eliminar video:', error);
        res.status(500).json({ error: 'Error al eliminar el video.' });
    }
});

// 2.6. Subir imagen de servicio (Editor Admin - Drag and Drop / File Input)
app.post('/api/upload', (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Error de subida: Archivo demasiado grande (máx 5MB).` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No se ha seleccionado ningún archivo.' });
            }
            res.json({ 
                success: true, 
                filename: req.file.filename,
                filepath: `${req.file.filename}` 
            });
        } catch (error) {
            console.error('[API Error] Error al retornar subida:', error);
            res.status(500).json({ error: 'Fallo al procesar la subida del archivo.' });
        }
    });
});

// ------ HERO SLIDES API ------

// GET all hero slides
app.get('/api/hero-slides', async (req, res) => {
    try {
        const db = await getDatabase();
        const slides = await db.all('SELECT * FROM hero_slides ORDER BY slide_order ASC');
        res.json(slides);
    } catch (error) {
        console.error('[API Error] Error al obtener hero_slides:', error);
        res.status(500).json({ error: 'Error al obtener los banners hero.' });
    }
});

// GET single hero slide
app.get('/api/hero-slides/:id', async (req, res) => {
    try {
        const db = await getDatabase();
        const slide = await db.get('SELECT * FROM hero_slides WHERE id = ?', [req.params.id]);
        if (!slide) return res.status(404).json({ error: 'Banner no encontrado.' });
        res.json(slide);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el banner.' });
    }
});

// POST create new hero slide
app.post('/api/hero-slides', async (req, res) => {
    try {
        const { image, subtitle, title, body, cta_text, cta_href, slide_order } = req.body;
        if (!title || !image) return res.status(400).json({ error: 'Título e imagen son obligatorios.' });
        const db = await getDatabase();
        // Determine order
        const maxOrder = await db.get('SELECT MAX(slide_order) as maxo FROM hero_slides');
        const newOrder = slide_order || (maxOrder.maxo || 0) + 1;
        const result = await db.run(
            'INSERT INTO hero_slides (slide_order, image, subtitle, title, body, cta_text, cta_href) VALUES (?,?,?,?,?,?,?)',
            [newOrder, image, subtitle || '', title, body || '', cta_text || '', cta_href || '#servicios']
        );
        res.json({ success: true, id: result.lastID, message: 'Banner creado correctamente.' });
    } catch (error) {
        console.error('[API Error] Error al crear banner:', error);
        res.status(500).json({ error: 'Error al crear el banner.' });
    }
});

// PUT update hero slide
app.put('/api/hero-slides/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { image, subtitle, title, body, cta_text, cta_href, slide_order } = req.body;
        const db = await getDatabase();
        const slide = await db.get('SELECT id FROM hero_slides WHERE id = ?', [id]);
        if (!slide) return res.status(404).json({ error: 'Banner no encontrado.' });
        await db.run(
            'UPDATE hero_slides SET image=?, subtitle=?, title=?, body=?, cta_text=?, cta_href=?, slide_order=? WHERE id=?',
            [image, subtitle, title, body, cta_text, cta_href, slide_order, id]
        );
        res.json({ success: true, message: 'Banner actualizado correctamente.' });
    } catch (error) {
        console.error('[API Error] Error al actualizar banner:', error);
        res.status(500).json({ error: 'Error al actualizar el banner.' });
    }
});

// DELETE hero slide
app.delete('/api/hero-slides/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDatabase();
        const slide = await db.get('SELECT id FROM hero_slides WHERE id = ?', [id]);
        if (!slide) return res.status(404).json({ error: 'Banner no encontrado.' });
        await db.run('DELETE FROM hero_slides WHERE id = ?', [id]);
        res.json({ success: true, message: 'Banner eliminado correctamente.' });
    } catch (error) {
        console.error('[API Error] Error al eliminar banner:', error);
        res.status(500).json({ error: 'Error al eliminar el banner.' });
    }
});

// DIAGNÓSTICO TEMPORAL: Ver si las variables de entorno están cargadas en producción
app.get('/api/health', (req, res) => {
    const stripeLoaded = !!(process.env.STRIPE_SECRET_KEY);
    const stripePrefix = process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...' : 'NO ENCONTRADA';
    res.json({
        status: 'ok',
        stripe_key_loaded: stripeLoaded,
        stripe_key_prefix: stripePrefix,
        node_env: process.env.NODE_ENV || 'no definido',
        port: process.env.PORT || '3000 (default)'
    });
});

// RESPALDO EXPORT: Comprime y descarga la base de datos y archivos subidos en producción
app.get('/api/backup', basicAuth, (req, res) => {
    const { exec } = require('child_process');
    const backupFile = path.join(__dirname, 'delinearte_backup.tar.gz');
    
    // Comprime la base de datos sqlite y los archivos que empiecen con 'uploaded_*'
    exec(`tar -czf "${backupFile}" data public/uploaded_* 2>/dev/null || tar -czf "${backupFile}" data`, (err) => {
        if (err) {
            console.error('[Backup Error] Falló al comprimir:', err);
            return res.status(500).send('Error al generar copia de seguridad.');
        }
        
        res.download(backupFile, 'delinearte_backup.tar.gz', (downloadErr) => {
            if (downloadErr) {
                console.error('[Backup Error] Falló al descargar:', downloadErr);
            }
            // Eliminar el archivo temporal del disco
            if (fs.existsSync(backupFile)) {
                fs.unlinkSync(backupFile);
            }
        });
    });
});

// 3a. Exponer la clave PÚBLICA de Stripe al frontend (la secreta nunca sale del servidor)
app.get('/api/stripe-config', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

// 3b. Crear sesión de pago en Stripe (Checkout)
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { name, phone, service, date, time, notes, origin } = req.body;
        
        // Validar parámetros obligatorios
        if (!name || !phone || !service || !date || !time) {
            return res.status(400).json({ error: 'Faltan parámetros obligatorios para la reserva.' });
        }
        
        const price = SERVICE_PRICES[service];
        if (price === undefined || price <= 0) {
            return res.status(400).json({ error: 'El servicio seleccionado es gratuito o no válido para pago en línea.' });
        }
        
        // Determinar URL de retorno dinámica (admite entorno local, Netlify o la IP de la VPS)
        const siteUrl = origin || req.headers.referer || `${req.protocol}://${req.get('host')}`;
        
        // Crear Sesión de Pago en Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'mxn',
                        product_data: {
                            name: `Delinearte: ${service}`,
                            description: `Cita para el día ${date} a las ${time} horas`,
                        },
                        unit_amount: price * 100, // En centavos
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&notes=${encodeURIComponent(notes)}`,
            cancel_url: `${siteUrl}/#reservas`,
            metadata: {
                clientName: name,
                clientPhone: phone,
                selectedService: service,
                appointmentDate: date,
                appointmentTime: time,
                clientNotes: notes || 'Sin notas'
            }
        });
        
        res.json({ url: session.url });
    } catch (error) {
        console.error('[Stripe Error] Error al generar checkout:', error);
        res.status(500).json({ error: 'Error interno al generar la sesión de pago.', details: error.message });
    }
});

// 4. Rutas Limpias de Navegación de Autoridad
app.get('/editor', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'editor.html'));
});

app.get('/editor.html', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'editor.html'));
});

app.get('/trayectoria', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trayectoria.html'));
});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'faq.html'));
});

app.get('/contacto', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contacto.html'));
});

app.get('/politica-privacidad', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'politica-privacidad.html'));
});

app.get('/terminos-condiciones', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terminos-condiciones.html'));
});

app.get('/reservar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reservar.html'));
});

app.get('/servicio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'servicio.html'));
});

// 3c. Guardar un nuevo lead de consulta de IA
app.post('/api/leads', async (req, res) => {
    try {
        const { name, contact, goals, recommended_service } = req.body;
        if (!name || !contact || !goals) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, contacto o metas).' });
        }
        
        const db = await getDatabase();
        await db.run(`
            INSERT INTO leads (name, contact, goals, recommended_service)
            VALUES (?, ?, ?, ?)
        `, [name, contact, goals, recommended_service || '']);
        
        res.json({ success: true, message: 'Consulta registrada con éxito.' });
    } catch (error) {
        console.error('[API Error] Error al crear lead:', error);
        res.status(500).json({ error: 'Error al registrar la consulta.' });
    }
});

// Incrementar contador de clics a WhatsApp
app.post('/api/track-whatsapp-click', async (req, res) => {
    try {
        const db = await getDatabase();
        await db.run("UPDATE metrics SET value = value + 1 WHERE name = 'whatsapp_clicks'");
        res.json({ success: true });
    } catch (error) {
        console.error('[API Error] Error al registrar clic en WhatsApp:', error);
        res.status(500).json({ error: 'Error al registrar el clic.' });
    }
});

// Obtener métricas del sitio (Protegido - Admin)
app.get('/api/metrics', basicAuth, async (req, res) => {
    try {
        const db = await getDatabase();
        const row = await db.get("SELECT value FROM metrics WHERE name = 'whatsapp_clicks'");
        res.json({ whatsapp_clicks: row ? row.value : 0 });
    } catch (error) {
        console.error('[API Error] Error al obtener métricas:', error);
        res.status(500).json({ error: 'Error al obtener métricas.' });
    }
});

// 3d. Obtener todos los leads (Protegido - Admin)
app.get('/api/leads', basicAuth, async (req, res) => {
    try {
        const db = await getDatabase();
        const leads = await db.all('SELECT * FROM leads ORDER BY created_at DESC');
        res.json(leads);
    } catch (error) {
        console.error('[API Error] Error al obtener leads:', error);
        res.status(500).json({ error: 'Error al obtener la lista de consultas.' });
    }
});

// 3e. Eliminar un lead por ID (Protegido - Admin)
app.delete('/api/leads/:id', basicAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDatabase();
        await db.run('DELETE FROM leads WHERE id = ?', [id]);
        res.json({ success: true, message: 'Consulta eliminada con éxito.' });
    } catch (error) {
        console.error('[API Error] Error al eliminar lead:', error);
        res.status(500).json({ error: 'Error al eliminar la consulta.' });
    }
});

// Comodín para redirigir cualquier otra petición de frontend a la página principal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar base de datos y arrancar el servidor
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`[Server] Servidor ejecutándose en puerto ${PORT}`);
    });
}).catch(err => {
    console.error('[Server Error] Falló al iniciar el servidor:', err);
});
