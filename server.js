const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const contentFile = path.join(dataDir, 'content.json');
const donationsFile = path.join(dataDir, 'donations.json');
const settingsFile = path.join(dataDir, 'settings.json');
const uploadsDir = path.join(rootDir, 'assets', 'uploads');
const port = Number(process.env.PORT || 3000);
const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'mamafi-admin';
const authAttempts = new Map();
const adminSessions = new Map();

const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
};

const uploadTypes = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host}`);

        if (url.pathname.startsWith('/api/')) {
            await handleApi(request, response, url);
            return;
        }

        await serveStatic(response, url.pathname);
    } catch (error) {
        if (error.statusCode) {
            sendJson(response, error.statusCode, { message: error.message });
            return;
        }

        console.error(error);
        sendJson(response, 500, { message: 'Erreur interne du serveur.' });
    }
});

server.listen(port, () => {
    console.log(`MAMAFI site lance sur http://localhost:${port}`);
    console.log(`Admin: http://localhost:${port}/admin.html`);
    console.log('Mot de passe admin par defaut: mamafi-admin');
});

async function handleApi(request, response, url) {
    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
        enforceAuthRateLimit(request);
        const body = await readBody(request);
        if (!(await verifyAdminPassword(cleanString(body.password)))) {
            registerAuthFailure(request);
            throw createHttpError(401, 'Mot de passe administrateur invalide.');
        }
        clearAuthFailures(request);
        createAdminSession(response);
        sendJson(response, 200, { message: 'Connexion reussie.' });
        return;
    }

    if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
        destroyAdminSession(request, response);
        sendJson(response, 200, { message: 'Deconnexion reussie.' });
        return;
    }

    if (url.pathname === '/api/content' && request.method === 'GET') {
        sendJson(response, 200, await readJson(contentFile, {}));
        return;
    }

    if (url.pathname === '/api/content' && request.method === 'PUT') {
        await requireAdmin(request);
        const content = await readBody(request);
        await writeJson(contentFile, sanitizeContent(content));
        sendJson(response, 200, { message: 'Contenu enregistre.' });
        return;
    }

    if (url.pathname === '/api/admin/uploads' && request.method === 'POST') {
        await requireAdmin(request);
        const image = await saveUploadedImage(request);
        sendJson(response, 201, image);
        return;
    }

    if (url.pathname === '/api/admin/password' && request.method === 'PUT') {
        const body = await readBody(request);
        await changeAdminPassword(body.currentPassword, body.newPassword);
        sendJson(response, 200, { message: 'Mot de passe modifie.' });
        return;
    }

    if (url.pathname === '/api/admin/recovery' && request.method === 'PUT') {
        await requireAdmin(request);
        const body = await readBody(request);
        await configureRecoveryCode(body.recoveryCode);
        sendJson(response, 200, { message: 'Code de recuperation configure.' });
        return;
    }

    if (url.pathname === '/api/admin/password/reset' && request.method === 'POST') {
        enforceAuthRateLimit(request);
        const body = await readBody(request);
        try {
            await resetPasswordWithRecovery(body.recoveryCode, body.newPassword);
            clearAuthFailures(request);
            createAdminSession(response);
        } catch (error) {
            registerAuthFailure(request);
            throw error;
        }
        sendJson(response, 200, { message: 'Mot de passe reinitialise.' });
        return;
    }

    if (url.pathname === '/api/admin/recovery/status' && request.method === 'GET') {
        const settings = await readJson(settingsFile, {});
        sendJson(response, 200, { configured: Boolean(settings.recoveryCodeHash && settings.recoveryCodeSalt) });
        return;
    }

    if (url.pathname === '/api/donations' && request.method === 'POST') {
        const donation = sanitizeDonation(await readBody(request));
        const donations = await readJson(donationsFile, []);
        donations.unshift({
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            ...donation
        });
        await writeJson(donationsFile, donations);
        sendJson(response, 201, { message: 'Don recu.' });
        return;
    }

    if (url.pathname === '/api/donations' && request.method === 'GET') {
        await requireAdmin(request);
        sendJson(response, 200, await readJson(donationsFile, []));
        return;
    }

    if (url.pathname.startsWith('/api/donations/') && request.method === 'DELETE') {
        await requireAdmin(request);
        const id = decodeURIComponent(url.pathname.replace('/api/donations/', ''));
        const donations = await readJson(donationsFile, []);
        await writeJson(donationsFile, donations.filter((donation) => donation.id !== id));
        sendJson(response, 200, { message: 'Don supprime.' });
        return;
    }

    sendJson(response, 404, { message: 'Route API introuvable.' });
}

async function serveStatic(response, pathname) {
    const requestedPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
    const blockedPaths = ['/data/', '/server.js', '/package.json', '/package-lock.json', '/README.md'];
    if (blockedPaths.some((blocked) => requestedPath.toLowerCase().startsWith(blocked.toLowerCase()))) {
        sendJson(response, 403, { message: 'Acces refuse.' });
        return;
    }
    const filePath = path.normalize(path.join(rootDir, requestedPath));
    const relativePath = path.relative(rootDir, filePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        sendJson(response, 403, { message: 'Acces refuse.' });
        return;
    }

    try {
        const extension = path.extname(filePath).toLowerCase();
        const content = await fs.readFile(filePath);
        response.writeHead(200, {
            'Content-Type': mimeTypes[extension] || 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        response.end(content);
    } catch (error) {
        sendJson(response, 404, { message: 'Fichier introuvable.' });
    }
}

async function requireAdmin(request) {
    if (hasValidAdminSession(request)) {
        return;
    }
    enforceAuthRateLimit(request);
    const password = request.headers['x-admin-password'] || '';
    if (!(await verifyAdminPassword(password))) {
        registerAuthFailure(request);
        throw createHttpError(401, 'Mot de passe administrateur invalide.');
    }
    clearAuthFailures(request);
}

function createAdminSession(response) {
    const token = crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
    response.setHeader('Set-Cookie', `mamafi_admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
}

function hasValidAdminSession(request) {
    const token = parseCookies(request.headers.cookie || '').mamafi_admin_session;
    if (!token) return false;
    const expiresAt = adminSessions.get(token);
    if (!expiresAt || expiresAt < Date.now()) {
        adminSessions.delete(token);
        return false;
    }
    return true;
}

function destroyAdminSession(request, response) {
    const token = parseCookies(request.headers.cookie || '').mamafi_admin_session;
    if (token) adminSessions.delete(token);
    response.setHeader('Set-Cookie', 'mamafi_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
}

function parseCookies(cookieHeader) {
    return cookieHeader.split(';').reduce((cookies, part) => {
        const [name, ...value] = part.trim().split('=');
        if (name) cookies[name] = value.join('=');
        return cookies;
    }, {});
}

function authKey(request) {
    return request.socket.remoteAddress || 'local';
}

function enforceAuthRateLimit(request) {
    const attempt = authAttempts.get(authKey(request));
    if (attempt?.blockedUntil > Date.now()) {
        throw createHttpError(429, 'Trop de tentatives. Reessayez dans quelques minutes.');
    }
}

function registerAuthFailure(request) {
    const key = authKey(request);
    const current = authAttempts.get(key) || { count: 0, blockedUntil: 0 };
    current.count += 1;
    if (current.count >= 8) {
        current.blockedUntil = Date.now() + 5 * 60 * 1000;
        current.count = 0;
    }
    authAttempts.set(key, current);
}

function clearAuthFailures(request) {
    authAttempts.delete(authKey(request));
}

async function verifyAdminPassword(password) {
    const settings = await readJson(settingsFile, null);

    if (!settings?.adminPasswordHash || !settings?.adminPasswordSalt) {
        return password === defaultAdminPassword;
    }

    return hashPassword(password, settings.adminPasswordSalt) === settings.adminPasswordHash;
}

async function changeAdminPassword(currentPassword, newPassword) {
    if (!(await verifyAdminPassword(cleanString(currentPassword)))) {
        throw createHttpError(401, 'Mot de passe actuel invalide.');
    }

    const nextPassword = cleanString(newPassword);
    if (nextPassword.length < 8) {
        throw createHttpError(400, 'Le nouveau mot de passe doit contenir au moins 8 caracteres.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const settings = await readJson(settingsFile, {});
    await writeJson(settingsFile, {
        ...settings,
        adminPasswordSalt: salt,
        adminPasswordHash: hashPassword(nextPassword, salt),
        updatedAt: new Date().toISOString()
    });
}

async function configureRecoveryCode(recoveryCode) {
    const code = cleanString(recoveryCode);
    if (code.length < 12) {
        throw createHttpError(400, 'Le code de recuperation doit contenir au moins 12 caracteres.');
    }
    const settings = await readJson(settingsFile, {});
    const salt = crypto.randomBytes(16).toString('hex');
    await writeJson(settingsFile, {
        ...settings,
        recoveryCodeSalt: salt,
        recoveryCodeHash: hashPassword(code, salt),
        recoveryUpdatedAt: new Date().toISOString()
    });
}

async function resetPasswordWithRecovery(recoveryCode, newPassword) {
    const settings = await readJson(settingsFile, {});
    if (!settings.recoveryCodeHash || !settings.recoveryCodeSalt) {
        throw createHttpError(400, 'Aucun code de recuperation n est configure.');
    }
    if (hashPassword(cleanString(recoveryCode), settings.recoveryCodeSalt) !== settings.recoveryCodeHash) {
        throw createHttpError(401, 'Code de recuperation invalide.');
    }
    const password = cleanString(newPassword);
    if (password.length < 8) {
        throw createHttpError(400, 'Le nouveau mot de passe doit contenir au moins 8 caracteres.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    await writeJson(settingsFile, {
        ...settings,
        adminPasswordSalt: salt,
        adminPasswordHash: hashPassword(password, salt),
        updatedAt: new Date().toISOString()
    });
}

function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

async function readBody(request) {
    const chunks = [];
    let size = 0;

    for await (const chunk of request) {
        size += chunk.length;
        if (size > 1024 * 1024) {
            throw createHttpError(413, 'Donnees trop volumineuses.');
        }
        chunks.push(chunk);
    }

    if (!chunks.length) {
        return {};
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
        throw createHttpError(400, 'JSON invalide.');
    }
}

async function saveUploadedImage(request) {
    const contentType = String(request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const extension = uploadTypes[contentType];
    if (!extension) {
        throw createHttpError(415, 'Format non accepte. Utilisez JPG, PNG, WebP ou GIF.');
    }

    const content = await readRawBody(request, 12 * 1024 * 1024);
    if (!content.length) {
        throw createHttpError(400, 'Aucune image recue.');
    }

    const originalName = decodeURIComponent(String(request.headers['x-file-name'] || 'image'));
    const safeBaseName = path.basename(originalName, path.extname(originalName))
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'image';
    const fileName = `${Date.now()}-${safeBaseName}-${crypto.randomBytes(4).toString('hex')}${extension}`;

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, fileName), content);

    return {
        message: 'Image ajoutee.',
        url: `./assets/uploads/${fileName}`
    };
}

async function readRawBody(request, maxSize) {
    const chunks = [];
    let size = 0;

    for await (const chunk of request) {
        size += chunk.length;
        if (size > maxSize) {
            throw createHttpError(413, 'Image trop volumineuse. Taille maximale : 12 Mo.');
        }
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

async function readJson(filePath, fallback) {
    try {
        return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
        return fallback;
    }
}

async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sanitizeContent(content = {}) {
    return {
        identity: {
            name: cleanString(content.identity?.name || 'MAMAFI').slice(0, 80),
            tagline: cleanString(content.identity?.tagline).slice(0, 200),
            logo: cleanString(content.identity?.logo || './assets/images/mamafi-logo.png')
        },
        styles: sanitizeStyles(content.styles || {}),
        hero: {
            title: sanitizeI18n(content.hero?.title),
            subtitle: sanitizeI18n(content.hero?.subtitle),
            button: sanitizeI18n(content.hero?.button),
            images: sanitizeImageList(content.hero?.images)
        },
        about: {
            title: sanitizeI18n(content.about?.title),
            text1: sanitizeI18n(content.about?.text1),
            text2: sanitizeI18n(content.about?.text2),
            image: sanitizeImage(content.about?.image)
        },
        impact: sanitizeImpactList(content.impact),
        actions: {
            title: sanitizeI18n(content.actions?.title),
            pageTitle: sanitizeI18n(content.actions?.pageTitle),
            intro: sanitizeI18n(content.actions?.intro),
            items: sanitizeActionList(content.actions?.items)
        },
        news: {
            title: sanitizeI18n(content.news?.title),
            intro: sanitizeI18n(content.news?.intro)
        },
        contents: sanitizeContentList(content.contents),
        socials: sanitizeSocials(content.socials || {}),
        partners: {
            title: sanitizeI18n(content.partners?.title),
            items: sanitizePartnerList(content.partners?.items)
        },
        intervention: {
            title: sanitizeI18n(content.intervention?.title),
            intro: sanitizeI18n(content.intervention?.intro),
            zones: sanitizeZoneList(content.intervention?.zones)
        },
        join: {
            title: sanitizeI18n(content.join?.title),
            subtitle: sanitizeI18n(content.join?.subtitle)
        },
        donation: {
            methods: sanitizeList(content.donation?.methods, ['name', 'details', 'logo'])
        },
        contact: {
            title: sanitizeI18n(content.contact?.title),
            intro: sanitizeI18n(content.contact?.intro),
            address: cleanString(content.contact?.address),
            email: cleanString(content.contact?.email),
            phone: cleanString(content.contact?.phone)
        },
        footer: {
            year: cleanString(content.footer?.year),
            legal: sanitizeI18n(content.footer?.legal)
        }
    };
}

function sanitizeStyles(styles) {
    return {
        primaryColor: cleanColor(styles.primaryColor, '#20a840'),
        accentColor: cleanColor(styles.accentColor, '#0b0f0c'),
        backgroundColor: cleanColor(styles.backgroundColor, '#f7fbf8'),
        fontFamily: cleanString(styles.fontFamily || 'Roboto').slice(0, 80),
        heroOverlay: cleanNumber(styles.heroOverlay, 0.55, 0, 0.9)
    };
}

function sanitizeActionList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => ({
        id: cleanString(item.id) || crypto.randomUUID(),
        category: cleanString(item.category).slice(0, 80),
        location: cleanString(item.location).slice(0, 200),
        period: cleanString(item.period).slice(0, 100),
        status: cleanString(item.status).slice(0, 100),
        title: sanitizeI18n(item.title),
        description: sanitizeI18n(item.description),
        details: sanitizeI18n(item.details),
        objectives: sanitizeI18n(item.objectives),
        results: sanitizeI18n(item.results),
        imageUrl: cleanString(item.imageUrl || './assets/images/1.jpg'),
        imageDisplay: sanitizeImageDisplay(item.imageDisplay),
        caption: sanitizeI18n(item.caption),
        gallery: sanitizeImageList(item.gallery)
    })).filter((item) => item.title.fr || item.title.mg || item.title.en);
}

function sanitizeContentList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => ({
        id: cleanString(item.id) || crypto.randomUUID(),
        category: cleanString(item.category || 'Association').slice(0, 80),
        date: cleanString(item.date).slice(0, 20),
        featured: Boolean(item.featured),
        title: sanitizeI18n(item.title),
        description: sanitizeI18n(item.description),
        details: sanitizeI18n(item.details || item.description),
        imageUrl: cleanString(item.imageUrl || './assets/images/5.jpg'),
        imageDisplay: sanitizeImageDisplay(item.imageDisplay),
        caption: sanitizeI18n(item.caption)
    })).filter((item) => item.title.fr || item.title.mg || item.title.en);
}

function sanitizeImageList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((image) => ({
        id: cleanString(image.id) || crypto.randomUUID(),
        url: cleanString(image.url),
        caption: sanitizeI18n(image.caption),
        display: sanitizeImageDisplay(image.display)
    })).filter((image) => image.url);
}

function sanitizeImage(image = {}) {
    return {
        url: cleanString(image.url),
        caption: sanitizeI18n(image.caption),
        display: sanitizeImageDisplay(image.display)
    };
}

function sanitizeSocials(socials) {
    return {
        facebook: cleanUrl(socials.facebook),
        instagram: cleanUrl(socials.instagram),
        youtube: cleanUrl(socials.youtube),
        linkedin: cleanUrl(socials.linkedin)
    };
}

function sanitizeImpactList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => ({
        id: cleanString(item.id) || crypto.randomUUID(),
        value: cleanString(item.value).slice(0, 30),
        label: sanitizeI18n(item.label)
    })).filter((item) => item.value);
}

function sanitizePartnerList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => ({
        id: cleanString(item.id) || crypto.randomUUID(),
        name: cleanString(item.name),
        logo: cleanString(item.logo),
        url: cleanUrl(item.url)
    })).filter((item) => item.name);
}

function sanitizeZoneList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((zone) => ({
        id: cleanString(zone.id) || crypto.randomUUID(),
        name: cleanString(zone.name),
        latitude: cleanCoordinate(zone.latitude, -90, 90),
        longitude: cleanCoordinate(zone.longitude, -180, 180),
        description: sanitizeI18n(zone.description)
    })).filter((zone) => zone.name);
}

function sanitizeImageDisplay(display = {}) {
    return {
        height: cleanInteger(display.height, 240, 100, 900),
        positionX: cleanInteger(display.positionX, 50, 0, 100),
        positionY: cleanInteger(display.positionY, 50, 0, 100),
        brightness: cleanInteger(display.brightness, 100, 20, 200),
        contrast: cleanInteger(display.contrast, 100, 20, 200),
        saturation: cleanInteger(display.saturation, 100, 0, 200),
        rotation: cleanInteger(display.rotation, 0, -180, 180)
    };
}

function sanitizeDonation(donation) {
    const supportType = cleanString(donation.supportType);

    if (!cleanString(donation.name) || !cleanString(donation.email) || !['donateur', 'benevole'].includes(supportType)) {
        throw createHttpError(400, 'Demande invalide.');
    }

    return {
        supportType,
        name: cleanString(donation.name),
        email: cleanString(donation.email),
        phone: cleanString(donation.phone),
        message: cleanString(donation.message)
    };
}

function sanitizeList(value, keys) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => ({
        id: cleanString(item.id) || crypto.randomUUID(),
        ...keys.reduce((result, key) => {
            result[key] = cleanString(item[key]);
            return result;
        }, {})
    })).filter((item) => keys.some((key) => item[key]));
}

function sanitizeI18n(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
            fr: cleanString(value.fr),
            mg: cleanString(value.mg),
            en: cleanString(value.en)
        };
    }

    return {
        fr: cleanString(value),
        mg: '',
        en: ''
    };
}

function cleanString(value = '') {
    return String(value || '').trim().slice(0, 3000);
}

function cleanUrl(value = '') {
    const url = cleanString(value);
    if (!url) {
        return '';
    }

    return url.startsWith('https://') || url.startsWith('http://') ? url : '';
}

function cleanColor(value, fallback) {
    const color = cleanString(value);
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function cleanNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return String(fallback);
    }
    return String(Math.min(max, Math.max(min, number)));
}

function cleanInteger(value, fallback, min, max) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, number));
}

function cleanCoordinate(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return 0;
    }
    return Math.min(max, Math.max(min, number));
}

function sendJson(response, statusCode, payload) {
    if (response.headersSent) {
        return;
    }

    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN'
    });
    response.end(JSON.stringify(payload));
}

function createHttpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
