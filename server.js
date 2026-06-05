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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jfif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no válido. Solo se admiten imágenes (JPG, PNG, GIF, WEBP).'));
    }
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// Configuración de Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51PMkLpRp87eWf768xyz');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

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
    "Micropigmentación de Cejas": 0 // Valoración gratuita, se gestiona por WhatsApp sin pago
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

// 3. Crear sesión de pago en Stripe (Checkout)
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
