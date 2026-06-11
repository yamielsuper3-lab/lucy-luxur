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

    // Cambiar dinámicamente el botón de envío según método de pago
    if (paymentMethodSelect && submitBtn) {
        paymentMethodSelect.addEventListener('change', () => {
            if (paymentMethodSelect.value === 'stripe') {
                submitBtn.innerHTML = '<span>Proceder al Pago Seguro</span> 💳';
            } else {
                submitBtn.innerHTML = '<span>Reservar por WhatsApp</span> 👑';
            }
        });
    }

    // Gestionar servicios gratuitos (no requieren pago en línea)
    if (serviceSelect && paymentMethodSelect) {
        serviceSelect.addEventListener('change', () => {
            const stripeOption = paymentMethodSelect.querySelector('option[value="stripe"]');
            const freeServices = ['Micropigmentación de Cejas', 'Plasma Fibroblast', 'Aquarela Lips', 'Full Lips', 'Eyeliner'];
            if (freeServices.includes(serviceSelect.value)) {
                paymentMethodSelect.value = 'whatsapp';
                if (stripeOption) stripeOption.disabled = true;
                if (submitBtn) submitBtn.innerHTML = '<span>Reservar por WhatsApp</span> 👑';
            } else {
                if (stripeOption) stripeOption.disabled = false;
                paymentMethodSelect.value = 'stripe';
                if (submitBtn) submitBtn.innerHTML = '<span>Proceder al Pago Seguro</span> 💳';
            }
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
            
            // Obtener valores del formulario
            const name = document.getElementById('booking-name').value.trim();
            const phone = document.getElementById('booking-phone').value.trim();
            const service = serviceSelect.value;
            const date = document.getElementById('booking-date').value;
            const time = document.getElementById('booking-time').value;
            const notes = document.getElementById('booking-notes').value.trim() || 'Sin notas adicionales';
            const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'stripe';
            
            // Validaciones básicas
            if (!name || !phone || !service || !date || !time) {
                alert('Por favor, rellene todos los campos obligatorios para su reserva.');
                return;
            }
            
            if (paymentMethod === 'stripe') {
                // FLUJO STRIPE (PAGO EN LÍNEA)
                if (submitBtn) {
                    submitBtn.innerHTML = '<span>Iniciando Pago Seguro...</span>';
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.7';
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
                        submitBtn.innerHTML = '<span>Redirigiendo a Stripe...</span> 🔒';
                    }
                    window.location.href = data.url;
                } catch (err) {
                    console.error('[Stripe Redirect Error]', err);
                    alert(`Lo sentimos, no pudimos procesar el pago con tarjeta: ${err.message}. Intentando agendar por WhatsApp de respaldo.`);
                    
                    // Volver a habilitar botón
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = '1';
                        submitBtn.innerHTML = '<span>Proceder al Pago Seguro</span> 💳';
                    }
                }
            } else {
                // FLUJO WHATSAPP (AGENDAR Y PAGAR EN SUCURSAL)
                // Obtener código de referido para la comisión
                const referralCode = getActiveReferralCode();
                
                // Generar código único de transacción/lead para validación
                const leadId = 'LL-' + Math.floor(1000 + Math.random() * 9000);
                
                // Formatear mensaje para WhatsApp
                const message = `\u2728 *DELINEARTE - NUEVA RESERVA (SUCURSAL)* \u2728\n\n` +
                                `\uD83D\uDC51 *Cliente:* ${name}\n` +
                                `\uD83D\uDCDE *Tel\u00F3fono:* ${phone}\n` +
                                `\uD83D\uDC85 *Servicio:* ${service}\n` +
                                `\uD83D\uDCC5 *Fecha:* ${date}\n` +
                                `\u23F0 *Hora:* ${time}\n` +
                                `\uD83D\uDCDD *Notas:* ${notes}\n\n` +
                                `---------------------------------\n` +
                                `\uD83D\uDD17 *C\u00F3digo de Lead:* ${leadId}\n` +
                                `\uD83D\uDD16 *Atribuci\u00F3n:* REF-${referralCode}\n` +
                                `\u2728 _Solicitud de cita para pago en boutique_`;
                
                // Codificar el texto para URL
                const encodedText = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${CONFIG.whatsappPhone}?text=${encodedText}`;
                
                if (submitBtn) {
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<span>Generando Enlace...</span>';
                    submitBtn.style.opacity = '0.7';
                    
                    setTimeout(() => {
                        submitBtn.innerHTML = '<span>¡Redirigiendo a WhatsApp!</span>';
                        window.open(whatsappUrl, '_blank');
                        
                        setTimeout(() => {
                            submitBtn.innerHTML = originalText;
                            submitBtn.style.opacity = '1';
                            bookingForm.reset();
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

        try {
            const res = await fetch('/api/hero-slides');
            const slidesData = await res.json();

            if (!slidesData || slidesData.length === 0) return;

            slidesContainer.innerHTML = '';
            paginationContainer.innerHTML = '';

            slidesData.forEach((s, idx) => {
                // Build slide element
                const div = document.createElement('div');
                div.className = 'hero-slide' + (idx === 0 ? ' active' : '');
                div.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.25) 100%), url('${s.image}')`;
                div.style.borderBottom = '1px solid rgba(197,160,89,0.15)';
                div.innerHTML = `
                    <div class="slide-overlay-shade"></div>
                    <div class="slide-content">
                        ${s.subtitle ? `<span class="slide-subtitle">${s.subtitle}</span>` : ''}
                        <h1 class="slide-title">${s.title}</h1>
                        ${s.body ? `<p class="slide-text">${s.body}</p>` : ''}
                        <a href="${s.cta_href || '#servicios'}" class="more-info-link">
                            <div class="arrow-line"></div>
                            <div class="arrow-head"></div>
                            <span class="more-info-text">${s.cta_text || 'Ver Más'}</span>
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

                card.innerHTML = `
                    <div class="card-image-container">
                        ${visualBlock}
                    </div>
                    <div class="card-content-overlay">
                        <span class="card-tag">
                            ${(video.instagram_link && video.instagram_link.trim() !== '') ? instagramIcon : ''}
                            ${video.tag || ''}
                        </span>
                        <h4 class="card-name">${video.name || ''}</h4>
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
                    Error al cargar los reels del carrusel.
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

        try {
            const response = await fetch('/api/services');
            if (!response.ok) throw new Error('Error al obtener servicios de la base de datos');
            const categories = await response.json();

            // Mapeo de nombres estéticos de categorías
            const categoryTitles = {
                mirada: 'Diseño de la Mirada & Micropigmentación',
                faciales: 'Cuidado Clínico de la Piel',
                unas: 'Aplicaciones de Uñas de Lujo'
            };

            let htmlContent = '';

            for (const [catKey, services] of Object.entries(categories)) {
                if (!services || services.length === 0) continue;

                const catTitle = categoryTitles[catKey] || catKey;
                
                htmlContent += `
                    <div class="services-category-block glass-panel">
                        <h3 class="category-title">${catTitle}</h3>
                        <div class="services-list">
                `;

                services.forEach(service => {
                    // Generar etiquetas de precios dinámicas
                    let priceTagsHtml = '';
                    const priceStr = service.price || '';
                    
                    if (service.id === 'ceja-hiperrealista' || priceStr.toLowerCase().includes('valoración gratis')) {
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
                    } else {
                        const parenMatch = priceStr.match(/^\s*(\$[\d,]+)\s*\(([^)]+)\)\s*$/);
                        if (parenMatch) {
                            const val = parenMatch[1];
                            const label = parenMatch[2];
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">${label}</span>
                                    <span>${val}</span>
                                </div>
                            `;
                            
                            // Añadir precio de mantenimiento para las categorías específicas
                            if (service.id === 'unas-esculturales' || service.id === 'poligel-premium' || service.id === 'soft-gel') {
                                priceTagsHtml += `
                                    <div class="price-tag">
                                        <span class="price-label">Mantenimiento</span>
                                        <span>$450</span>
                                    </div>
                                `;
                            } else if (service.id === 'ruber-base') {
                                priceTagsHtml += `
                                    <div class="price-tag">
                                        <span class="price-label">Mantenimiento</span>
                                        <span>$250</span>
                                    </div>
                                `;
                            }
                        } else if (priceStr.startsWith('$')) {
                            const label = service.category === 'unas' ? 'Aplicación' : 'Sesión';
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">${label}</span>
                                    <span>${priceStr}</span>
                                </div>
                            `;
                        } else {
                            priceTagsHtml = `
                                <div class="price-tag">
                                    <span class="price-label">Precio</span>
                                    <span>${priceStr}</span>
                                </div>
                            `;
                        }
                    }

                    // Generar meta pills dinámicos
                    let pillsHtml = '';
                    if (service.id === 'ceja-hiperrealista') {
                        pillsHtml += `<span class="meta-pill">✦ Técnica Orgánica</span>`;
                        pillsHtml += `<span class="meta-pill">⏱ 2.5 Hrs</span>`;
                    } else {
                        if (service.duration) {
                            const dur = service.duration.split('(')[0].trim();
                            pillsHtml += `<span class="meta-pill">⏱ ${dur}</span>`;
                        }
                        if (service.frequency) {
                            let freq = service.frequency.toLowerCase();
                            if (freq.includes('cada')) {
                                freq = freq.split('cada')[1].trim();
                            } else if (freq.includes('recomendado')) {
                                freq = freq.replace('recomendado', '').trim();
                            }
                            freq = freq.charAt(0).toUpperCase() + freq.slice(1);
                            pillsHtml += `<span class="meta-pill">🗓 ${freq}</span>`;
                        }
                    }

                    htmlContent += `
                        <a href="servicio.html?id=${service.id}" class="service-item">
                            <div class="service-main-row">
                                <h4 class="service-item-name">${service.title}</h4>
                                <div class="service-dots"></div>
                                <div class="service-prices">
                                    ${priceTagsHtml}
                                </div>
                            </div>
                            <div class="service-details">
                                <p class="service-description">${service.description}</p>
                                <div class="service-meta-info">
                                    ${pillsHtml}
                                </div>
                            </div>
                        </a>
                    `;
                });

                htmlContent += `
                        </div>
                    </div>
                `;
            }

            container.innerHTML = htmlContent;

        } catch (error) {
            console.error('[Services Dynamic Loading Error]', error);
            container.innerHTML = `
                <div class="glass-panel" style="padding: 2rem; text-align: center; color: var(--brushed-gold);">
                    <p>Lo sentimos, no pudimos cargar el catálogo de servicios en este momento.</p>
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
});

