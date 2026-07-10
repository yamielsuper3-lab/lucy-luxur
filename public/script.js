/**
 * Lucy Luxury - Plataforma Web Premium
 * Lógica Base de Negocio, Tracking de Leads y Efectos Visuales
 */

// CONFIGURACIÓN GLOBAL DE LA PLATAFORMA
const CONFIG = {
    whatsappPhone: '5213222629523', // Número de WhatsApp de la boutique (Delinearte por Lucy González)
    defaultReferral: 'LUCY-DIRECT', // Código de referido por defecto
    refStorageKey: 'lucy_luxury_ref_code', // Clave para localStorage
};

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. SISTEMA DE TRACKING DE REFERIDOS (LEADS)
    // ==========================================
    
    function initReferralTracking() {
        try {
            // Buscar parámetros "ref" o "utm_source" en la URL
            const urlParams = new URLSearchParams(window.location.search);
            let refCode = urlParams.get('ref') || urlParams.get('utm_source');
            
            if (refCode) {
                // Limpiar caracteres extraños y guardar
                refCode = refCode.trim().toUpperCase();
                localStorage.setItem(CONFIG.refStorageKey, refCode);
                console.log(`[Tracking] Referido detectado y guardado: ${refCode}`);
            } else {
                // Si no hay parámetro, verificar si ya existe uno guardado en localStorage
                const storedRef = localStorage.getItem(CONFIG.refStorageKey);
                if (!storedRef) {
                    // Si está vacío, asignar el código por defecto
                    localStorage.setItem(CONFIG.refStorageKey, CONFIG.defaultReferral);
                    console.log(`[Tracking] Sin referido en URL. Asignado por defecto: ${CONFIG.defaultReferral}`);
                } else {
                    console.log(`[Tracking] Referido existente en memoria: ${storedRef}`);
                }
            }
        } catch (e) {
            console.error('[Tracking] Error al inicializar el almacenamiento de referidos:', e);
        }
    }
    
    initReferralTracking();
    
    // Función auxiliar para obtener el referido actual
    function getActiveReferralCode() {
        try {
            return localStorage.getItem(CONFIG.refStorageKey) || CONFIG.defaultReferral;
        } catch (e) {
            return CONFIG.defaultReferral;
        }
    }

    // ==========================================
    // 2. FORMULARIO DE RESERVAS A WHATSAPP
    // ==========================================
    
    const bookingForm = document.getElementById('luxury-booking-form');
    const paymentMethodSelect = document.getElementById('booking-payment-method');
    const serviceSelect = document.getElementById('booking-service');
    const submitBtn = document.getElementById('booking-submit-btn');

    // Cambiar dinámicamente el botón de envío según método de pago y lenguaje
    function updateSubmitButtonText() {
        const isEn = (typeof currentLanguage !== 'undefined' ? currentLanguage : (localStorage.getItem('lang') || 'es')) === 'en';
        if (!paymentMethodSelect || !submitBtn) return;
        
        if (paymentMethodSelect.value === 'stripe') {
            submitBtn.innerHTML = isEn ? '<span>Proceed to Secure Payment</span> 💳' : '<span>Proceder al Pago Seguro</span> 💳';
        } else {
            submitBtn.innerHTML = isEn ? '<span>Book via WhatsApp</span> 👑' : '<span>Reservar por WhatsApp</span> 👑';
        }
    }

    if (paymentMethodSelect && submitBtn) {
        paymentMethodSelect.addEventListener('change', updateSubmitButtonText);
    }

    // Gestionar servicios gratuitos (no requieren pago en línea)
    if (serviceSelect && paymentMethodSelect) {
        serviceSelect.addEventListener('change', () => {
            const stripeOption = paymentMethodSelect.querySelector('option[value="stripe"]');
            const freeServices = ['Micropigmentación de Cejas', 'Plasma Fibroblast', 'Aquarela Lips', 'Full Lips', 'Eyeliner'];
            if (freeServices.includes(serviceSelect.value)) {
                paymentMethodSelect.value = 'whatsapp';
                if (stripeOption) stripeOption.disabled = true;
            } else {
                if (stripeOption) stripeOption.disabled = false;
                paymentMethodSelect.value = 'stripe';
            }
            updateSubmitButtonText();
        });
    }

    // Pre-seleccionar servicio si viene por parámetro de URL (?select=...)
    const urlParams = new URLSearchParams(window.location.search);
    const selectService = urlParams.get('select');
    if (selectService && serviceSelect) {
        setTimeout(() => {
            serviceSelect.value = selectService;
            serviceSelect.dispatchEvent(new Event('change'));
        }, 150);
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitar el comportamiento estándar de recarga
            
            const isEn = (typeof currentLanguage !== 'undefined' ? currentLanguage : (localStorage.getItem('lang') || 'es')) === 'en';
            
            // Obtener valores del formulario
            const name = document.getElementById('booking-name').value.trim();
            const phone = document.getElementById('booking-phone').value.trim();
            const service = serviceSelect.value;
            const date = document.getElementById('booking-date').value;
            const time = document.getElementById('booking-time').value;
            const notes = document.getElementById('booking-notes').value.trim() || (isEn ? 'No additional notes' : 'Sin notas adicionales');
            const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'stripe';
            
            // Validaciones básicas
            if (!name || !phone || !service || !date || !time) {
                alert(isEn ? 'Please fill out all required fields for your reservation.' : 'Por favor, rellene todos los campos obligatorios para su reserva.');
                return;
            }
            
            if (paymentMethod === 'stripe') {
                // FLUJO STRIPE (PAGO EN LÍNEA)
                if (submitBtn) {
                    submitBtn.innerHTML = isEn ? '<span>Initiating Secure Payment...</span>' : '<span>Iniciando Pago Seguro...</span>';
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.7';
                }
                
                // Meta Pixel: Registrar inicio de proceso de pago
                if (typeof fbq !== 'undefined') {
                    fbq('track', 'InitiateCheckout', {
                        content_name: service,
                        content_category: 'Service Booking'
                    });
                }
                
                try {
                    const response = await fetch('/api/create-checkout-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name,
                            phone,
                            service,
                            date,
                            time,
                            notes,
                            origin: window.location.origin
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Error al generar sesión de pago');
                    }
                    
                    // Redirigir a Stripe Checkout
                    if (submitBtn) {
                        submitBtn.innerHTML = isEn ? '<span>Redirecting to Stripe...</span> 🔒' : '<span>Redirigiendo a Stripe...</span> 🔒';
                    }
                    window.location.href = data.url;
                } catch (err) {
                    console.error('[Stripe Redirect Error]', err);
                    alert(isEn ? `Sorry, we could not process card payment: ${err.message}. Attempting to book via WhatsApp fallback.` : `Lo sentimos, no pudimos procesar el pago con tarjeta: ${err.message}. Intentando agendar por WhatsApp de respaldo.`);
                    
                    // Volver a habilitar botón
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = '1';
                        updateSubmitButtonText();
                    }
                }
            } else {
                // FLUJO WHATSAPP (AGENDAR Y PAGAR EN SUCURSAL)
                // Obtener código de referido para la comisión
                const referralCode = getActiveReferralCode();
                
                // Generar código único de transacción/lead para validación
                const leadId = 'LL-' + Math.floor(1000 + Math.random() * 9000);
                
                // Formatear mensaje para WhatsApp
                let message = '';
                if (isEn) {
                    message = `\u2728 *DELINEARTE - NEW BOOKING (BOUTIQUE)* \u2728\n\n` +
                              `\uD83D\uDC51 *Client:* ${name}\n` +
                              `\uD83D\uDCDE *Phone:* ${phone}\n` +
                              `\uD83D\uDC85 *Service:* ${service}\n` +
                              `\uD83D\uDCC5 *Date:* ${date}\n` +
                              `\u23F0 *Time:* ${time}\n` +
                              `\uD83D\uDCDD *Notes:* ${notes}\n\n` +
                              `---------------------------------\n` +
                              `\uD83D\uDD17 *Lead Code:* ${leadId}\n` +
                              `\uD83D\uDD16 *Attribution:* REF-${referralCode}\n` +
                              `\u2728 _Appointment request for in-boutique payment_`;
                } else {
                    message = `\u2728 *DELINEARTE - NUEVA RESERVA (SUCURSAL)* \u2728\n\n` +
                              `\uD83D\uDC51 *Cliente:* ${name}\n` +
                              `\uD83D\uDCDE *Tel\u00E9fono:* ${phone}\n` +
                              `\uD83D\uDC85 *Servicio:* ${service}\n` +
                              `\uD83D\uDCC5 *Fecha:* ${date}\n` +
                              `\u23F0 *Hora:* ${time}\n` +
                              `\uD83D\uDCDD *Notas:* ${notes}\n\n` +
                              `---------------------------------\n` +
                              `\uD83D\uDD17 *C\u00F3digo de Lead:* ${leadId}\n` +
                              `\uD83D\uDD16 *Atribuci\u00F3n:* REF-${referralCode}\n` +
                              `\u2728 _Solicitud de cita para pago en boutique_`;
                }
                
                // Codificar el texto para URL
                const encodedText = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${CONFIG.whatsappPhone}?text=${encodedText}`;
                
                if (submitBtn) {
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = isEn ? '<span>Generating Link...</span>' : '<span>Generando Enlace...</span>';
                    submitBtn.style.opacity = '0.7';
                    
                    setTimeout(() => {
                        submitBtn.innerHTML = isEn ? '<span>Redirecting to WhatsApp!</span>' : '<span>¡Redirigiendo a WhatsApp!</span>';
                        window.open(whatsappUrl, '_blank');
                        
                        setTimeout(() => {
                            submitBtn.innerHTML = originalText;
                            submitBtn.style.opacity = '1';
                            bookingForm.reset();
                            updateSubmitButtonText();
                        }, 2000);
                    }, 1000);
                } else {
                    window.open(whatsappUrl, '_blank');
                }
            }
        });
    }

    // ==========================================
    // 3. CONTROLADOR DEL SLIDESHOW HERO (Dinámico desde BD)
    // ==========================================

    let slides = [];
    let dots = [];
    let currentSlide = 0;
    let slideInterval;
    const intervalTime = 6000;

    function showSlide(index) {
        if (slides.length === 0) return;
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
            const content = slide.querySelector('.slide-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(30px)';
                content.offsetHeight;
                if (i === index) {
                    setTimeout(() => {
                        content.style.opacity = '1';
                        content.style.transform = 'translateY(0)';
                    }, 100);
                }
            }
        });
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        currentSlide = index;
    }

    function nextSlide() {
        let next = currentSlide + 1;
        if (next >= slides.length) next = 0;
        showSlide(next);
    }

    function startSlideShow() {
        stopSlideShow();
        slideInterval = setInterval(nextSlide, intervalTime);
    }

    function stopSlideShow() {
        if (slideInterval) clearInterval(slideInterval);
    }

    async function initHeroSlideshow() {
        const slidesContainer = document.getElementById('hero-slides-container');
        const paginationContainer = document.getElementById('hero-pagination');
        if (!slidesContainer || !paginationContainer) return;

        const isEn = (typeof currentLanguage !== 'undefined' ? currentLanguage : (localStorage.getItem('lang') || 'es')) === 'en';

        try {
            const res = await fetch('/api/hero-slides');
            const slidesData = await res.json();

            if (!slidesData || slidesData.length === 0) return;

            slidesContainer.innerHTML = '';
            paginationContainer.innerHTML = '';

            slidesData.forEach((s, idx) => {
                let title = s.title;
                let subtitle = s.subtitle;
                let body = s.body;
                let ctaText = s.cta_text;

                if (isEn) {
                    if (s.title === 'Ceja Hiperrealista') {
                        subtitle = "The Art of the Gaze";
                        title = "Hyperrealistic Eyebrows";
                        body = "Organic design and micropigmentation of eyebrows and lips adapted to the unique symmetry and harmony of your face.";
                        ctaText = "Book Assessment";
                    } else if (s.title === 'Uñas Élite') {
                        subtitle = "Signature Sculpting";
                        title = "Elite Nails";
                        body = "Fine signature sculpting and premium extensions custom designed with top quality materials that respect your natural health.";
                        ctaText = "View Nails Menu";
                    } else if (s.title === 'Faciales Clínicos') {
                        subtitle = "Signature Treatments";
                        title = "Clinical Facials";
                        body = "Advanced cellular nutrition and cutting-edge technology to reveal the true luminosity and youth of your skin.";
                        ctaText = "Explore Facials";
                    }
                }

                // Build slide element
                const div = document.createElement('div');
                div.className = 'hero-slide' + (idx === 0 ? ' active' : '');
                div.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.25) 100%), url('${s.image}')`;
                div.style.borderBottom = '1px solid rgba(197,160,89,0.15)';
                div.innerHTML = `
                    <div class="slide-overlay-shade"></div>
                    <div class="slide-content">
                        ${subtitle ? `<span class="slide-subtitle">${subtitle}</span>` : ''}
                        <h1 class="slide-title">${title}</h1>
                        ${body ? `<p class="slide-text">${body}</p>` : ''}
                        <a href="${s.cta_href || '#servicios'}" class="more-info-link">
                            <div class="arrow-line"></div>
                            <div class="arrow-head"></div>
                            <span class="more-info-text">${ctaText || (isEn ? 'View More' : 'Ver Más')}</span>
                        </a>
                    </div>
                `;
                slidesContainer.appendChild(div);

                // Build dot
                const dot = document.createElement('span');
                dot.className = 'pagination-dot' + (idx === 0 ? ' active' : '');
                dot.dataset.slide = idx;
                dot.addEventListener('click', () => {
                    showSlide(idx);
                    startSlideShow();
                });
                paginationContainer.appendChild(dot);
            });

            // Re-query slides and dots now that they're rendered
            slides = Array.from(slidesContainer.querySelectorAll('.hero-slide'));
            dots = Array.from(paginationContainer.querySelectorAll('.pagination-dot'));

            showSlide(0);
            startSlideShow();

        } catch (err) {
            console.error('[HeroSlideshow] Error al cargar banners:', err);
        }
    }

    // Pausar en hover para permitir lectura pausada
    const slideshowWrapper = document.querySelector('.hero-slideshow-wrapper');
    if (slideshowWrapper) {
        slideshowWrapper.addEventListener('mouseenter', stopSlideShow);
        slideshowWrapper.addEventListener('mouseleave', startSlideShow);
    }

    // Arrancar slideshow dinámico
    initHeroSlideshow();

    // ==========================================
    // 4. CAMBIO ESTILIZADO DE HEADER AL SCROLL
    // ==========================================
    
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // ==========================================
    // 5. INTERACCIONES DE VIDEO HOTSPOTS (GALERÍA)
    // ==========================================
    
    const hotspots = document.querySelectorAll('.hotspot');
    hotspots.forEach(hotspot => {
        // En dispositivos móviles, un clic abre/cierra el tooltip
        hotspot.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Cerrar otros tooltips activos
            hotspots.forEach(h => {
                if (h !== hotspot) h.classList.remove('active');
            });
            
            hotspot.classList.toggle('active');
        });
    });

    // Cerrar tooltips al hacer clic en cualquier otra parte
    document.addEventListener('click', () => {
        hotspots.forEach(h => h.classList.remove('active'));
    });

    // ==========================================
    // 6. MODAL DINÁMICO DE BIOGRAFÍA / CUIDADOS
    // ==========================================
    
    const modal = document.getElementById('luxury-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.querySelector('.modal-close');
    
    function openModal(title, htmlContent) {
        if (!modal || !modalTitle || !modalBody) return;
        modalTitle.textContent = title;
        modalBody.innerHTML = htmlContent;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Configurar activadores de modal para biografía de estilistas
    const viewBioButtons = document.querySelectorAll('.view-bio-btn');
    viewBioButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const stylistName = btn.getAttribute('data-name');
            const bioHTML = btn.getAttribute('data-bio');
            openModal(`Biografía de ${stylistName}`, bioHTML);
        });
    });

    // ==========================================
    // 7. ANIMACIÓN DE LA LÍNEA DEL TIEMPO AL SCROLL
    // ==========================================
    const timelinePath = document.querySelector('.timeline-path-active');
    if (timelinePath) {
        // Calcular la longitud total del trazo curvo SVG
        const pathLength = timelinePath.getTotalLength();
        timelinePath.style.strokeDasharray = pathLength + ' ' + pathLength;
        timelinePath.style.strokeDashoffset = pathLength;
        
        window.addEventListener('scroll', () => {
            const timelineSection = document.querySelector('.timeline-section');
            if (!timelineSection) return;
            
            const sectionRect = timelineSection.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // Determinar el progreso del scroll dentro de la sección
            const startScroll = viewportHeight * 0.8;
            const elementHeight = sectionRect.height;
            const progress = (startScroll - sectionRect.top) / (elementHeight + startScroll - viewportHeight);
            
            // Limitar progreso entre 0 (inicio) y 1 (completado)
            const clampedProgress = Math.max(0, Math.min(1, progress));
            
            // Dibujar el trazo de luz dorada proporcionalmente
            timelinePath.style.strokeDashoffset = pathLength - (clampedProgress * pathLength);
        });
    }
    
    // Animación de aparición (Scroll Reveal) para las tarjetas de la línea de tiempo
    const timelineItems = document.querySelectorAll('.timeline-item');
    if (timelineItems.length > 0) {
        const observerOptions = {
            root: null,
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const timelineObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Detener observación tras hacerse visible
                }
            });
        }, observerOptions);
        
        timelineItems.forEach(item => {
            timelineObserver.observe(item);
        });
    }

    // ==========================================
    // 8. CAROUSEL DE VIDEOS INFINITO (AUTO-SLIDING REELS)
    // ==========================================
    // ==========================================
    // 8. CAROUSEL DE VIDEOS INFINITO (AUTO-SLIDING REELS)
    // ==========================================
    const carouselWrapper = document.getElementById('carousel-videos-container');
    if (carouselWrapper) {
        loadCarouselVideos();
    }

    async function loadCarouselVideos() {
        const isEn = (typeof currentLanguage !== 'undefined' ? currentLanguage : (localStorage.getItem('lang') || 'es')) === 'en';
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) throw new Error('Error al obtener los videos del carrusel');
            const videos = await response.json();

            carouselWrapper.innerHTML = '';

            const instagramIcon = `
                <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: var(--brushed-gold); vertical-align: middle; margin-right: 4px; display: inline-block; position: relative; top: -1px;">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
            `;

            const tagsEn = {
                "Mirada": "Eyes",
                "Estética": "Aesthetics",
                "Bienestar": "Wellness",
                "Cosmética": "Cosmetics"
            };
            const namesEn = {
                "Cejas de Autor": "Signature Brows",
                "Micropigmentación": "Micropigmentation",
                "Spa Corporal": "Body Spa",
                "Lucy Luxury": "Lucy Luxury"
            };

            videos.forEach(video => {
                const card = document.createElement('div');
                card.className = 'portrait-card glass-panel';
                if (video.instagram_link && video.instagram_link.trim() !== '') {
                    card.dataset.link = video.instagram_link.trim();
                }

                // Generar el bloque de contenido (video o imagen de poster)
                let visualBlock = '';
                if (video.url && video.url.trim() !== '') {
                    visualBlock = `<video src="${video.url.trim()}" poster="${video.poster || ''}" autoplay loop muted playsinline class="carousel-card-video"></video>`;
                } else {
                    visualBlock = `<img src="${video.poster || ''}" alt="${video.name || ''}" class="carousel-card-img">`;
                }

                let tag = video.tag || '';
                let name = video.name || '';
                if (isEn) {
                    tag = tagsEn[tag] || tag;
                    name = namesEn[name] || name;
                }

                card.innerHTML = `
                    <div class="card-image-container">
                        ${visualBlock}
                    </div>
                    <div class="card-content-overlay">
                        <span class="card-tag">
                            ${(video.instagram_link && video.instagram_link.trim() !== '') ? instagramIcon : ''}
                            ${tag}
                        </span>
                        <h4 class="card-name">${name}</h4>
                    </div>
                `;

                // Evento de redirección si tiene link de Instagram
                if (video.instagram_link && video.instagram_link.trim() !== '') {
                    card.addEventListener('click', () => {
                        window.open(video.instagram_link.trim(), '_blank');
                    });
                }

                carouselWrapper.appendChild(card);
            });

            // Inicializar el movimiento y la clonación infinitos después de renderizar
            initInfiniteCarousel(carouselWrapper);

        } catch (error) {
            console.error('[Carousel Load Error]', error);
            carouselWrapper.innerHTML = `
                <div style="width:100%; text-align:center; padding: 2rem; color: var(--brushed-gold);">
                    ${isEn ? 'Error loading carousel reels.' : 'Error al cargar los reels del carrusel.'}
                </div>
            `;
        }
    }

    function initInfiniteCarousel(wrapper) {
        // Clonar elementos para loop infinito transparente
        const originalCards = Array.from(wrapper.children);
        originalCards.forEach(card => {
            const clone = card.cloneNode(true);
            
            // Si el clon contiene un elemento de video, asegurar que tenga autoplay y esté muted
            const video = clone.querySelector('video');
            if (video) {
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('muted', '');
                video.setAttribute('playsinline', '');
                
                // Forzar reproducción al completarse la carga
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(e => console.log('Autoplay clon amortiguado:', e));
                });
            }

            // Copiar evento de clic en el clon si tiene data-link
            if (card.dataset.link) {
                clone.addEventListener('click', () => {
                    window.open(card.dataset.link, '_blank');
                });
            }
            
            wrapper.appendChild(clone);
        });

        // Asegurar que todos los videos originales se reproduzcan automáticamente en silencio
        const originalVideos = wrapper.querySelectorAll('video');
        originalVideos.forEach(video => {
            video.muted = true;
            video.playsInline = true;
            video.play().catch(e => console.log('Autoplay original amortiguado:', e));
        });

        let scrollSpeed = 0.7; // Velocidad suave de desplazamiento constante (píxeles por frame)
        let isPaused = false;
        let isDown = false;
        let startX;
        let scrollLeftStart;

        // Bucle de animación suave a 60 FPS con hardware acceleration
        function autoScroll() {
            if (!isPaused && !isDown) {
                wrapper.scrollLeft += scrollSpeed;
                
                const halfWidth = wrapper.scrollWidth / 2;
                if (wrapper.scrollLeft >= halfWidth) {
                    wrapper.scrollLeft = 0;
                }
            }
            requestAnimationFrame(autoScroll);
        }

        // Arrancar animación
        requestAnimationFrame(autoScroll);

        // Controladores de Pausa con Mouse
        wrapper.addEventListener('mouseenter', () => {
            isPaused = true;
        });

        wrapper.addEventListener('mouseleave', () => {
            if (!isDown) isPaused = false;
        });

        // Soporte de Arrastre para Escritorio (Mouse Drag)
        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            isPaused = true;
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeftStart = wrapper.scrollLeft;
            wrapper.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            if (isDown) {
                isDown = false;
                wrapper.style.cursor = 'pointer';
                // Pequeña pausa antes de reanudar el autodesplazamiento
                setTimeout(() => {
                    isPaused = false;
                }, 1000);
            }
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 1.5;
            wrapper.scrollLeft = scrollLeftStart - walk;

            // Corrección de límites instantánea para el bucle
            const halfWidth = wrapper.scrollWidth / 2;
            if (wrapper.scrollLeft >= halfWidth) {
                wrapper.scrollLeft -= halfWidth;
            } else if (wrapper.scrollLeft <= 0) {
                wrapper.scrollLeft += halfWidth;
            }
        });

        // Soporte Táctil para Dispositivos Móviles (Touch Swipe)
        wrapper.addEventListener('touchstart', (e) => {
            isPaused = true;
            isDown = true;
            startX = e.touches[0].pageX - wrapper.offsetLeft;
            scrollLeftStart = wrapper.scrollLeft;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDown = false;
            setTimeout(() => {
                isPaused = false;
            }, 1500);
        }, { passive: true });
    }

    // ==========================================
    // 9. PROTOTIPO: LÍNEA DE TIEMPO HORIZONTAL INMERSIVA (¡NUEVO!)
    // ==========================================
    const triggerBtn = document.getElementById('trigger-timeline-h');
    const hTimelineModal = document.getElementById('timeline-horizontal-modal');
    const closeBtn = document.querySelector('.timeline-h-close-btn');
    const track = document.querySelector('.timeline-h-track');

    if (triggerBtn && hTimelineModal && closeBtn && track) {
        // Abrir Modal
        triggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            hTimelineModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo de la web
            
            // Posicionar al inicio del track al abrir
            setTimeout(() => {
                track.scrollLeft = 0;
            }, 100);
        });

        // Cerrar Modal
        const closeModal = () => {
            hTimelineModal.classList.remove('active');
            document.body.style.overflow = ''; // Restaurar scroll normal de la web
        };

        closeBtn.addEventListener('click', closeModal);
        
        // Cerrar al pulsar Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && hTimelineModal.classList.contains('active')) {
                closeModal();
            }
        });

        // 1. Mapear Rueda del Mouse (Vertical Scroll) a Desplazamiento Horizontal (Ultrasuave)
        track.addEventListener('wheel', (e) => {
            e.preventDefault();
            track.scrollLeft += e.deltaY * 1.5;
        }, { passive: false });

        // 2. Soporte de Arrastre con Mouse para Escritorio (Mouse Drag Scroll)
        let isDragActive = false;
        let dragStartX;
        let scrollStartX;

        track.addEventListener('mousedown', (e) => {
            isDragActive = true;
            dragStartX = e.pageX - track.offsetLeft;
            scrollStartX = track.scrollLeft;
            track.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            if (isDragActive) {
                isDragActive = false;
                track.style.cursor = 'grab';
            }
        });

        track.addEventListener('mouseleave', () => {
            if (isDragActive) {
                isDragActive = false;
                track.style.cursor = 'grab';
            }
        });

        track.addEventListener('mousemove', (e) => {
            if (!isDragActive) return;
            e.preventDefault();
            const x = e.pageX - track.offsetLeft;
            const walk = (x - dragStartX) * 1.5; // Multiplicador de sensibilidad de arrastre
            track.scrollLeft = scrollStartX - walk;
        });
    }

    // ==========================================
    // 10. CARGA DINÁMICA DE SERVICIOS (SQLite API)
    // ==========================================
    async function loadDynamicServices() {
        const container = document.getElementById('services-categories-container');
        if (!container) return;

        const isEn = (typeof currentLanguage !== 'undefined' ? currentLanguage : (localStorage.getItem('lang') || 'es')) === 'en';

        try {
            const response = await fetch('/api/services');
            if (!response.ok) throw new Error('Error al obtener servicios de la base de datos');
            const categories = await response.json();

            // Mapeo de nombres estéticos de categorías
            const categoryTitlesEn = {
                mirada: 'Signature Eye & Lash Design',
                micropigmentacion: 'Signature Micropigmentation',
                faciales: 'Clinical Skin Care',
                unas: 'Luxury Nails'
            };
            const categoryTitlesEs = {
                mirada: 'Diseño de Mirada',
                micropigmentacion: 'Micropigmentación de Autor',
                faciales: 'Cuidado Clínico de la Piel',
                unas: 'Aplicaciones de Uñas de Lujo'
            };

            let htmlContent = '';

            for (const [catKey, services] of Object.entries(categories)) {
                if (!services || services.length === 0) continue;

                const catTitle = isEn ? (categoryTitlesEn[catKey] || catKey) : (categoryTitlesEs[catKey] || catKey);
                
                htmlContent += `
                    <div class="services-category-block glass-panel collapsed" data-category="${catKey}" style="margin-bottom: 2rem; overflow: hidden; border-radius: 8px; border: 1px solid rgba(197, 160, 89, 0.15); transition: border-color 0.4s ease;">
                        <div class="category-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 1.8rem 2.2rem; background: rgba(0, 0, 0, 0.4); user-select: none; transition: background 0.3s ease;">
                            <h3 class="category-title" style="margin: 0; font-family: var(--font-serif); font-size: 1.5rem; color: #ffffff; letter-spacing: 0.05em; font-weight: 300; display: flex; align-items: center; gap: 1rem;">
                                ${catTitle}
                            </h3>
                            <span class="category-chevron" style="color: var(--brushed-gold); font-size: 0.9rem; transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1); transform: rotate(0deg);">▼</span>
                        </div>
                        <div class="services-list" style="max-height: 0; overflow: hidden; transition: max-height 0.6s cubic-bezier(0.25, 1, 0.5, 1); padding: 0 2.2rem;">
                            <div style="height: 1.5rem;"></div> <!-- Spacing inside collapsed container -->
                `;

                services.forEach(service => {
                    const s = { ...service };
                    const translation = (typeof TRANSLATIONS_SERVICES !== 'undefined' && TRANSLATIONS_SERVICES[s.id]) ? TRANSLATIONS_SERVICES[s.id] : null;
                    if (isEn && translation) {
                        s.title = translation.title || s.title;
                        s.description = translation.description || s.description;
                        s.price = translation.price || s.price;
                        s.duration = translation.duration || s.duration;
                        s.frequency = translation.frequency || s.frequency;
                    }

                    // Generar etiquetas de precios dinámicas
                    let priceTagsHtml = '';
                    const priceStr = s.price || '';
                    
                    if (s.id === 'ceja-hiperrealista' || priceStr.toLowerCase().includes('valoración gratis') || priceStr.toLowerCase().includes('free assessment')) {
                        if (isEn) {
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">Assessment</span>
                                    <span>Free</span>
                                </div>
                                <div class="price-tag">
                                    <span class="price-label">Design</span>
                                    <span>$3,500</span>
                                </div>
                            `;
                        } else {
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">Valoración</span>
                                    <span>Gratis</span>
                                </div>
                                <div class="price-tag">
                                    <span class="price-label">Diseño</span>
                                    <span>$3,500</span>
                                </div>
                            `;
                        }
                    } else {
                        const parenMatch = priceStr.match(/^\s*(\$[\d,]+)\s*\(([^)]+)\)\s*$/);
                        if (parenMatch) {
                            const val = parenMatch[1];
                            const label = parenMatch[2];
                            
                            let translatedLabel = label;
                            if (isEn) {
                                if (label.toLowerCase() === 'aplicación') translatedLabel = 'Application';
                                else if (label.toLowerCase() === 'mantenimiento') translatedLabel = 'Maintenance';
                                else if (label.toLowerCase() === 'retoque') translatedLabel = 'Touch-up';
                                else if (label.toLowerCase() === 'sesión') translatedLabel = 'Session';
                            }
                            
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">${translatedLabel}</span>
                                    <span>${val}</span>
                                </div>
                            `;
                            
                            // Añadir precio de mantenimiento para las categorías específicas
                            if (s.id === 'unas-esculturales' || s.id === 'poligel-premium' || s.id === 'soft-gel') {
                                priceTagsHtml += `
                                    <div class="price-tag">
                                        <span class="price-label">${isEn ? 'Maintenance' : 'Mantenimiento'}</span>
                                        <span>$450</span>
                                    </div>
                                `;
                            } else if (s.id === 'ruber-base') {
                                priceTagsHtml += `
                                    <div class="price-tag">
                                        <span class="price-label">${isEn ? 'Maintenance' : 'Mantenimiento'}</span>
                                        <span>$250</span>
                                    </div>
                                `;
                            }
                        } else if (priceStr.startsWith('$')) {
                            const defaultLabel = s.category === 'unas' ? (isEn ? 'Application' : 'Aplicación') : (isEn ? 'Session' : 'Sesión');
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">${defaultLabel}</span>
                                    <span>${priceStr}</span>
                                </div>
                            `;
                        } else {
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">${isEn ? 'Price' : 'Precio'}</span>
                                    <span>${priceStr}</span>
                                </div>
                            `;
                        }
                    }

                    // Generar meta pills dinámicos
                    let pillsHtml = '';
                    if (s.id === 'ceja-hiperrealista') {
                        pillsHtml += `<span class="meta-pill">✦ ${isEn ? 'Organic Technique' : 'Técnica Orgánica'}</span>`;
                        pillsHtml += `<span class="meta-pill">⏱ 2.5 Hrs</span>`;
                    } else {
                        if (s.duration) {
                            const dur = s.duration.split('(')[0].trim();
                            pillsHtml += `<span class="meta-pill">⏱ ${dur}</span>`;
                        }
                        if (s.frequency) {
                            let freq = s.frequency.toLowerCase();
                            if (isEn) {
                                if (freq.includes('cada')) {
                                    freq = freq.split('cada')[1].trim();
                                    freq = `Every ${freq}`;
                                } else if (freq.includes('recomendado')) {
                                    freq = freq.replace('recomendado', '').trim();
                                    freq = `${freq} recommended`;
                                }
                            } else {
                                if (freq.includes('cada')) {
                                    freq = freq.split('cada')[1].trim();
                                } else if (freq.includes('recomendado')) {
                                    freq = freq.replace('recomendado', '').trim();
                                }
                                freq = freq.charAt(0).toUpperCase() + freq.slice(1);
                            }
                            pillsHtml += `<span class="meta-pill">🗓 ${freq}</span>`;
                        }
                    }

                    htmlContent += `
                        <a href="servicio.html?id=${s.id}" class="service-item">
                            <div class="service-main-row">
                                <h4 class="service-item-name">${s.title}</h4>
                                <div class="service-dots"></div>
                                <div class="service-prices">
                                    ${priceTagsHtml}
                                </div>
                            </div>
                            <div class="service-details">
                                <p class="service-description">${s.description}</p>
                                <div class="service-meta-info">
                                    ${pillsHtml}
                                </div>
                            </div>
                        </a>
                    `;
                });

                htmlContent += `
                            <div style="height: 1.5rem;"></div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = htmlContent;

            // Configurar los acordeones desplegables
            document.querySelectorAll('.services-category-block').forEach(block => {
                const header = block.querySelector('.category-header');
                const list = block.querySelector('.services-list');
                const chevron = block.querySelector('.category-chevron');

                // Hover style enhancements
                header.addEventListener('mouseenter', () => {
                    header.style.background = 'rgba(197, 160, 89, 0.06)';
                });
                header.addEventListener('mouseleave', () => {
                    header.style.background = 'rgba(0, 0, 0, 0.4)';
                });
                
                header.addEventListener('click', () => {
                    const isCollapsed = block.classList.contains('collapsed');
                    
                    if (isCollapsed) {
                        block.classList.remove('collapsed');
                        block.style.borderColor = 'rgba(197, 160, 89, 0.4)';
                        list.style.maxHeight = (list.scrollHeight + 50) + 'px';
                        chevron.style.transform = 'rotate(180deg)';
                    } else {
                        block.classList.add('collapsed');
                        block.style.borderColor = 'rgba(197, 160, 89, 0.15)';
                        list.style.maxHeight = '0px';
                        chevron.style.transform = 'rotate(0deg)';
                    }
                });
            });

        } catch (error) {
            console.error('[Services Dynamic Loading Error]', error);
            container.innerHTML = `
                <div class="glass-panel" style="padding: 2rem; text-align: center; color: var(--brushed-gold);">
                    <p>${isEn ? 'Sorry, we could not load the services catalog at this moment.' : 'Lo sentimos, no pudimos cargar el catálogo de servicios en este momento.'}</p>
                </div>
            `;
        }
    }

    loadDynamicServices();

    // ==========================================
    // 11. MENÚ MÓVIL DESPLEGABLE (HAMBURGER TOGGLE)
    // ==========================================
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenuDrawer = document.querySelector('.mobile-menu-drawer');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link, .mobile-cta-btn');

    if (mobileMenuToggle && mobileMenuDrawer) {
        // Abrir/Cerrar Menú al hacer click en el botón hamburguesa
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenuToggle.classList.toggle('active');
            mobileMenuDrawer.classList.toggle('active');
            document.body.classList.toggle('body-no-scroll');
        });

        // Cerrar Menú al hacer click en cualquier enlace o botón dentro del drawer
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                mobileMenuDrawer.classList.remove('active');
                document.body.classList.remove('body-no-scroll');
            });
        });

        // Cerrar Menú al hacer click fuera del drawer
        document.addEventListener('click', (e) => {
            if (mobileMenuDrawer.classList.contains('active') && 
                !mobileMenuDrawer.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                mobileMenuDrawer.classList.remove('active');
                document.body.classList.remove('body-no-scroll');
            }
        });
    }

    // ==========================================
    // 12. MAPA INTERACTIVO DINÁMICO (TOGGLE ON CLICK)
    // ==========================================
    const addressLink = document.getElementById('address-link-home');
    const mapContainer = document.getElementById('contact-map-container');
    const mapIframe = document.getElementById('contact-map-iframe');

    if (addressLink && mapContainer && mapIframe) {
        addressLink.addEventListener('click', (e) => {
            e.preventDefault(); // Evita redirigir a una página externa
            const mapUrl = "https://maps.google.com/maps?q=Calle%20Francia%20140-B,%20Col%20Versalles,%20Puerto%20Vallarta,%20Jalisco,%20C.P.%2048310&t=&z=16&ie=UTF8&iwloc=&output=embed";
            
            if (mapContainer.style.display === 'none' || mapContainer.style.height === '0px' || mapContainer.style.height === '') {
                if (!mapIframe.getAttribute('src')) {
                    mapIframe.setAttribute('src', mapUrl);
                }
                mapContainer.style.display = 'block';
                // Forzar reflujo
                mapContainer.offsetHeight;
                mapContainer.style.height = '260px';
                mapContainer.style.opacity = '1';
                
                // Hacer scroll suave al contenedor para que sea visible
                setTimeout(() => {
                    mapContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 200);
            } else {
                mapContainer.style.height = '0px';
                mapContainer.style.opacity = '0';
                setTimeout(() => {
                    mapContainer.style.display = 'none';
                }, 500);
            }
        });
    }

    // ==========================================
    // 13. IDIOMAS Y TRADUCCIONES
    // ==========================================
    function translateBookingSelect(isEn) {
        const select = document.getElementById('booking-service');
        if (!select) return;

        const optgroups = select.querySelectorAll('optgroup');
        if (optgroups.length >= 3) {
            optgroups[0].label = isEn ? "Premium Nails" : "Uñas Premium";
            optgroups[1].label = isEn ? "Clinical Facials" : "Faciales Clínicos";
            optgroups[2].label = isEn ? "Eyes & Lashes" : "Mirada & Pestañas";
        }

        const placeholder = select.querySelector('option[value=""]');
        if (placeholder) {
            placeholder.textContent = isEn ? "Select an Elite Experience" : "Seleccione una Experiencia Elite";
        }

        const optionsMap = {
            "Uñas Esculturales (Aplicación)": { es: "Uñas Esculturales - Aplicación ($650)", en: "Sculptured Nails - Application ($650)" },
            "Uñas Esculturales (Mantenimiento)": { es: "Uñas Esculturales - Mantenimiento ($450)", en: "Sculptured Nails - Maintenance ($450)" },
            "Poligel Premium (Aplicación)": { es: "Poligel Premium - Aplicación ($650)", en: "Premium Poligel - Application ($650)" },
            "Soft Gel (Aplicación)": { es: "Soft Gel - Aplicación ($650)", en: "Soft Gel - Application ($650)" },
            "Ruber Base (Aplicación)": { es: "Ruber Base - Aplicación ($350)", en: "Ruber Base - Application ($350)" },
            "Gel Semipermanente": { es: "Gel Semipermanente ($250)", en: "Gel Polish ($250)" },
            "Tratamiento Vitamina E": { es: "Tratamiento Vitamina E ($150)", en: "Vitamin E Treatment ($150)" },
            "Facial Limpieza Profunda": { es: "Facial Limpieza Profunda ($800)", en: "Deep Facial Cleansing ($800)" },
            "Facial Hidratante": { es: "Facial Hidratante ($1,200)", en: "Hydrating Facial ($1,200)" },
            "Facial Despigmentante": { es: "Facial Despigmentante ($1,200)", en: "Depigmenting Facial ($1,200)" },
            "Facial Anti-Edad Premium": { es: "Facial Anti-Edad Premium ($1,300)", en: "Premium Anti-Aging Facial ($1,300)" },
            "Plasma Fibroblast": { es: "Plasma Fibroblast (Valoración Gratis)", en: "Plasma Fibroblast (Free Assessment)" },
            "Micropigmentación de Cejas": { es: "Valoración Micropigmentación Cejas (Gratis)", en: "Eyebrow Micropigmentation Assessment (Free)" },
            "Aquarela Lips": { es: "Valoración Aquarela Lips (Gratis)", en: "Aquarela Lips Assessment (Free)" },
            "Full Lips": { es: "Valoración Full Lips (Gratis)", en: "Full Lips Assessment (Free)" },
            "Eyeliner": { es: "Valoración Eyeliner (Gratis)", en: "Eyeliner Assessment (Free)" },
            "Diseño & Perfilado de Cejas": { es: "Diseño & Perfilado de Cejas ($250)", en: "Eyebrow Design & Shaping ($250)" },
            "Planchado de Cejas": { es: "Planchado de Cejas ($350)", en: "Eyebrow Grooming / Straightening ($350)" },
            "Laminación de Cejas": { es: "Laminación de Cejas ($350)", en: "Eyebrow Lamination ($350)" },
            "Cejas HD": { es: "Cejas HD ($250)", en: "HD Eyebrows ($250)" },
            "Lifting de Pestañas": { es: "Lifting de Pestañas ($450)", en: "Lash Lift ($450)" },
            "Extensión de Pestañas Clásica": { es: "Extensión Pestañas Clásica ($650)", en: "Classic Lash Extensions ($650)" },
            "Extensión de Pestañas Volumen Soft": { es: "Extensión Pestañas Volumen Soft ($750)", en: "Soft Volume Lash Extensions ($750)" },
            "Extensión de Pestañas Volumen Intense": { es: "Extensión Pestañas Volumen Intense ($850)", en: "Intense Volume Lash Extensions ($850)" },
            "Extensión de Pestañas Volumen Ruso": { es: "Extensión Pestañas Volumen Ruso ($800)", en: "Mega Volume Lash Extensions ($800)" }
        };

        const optgroupsMap = {
            "optgroup-mirada": { es: "Diseño de Mirada", en: "Eye & Lash Design" },
            "optgroup-micropigmentacion": { es: "Micropigmentación de Autor", en: "Signature Micropigmentation" }
        };

        select.querySelectorAll('option').forEach(opt => {
            const val = opt.value;
            if (optionsMap[val]) {
                opt.textContent = isEn ? optionsMap[val].en : optionsMap[val].es;
            }
        });

        select.querySelectorAll('optgroup').forEach(group => {
            const i18nLabel = group.getAttribute('data-i18n-label');
            if (i18nLabel && optgroupsMap[i18nLabel]) {
                group.label = isEn ? optgroupsMap[i18nLabel].en : optgroupsMap[i18nLabel].es;
            }
        });
    }

    // Traducir formulario inicialmente
    const initialIsEn = (typeof currentLanguage !== 'undefined' ? currentLanguage : (localStorage.getItem('lang') || 'es')) === 'en';
    translateBookingSelect(initialIsEn);
    updateSubmitButtonText();

    // Escuchar el cambio de idioma
    window.addEventListener('languageChanged', (e) => {
        const lang = e.detail.language;
        const isEn = lang === 'en';
        translateBookingSelect(isEn);
        updateSubmitButtonText();
        loadDynamicServices();
        initHeroSlideshow();
        loadCarouselVideos();
    });

    // ==========================================
    // 12. LOGICA DEL RECOMENDADOR DE BELLEZA IA (¡NUEVO!)
    // ==========================================
    const aiForm = document.getElementById('ai-advisor-form');
    if (aiForm) {
        aiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const isEn = (typeof currentLanguage !== 'undefined' ? currentLanguage : (localStorage.getItem('lang') || 'es')) === 'en';
            const name = document.getElementById('ai-name').value.trim();
            const contact = document.getElementById('ai-contact').value.trim();
            const goals = document.getElementById('ai-goals').value.trim();
            
            const resultContainer = document.getElementById('ai-result-container');
            const loadingBox = document.getElementById('ai-loading-box');
            const recCard = document.getElementById('ai-rec-card');
            
            // Mostrar contenedor y spinner
            resultContainer.style.display = 'block';
            loadingBox.style.display = 'block';
            recCard.style.display = 'none';
            
            // Scroll suave hacia los resultados
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Simular análisis inteligente de visagismo
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            // Algoritmo de recomendación fisonómica
            const goalsLower = goals.toLowerCase();
            let recId = 'ceja-hiperrealista'; // Default
            
            if (goalsLower.includes('uñas') || goalsLower.includes('nails') || goalsLower.includes('manos') || goalsLower.includes('poligel') || goalsLower.includes('gel')) {
                recId = 'unas-esculturales';
            } else if (goalsLower.includes('hidratar') || goalsLower.includes('hidratación') || goalsLower.includes('seca')) {
                recId = 'facial-hidratante';
            } else if (goalsLower.includes('limpieza') || goalsLower.includes('acné') || goalsLower.includes('granitos') || goalsLower.includes('puntos negros')) {
                recId = 'facial-limpieza';
            } else if (goalsLower.includes('manchas') || goalsLower.includes('tono') || goalsLower.includes('despigmentar') || goalsLower.includes('aclarar')) {
                recId = 'facial-despigmentante';
            } else if (goalsLower.includes('arrugas') || goalsLower.includes('edad') || goalsLower.includes('rejuvenecer') || goalsLower.includes('colágeno') || goalsLower.includes('flacidez')) {
                recId = 'facial-antiedad';
            } else if (goalsLower.includes('labios') || goalsLower.includes('lips') || goalsLower.includes('boca') || goalsLower.includes('aquarela')) {
                recId = 'aquarela-lips';
            } else if (goalsLower.includes('pestañas') || goalsLower.includes('lashes') || goalsLower.includes('lifting') || goalsLower.includes('rímel')) {
                if (goalsLower.includes('volumen') || goalsLower.includes('extensiones')) {
                    recId = 'pestanas-volumen-soft';
                } else {
                    recId = 'lifting-pestanas';
                }
            } else if (goalsLower.includes('eyeliner') || goalsLower.includes('delineado') || goalsLower.includes('ojos')) {
                recId = 'eyeliner';
            } else if (goalsLower.includes('cejas') || goalsLower.includes('brows') || goalsLower.includes('microblading') || goalsLower.includes('pelo a pelo')) {
                if (goalsLower.includes('laminación') || goalsLower.includes('laminado') || goalsLower.includes('laminacion')) {
                    recId = 'laminacion-cejas';
                } else {
                    recId = 'ceja-hiperrealista';
                }
            }

            // Consultar datos reales de la API
            try {
                const response = await fetch(`/api/services/${recId}`);
                if (!response.ok) throw new Error('Error al consultar servicio recomendado');
                const serviceData = await response.json();
                
                const translation = (typeof TRANSLATIONS_SERVICES !== 'undefined' && TRANSLATIONS_SERVICES[recId]) ? TRANSLATIONS_SERVICES[recId] : null;
                const recTitle = isEn && translation ? (translation.title || serviceData.title) : serviceData.title;
                const recDesc = isEn && translation ? (translation.description || serviceData.description) : serviceData.description;
                const recPrice = isEn && translation ? (translation.price || serviceData.price) : serviceData.price;
                
                // Actualizar interfaz
                document.getElementById('ai-rec-service-title').textContent = recTitle;
                document.getElementById('ai-rec-service-desc').textContent = recDesc;
                document.getElementById('ai-rec-service-price').textContent = recPrice;
                
                // Enviar lead al backend
                try {
                    await fetch('/api/leads', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name,
                            contact,
                            goals,
                            recommended_service: recTitle
                        })
                    });
                } catch (leadErr) {
                    console.error('Error al guardar lead:', leadErr);
                }
                
                // Configurar botón de WhatsApp
                const whatsappMsg = isEn ?
                    `✨ *DELINEARTE - AI BEAUTY INQUIRY* ✨\n\n` +
                    `👑 *Name:* ${name}\n` +
                    `📞 *Contact:* ${contact}\n` +
                    `🎯 *Goal:* ${goals}\n\n` +
                    `💡 *AI Recommended Service:* ${recTitle} (${recPrice})\n\n` +
                    `✨ _I want to schedule a session/consultation for this treatment._` :
                    
                    `✨ *DELINEARTE - CONSULTA DE ASESORA IA* ✨\n\n` +
                    `👑 *Nombre:* ${name}\n` +
                    `📞 *Contacto:* ${contact}\n` +
                    `🎯 *Objetivo:* ${goals}\n\n` +
                    `💡 *Servicio Recomendado por IA:* ${recTitle} (${recPrice})\n\n` +
                    `✨ _Deseo agendar una sesión/valoración para este tratamiento._`;
                
                const whatsappBtn = document.getElementById('ai-whatsapp-btn');
                whatsappBtn.href = `https://wa.me/${CONFIG.whatsappPhone}?text=${encodeURIComponent(whatsappMsg)}`;
                
                // Ocultar carga y mostrar resultado
                loadingBox.style.display = 'none';
                recCard.style.display = 'block';
                
            } catch (err) {
                console.error(err);
                loadingBox.style.display = 'none';
                alert(isEn ? 'Sorry, we could not generate a recommendation at this moment. Please contact us via WhatsApp.' : 'Lo sentimos, no pudimos generar una recomendación en este momento. Por favor contáctanos directamente por WhatsApp.');
            }
        });
    }

    // ==========================================
    // 11. MODAL DE RETENCIÓN DE USUARIO (EXIT-INTENT & INACTIVIDAD) (¡NUEVO!)
    // ==========================================
    const retentionModal = document.getElementById('retention-tutorial-modal');
    const retentionClose = document.querySelector('.retention-close-btn');
    const retentionVideo = document.getElementById('retention-video');
    
    if (retentionModal && retentionClose) {
        let hasShown = false;
        let idleTimer = null;
        const IDLE_TIME_MS = 45000; // 45 segundos de inactividad

        // Función para abrir el modal
        const showRetentionModal = () => {
            if (hasShown) return;
            hasShown = true;
            
            // Detener el temporizador de inactividad
            clearTimeout(idleTimer);
            stopTrackingActivity();
            
            // Mostrar modal
            retentionModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Reproducir video automáticamente
            if (retentionVideo) {
                retentionVideo.currentTime = 0;
                retentionVideo.play().catch(err => {
                    console.log('Auto-play blocked by browser policy, waiting for user click.');
                });
            }
        };

        // Función para cerrar el modal
        const closeRetentionModal = () => {
            retentionModal.style.display = 'none';
            document.body.style.overflow = '';
            if (retentionVideo) {
                retentionVideo.pause();
            }
        };

        retentionClose.addEventListener('click', closeRetentionModal);
        
        // Cerrar al pulsar Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && retentionModal.style.display === 'flex') {
                closeRetentionModal();
            }
        });

        // 1. Detectar Exit-Intent (El cursor sale por la parte superior)
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY < 20) {
                showRetentionModal();
            }
        });

        // 1b. Interceptar Botón de Atrás / Gesto de Deslizar para salir en Teléfonos (Android / iOS) (¡NUEVO!)
        if (window.history && window.history.pushState) {
            // Empujar un estado inicial en el historial para retener la navegación
            window.history.pushState({ retentionActive: true }, '');
            
            window.addEventListener('popstate', (e) => {
                if (!hasShown) {
                    // Re-inyectamos el estado de retención para que no se salga de la página
                    window.history.pushState({ retentionActive: true }, '');
                    showRetentionModal();
                }
            });
        }

        // 2. Detectar Inactividad (Idle)
        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            if (!hasShown) {
                idleTimer = setTimeout(showRetentionModal, IDLE_TIME_MS);
            }
        };

        // Escuchar eventos del usuario para reiniciar el temporizador de inactividad
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const startTrackingActivity = () => {
            activityEvents.forEach(evt => {
                document.addEventListener(evt, resetIdleTimer, true);
            });
            resetIdleTimer();
        };

        const stopTrackingActivity = () => {
            activityEvents.forEach(evt => {
                document.removeEventListener(evt, resetIdleTimer, true);
            });
        };

        // Iniciar rastreo de actividad
        startTrackingActivity();

        // Exponer globalmente la función de cerrar y enfocar para el botón de acción
        window.closeRetentionModalAndFocus = () => {
            closeRetentionModal();
            
            const aiSection = document.getElementById('ai-advisor-form');
            if (aiSection) {
                aiSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    const nameInput = document.getElementById('ai-name');
                    if (nameInput) nameInput.focus();
                }, 800);
            }
        };
    }
});

