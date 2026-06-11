document.addEventListener('DOMContentLoaded', () => {
    const state = {
        content: null
    };

    const loginPanel = document.querySelector('#login-panel');
    const adminPanel = document.querySelector('#admin-panel');
    const loginForm = document.querySelector('#login-form');
    const contentForm = document.querySelector('#content-form');
    const passwordForm = document.querySelector('#password-form');
    const forgotPasswordForm = document.querySelector('#forgot-password-form');
    const recoveryCodeForm = document.querySelector('#recovery-code-form');
    const status = document.querySelector('#admin-status');
    const passwordStatus = document.querySelector('#password-status');
    const forgotPasswordStatus = document.querySelector('#forgot-password-status');
    const recoveryCodeStatus = document.querySelector('#recovery-code-status');
    const logoutButton = document.querySelector('#logout-admin');

    refreshIcons();
    bindPasswordToggles();
    initBackToTop();

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

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = document.querySelector('#admin-password').value;
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!response.ok) {
            forgotPasswordStatus.textContent = 'Mot de passe administrateur invalide.';
            return;
        }
        loginForm.reset();
        await bootAdmin();
    });

    document.querySelector('#show-forgot-password').addEventListener('click', async () => {
        forgotPasswordForm.classList.toggle('hidden');
        if (!forgotPasswordForm.classList.contains('hidden')) {
            const response = await fetch('/api/admin/recovery/status');
            const result = await response.json();
            forgotPasswordStatus.textContent = result.configured
                ? 'Saisissez votre code de recuperation et un nouveau mot de passe.'
                : 'Aucun code de recuperation n est configure. Connectez-vous pour en creer un ou contactez le responsable du serveur.';
            forgotPasswordForm.querySelector('button[type="submit"]').disabled = !result.configured;
        }
    });

    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        forgotPasswordStatus.textContent = 'Reinitialisation...';
        const recoveryCode = document.querySelector('#recovery-code-login').value;
        const newPassword = document.querySelector('#reset-password').value;
        const response = await fetch('/api/admin/password/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recoveryCode, newPassword })
        });
        const result = await response.json().catch(() => ({ message: 'Erreur.' }));
        forgotPasswordStatus.textContent = result.message;
        if (response.ok) {
            forgotPasswordForm.reset();
            await bootAdmin();
        }
    });

    document.querySelector('#add-hero-image').addEventListener('click', () => {
        state.content.hero.images.push(createImage('./assets/images/1.jpg'));
        renderListEditors();
    });

    document.querySelector('#add-action').addEventListener('click', () => {
        state.content.actions.items.push(createAction());
        renderListEditors();
    });

    document.querySelector('#add-content').addEventListener('click', () => {
        state.content.contents.push(createContentItem());
        renderListEditors();
    });

    document.querySelector('#add-donation-method').addEventListener('click', () => {
        state.content.donation.methods.push(createDonationMethod());
        renderListEditors();
    });

    document.querySelector('#add-partner').addEventListener('click', () => {
        state.content.partners.items.push(createPartner());
        renderListEditors();
    });

    document.querySelector('#add-zone').addEventListener('click', () => {
        state.content.intervention.zones.push(createZone());
        renderListEditors();
    });

    document.querySelector('#add-impact').addEventListener('click', () => {
        state.content.impact.push(createImpact());
        renderListEditors();
    });

    document.querySelector('#reload-content').addEventListener('click', bootAdmin);
    document.querySelector('#refresh-donations').addEventListener('click', loadDonations);

    contentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        collectFormFields();
        setStatus('Enregistrement...');

        const response = await adminFetch('/api/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.content)
        });

        if (!response.ok) {
            setStatus('Impossible d enregistrer. Verifiez le mot de passe.');
            return;
        }

        state.content = await (await adminFetch('/api/content')).json();
        fillFormFields();
        renderListEditors();
        setStatus('Modifications enregistrees.');
    });

    passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        passwordStatus.textContent = 'Modification...';

        const currentPassword = document.querySelector('#current-password').value;
        const newPassword = document.querySelector('#new-password').value;
        const response = await fetch('/api/admin/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erreur.' }));
            passwordStatus.textContent = error.message;
            return;
        }

        passwordForm.reset();
        passwordStatus.textContent = 'Mot de passe modifie.';
    });

    recoveryCodeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        recoveryCodeStatus.textContent = 'Configuration...';
        const recoveryCode = document.querySelector('#new-recovery-code').value;
        const response = await adminFetch('/api/admin/recovery', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recoveryCode })
        });
        const result = await response.json().catch(() => ({ message: 'Erreur.' }));
        recoveryCodeStatus.textContent = result.message;
        if (response.ok) recoveryCodeForm.reset();
    });

    logoutButton.addEventListener('click', async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        state.content = null;
        adminPanel.classList.add('hidden');
        loginPanel.classList.remove('hidden');
        logoutButton.classList.add('hidden');
    });

    bootAdmin();

    async function bootAdmin() {
        setStatus('Chargement...');

        const contentResponse = await adminFetch('/api/content');
        const donationsResponse = await adminFetch('/api/donations');

        if (!contentResponse.ok || !donationsResponse.ok) {
            loginPanel.classList.remove('hidden');
            adminPanel.classList.add('hidden');
            logoutButton.classList.add('hidden');
            setStatus('');
            return;
        }

        state.content = normalizeContent(await contentResponse.json());
        loginPanel.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        ensureEnglishFields();
        fillFormFields();
        renderListEditors();
        bindStaticImagePreview();
        bindImageUploads();
        renderDonations(await donationsResponse.json());
        setStatus('Pret.');
        refreshIcons();
    }

    async function loadDonations() {
        const response = await adminFetch('/api/donations');
        renderDonations(response.ok ? await response.json() : []);
    }

    function fillFormFields() {
        document.querySelectorAll('[data-path]').forEach((field) => {
            field.value = getByPath(state.content, field.dataset.path) || '';
        });
        const logoPreview = document.querySelector('[data-path="identity.logo"]')?.closest('.image-upload-field')?.querySelector('[data-upload-preview]');
        if (logoPreview) logoPreview.src = state.content.identity.logo || './assets/images/mamafi-logo.png';
    }

    function ensureEnglishFields() {
        document.querySelectorAll('[data-path$=".mg"]').forEach((field) => {
            const englishPath = field.dataset.path.replace(/\.mg$/, '.en');
            if (document.querySelector(`[data-path="${englishPath}"]`)) return;

            const wrapper = field.closest('.admin-field');
            if (!wrapper) return;
            const englishWrapper = wrapper.cloneNode(true);
            const englishField = englishWrapper.querySelector('[data-path]');
            const englishLabel = englishWrapper.querySelector('label');
            englishField.dataset.path = englishPath;
            englishField.value = '';
            if (englishLabel) englishLabel.textContent = englishLabel.textContent.replace(/\bMG\b/, 'EN');
            wrapper.insertAdjacentElement('afterend', englishWrapper);
        });
    }

    function collectFormFields() {
        document.querySelectorAll('[data-path]').forEach((field) => {
            setByPath(state.content, field.dataset.path, field.value);
        });
        collectHeroImages();
        collectActions();
        collectContents();
        collectDonationMethods();
        collectPartners();
        collectZones();
        collectImpact();
    }

    function renderListEditors() {
        renderHeroImages();
        renderActions();
        renderContents();
        renderDonationMethods();
        renderPartners();
        renderZones();
        renderImpact();
        bindDynamicImagePreviews();
        bindImageUploads();
        refreshIcons();
    }

    function renderHeroImages() {
        const container = document.querySelector('#hero-images-editor');
        container.innerHTML = state.content.hero.images.map((image, index) => `
            <article class="sub-editor" data-hero-index="${index}">
                <div class="image-admin-layout">
                    ${previewMarkup(image.url, image.display)}
                    <div class="admin-grid md:grid-cols-3 flex-1">
                    <div class="admin-field">
                        <label>Fichier image</label>
                        ${uploadFieldMarkup('url', image.url)}
                    </div>
                    <div class="admin-field">
                        <label>Legende FR</label>
                        <input data-field="caption.fr" value="${escapeHtml(image.caption.fr)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Legende MG</label>
                        <input data-field="caption.mg" value="${escapeHtml(image.caption.mg)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Legende EN</label>
                        <input data-field="caption.en" value="${escapeHtml(image.caption.en)}" type="text">
                    </div>
                    </div>
                </div>
                ${imageControlsMarkup(image.display)}
                <button type="button" class="admin-button danger icon-button mt-3" data-remove-hero="${index}"><i data-lucide="trash-2"></i>Supprimer</button>
            </article>
        `).join('');

        bindRemove(container, '[data-remove-hero]', state.content.hero.images);
    }

    function collectHeroImages() {
        state.content.hero.images = Array.from(document.querySelectorAll('[data-hero-index]')).map((card, index) => ({
            id: state.content.hero.images[index]?.id || createId('hero'),
            url: fieldValue(card, 'url'),
            caption: {
                fr: fieldValue(card, 'caption.fr'),
                mg: fieldValue(card, 'caption.mg'),
                en: fieldValue(card, 'caption.en')
            },
            display: collectImageDisplay(card)
        }));
    }

    function renderActions() {
        const container = document.querySelector('#actions-editor');
        container.innerHTML = state.content.actions.items.map((action, index) => `
            <article class="admin-card p-4" data-action-index="${index}">
                <div class="admin-grid md:grid-cols-2">
                    ${i18nInput('title', action.title, 'Titre')}
                    <div class="admin-field">
                        <label>Categorie</label>
                        <input data-field="category" value="${escapeHtml(action.category)}" type="text" placeholder="education">
                    </div>
                    <div class="admin-field">
                        <label>Zone</label>
                        <input data-field="location" value="${escapeHtml(action.location)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Periode</label>
                        <input data-field="period" value="${escapeHtml(action.period)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Statut</label>
                        <input data-field="status" value="${escapeHtml(action.status)}" type="text">
                    </div>
                    ${i18nTextarea('description', action.description, 'Resume')}
                    ${i18nTextarea('details', action.details, 'Details')}
                    ${i18nTextarea('objectives', action.objectives, 'Objectifs')}
                    ${i18nTextarea('results', action.results, 'Resultats')}
                    <div class="md:col-span-2">
                        <div class="image-admin-layout">
                            ${previewMarkup(action.imageUrl, action.imageDisplay)}
                            <div class="admin-field flex-1">
                                <label>Image principale</label>
                                ${uploadFieldMarkup('imageUrl', action.imageUrl)}
                            </div>
                        </div>
                        ${imageControlsMarkup(action.imageDisplay)}
                    </div>
                    ${i18nInput('caption', action.caption, 'Legende image')}
                </div>
                <div class="mt-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-bold text-gray-800">Images des activites</h3>
                        <button type="button" class="admin-button icon-button" data-add-gallery="${index}"><i data-lucide="image-plus"></i>Ajouter une image</button>
                    </div>
                    <div class="grid gap-3" data-gallery-list="${index}">
                        ${action.gallery.map((image, galleryIndex) => galleryEditor(image, galleryIndex)).join('')}
                    </div>
                </div>
                <button type="button" class="admin-button danger icon-button mt-4" data-remove-action="${index}"><i data-lucide="trash-2"></i>Supprimer le domaine</button>
            </article>
        `).join('');

        bindRemove(container, '[data-remove-action]', state.content.actions.items);
        container.querySelectorAll('[data-add-gallery]').forEach((button) => {
            button.addEventListener('click', () => {
                state.content.actions.items[Number(button.dataset.addGallery)].gallery.push(createImage('./assets/images/1.jpg'));
                renderListEditors();
            });
        });
        container.querySelectorAll('[data-remove-gallery]').forEach((button) => {
            button.addEventListener('click', () => {
                const actionIndex = Number(button.closest('[data-action-index]').dataset.actionIndex);
                state.content.actions.items[actionIndex].gallery.splice(Number(button.dataset.removeGallery), 1);
                renderListEditors();
            });
        });
    }

    function collectActions() {
        state.content.actions.items = Array.from(document.querySelectorAll('[data-action-index]')).map((card, index) => ({
            id: state.content.actions.items[index]?.id || createId('action'),
            category: fieldValue(card, 'category'),
            location: fieldValue(card, 'location'),
            period: fieldValue(card, 'period'),
            status: fieldValue(card, 'status'),
            title: collectI18n(card, 'title'),
            description: collectI18n(card, 'description'),
            details: collectI18n(card, 'details'),
            objectives: collectI18n(card, 'objectives'),
            results: collectI18n(card, 'results'),
            imageUrl: fieldValue(card, 'imageUrl'),
            imageDisplay: collectImageDisplay(card),
            caption: collectI18n(card, 'caption'),
            gallery: Array.from(card.querySelectorAll('[data-gallery-index]')).map((galleryCard, galleryIndex) => ({
                id: state.content.actions.items[index]?.gallery?.[galleryIndex]?.id || createId('gallery'),
                url: fieldValue(galleryCard, 'url'),
                caption: {
                    fr: fieldValue(galleryCard, 'caption.fr'),
                    mg: fieldValue(galleryCard, 'caption.mg'),
                    en: fieldValue(galleryCard, 'caption.en')
                },
                display: collectImageDisplay(galleryCard)
            }))
        }));
    }

    function renderContents() {
        const container = document.querySelector('#contents-editor');
        container.innerHTML = state.content.contents.map((item, index) => `
            <article class="admin-card p-4" data-content-index="${index}">
                <div class="admin-grid md:grid-cols-2">
                    ${i18nInput('title', item.title, 'Titre')}
                    <div class="admin-field">
                        <label>Categorie</label>
                        <input data-field="category" value="${escapeHtml(item.category)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Date de publication</label>
                        <input data-field="date" value="${escapeHtml(item.date)}" type="date">
                    </div>
                    <label class="admin-check">
                        <input data-field="featured" type="checkbox" ${item.featured ? 'checked' : ''}>
                        <span>Afficher cette actualite a la une</span>
                    </label>
                    ${i18nTextarea('description', item.description, 'Description')}
                    ${i18nTextarea('details', item.details, 'Texte detaille')}
                    <div class="md:col-span-2">
                        <div class="image-admin-layout">
                            ${previewMarkup(item.imageUrl, item.imageDisplay)}
                            <div class="admin-field flex-1">
                                <label>Fichier image</label>
                                ${uploadFieldMarkup('imageUrl', item.imageUrl)}
                            </div>
                        </div>
                        ${imageControlsMarkup(item.imageDisplay)}
                    </div>
                    ${i18nInput('caption', item.caption, 'Legende image')}
                </div>
                <button type="button" class="admin-button danger icon-button mt-4" data-remove-content="${index}"><i data-lucide="trash-2"></i>Supprimer</button>
            </article>
        `).join('');

        bindRemove(container, '[data-remove-content]', state.content.contents);
    }

    function collectContents() {
        state.content.contents = Array.from(document.querySelectorAll('[data-content-index]')).map((card, index) => ({
            id: state.content.contents[index]?.id || createId('content'),
            category: fieldValue(card, 'category'),
            date: fieldValue(card, 'date'),
            featured: card.querySelector('[data-field="featured"]')?.checked || false,
            title: collectI18n(card, 'title'),
            description: collectI18n(card, 'description'),
            details: collectI18n(card, 'details'),
            imageUrl: fieldValue(card, 'imageUrl'),
            imageDisplay: collectImageDisplay(card),
            caption: collectI18n(card, 'caption')
        }));
    }

    function renderDonationMethods() {
        const container = document.querySelector('#donation-methods-editor');
        container.innerHTML = state.content.donation.methods.map((method, index) => `
            <article class="sub-editor" data-method-index="${index}">
                <div class="admin-grid md:grid-cols-2">
                    <div class="admin-field">
                        <label>Nom</label>
                        <input data-field="name" value="${escapeHtml(method.name)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Details</label>
                        <input data-field="details" value="${escapeHtml(method.details)}" type="text">
                    </div>
                    <div class="admin-field md:col-span-2">
                        <label>Logo du moyen de paiement</label>
                        <div class="image-upload-field">
                            <img class="upload-thumbnail" data-upload-preview src="${escapeHtml(method.logo || './assets/images/mamafi-logo.png')}" alt="Apercu du logo">
                            ${uploadFieldMarkup('logo', method.logo)}
                        </div>
                    </div>
                </div>
                <button type="button" class="admin-button danger icon-button mt-3" data-remove-method="${index}"><i data-lucide="trash-2"></i>Supprimer</button>
            </article>
        `).join('');

        bindRemove(container, '[data-remove-method]', state.content.donation.methods);
    }

    function collectDonationMethods() {
        state.content.donation.methods = Array.from(document.querySelectorAll('[data-method-index]')).map((card, index) => ({
            id: state.content.donation.methods[index]?.id || createId('method'),
            name: fieldValue(card, 'name'),
            details: fieldValue(card, 'details'),
            logo: fieldValue(card, 'logo')
        }));
    }

    function renderPartners() {
        const container = document.querySelector('#partners-editor');
        container.innerHTML = state.content.partners.items.map((partner, index) => `
            <article class="sub-editor" data-partner-index="${index}">
                <div class="admin-grid md:grid-cols-3">
                    <div class="admin-field">
                        <label>Nom</label>
                        <input data-field="name" value="${escapeHtml(partner.name)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Logo</label>
                        <div class="image-upload-field">
                            <img class="upload-thumbnail" data-upload-preview src="${escapeHtml(partner.logo || './assets/images/mamafi-logo.png')}" alt="Apercu du logo">
                            ${uploadFieldMarkup('logo', partner.logo)}
                        </div>
                    </div>
                    <div class="admin-field">
                        <label>Lien</label>
                        <input data-field="url" value="${escapeHtml(partner.url)}" type="url">
                    </div>
                </div>
                <button type="button" class="admin-button danger icon-button mt-3" data-remove-partner="${index}"><i data-lucide="trash-2"></i>Supprimer</button>
            </article>
        `).join('');
        bindRemove(container, '[data-remove-partner]', state.content.partners.items);
    }

    function collectPartners() {
        state.content.partners.items = Array.from(document.querySelectorAll('[data-partner-index]')).map((card, index) => ({
            id: state.content.partners.items[index]?.id || createId('partner'),
            name: fieldValue(card, 'name'),
            logo: fieldValue(card, 'logo'),
            url: fieldValue(card, 'url')
        }));
    }

    function renderZones() {
        const container = document.querySelector('#zones-editor');
        container.innerHTML = state.content.intervention.zones.map((zone, index) => `
            <article class="sub-editor" data-zone-index="${index}">
                <div class="admin-grid md:grid-cols-2">
                    <div class="admin-field">
                        <label>Nom de la zone</label>
                        <input data-field="name" value="${escapeHtml(zone.name)}" type="text">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="admin-field">
                            <label>Latitude</label>
                            <input data-field="latitude" value="${escapeHtml(zone.latitude)}" type="number" step="0.0001">
                        </div>
                        <div class="admin-field">
                            <label>Longitude</label>
                            <input data-field="longitude" value="${escapeHtml(zone.longitude)}" type="number" step="0.0001">
                        </div>
                    </div>
                    ${i18nTextarea('description', zone.description, 'Description')}
                </div>
                <button type="button" class="admin-button danger icon-button mt-3" data-remove-zone="${index}"><i data-lucide="trash-2"></i>Supprimer</button>
            </article>
        `).join('');
        bindRemove(container, '[data-remove-zone]', state.content.intervention.zones);
    }

    function collectZones() {
        state.content.intervention.zones = Array.from(document.querySelectorAll('[data-zone-index]')).map((card, index) => ({
            id: state.content.intervention.zones[index]?.id || createId('zone'),
            name: fieldValue(card, 'name'),
            latitude: Number(fieldValue(card, 'latitude')),
            longitude: Number(fieldValue(card, 'longitude')),
            description: collectI18n(card, 'description')
        }));
    }

    function renderImpact() {
        const container = document.querySelector('#impact-editor');
        container.innerHTML = state.content.impact.map((item, index) => `
            <article class="sub-editor" data-impact-index="${index}">
                <div class="admin-grid md:grid-cols-3">
                    <div class="admin-field">
                        <label>Valeur</label>
                        <input data-field="value" value="${escapeHtml(item.value)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Libelle FR</label>
                        <input data-field="label.fr" value="${escapeHtml(item.label.fr)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Libelle MG</label>
                        <input data-field="label.mg" value="${escapeHtml(item.label.mg)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Libelle EN</label>
                        <input data-field="label.en" value="${escapeHtml(item.label.en)}" type="text">
                    </div>
                </div>
                <button type="button" class="admin-button danger icon-button mt-3" data-remove-impact="${index}"><i data-lucide="trash-2"></i>Supprimer</button>
            </article>
        `).join('');
        bindRemove(container, '[data-remove-impact]', state.content.impact);
    }

    function collectImpact() {
        state.content.impact = Array.from(document.querySelectorAll('[data-impact-index]')).map((card, index) => ({
            id: state.content.impact[index]?.id || createId('impact'),
            value: fieldValue(card, 'value'),
            label: {
                fr: fieldValue(card, 'label.fr'),
                mg: fieldValue(card, 'label.mg'),
                en: fieldValue(card, 'label.en')
            }
        }));
    }

    function galleryEditor(image, index) {
        return `
            <div class="sub-editor" data-gallery-index="${index}">
                <div class="image-admin-layout">
                    ${previewMarkup(image.url, image.display)}
                    <div class="admin-grid md:grid-cols-3 flex-1">
                    <div class="admin-field">
                        <label>Fichier image</label>
                        ${uploadFieldMarkup('url', image.url)}
                    </div>
                    <div class="admin-field">
                        <label>Legende FR</label>
                        <input data-field="caption.fr" value="${escapeHtml(image.caption.fr)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Legende MG</label>
                        <input data-field="caption.mg" value="${escapeHtml(image.caption.mg)}" type="text">
                    </div>
                    <div class="admin-field">
                        <label>Legende EN</label>
                        <input data-field="caption.en" value="${escapeHtml(image.caption.en)}" type="text">
                    </div>
                    </div>
                </div>
                ${imageControlsMarkup(image.display)}
                <button type="button" class="admin-button danger icon-button mt-3" data-remove-gallery="${index}"><i data-lucide="trash-2"></i>Supprimer image</button>
            </div>
        `;
    }

    function renderDonations(donations) {
        const container = document.querySelector('#donations-list');

        if (!donations.length) {
            container.innerHTML = '<p>Aucune demande de donateur ou benevole pour le moment.</p>';
            return;
        }

        container.innerHTML = donations.map((donation) => `
            <article class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                        <h3 class="font-bold text-gray-800">${escapeHtml(donation.name)} - ${escapeHtml(donation.supportType === 'benevole' ? 'Benevole' : 'Donateur')}</h3>
                        <p>${escapeHtml(donation.email)} ${donation.phone ? `| ${escapeHtml(donation.phone)}` : ''}</p>
                        <p class="text-sm text-gray-500">${formatDate(donation.createdAt)}</p>
                        ${donation.message ? `<p class="mt-2">${escapeHtml(donation.message)}</p>` : ''}
                    </div>
                    <button type="button" class="admin-button danger" data-donation-id="${escapeHtml(donation.id)}">Supprimer</button>
                </div>
            </article>
        `).join('');

        container.querySelectorAll('[data-donation-id]').forEach((button) => {
            button.addEventListener('click', async () => {
                await adminFetch(`/api/donations/${encodeURIComponent(button.dataset.donationId)}`, { method: 'DELETE' });
                await loadDonations();
            });
        });
    }

    function i18nInput(field, value, label) {
        return `
            <div class="admin-field">
                <label>${label} FR</label>
                <input data-field="${field}.fr" value="${escapeHtml(value.fr)}" type="text">
            </div>
            <div class="admin-field">
                <label>${label} MG</label>
                <input data-field="${field}.mg" value="${escapeHtml(value.mg)}" type="text">
            </div>
            <div class="admin-field">
                <label>${label} EN</label>
                <input data-field="${field}.en" value="${escapeHtml(value.en)}" type="text">
            </div>
        `;
    }

    function i18nTextarea(field, value, label) {
        return `
            <div class="admin-field">
                <label>${label} FR</label>
                <textarea data-field="${field}.fr">${escapeHtml(value.fr)}</textarea>
            </div>
            <div class="admin-field">
                <label>${label} MG</label>
                <textarea data-field="${field}.mg">${escapeHtml(value.mg)}</textarea>
            </div>
            <div class="admin-field">
                <label>${label} EN</label>
                <textarea data-field="${field}.en">${escapeHtml(value.en)}</textarea>
            </div>
        `;
    }

    function collectI18n(card, field) {
        return {
            fr: fieldValue(card, `${field}.fr`),
            mg: fieldValue(card, `${field}.mg`),
            en: fieldValue(card, `${field}.en`)
        };
    }

    function bindRemove(container, selector, target) {
        container.querySelectorAll(selector).forEach((button) => {
            button.addEventListener('click', () => {
                target.splice(Number(button.dataset.removeHero || button.dataset.removeAction || button.dataset.removeContent || button.dataset.removeMethod || button.dataset.removePartner || button.dataset.removeZone || button.dataset.removeImpact), 1);
                renderListEditors();
            });
        });
    }

    function fieldValue(card, field) {
        return card.querySelector(`[data-field="${field}"]`)?.value || '';
    }

    function adminFetch(path, options = {}) {
        return fetch(path, options);
    }

    function normalizeContent(content) {
        content.identity = content.identity || { name: 'MAMAFI', tagline: '', logo: './assets/images/mamafi-logo.png' };
        content.styles = content.styles || {};
        content.hero = content.hero || {};
        content.hero.title = normalizeI18n(content.hero.title);
        content.hero.subtitle = normalizeI18n(content.hero.subtitle);
        content.hero.button = normalizeI18n(content.hero.button);
        content.hero.images = (content.hero.images || []).map(normalizeImage);
        content.about = content.about || {};
        content.about.title = normalizeI18n(content.about.title);
        content.about.text1 = normalizeI18n(content.about.text1);
        content.about.text2 = normalizeI18n(content.about.text2);
        content.about.image = normalizeImage(content.about.image || {});
        content.impact = (content.impact || []).map((item) => ({
            id: item.id || createId('impact'),
            value: item.value || '',
            label: normalizeI18n(item.label)
        }));
        content.actions = content.actions || {};
        content.actions.title = normalizeI18n(content.actions.title);
        content.actions.pageTitle = normalizeI18n(content.actions.pageTitle);
        content.actions.intro = normalizeI18n(content.actions.intro);
        content.actions.items = (content.actions.items || []).map((action) => ({
            id: action.id || createId('action'),
            category: action.category || '',
            location: action.location || '',
            period: action.period || '',
            status: action.status || '',
            title: normalizeI18n(action.title),
            description: normalizeI18n(action.description),
            details: normalizeI18n(action.details),
            objectives: normalizeI18n(action.objectives),
            results: normalizeI18n(action.results),
            imageUrl: action.imageUrl || './assets/images/1.jpg',
            caption: normalizeI18n(action.caption),
            imageDisplay: normalizeDisplay(action.imageDisplay),
            gallery: (action.gallery || []).map(normalizeImage)
        }));
        content.news = content.news || {};
        content.news.title = normalizeI18n(content.news.title || { fr: 'Actualites', mg: 'Vaovao' });
        content.news.intro = normalizeI18n(content.news.intro || {
            fr: "Retrouvez les actualites de l'association, ses actions et ses projets.",
            mg: "Araho eto ny vaovao momba ny fikambanana, ny asa ary ny tetikasa."
        });
        content.contents = (content.contents || []).map((item) => ({
            id: item.id || createId('content'),
            category: item.category || 'Association',
            date: item.date || '',
            featured: Boolean(item.featured),
            title: normalizeI18n(item.title),
            description: normalizeI18n(item.description),
            details: normalizeI18n(item.details || item.description),
            imageUrl: item.imageUrl || './assets/images/5.jpg',
            imageDisplay: normalizeDisplay(item.imageDisplay),
            caption: normalizeI18n(item.caption)
        }));
        content.socials = content.socials || {};
        content.partners = content.partners || {};
        content.partners.title = normalizeI18n(content.partners.title);
        content.partners.items = content.partners.items || [];
        content.intervention = content.intervention || {};
        content.intervention.title = normalizeI18n(content.intervention.title);
        content.intervention.intro = normalizeI18n(content.intervention.intro);
        content.intervention.zones = (content.intervention.zones || []).map((zone) => ({
            id: zone.id || createId('zone'),
            name: zone.name || '',
            latitude: Number(zone.latitude) || 0,
            longitude: Number(zone.longitude) || 0,
            description: normalizeI18n(zone.description)
        }));
        content.join = content.join || {};
        content.join.title = normalizeI18n(content.join.title);
        content.join.subtitle = normalizeI18n(content.join.subtitle);
        content.donation = content.donation || {};
        content.donation.methods = content.donation.methods || [];
        content.contact = content.contact || {};
        content.contact.title = normalizeI18n(content.contact.title);
        content.contact.intro = normalizeI18n(content.contact.intro);
        content.footer = content.footer || {};
        content.footer.legal = normalizeI18n(content.footer.legal);
        return content;
    }

    function normalizeI18n(value) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return { fr: value.fr || '', mg: value.mg || '', en: value.en || '' };
        }
        return { fr: value || '', mg: '', en: '' };
    }

    function normalizeImage(image) {
        return {
            id: image.id || createId('image'),
            url: image.url || '',
            caption: normalizeI18n(image.caption),
            display: normalizeDisplay(image.display)
        };
    }

    function createAction() {
        return {
            id: createId('action'),
            category: 'nouveau',
            location: 'Madagascar',
            period: '',
            status: 'En preparation',
            title: { fr: 'Nouveau domaine', mg: '', en: 'New action area' },
            description: { fr: 'Resume du domaine.', mg: '', en: 'Action area summary.' },
            details: { fr: 'Details des activites.', mg: '', en: 'Activity details.' },
            objectives: { fr: 'Objectifs du projet.', mg: '', en: 'Project objectives.' },
            results: { fr: 'Resultats attendus.', mg: '', en: 'Expected results.' },
            imageUrl: './assets/images/1.jpg',
            imageDisplay: normalizeDisplay(),
            caption: { fr: 'Legende de l image.', mg: '', en: 'Image caption.' },
            gallery: [createImage('./assets/images/1.jpg')]
        };
    }

    function createContentItem() {
        return {
            id: createId('content'),
            category: 'Association',
            date: new Date().toISOString().slice(0, 10),
            featured: false,
            title: { fr: 'Nouveau contenu', mg: '', en: 'New content' },
            description: { fr: 'Description du contenu.', mg: '', en: 'Content description.' },
            details: { fr: 'Texte detaille de l actualite.', mg: '', en: 'Detailed news text.' },
            imageUrl: './assets/images/5.jpg',
            imageDisplay: normalizeDisplay(),
            caption: { fr: 'Legende de l image.', mg: '', en: 'Image caption.' }
        };
    }

    function createDonationMethod() {
        return {
            id: createId('method'),
            name: 'Nouveau moyen',
            details: 'Details du moyen de don.',
            logo: ''
        };
    }

    function createPartner() {
        return {
            id: createId('partner'),
            name: 'Nouveau partenaire',
            logo: '',
            url: ''
        };
    }

    function createZone() {
        return {
            id: createId('zone'),
            name: 'Nouvelle zone',
            latitude: -19.8659,
            longitude: 47.0333,
            description: { fr: 'Description de la zone.', mg: '', en: 'Area description.' }
        };
    }

    function createImpact() {
        return {
            id: createId('impact'),
            value: '0',
            label: { fr: 'Nouveau chiffre cle', mg: '', en: 'New key figure' }
        };
    }

    function createImage(url) {
        return {
            id: createId('image'),
            url,
            caption: { fr: 'Legende de l image.', mg: '', en: 'Image caption.' },
            display: normalizeDisplay()
        };
    }

    function previewMarkup(url, display) {
        return `
            <div class="image-preview-frame">
                <img class="admin-image-preview" data-image-preview src="${escapeHtml(url)}" alt="Apercu">
            </div>
        `;
    }

    function uploadFieldMarkup(field, value = '') {
        return `
            <div class="image-upload-field">
                <input data-field="${field}" value="${escapeHtml(value)}" type="hidden">
                <label class="admin-button secondary icon-button upload-picker">
                    <i data-lucide="upload"></i>Choisir une image
                    <input data-image-upload type="file" accept="image/jpeg,image/png,image/webp,image/gif">
                </label>
                <span class="upload-file-name" data-upload-status>${value ? escapeHtml(fileNameFromUrl(value)) : 'Aucun fichier'}</span>
            </div>
        `;
    }

    function imageControlsMarkup(display) {
        const value = normalizeDisplay(display);
        return `
            <div class="image-controls">
                ${numberControl('display.height', 'Hauteur (px)', value.height, 100, 900)}
                ${rangeControl('display.positionX', 'Cadrage horizontal', value.positionX, 0, 100)}
                ${rangeControl('display.positionY', 'Cadrage vertical', value.positionY, 0, 100)}
                ${rangeControl('display.brightness', 'Luminosite', value.brightness, 20, 200)}
                ${rangeControl('display.contrast', 'Contraste', value.contrast, 20, 200)}
                ${rangeControl('display.saturation', 'Saturation', value.saturation, 0, 200)}
                ${numberControl('display.rotation', 'Rotation (deg)', value.rotation, -180, 180)}
            </div>
        `;
    }

    function rangeControl(field, label, value, min, max) {
        return `<div class="admin-field"><label>${label}: <span data-value-for="${field}">${value}</span></label><input data-field="${field}" type="range" min="${min}" max="${max}" value="${value}"></div>`;
    }

    function numberControl(field, label, value, min, max) {
        return `<div class="admin-field"><label>${label}</label><input data-field="${field}" type="number" min="${min}" max="${max}" value="${value}"></div>`;
    }

    function collectImageDisplay(card) {
        return {
            height: Number(fieldValue(card, 'display.height')) || 240,
            positionX: Number(fieldValue(card, 'display.positionX')) || 0,
            positionY: Number(fieldValue(card, 'display.positionY')) || 0,
            brightness: Number(fieldValue(card, 'display.brightness')) || 100,
            contrast: Number(fieldValue(card, 'display.contrast')) || 100,
            saturation: Number(fieldValue(card, 'display.saturation')),
            rotation: Number(fieldValue(card, 'display.rotation')) || 0
        };
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

    function bindDynamicImagePreviews() {
        document.querySelectorAll('[data-image-preview]').forEach((preview) => {
            const card = preview.closest('[data-hero-index], [data-action-index], [data-content-index], [data-gallery-index]');
            if (!card) return;
            const urlInput = card.querySelector('[data-field="url"], [data-field="imageUrl"]');
            const controls = card.querySelectorAll('[data-field^="display."]');
            const update = () => updatePreview(preview, urlInput?.value || preview.src, collectImageDisplay(card));
            urlInput?.addEventListener('input', update);
            controls.forEach((control) => control.addEventListener('input', () => {
                const output = card.querySelector(`[data-value-for="${control.dataset.field}"]`);
                if (output) output.textContent = control.value;
                update();
            }));
            update();
        });
    }

    function bindImageUploads() {
        document.querySelectorAll('[data-image-upload]').forEach((input) => {
            if (input.dataset.uploadBound === 'true') return;
            input.dataset.uploadBound = 'true';
            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                if (!file) return;

                const field = input.closest('.image-upload-field');
                const valueInput = field?.querySelector('input[type="hidden"]');
                const statusOutput = field?.querySelector('[data-upload-status]');
                const card = input.closest('[data-hero-index], [data-action-index], [data-content-index], [data-gallery-index], [data-method-index], [data-partner-index]');
                const preview = field?.querySelector('[data-upload-preview]')
                    || card?.querySelector('[data-image-preview], [data-upload-preview]')
                    || (valueInput?.dataset.path === 'about.image.url' ? document.querySelector('#about-admin-preview') : null);

                if (!valueInput) return;
                if (statusOutput) statusOutput.textContent = 'Envoi en cours...';
                input.disabled = true;

                try {
                    const result = await uploadImage(file);
                    valueInput.value = result.url;
                    if (preview) {
                        preview.src = result.url;
                        if (preview.matches('[data-image-preview]')) {
                            const imageCard = preview.closest('[data-hero-index], [data-action-index], [data-content-index], [data-gallery-index]');
                            updatePreview(preview, result.url, imageCard ? collectImageDisplay(imageCard) : {});
                        }
                    }
                    if (statusOutput) statusOutput.textContent = file.name;
                    setStatus('Image ajoutee. Enregistrez les modifications pour la publier.');
                } catch (error) {
                    if (statusOutput) statusOutput.textContent = error.message;
                } finally {
                    input.disabled = false;
                    input.value = '';
                }
            });
        });
    }

    async function uploadImage(file) {
        const response = await adminFetch('/api/admin/uploads', {
            method: 'POST',
            headers: {
                'Content-Type': file.type,
                'X-File-Name': encodeURIComponent(file.name)
            },
            body: file
        });
        const result = await response.json().catch(() => ({ message: 'Echec de l envoi.' }));
        if (!response.ok) {
            throw new Error(result.message || 'Echec de l envoi.');
        }
        return result;
    }

    function bindStaticImagePreview() {
        const preview = document.querySelector('#about-admin-preview');
        if (!preview) return;
        const urlInput = document.querySelector('[data-path="about.image.url"]');
        const controls = Array.from(document.querySelectorAll('[data-path^="about.image.display."]'));
        const update = () => updatePreview(preview, urlInput?.value || './assets/images/4.jpg', {
            height: document.querySelector('[data-path="about.image.display.height"]')?.value,
            positionX: document.querySelector('[data-path="about.image.display.positionX"]')?.value,
            positionY: document.querySelector('[data-path="about.image.display.positionY"]')?.value,
            brightness: document.querySelector('[data-path="about.image.display.brightness"]')?.value,
            contrast: document.querySelector('[data-path="about.image.display.contrast"]')?.value,
            saturation: document.querySelector('[data-path="about.image.display.saturation"]')?.value,
            rotation: document.querySelector('[data-path="about.image.display.rotation"]')?.value
        });
        urlInput?.addEventListener('input', update);
        controls.forEach((control) => control.addEventListener('input', update));
        update();
    }

    function updatePreview(preview, url, display) {
        const value = normalizeDisplay(display);
        preview.src = url;
        preview.style.height = `${Math.min(value.height, 260)}px`;
        preview.style.objectPosition = `${value.positionX}% ${value.positionY}%`;
        preview.style.filter = `brightness(${value.brightness}%) contrast(${value.contrast}%) saturate(${value.saturation}%)`;
        preview.style.transform = `rotate(${value.rotation}deg)`;
    }

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
        }
    }

    function bindPasswordToggles() {
        document.querySelectorAll('[data-password-target]').forEach((button) => {
            button.addEventListener('click', () => {
                const input = document.querySelector(`#${button.dataset.passwordTarget}`);
                if (!input) return;
                const visible = input.type === 'text';
                input.type = visible ? 'password' : 'text';
                button.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
                button.innerHTML = `<i data-lucide="${visible ? 'eye' : 'eye-off'}"></i>`;
                refreshIcons();
            });
        });
    }

    function createId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function getByPath(source, path) {
        return path.split('.').reduce((value, key) => value?.[key], source);
    }

    function setByPath(source, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            current[key] = current[key] || {};
            return current[key];
        }, source);
        target[lastKey] = value;
    }

    function setStatus(message) {
        if (status) {
            status.textContent = message;
        }
    }

    function formatDate(value) {
        return value ? new Date(value).toLocaleString('fr-FR') : '';
    }

    function fileNameFromUrl(value) {
        return String(value || '').split('/').pop() || 'Image actuelle';
    }

    function escapeHtml(value = '') {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
});
