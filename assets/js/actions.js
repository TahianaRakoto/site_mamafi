document.addEventListener('DOMContentLoaded', () => {
    const labels = {
        fr: {
            'nav.home': 'Accueil',
            'nav.about': 'A propos',
            'nav.actions': 'Nos actions',
            'nav.news': 'Actualites',
            'nav.donation': "S'engager",
            all: 'Tous les projets',
            discover: 'Decouvrir le projet',
            objectives: 'Objectifs',
            results: 'Actions et resultats attendus',
            gallery: 'En images',
            location: 'Zone',
            period: 'Periode',
            status: 'Statut',
            close: 'Fermer',
            engagementTitle: 'Agissons ensemble',
            engagementText: 'Soutenez les actions de MAMAFI en devenant donateur ou benevole.',
            engagementButton: "Je m'engage"
        },
        mg: {
            'nav.home': 'Fandraisana',
            'nav.about': 'Momba anay',
            'nav.actions': 'Asanay',
            'nav.news': 'Vaovao',
            'nav.donation': 'Handray anjara',
            all: 'Tetikasa rehetra',
            discover: 'Hijery ny tetikasa',
            objectives: 'Tanjona',
            results: 'Asa sy vokatra andrasana',
            gallery: 'Sary',
            location: 'Faritra',
            period: 'Fotoana',
            status: 'Fivoarana',
            close: 'Hidio',
            engagementTitle: 'Andao hiara-hiasa',
            engagementText: "Tohano ny asan'ny MAMAFI amin'ny maha-mpanome na mpilatsaka an-tsitrapo.",
            engagementButton: 'Handray anjara'
        },
        en: {
            'nav.home': 'Home',
            'nav.about': 'About us',
            'nav.actions': 'Our work',
            'nav.news': 'News',
            'nav.donation': 'Support us',
            all: 'All projects',
            discover: 'Discover the project',
            objectives: 'Objectives',
            results: 'Actions and expected results',
            gallery: 'Gallery',
            location: 'Area',
            period: 'Period',
            status: 'Status',
            close: 'Close',
            engagementTitle: 'Let us act together',
            engagementText: 'Support MAMAFI by becoming a donor or volunteer.',
            engagementButton: 'Get involved'
        }
    };

    const languages = ['fr', 'mg', 'en'];
    const state = {
        content: null,
        language: languages.includes(localStorage.getItem('mamafi_language')) ? localStorage.getItem('mamafi_language') : 'fr',
        darkMode: localStorage.getItem('mamafi_dark_mode') === 'true',
        filter: 'all'
    };

    document.querySelector('#language-toggle')?.addEventListener('click', () => {
        state.language = languages[(languages.indexOf(state.language) + 1) % languages.length];
        localStorage.setItem('mamafi_language', state.language);
        render();
    });
    document.querySelector('#dark-toggle')?.addEventListener('click', () => {
        state.darkMode = !state.darkMode;
        localStorage.setItem('mamafi_dark_mode', String(state.darkMode));
        applyTheme();
    });
    document.querySelector('#close-project-detail')?.addEventListener('click', closeDetail);

    initBackToTop();
    load();

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

    async function load() {
        const response = await fetch('/api/content');
        if (!response.ok) return;
        state.content = await response.json();
        applyStyles();
        render();
        openFromHash();
    }

    function render() {
        if (!state.content) return;
        document.documentElement.lang = state.language;
        applyTheme();
        renderLabels();
        renderIdentity();
        document.querySelector('#projects-page-title').textContent = t(state.content.actions.pageTitle || state.content.actions.title);
        document.querySelector('#projects-breadcrumb').textContent = label('nav.actions');
        document.querySelector('#projects-intro-text').textContent = t(state.content.actions.intro);
        document.querySelector('#engagement-title').textContent = label('engagementTitle');
        document.querySelector('#engagement-text').textContent = label('engagementText');
        document.querySelector('#engagement-button').textContent = label('engagementButton');
        renderFilters();
        renderProjects();
        refreshIcons();
    }

    function renderLabels() {
        document.querySelectorAll('[data-label]').forEach((node) => {
            node.textContent = label(node.dataset.label);
        });
        const languageButton = document.querySelector('#language-toggle');
        const nextLanguage = languages[(languages.indexOf(state.language) + 1) % languages.length];
        languageButton.querySelector('.language-code').textContent = nextLanguage.toUpperCase();
        const flag = languageButton.querySelector('.flag-icon');
        flag.classList.remove('flag-fr', 'flag-mg', 'flag-en');
        flag.classList.add(`flag-${nextLanguage}`);
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
        });
    }

    function renderFilters() {
        const categories = [...new Set((state.content.actions.items || []).map((item) => item.category).filter(Boolean))];
        const filters = [{ value: 'all', label: label('all') }, ...categories.map((category) => ({
            value: category,
            label: category.charAt(0).toUpperCase() + category.slice(1)
        }))];
        const container = document.querySelector('#project-filters');
        container.innerHTML = filters.map((filter) => `
            <button type="button" class="project-filter ${state.filter === filter.value ? 'active' : ''}" data-filter="${esc(filter.value)}">${esc(filter.label)}</button>
        `).join('');
        container.querySelectorAll('[data-filter]').forEach((button) => {
            button.addEventListener('click', () => {
                state.filter = button.dataset.filter;
                renderFilters();
                renderProjects();
            });
        });
    }

    function renderProjects() {
        const items = (state.content.actions.items || []).filter((item) => state.filter === 'all' || item.category === state.filter);
        const container = document.querySelector('#projects-grid');
        container.innerHTML = items.map((item) => `
            <article class="project-card">
                <div class="project-card-media">
                    <img src="${esc(item.imageUrl)}" alt="${esc(t(item.title))}" style="${imageStyle(item.imageDisplay)}">
                    <span class="project-category">${esc(item.category || '')}</span>
                </div>
                <div class="project-card-body">
                    <div class="project-meta">
                        <span><i data-lucide="map-pin"></i>${esc(item.location || '')}</span>
                        <span><i data-lucide="calendar-days"></i>${esc(item.period || '')}</span>
                    </div>
                    <h3>${esc(t(item.title))}</h3>
                    <p>${esc(t(item.description))}</p>
                    <button type="button" class="project-read-more" data-project-id="${esc(item.id)}">
                        ${esc(label('discover'))}<i data-lucide="arrow-right"></i>
                    </button>
                </div>
            </article>
        `).join('');
        container.querySelectorAll('[data-project-id]').forEach((button) => {
            button.addEventListener('click', () => openDetail(button.dataset.projectId));
        });
        refreshIcons();
    }

    function openDetail(id) {
        const item = state.content.actions.items.find((project) => project.id === id);
        if (!item) return;
        location.hash = id;
        const section = document.querySelector('#project-detail-section');
        const container = document.querySelector('#project-detail-page');
        section.classList.remove('hidden');
        container.innerHTML = `
            <div class="project-detail-hero">
                <img src="${esc(item.imageUrl)}" alt="${esc(t(item.title))}" style="${imageStyle(item.imageDisplay)}">
                <div>
                    <span class="project-category">${esc(item.category || '')}</span>
                    <h2>${esc(t(item.title))}</h2>
                    <p>${esc(t(item.details || item.description))}</p>
                </div>
            </div>
            <div class="project-facts">
                ${fact('map-pin', label('location'), item.location)}
                ${fact('calendar-days', label('period'), item.period)}
                ${fact('activity', label('status'), item.status)}
            </div>
            <div class="project-detail-columns">
                <section><h3><i data-lucide="target"></i>${esc(label('objectives'))}</h3><p>${esc(t(item.objectives))}</p></section>
                <section><h3><i data-lucide="chart-no-axes-combined"></i>${esc(label('results'))}</h3><p>${esc(t(item.results))}</p></section>
            </div>
            <h3 class="project-gallery-title">${esc(label('gallery'))}</h3>
            <div class="project-gallery">
                ${(item.gallery || []).map((image) => `
                    <figure><img src="${esc(image.url)}" alt="${esc(t(image.caption))}" style="${imageStyle(image.display)}"><figcaption>${esc(t(image.caption))}</figcaption></figure>
                `).join('')}
            </div>
        `;
        document.querySelector('#close-project-detail span').textContent = label('close');
        refreshIcons();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeDetail() {
        document.querySelector('#project-detail-section').classList.add('hidden');
        history.replaceState(null, '', location.pathname);
    }

    function openFromHash() {
        if (location.hash.length > 1) openDetail(location.hash.slice(1));
    }

    function fact(icon, title, value) {
        return `<div><i data-lucide="${icon}"></i><span>${esc(title)}</span><strong>${esc(value || '-')}</strong></div>`;
    }

    function applyStyles() {
        const styles = state.content.styles || {};
        const root = document.documentElement.style;
        if (styles.primaryColor) root.setProperty('--mamafi-primary', styles.primaryColor);
        if (styles.accentColor) root.setProperty('--mamafi-accent', styles.accentColor);
        if (styles.fontFamily) root.setProperty('--mamafi-font', styles.fontFamily);
    }

    function applyTheme() {
        document.body.classList.toggle('dark-mode', state.darkMode);
        const button = document.querySelector('#dark-toggle');
        button.querySelector('span').textContent = state.darkMode ? 'Light' : 'Dark';
        const icon = button.querySelector('i, svg');
        if (icon) icon.setAttribute('data-lucide', state.darkMode ? 'sun' : 'moon');
        refreshIcons();
    }

    function imageStyle(display = {}) {
        const height = Number(display.height) || 280;
        const x = Number.isFinite(Number(display.positionX)) ? Number(display.positionX) : 50;
        const y = Number.isFinite(Number(display.positionY)) ? Number(display.positionY) : 50;
        const brightness = Number(display.brightness) || 100;
        const contrast = Number(display.contrast) || 100;
        const saturation = Number.isFinite(Number(display.saturation)) ? Number(display.saturation) : 100;
        return `height:${height}px;object-position:${x}% ${y}%;filter:brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%);`;
    }

    function t(value) {
        return value && typeof value === 'object' ? value[state.language] || value.fr || value.mg || value.en || '' : value || '';
    }

    function label(key) {
        return labels[state.language][key] || labels.fr[key] || key;
    }

    function esc(value = '') {
        return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    function refreshIcons() {
        if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
    }
});
