const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51PMkLpRp87eWf768xyz'); // Clave secreta (de pruebas por defecto)

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
  "Micropigmentación de Cejas": 0 // Valoración gratuita, se gestiona sin pago
};

exports.handler = async (event, context) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { name, phone, service, date, time, notes, origin } = JSON.parse(event.body);

    // Validar parámetros obligatorios
    if (!name || !phone || !service || !date || !time) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan parámetros obligatorios para la reserva.' }),
      };
    }

    const price = SERVICE_PRICES[service];
    if (price === undefined || price <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El servicio seleccionado es gratuito o no válido para pago en línea.' }),
      };
    }

    // Obtener origen dinámico para retornos
    const siteUrl = origin || event.headers.origin || 'https://delinearte-lucy.netlify.app';

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
            unit_amount: price * 100, // Stripe requiere el monto en centavos
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('[Stripe Error]', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno al generar la sesión de pago.', details: error.message }),
    };
  }
};
