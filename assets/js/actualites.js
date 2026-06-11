document.addEventListener('DOMContentLoaded', () => {
    const labels = {
        fr: {
            'nav.home': 'Accueil',
            'nav.about': 'A propos',
            'nav.actions': 'Nos actions',
            'nav.news': 'Actualites',
            'nav.donation': "S'engager",
            journal: 'Notre journal',
            filter: 'Filtrer les actualites',
            all: 'Toutes les actualites',
            latest: 'A la une de MAMAFI',
            listTitle: 'Toutes nos actualites',
            read: 'Lire la suite',
            featured: 'Actualite a la une',
            close: 'Fermer',
            empty: 'Aucune actualite dans cette categorie.',
            article: 'actualite',
            articles: 'actualites',
            socialTitle: 'Suivez nos actions',
            socialText: "Retrouvez les nouvelles de l'association sur nos reseaux sociaux."
        },
        mg: {
            'nav.home': 'Fandraisana',
            'nav.about': 'Momba anay',
            'nav.actions': 'Asanay',
            'nav.news': 'Vaovao',
            'nav.donation': 'Handray anjara',
            journal: 'Gazetinay',
            filter: 'Sivano ny vaovao',
            all: 'Vaovao rehetra',
            latest: "Vaovao misongadina ao amin'ny MAMAFI",
            listTitle: 'Ny vaovao rehetra',
            read: 'Hamaky bebe kokoa',
            featured: 'Vaovao misongadina',
            close: 'Hidio',
            empty: 'Tsy misy vaovao ato amin’ity sokajy ity.',
            article: 'vaovao',
            articles: 'vaovao',
            socialTitle: 'Araho ny asanay',
            socialText: "Araho amin'ny tambajotra sosialy ny vaovao momba ny fikambanana."
        },
        en: {
            'nav.home': 'Home',
            'nav.about': 'About us',
            'nav.actions': 'Our work',
            'nav.news': 'News',
            'nav.donation': 'Support us',
            journal: 'Our journal',
            filter: 'Filter news',
            all: 'All news',
            latest: 'Latest from MAMAFI',
            listTitle: 'All our news',
            read: 'Read more',
            featured: 'Featured story',
            close: 'Close',
            empty: 'There is no news in this category.',
            article: 'article',
            articles: 'articles',
            socialTitle: 'Follow our work',
            socialText: 'Follow the association news on our social networks.'
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
    document.querySelector('#news-filter')?.addEventListener('change', (event) => {
        state.filter = event.target.value;
        renderArticles();
    });
    document.querySelector('#close-news-detail')?.addEventListener('click', closeDetail);

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
        renderIdentity();
        renderLabels();
        renderFilters();
        renderArticles();
        renderSocials();
        renderPartners();
        refreshIcons();
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

    function renderLabels() {
        document.querySelectorAll('[data-label]').forEach((node) => {
            node.textContent = label(node.dataset.label);
        });
        const news = state.content.news || {};
        document.querySelector('#news-page-title').textContent = t(news.title) || label('nav.news');
        document.querySelector('#news-breadcrumb').textContent = label('nav.news');
        document.querySelector('#news-intro-kicker').textContent = label('journal');
        document.querySelector('#news-intro-text').textContent = t(news.intro);
        document.querySelector('#news-filter-label').textContent = label('filter');
        document.querySelector('#news-list-kicker').textContent = label('latest');
        document.querySelector('#news-list-title').textContent = label('listTitle');
        document.querySelector('#social-title').textContent = label('socialTitle');
        document.querySelector('#social-text').textContent = label('socialText');
        document.querySelector('#news-partners-title').textContent = t(state.content.partners?.title) || 'Nos partenaires';
        document.querySelector('#footer-year').textContent = state.content.footer?.year || new Date().getFullYear();
        document.querySelector('#close-news-detail span').textContent = label('close');

        const languageButton = document.querySelector('#language-toggle');
        const nextLanguage = languages[(languages.indexOf(state.language) + 1) % languages.length];
        languageButton.querySelector('.language-code').textContent = nextLanguage.toUpperCase();
        const flag = languageButton.querySelector('.flag-icon');
        flag.classList.remove('flag-fr', 'flag-mg', 'flag-en');
        flag.classList.add(`flag-${nextLanguage}`);
    }

    function renderFilters() {
        const categories = [...new Set(items().map((item) => item.category).filter(Boolean))];
        const select = document.querySelector('#news-filter');
        select.innerHTML = [
            `<option value="all">${esc(label('all'))}</option>`,
            ...categories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`)
        ].join('');
        select.value = categories.includes(state.filter) ? state.filter : 'all';
        state.filter = select.value;
    }

    function renderArticles() {
        const allItems = items();
        const featured = allItems.find((item) => item.featured) || allItems[0];
        const filtered = allItems.filter((item) => state.filter === 'all' || item.category === state.filter);
        renderFeatured(featured);

        const gridItems = filtered.filter((item) => !featured || item.id !== featured.id || state.filter !== 'all');
        const grid = document.querySelector('#news-grid');
        const empty = document.querySelector('#news-empty');
        grid.innerHTML = gridItems.map(articleCard).join('');
        empty.textContent = label('empty');
        empty.classList.toggle('hidden', gridItems.length > 0);
        document.querySelector('#news-count').textContent = `${filtered.length} ${filtered.length === 1 ? label('article') : label('articles')}`;
        bindArticleButtons();
        refreshIcons();
    }

    function renderFeatured(item) {
        const section = document.querySelector('#featured-news-section');
        const container = document.querySelector('#featured-news');
        if (!item || state.filter !== 'all') {
            section.classList.add('hidden');
            return;
        }
        section.classList.remove('hidden');
        container.innerHTML = `
            <article class="featured-news">
                <div class="featured-news-media">
                    <img src="${esc(item.imageUrl)}" alt="${esc(t(item.title))}" style="${imageStyle(item.imageDisplay)}">
                </div>
                <div class="featured-news-copy">
                    <span class="news-featured-label"><i data-lucide="sparkles"></i>${esc(label('featured'))}</span>
                    <div class="news-meta"><span>${esc(item.category || '')}</span><time>${esc(formatDate(item.date))}</time></div>
                    <h2>${esc(t(item.title))}</h2>
                    <p>${esc(t(item.description))}</p>
                    <button type="button" class="news-read-button" data-news-id="${esc(item.id)}">${esc(label('read'))}<i data-lucide="arrow-right"></i></button>
                </div>
            </article>
        `;
    }

    function articleCard(item) {
        return `
            <article class="news-card">
                <div class="news-card-media">
                    <img src="${esc(item.imageUrl)}" alt="${esc(t(item.title))}" style="${imageStyle(item.imageDisplay)}">
                    <span>${esc(item.category || '')}</span>
                </div>
                <div class="news-card-body">
                    <time><i data-lucide="calendar-days"></i>${esc(formatDate(item.date))}</time>
                    <h3>${esc(t(item.title))}</h3>
                    <p>${esc(t(item.description))}</p>
                    <button type="button" class="news-card-link" data-news-id="${esc(item.id)}">${esc(label('read'))}<i data-lucide="arrow-up-right"></i></button>
                </div>
            </article>
        `;
    }

    function bindArticleButtons() {
        document.querySelectorAll('[data-news-id]').forEach((button) => {
            button.addEventListener('click', () => openDetail(button.dataset.newsId));
        });
    }

    function openDetail(id) {
        const item = items().find((article) => article.id === id);
        if (!item) return;
        location.hash = item.id;
        const section = document.querySelector('#news-detail-section');
        section.classList.remove('hidden');
        document.querySelector('#news-detail').innerHTML = `
            <div class="news-detail-hero">
                <img src="${esc(item.imageUrl)}" alt="${esc(t(item.title))}" style="${imageStyle(item.imageDisplay)}">
                <div class="news-detail-overlay">
                    <div class="news-meta"><span>${esc(item.category || '')}</span><time>${esc(formatDate(item.date))}</time></div>
                    <h2>${esc(t(item.title))}</h2>
                </div>
            </div>
            <div class="news-detail-copy">
                <p class="news-detail-lead">${esc(t(item.description))}</p>
                <p>${esc(t(item.details || item.description))}</p>
                ${t(item.caption) ? `<p class="news-detail-caption"><i data-lucide="camera"></i>${esc(t(item.caption))}</p>` : ''}
            </div>
        `;
        refreshIcons();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeDetail() {
        document.querySelector('#news-detail-section').classList.add('hidden');
        history.replaceState(null, '', location.pathname);
    }

    function openFromHash() {
        if (location.hash.length > 1) openDetail(location.hash.slice(1));
    }

    function renderSocials() {
        const socialData = state.content.socials || {};
        const socialItems = [
            ['facebook', 'Facebook'],
            ['instagram', 'Instagram'],
            ['youtube', 'YouTube'],
            ['linkedin', 'LinkedIn']
        ].filter(([key]) => socialData[key]);
        document.querySelector('#news-social-links').innerHTML = socialItems.map(([key, name]) => `
            <a href="${esc(socialData[key])}" target="_blank" rel="noopener noreferrer" aria-label="${name}">
                <i data-lucide="${key === 'facebook' ? 'facebook' : key === 'youtube' ? 'youtube' : key === 'linkedin' ? 'linkedin' : 'instagram'}"></i>
                <span>${name}</span>
            </a>
        `).join('');
    }

    function renderPartners() {
        const partners = state.content.partners?.items || [];
        document.querySelector('#news-partners').innerHTML = partners.map((partner) => `
            <a class="partner-item" href="${esc(partner.url || '#')}" target="_blank" rel="noopener noreferrer">
                ${partner.logo ? `<img src="${esc(partner.logo)}" alt="${esc(partner.name)}">` : `<span class="partner-placeholder">${esc(initials(partner.name))}</span>`}
                <span>${esc(partner.name)}</span>
            </a>
        `).join('');
    }

    function items() {
        return [...(state.content.contents || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
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
        const x = Number.isFinite(Number(display.positionX)) ? Number(display.positionX) : 50;
        const y = Number.isFinite(Number(display.positionY)) ? Number(display.positionY) : 50;
        const brightness = Number(display.brightness) || 100;
        const contrast = Number(display.contrast) || 100;
        const saturation = Number.isFinite(Number(display.saturation)) ? Number(display.saturation) : 100;
        return `object-position:${x}% ${y}%;filter:brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%);`;
    }

    function formatDate(value) {
        if (!value) return '';
        const locales = { fr: 'fr-FR', mg: 'mg-MG', en: 'en-GB' };
        return new Intl.DateTimeFormat(locales[state.language] || 'fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(`${value}T12:00:00`));
    }

    function initials(value = '') {
        return value.split(/\s+/).slice(0, 2).map((word) => word[0] || '').join('').toUpperCase();
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
