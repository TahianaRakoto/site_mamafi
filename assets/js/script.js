document.addEventListener('DOMContentLoaded', () => {
    const labels = {
        fr: {
            'nav.home': 'Accueil',
            'nav.about': 'A propos',
            'nav.actions': 'Nos actions',
            'nav.news': 'Actualites',
            'nav.donation': 'Dons',
            'nav.contact': 'Contact',
            'hero.donor': 'Je deviens donateur',
            'hero.volunteer': 'Je deviens benevole',
            'news.title': 'Actualites et contenus',
            'news.all': 'Voir toutes les actualites',
            'donation.methods': 'Moyens de don',
            'donation.formTitle': 'Devenir donateur ou benevole',
            'donation.supportType': 'Je souhaite devenir',
            'donation.donor': 'Donateur',
            'donation.volunteer': 'Benevole',
            'donation.name': 'Nom complet',
            'donation.phone': 'Telephone',
            'donation.message': 'Message',
            'donation.submit': 'Envoyer ma demande',
            'donation.sending': 'Envoi en cours...',
            'donation.success': 'Merci ! Votre demande a bien ete recue.',
            'donation.error': 'Impossible d envoyer le don pour le moment. Contactez-nous directement.',
            'actions.details': 'Details de l action',
            'actions.gallery': 'Images des activites',
            'footer.rights': 'Tous droits reserves.',
            'footer.privacy': 'Politique de confidentialite',
            'footer.legalLink': 'Mentions legales',
            'theme.dark': 'Dark',
            'theme.light': 'Light'
        },
        mg: {
            'nav.home': 'Fandraisana',
            'nav.about': 'Momba anay',
            'nav.actions': 'Asanay',
            'nav.news': 'Vaovao',
            'nav.donation': 'Fanomezana',
            'nav.contact': 'Fifandraisana',
            'hero.donor': 'Ho mpanome',
            'hero.volunteer': 'Ho mpilatsaka an-tsitrapo',
            'news.title': 'Vaovao sy votoaty',
            'news.all': 'Hijery ny vaovao rehetra',
            'donation.methods': 'Fomba fanomezana',
            'donation.formTitle': 'Ho mpanome na mpilatsaka an-tsitrapo',
            'donation.supportType': 'Te ho',
            'donation.donor': 'Mpanome',
            'donation.volunteer': 'Mpilatsaka an-tsitrapo',
            'donation.name': 'Anarana feno',
            'donation.phone': 'Finday',
            'donation.message': 'Hafatra',
            'donation.submit': 'Alefaso ny fangatahana',
            'donation.sending': 'Mandefa...',
            'donation.success': 'Misaotra ! Voaray ny fangatahanao.',
            'donation.error': 'Tsy afaka mandefa izao. Mifandraisa aminay mivantana.',
            'actions.details': 'Antsipirian ny asa',
            'actions.gallery': 'Sary maneho ny asa',
            'footer.rights': 'Zo rehetra voatokana.',
            'footer.privacy': 'Politika tsiambaratelo',
            'footer.legalLink': 'Filazana ara-dalana',
            'theme.dark': 'Maizina',
            'theme.light': 'Mazava'
        },
        en: {
            'nav.home': 'Home',
            'nav.about': 'About us',
            'nav.actions': 'Our work',
            'nav.news': 'News',
            'nav.donation': 'Support us',
            'nav.contact': 'Contact',
            'hero.donor': 'Become a donor',
            'hero.volunteer': 'Become a volunteer',
            'news.title': 'News and stories',
            'news.all': 'View all news',
            'donation.methods': 'Donation methods',
            'donation.formTitle': 'Become a donor or volunteer',
            'donation.supportType': 'I would like to become',
            'donation.donor': 'Donor',
            'donation.volunteer': 'Volunteer',
            'donation.name': 'Full name',
            'donation.phone': 'Phone',
            'donation.message': 'Message',
            'donation.submit': 'Send my request',
            'donation.sending': 'Sending...',
            'donation.success': 'Thank you! Your request has been received.',
            'donation.error': 'Unable to send your request at the moment. Please contact us directly.',
            'actions.details': 'Action details',
            'actions.gallery': 'Activity photos',
            'footer.rights': 'All rights reserved.',
            'footer.privacy': 'Privacy policy',
            'footer.legalLink': 'Legal notice',
            'theme.dark': 'Dark',
            'theme.light': 'Light'
        }
    };

    const languages = ['fr', 'mg', 'en'];
    const state = {
        content: null,
        language: languages.includes(localStorage.getItem('mamafi_language')) ? localStorage.getItem('mamafi_language') : 'fr',
        darkMode: localStorage.getItem('mamafi_dark_mode') === 'true',
        currentHero: 0,
        carouselTimer: null,
        activeActionId: null,
        map: null,
        mapLayer: null
    };

    initHeader();
    initAnimations();
    initControls();
    initBackToTop();
    initDonationForm();
    loadSiteContent();

    function initHeader() {
        const header = document.querySelector('header');
        const headerInfo = document.querySelector('header > div > div:first-child');

        if (headerInfo) {
            headerInfo.classList.add('animate-slide-down');
        }

        if (!header) {
            return;
        }

        function handleScroll() {
            header.classList.toggle('header-scrolled', window.scrollY > 50);
        }

        handleScroll();
        window.addEventListener('scroll', handleScroll);
    }

    function initAnimations() {
        const animatedElements = document.querySelectorAll('.animate-fade-in, .animate-fade-in-up');

        if (!('IntersectionObserver' in window)) {
            animatedElements.forEach((element) => {
                element.style.opacity = 1;
            });
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = 1;
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach((element) => observer.observe(element));
    }

    function initControls() {
        const languageToggle = document.querySelector('#language-toggle');
        const darkToggle = document.querySelector('#dark-toggle');

        languageToggle?.addEventListener('click', () => {
            state.language = languages[(languages.indexOf(state.language) + 1) % languages.length];
            localStorage.setItem('mamafi_language', state.language);
            renderAll();
        });

        darkToggle?.addEventListener('click', () => {
            state.darkMode = !state.darkMode;
            localStorage.setItem('mamafi_dark_mode', String(state.darkMode));
            applyTheme();
        });

        applyTheme();
    }

    async function loadSiteContent() {
        try {
            const response = await fetch('/api/content');
            if (!response.ok) {
                return;
            }

            state.content = await response.json();
            state.activeActionId = state.content.actions?.items?.[0]?.id || null;
            renderAll();
        } catch (error) {
            console.warn('Le backend de contenu est indisponible, contenu statique conserve.', error);
            renderStaticLabels();
        }
    }

    function renderAll() {
        if (!state.content) {
            renderStaticLabels();
            return;
        }

        document.documentElement.lang = state.language;
        applyStyles(state.content.styles || {});
        renderIdentity();
        applyTheme();
        renderStaticLabels();
        renderTextContent();
        renderHero();
        renderAboutImage();
        renderImpact();
        renderActions();
        renderContents();
        renderSocials();
        renderDonationMethods();
        renderPartners();
        renderIntervention();
    }

    function applyStyles(styles) {
        const root = document.documentElement.style;
        if (styles.primaryColor) root.setProperty('--mamafi-primary', styles.primaryColor);
        if (styles.accentColor) root.setProperty('--mamafi-accent', styles.accentColor);
        if (styles.backgroundColor && !state.darkMode) root.setProperty('--mamafi-bg', styles.backgroundColor);
        if (styles.fontFamily) root.setProperty('--mamafi-font', styles.fontFamily);
        if (styles.heroOverlay) root.setProperty('--hero-overlay', styles.heroOverlay);
    }

    function applyTheme() {
        document.body.classList.toggle('dark-mode', state.darkMode);
        const darkToggle = document.querySelector('#dark-toggle');
        if (darkToggle) {
            const label = darkToggle.querySelector('span');
            if (label) label.textContent = state.darkMode ? getLabel('theme.light') : getLabel('theme.dark');
            const icon = darkToggle.querySelector('i, svg');
            if (icon) icon.setAttribute('data-lucide', state.darkMode ? 'sun' : 'moon');
            darkToggle.classList.toggle('active', state.darkMode);
        }
        refreshIcons();
    }

    function renderStaticLabels() {
        document.querySelectorAll('[data-label]').forEach((element) => {
            element.textContent = getLabel(element.dataset.label);
        });

        const languageToggle = document.querySelector('#language-toggle');
        if (languageToggle) {
            const nextLanguage = languages[(languages.indexOf(state.language) + 1) % languages.length];
            const label = languageToggle.querySelector('.language-code');
            if (label) label.textContent = nextLanguage.toUpperCase();
            const flag = languageToggle.querySelector('.flag-icon');
            flag?.classList.remove('flag-fr', 'flag-mg', 'flag-en');
            flag?.classList.add(`flag-${nextLanguage}`);
            const languageNames = { fr: 'français', mg: 'malagasy', en: 'English' };
            const targetLanguage = languageNames[nextLanguage];
            languageToggle.setAttribute('aria-label', `Afficher le site en ${targetLanguage}`);
            languageToggle.setAttribute('title', `Afficher le site en ${targetLanguage}`);
            languageToggle.classList.toggle('active', state.language !== 'fr');
        }

        applyTheme();
    }

    function renderTextContent() {
        document.querySelectorAll('[data-content]').forEach((element) => {
            const value = getByPath(state.content, element.dataset.content);
            if (value !== undefined && value !== null) {
                element.textContent = translate(value);
            }
        });
    }

    function initBackToTop() {
        const button = document.querySelector('#back-to-top');
        if (!button) return;

        const updateVisibility = () => {
            button.classList.toggle('visible', window.scrollY > 500);
        };

        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
    }

    function renderIdentity() {
        const identity = state.content.identity || {};
        document.querySelectorAll('[data-identity-name]').forEach((node) => {
            node.textContent = identity.name || 'MAMAFI';
        });
        document.querySelectorAll('[data-identity-tagline]').forEach((node) => {
            node.textContent = identity.tagline || '';
        });
        document.querySelectorAll('[data-identity-logo]').forEach((image) => {
            image.src = identity.logo || './assets/images/mamafi-logo.png';
            image.alt = `Logo ${identity.name || 'MAMAFI'}`;
        });
    }

    function renderHero() {
        const container = document.querySelector('#hero-images');
        const caption = document.querySelector('#hero-caption');
        const images = state.content.hero?.images || [];

        if (!container || !images.length) {
            return;
        }

        clearInterval(state.carouselTimer);
        state.currentHero = 0;
        container.innerHTML = images.map((image, index) => `
            <div class="hero-carousel-image ${index === 0 ? 'active' : ''}" style="background-image: url('${escapeAttribute(image.url)}'); ${imageBackgroundStyle(image.display)}"></div>
        `).join('');
        updateHeroCaption(caption, images);

        if (images.length > 1) {
            state.carouselTimer = setInterval(() => {
                const nodes = container.querySelectorAll('.hero-carousel-image');
                nodes[state.currentHero]?.classList.remove('active');
                state.currentHero = (state.currentHero + 1) % images.length;
                nodes[state.currentHero]?.classList.add('active');
                updateHeroCaption(caption, images);
            }, 5200);
        }
    }

    function updateHeroCaption(caption, images) {
        if (caption) {
            caption.textContent = translate(images[state.currentHero]?.caption || '');
        }
    }

    function renderAboutImage() {
        const image = document.querySelector('#about-image');
        const caption = document.querySelector('#about-caption');
        const aboutImage = state.content.about?.image;

        if (image && aboutImage?.url) {
            image.src = aboutImage.url;
            image.setAttribute('style', imageStyle(aboutImage.display));
        }
        if (caption) {
            caption.textContent = translate(aboutImage?.caption || '');
        }
    }

    function renderImpact() {
        const container = document.querySelector('#impact-list');
        const items = state.content.impact || [];
        if (!container) return;

        container.innerHTML = items.map((item) => `
            <div class="impact-item">
                <strong class="impact-value">${escapeHtml(item.value)}</strong>
                <span class="impact-label">${escapeHtml(translate(item.label))}</span>
            </div>
        `).join('');
    }

    function renderActions() {
        const container = document.querySelector('#actions-list');
        const actions = state.content.actions?.items || [];

        if (!container) {
            return;
        }

        container.innerHTML = actions.map((item) => `
            <button type="button" class="illustrated-card text-left animate-fade-in-up ${item.id === state.activeActionId ? 'active' : ''}" data-action-id="${escapeAttribute(item.id)}">
                <img src="${escapeAttribute(item.imageUrl || './assets/images/1.jpg')}" alt="${escapeAttribute(translate(item.title))}" class="card-image" style="${imageStyle(item.imageDisplay)}">
                <div class="p-6">
                    <h4 class="text-xl font-semibold mb-3">${escapeHtml(translate(item.title))}</h4>
                    <p class="mb-3">${escapeHtml(translate(item.description))}</p>
                    <p class="image-caption">${escapeHtml(translate(item.caption))}</p>
                </div>
            </button>
        `).join('');

        container.querySelectorAll('[data-action-id]').forEach((button) => {
            button.addEventListener('click', () => {
                state.activeActionId = button.dataset.actionId;
                renderActions();
                document.querySelector('#action-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        renderActionDetail(actions.find((item) => item.id === state.activeActionId) || actions[0]);
    }

    function renderActionDetail(action) {
        const detail = document.querySelector('#action-detail');
        if (!detail || !action) {
            return;
        }

        const gallery = Array.isArray(action.gallery) ? action.gallery : [];
        detail.innerHTML = `
            <figure>
                <img src="${escapeAttribute(action.imageUrl || './assets/images/1.jpg')}" alt="${escapeAttribute(translate(action.title))}" class="action-detail-image" style="${imageStyle(action.imageDisplay)}">
                <figcaption class="image-caption mt-3">${escapeHtml(translate(action.caption))}</figcaption>
            </figure>
            <div>
                <p class="text-mamafi-green font-bold mb-2">${escapeHtml(getLabel('actions.details'))}</p>
                <h4 class="text-3xl font-bold mb-4">${escapeHtml(translate(action.title))}</h4>
                <p class="leading-relaxed mb-6">${escapeHtml(translate(action.details || action.description))}</p>
                <p class="text-mamafi-green font-bold mb-3">${escapeHtml(getLabel('actions.gallery'))}</p>
                <div class="gallery-grid">
                    ${gallery.map((image) => `
                        <figure>
                            <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(translate(image.caption))}" style="${imageStyle(image.display)}">
                            <figcaption class="image-caption p-3">${escapeHtml(translate(image.caption))}</figcaption>
                        </figure>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderContents() {
        const container = document.querySelector('#content-list');
        const contents = state.content.contents || [];

        if (!container) {
            return;
        }

        container.innerHTML = contents.map((item) => `
            <article class="illustrated-card animate-fade-in-up">
                <img src="${escapeAttribute(item.imageUrl || './assets/images/5.jpg')}" alt="${escapeAttribute(translate(item.title))}" class="card-image" style="${imageStyle(item.imageDisplay)}">
                <div class="p-6">
                    <h4 class="text-xl font-semibold mb-3">${escapeHtml(translate(item.title))}</h4>
                    <p class="mb-3">${escapeHtml(translate(item.description))}</p>
                    <p class="image-caption">${escapeHtml(translate(item.caption))}</p>
                </div>
            </article>
        `).join('');
    }

    function renderSocials() {
        const container = document.querySelector('#social-links');
        const socials = state.content.socials || {};
        const names = [
            ['facebook', 'Facebook'],
            ['instagram', 'Instagram'],
            ['youtube', 'YouTube'],
            ['linkedin', 'LinkedIn']
        ];

        if (!container) {
            return;
        }

        container.innerHTML = names
            .filter(([key]) => socials[key])
            .map(([key, label]) => `<a class="social-link" href="${escapeAttribute(socials[key])}" target="_blank" rel="noopener noreferrer"><i data-lucide="${key === 'youtube' ? 'youtube' : key === 'linkedin' ? 'linkedin' : key === 'instagram' ? 'instagram' : 'facebook'}"></i>${label}</a>`)
            .join('');
        refreshIcons();
    }

    function renderDonationMethods() {
        const container = document.querySelector('#donation-methods');
        const methods = state.content.donation?.methods || [];

        if (!container) {
            return;
        }

        container.innerHTML = methods.map((method) => `
            <div class="donation-method">
                ${method.logo ? `<img class="payment-method-logo" src="${escapeAttribute(method.logo)}" alt="Logo ${escapeAttribute(method.name)}">` : '<span class="payment-card-icon" aria-hidden="true">VISA</span>'}
                <div>
                    <strong>${escapeHtml(method.name)}</strong>
                    <span>${escapeHtml(method.details)}</span>
                </div>
            </div>
        `).join('');
    }

    function renderPartners() {
        const container = document.querySelector('#partners-list');
        const partners = state.content.partners?.items || [];
        if (!container) return;

        container.innerHTML = partners.map((partner) => {
            const initials = partner.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
            const content = `
                ${partner.logo
                    ? `<img src="${escapeAttribute(partner.logo)}" alt="Logo ${escapeAttribute(partner.name)}">`
                    : `<span class="partner-placeholder">${escapeHtml(initials)}</span>`}
                <span>${escapeHtml(partner.name)}</span>
            `;
            return partner.url
                ? `<a class="partner-item" href="${escapeAttribute(partner.url)}" target="_blank" rel="noopener noreferrer">${content}</a>`
                : `<div class="partner-item">${content}</div>`;
        }).join('');
    }

    function renderIntervention() {
        const zones = state.content.intervention?.zones || [];
        const list = document.querySelector('#zone-list');
        const mapElement = document.querySelector('#madagascar-map');

        if (list) {
            list.innerHTML = zones.map((zone) => `
                <div class="zone-item">
                    <strong>${escapeHtml(zone.name)}</strong>
                    <span>${escapeHtml(translate(zone.description))}</span>
                </div>
            `).join('');
        }

        if (!mapElement || !window.L) return;

        if (!state.map) {
            state.map = window.L.map(mapElement, {
                scrollWheelZoom: false,
                zoomControl: true
            }).setView([-18.9, 46.8], 5);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 18
            }).addTo(state.map);
            state.mapLayer = window.L.layerGroup().addTo(state.map);
        }

        state.mapLayer.clearLayers();
        const bounds = [];
        const icon = window.L.divIcon({
            className: '',
            html: '<div class="mamafi-map-marker"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        zones.forEach((zone) => {
            const coordinates = [Number(zone.latitude), Number(zone.longitude)];
            if (!Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return;
            bounds.push(coordinates);
            window.L.marker(coordinates, { icon })
                .bindPopup(`<strong>${escapeHtml(zone.name)}</strong><br>${escapeHtml(translate(zone.description))}`)
                .addTo(state.mapLayer);
        });

        if (bounds.length > 1) {
            state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
        } else if (bounds.length === 1) {
            state.map.setView(bounds[0], 7);
        }

        setTimeout(() => state.map.invalidateSize(), 100);
    }

    function initDonationForm() {
        const form = document.querySelector('#donation-form');
        const status = document.querySelector('#donation-status');

        if (!form || !status) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            status.textContent = getLabel('donation.sending');

            const donation = Object.fromEntries(new FormData(form).entries());
            try {
                const response = await fetch('/api/donations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(donation)
                });

                if (!response.ok) {
                    throw new Error('Erreur serveur');
                }

                form.reset();
                status.textContent = getLabel('donation.success');
            } catch (error) {
                status.textContent = getLabel('donation.error');
            }
        });
    }

    function translate(value) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value[state.language] || value.fr || value.mg || value.en || '';
        }
        return value || '';
    }

    function getLabel(key) {
        return labels[state.language]?.[key] || labels.fr[key] || key;
    }

    function getByPath(source, path) {
        return path.split('.').reduce((value, key) => value?.[key], source);
    }

    function escapeHtml(value = '') {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function escapeAttribute(value = '') {
        return escapeHtml(value).replaceAll('`', '&#096;');
    }

    function imageStyle(display = {}) {
        const value = normalizeDisplay(display);
        return `height:${value.height}px;object-position:${value.positionX}% ${value.positionY}%;filter:brightness(${value.brightness}%) contrast(${value.contrast}%) saturate(${value.saturation}%);transform:rotate(${value.rotation}deg);`;
    }

    function imageBackgroundStyle(display = {}) {
        const value = normalizeDisplay(display);
        return `background-position:${value.positionX}% ${value.positionY}%;filter:brightness(${value.brightness}%) contrast(${value.contrast}%) saturate(${value.saturation}%);transform:rotate(${value.rotation}deg) scale(1.08);`;
    }

    function normalizeDisplay(display = {}) {
        return {
            height: Number(display.height) || 240,
            positionX: Number.isFinite(Number(display.positionX)) ? Number(display.positionX) : 50,
            positionY: Number.isFinite(Number(display.positionY)) ? Number(display.positionY) : 50,
            brightness: Number(display.brightness) || 100,
            contrast: Number(display.contrast) || 100,
            saturation: Number.isFinite(Number(display.saturation)) ? Number(display.saturation) : 100,
            rotation: Number(display.rotation) || 0
        };
    }

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
        }
    }
});
