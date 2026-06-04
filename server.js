const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDatabase } = require('./database.js');

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
