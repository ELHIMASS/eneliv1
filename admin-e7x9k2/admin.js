// ===== ENELIV ADMIN - Blog Manager =====
const ADMIN_PASSWORD = 'eneliv2025';
const STORAGE_KEY = 'eneliv_blog_articles';
const SESSION_KEY = 'eneliv_admin_session';

const CATEGORIES = [
    'Aides financières',
    'AMO de copropriété',
    'Audit énergétique',
    'Étude thermique RE2020',
    'Audit Énergétique Industrie',
    'Plan pluriannuel de travaux (PPT)',
    'Rénovation énergétique',
    'Tertiaire'
];

let articles = [];
let editingId = null;
let currentFilter = 'tous';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    checkSession();
    setupEventListeners();
});

// ===== AUTH =====
function checkSession() {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        showApp();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const pwd = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    if (pwd === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        showApp();
    } else {
        errorEl.textContent = '❌ Mot de passe incorrect';
        errorEl.style.display = 'block';
        document.getElementById('loginPassword').value = '';
    }
}

function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderDashboard();
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
}

// ===== DATA =====
function loadArticles() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        articles = data ? JSON.parse(data) : [];
    } catch { articles = []; }
}

function saveArticles() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function generateId() {
    return 'art_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ===== RENDER =====
function renderDashboard() {
    renderStats();
    renderArticles();
}

function renderStats() {
    document.getElementById('statTotal').textContent = articles.length;
    const cats = [...new Set(articles.map(a => a.category))];
    document.getElementById('statCategories').textContent = cats.length;
    const thisMonth = articles.filter(a => {
        const d = new Date(a.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    document.getElementById('statMonth').textContent = thisMonth;
}

function renderArticles() {
    const grid = document.getElementById('articlesGrid');
    let filtered = currentFilter === 'tous' ? articles : articles.filter(a => a.category === currentFilter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-icon">📝</div>
                <div class="empty-title">${articles.length === 0 ? 'Aucun article' : 'Aucun article dans cette catégorie'}</div>
                <div class="empty-text">${articles.length === 0 ? 'Commencez par créer votre premier article de blog' : 'Essayez un autre filtre'}</div>
                ${articles.length === 0 ? '<button class="btn btn-primary" onclick="openEditor()">➕ Créer un article</button>' : ''}
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(article => {
        const date = new Date(article.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const excerpt = article.content ? article.content.replace(/<[^>]+>/g, '').substring(0, 120) + '...' : '';
        return `
        <div class="admin-card" data-id="${article.id}">
            ${article.image
                ? `<img src="${article.image}" alt="${article.title}" class="card-image">`
                : `<div class="card-image-placeholder">🖼️</div>`}
            <div class="card-body">
                <span class="card-tag">${article.category}</span>
                <h3 class="card-title-admin">${article.title}</h3>
                <p class="card-excerpt">${excerpt}</p>
                <div class="card-date">📅 ${date}</div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openEditor('${article.id}')">✏️ Modifier</button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDelete('${article.id}')">🗑️ Supprimer</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderFilterTags() {
    const bar = document.getElementById('filterBar');
    if (!bar) return;
    const usedCats = [...new Set(articles.map(a => a.category))];
    let html = `<span class="filter-tag ${currentFilter === 'tous' ? 'active' : ''}" onclick="filterArticles('tous')">Tous</span>`;
    usedCats.forEach(cat => {
        html += `<span class="filter-tag ${currentFilter === cat ? 'active' : ''}" onclick="filterArticles('${cat}')">${cat}</span>`;
    });
    bar.innerHTML = html;
}

function filterArticles(cat) {
    currentFilter = cat;
    renderFilterTags();
    renderArticles();
}

// ===== EDITOR =====
function openEditor(id = null) {
    editingId = id;
    const panel = document.getElementById('editorPanel');
    const title = document.getElementById('editorTitle');

    if (id) {
        const article = articles.find(a => a.id === id);
        if (!article) return;
        title.textContent = '✏️ Modifier l\'article';
        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleCategory').value = article.category;
        document.getElementById('richEditor').innerHTML = article.content || '';
        if (article.image) {
            const preview = document.getElementById('imagePreview');
            preview.src = article.image;
            document.querySelector('.image-upload').classList.add('has-image');
        }
    } else {
        title.textContent = '➕ Nouvel article';
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleCategory').value = '';
        document.getElementById('richEditor').innerHTML = '';
        document.getElementById('imagePreview').src = '';
        document.querySelector('.image-upload').classList.remove('has-image');
    }

    panel.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditor() {
    document.getElementById('editorPanel').classList.remove('active');
    document.body.style.overflow = '';
    editingId = null;
}

function saveArticle() {
    const title = document.getElementById('articleTitle').value.trim();
    const category = document.getElementById('articleCategory').value;
    const content = document.getElementById('richEditor').innerHTML;
    const imageEl = document.getElementById('imagePreview');
    const image = imageEl.src && !imageEl.src.includes('about:blank') ? imageEl.src : '';

    if (!title) { showToast('Veuillez entrer un titre', 'error'); return; }
    if (!category) { showToast('Veuillez sélectionner une catégorie', 'error'); return; }

    if (editingId) {
        const idx = articles.findIndex(a => a.id === editingId);
        if (idx !== -1) {
            articles[idx] = { ...articles[idx], title, category, content, image, updatedAt: new Date().toISOString() };
        }
        showToast('Article modifié avec succès ✅', 'success');
    } else {
        articles.unshift({
            id: generateId(),
            title,
            category,
            content,
            image,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        showToast('Article créé avec succès ✅', 'success');
    }

    saveArticles();
    closeEditor();
    renderDashboard();
    renderFilterTags();
}

// ===== IMAGE UPLOAD =====
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Fichier non valide. Utilisez une image.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Image trop volumineuse (max 5 Mo)', 'error'); return; }

    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('imagePreview').src = ev.target.result;
        document.querySelector('.image-upload').classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

function removeImage(e) {
    e.stopPropagation();
    document.getElementById('imagePreview').src = '';
    document.querySelector('.image-upload').classList.remove('has-image');
    document.getElementById('imageInput').value = '';
}

// ===== DELETE =====
let deleteTargetId = null;

function confirmDelete(id) {
    deleteTargetId = id;
    const article = articles.find(a => a.id === id);
    document.getElementById('deleteTitle').textContent = article ? article.title : '';
    document.getElementById('deleteModal').classList.add('active');
}

function cancelDelete() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteTargetId = null;
}

function executeDelete() {
    if (!deleteTargetId) return;
    articles = articles.filter(a => a.id !== deleteTargetId);
    saveArticles();
    cancelDelete();
    renderDashboard();
    renderFilterTags();
    showToast('Article supprimé 🗑️', 'info');
}

// ===== TOOLBAR =====
function execCmd(cmd, value = null) {
    document.execCommand(cmd, false, value);
    document.getElementById('richEditor').focus();
}

function insertLink() {
    const url = prompt('Entrez l\'URL :');
    if (url) execCmd('createLink', url);
}

// ===== TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ===== TAB SWITCHING =====
let currentTab = 'blog';

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('blogTab').style.display = tab === 'blog' ? '' : 'none';
    document.getElementById('refsTab').style.display = tab === 'refs' ? '' : 'none';

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    if (tab === 'blog') navItems[0].classList.add('active');
    if (tab === 'refs') navItems[1].classList.add('active');

    if (tab === 'refs') renderRefsDashboard();
}

// ===== REFERENCES MANAGEMENT (Railway API) =====
const API_URL = window.ENELIV_API_URL || 'http://192.168.1.25:3000';

let references = [];
let editingRefId = null;
let deleteRefTargetId = null;

async function loadRefs() {
    try {
        const res = await fetch(API_URL + '/api/references');
        if (!res.ok) throw new Error('API error ' + res.status);
        references = await res.json();
    } catch (err) {
        console.error('Failed to load refs:', err);
        showToast('Erreur de connexion au serveur', 'error');
        references = [];
    }
}

async function renderRefsDashboard() {
    await loadRefs();
    renderRefsStats();
    renderRefsGrid();
}

function renderRefsStats() {
    document.getElementById('statRefsTotal').textContent = references.length;
    const thisMonth = references.filter(r => {
        const d = new Date(r.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    document.getElementById('statRefsMonth').textContent = thisMonth;
}

function renderRefsGrid() {
    const grid = document.getElementById('refsGrid');
    if (references.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-icon">⭐</div>
                <div class="empty-title">Aucune référence</div>
                <div class="empty-text">Ajoutez vos réalisations pour les afficher sur le site</div>
                <button class="btn btn-primary" onclick="openRefEditor()">➕ Ajouter une référence</button>
            </div>`;
        return;
    }

    grid.innerHTML = references.map(ref => {
        const date = new Date(ref.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const excerpt = ref.text ? ref.text.substring(0, 120) + (ref.text.length > 120 ? '...' : '') : '';
        return `
        <div class="admin-card" data-id="${ref.id}">
            ${ref.image
                ? `<img src="${ref.image}" alt="Référence" class="card-image">`
                : `<div class="card-image-placeholder">🏗️</div>`}
            <div class="card-body">
                <span class="card-tag">Référence</span>
                ${ref.title ? `<h3 class="card-title" style="margin:4px 0 6px;font-size:1rem;color:#0B3041;">${ref.title}</h3>` : ''}
                <p class="card-excerpt">${excerpt}</p>
                <div class="card-date">📅 ${date}</div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openRefEditor('${ref.id}')">✏️ Modifier</button>
                    <button class="btn btn-danger btn-sm" onclick="confirmRefDelete('${ref.id}')">🗑️ Supprimer</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openRefEditor(id = null) {
    editingRefId = id;
    const panel = document.getElementById('refEditorPanel');
    const title = document.getElementById('refEditorTitle');

    if (id) {
        const ref = references.find(r => r.id === id);
        if (!ref) return;
        title.textContent = '✏️ Modifier la référence';
        document.getElementById('refTitle').value = ref.title || '';
        document.getElementById('refDate').value = ref.created_at ? new Date(ref.created_at).toISOString().split('T')[0] : '';
        document.getElementById('refText').value = ref.text || '';
        if (ref.image) {
            document.getElementById('refImagePreview').src = ref.image;
            document.getElementById('refImageUploadZone').classList.add('has-image');
        }
    } else {
        title.textContent = '➕ Nouvelle référence';
        document.getElementById('refTitle').value = '';
        document.getElementById('refDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('refText').value = '';
        document.getElementById('refImagePreview').src = '';
        document.getElementById('refImageUploadZone').classList.remove('has-image');
    }

    panel.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeRefEditor() {
    document.getElementById('refEditorPanel').classList.remove('active');
    document.body.style.overflow = '';
    editingRefId = null;
}

async function saveRef() {
    const title = document.getElementById('refTitle').value.trim();
    const dateVal = document.getElementById('refDate').value;
    const text = document.getElementById('refText').value.trim();
    const imageEl = document.getElementById('refImagePreview');
    const image = imageEl.src && !imageEl.src.includes('about:blank') ? imageEl.src : '';
    const created_at = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

    if (!title && !text && !image) { showToast('Ajoutez au moins un titre, une image ou du texte', 'error'); return; }

    try {
        if (editingRefId) {
            const res = await fetch(API_URL + '/api/references/' + editingRefId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, text, image, created_at })
            });
            if (!res.ok) throw new Error('Update failed');
            showToast('Référence modifiée ✅', 'success');
        } else {
            const res = await fetch(API_URL + '/api/references', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, text, image, created_at })
            });
            if (!res.ok) throw new Error('Create failed');
            showToast('Référence ajoutée ✅', 'success');
        }
    } catch (err) {
        console.error('Save ref error:', err);
        showToast('Erreur lors de la sauvegarde', 'error');
        return;
    }

    closeRefEditor();
    renderRefsDashboard();
}

function handleRefImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Fichier non valide. Utilisez une image.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Image trop volumineuse (max 5 Mo)', 'error'); return; }

    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('refImagePreview').src = ev.target.result;
        document.getElementById('refImageUploadZone').classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

function removeRefImage(e) {
    e.stopPropagation();
    document.getElementById('refImagePreview').src = '';
    document.getElementById('refImageUploadZone').classList.remove('has-image');
    document.getElementById('refImageInput').value = '';
}

function confirmRefDelete(id) {
    deleteRefTargetId = id;
    document.getElementById('deleteRefModal').classList.add('active');
}

function cancelRefDelete() {
    document.getElementById('deleteRefModal').classList.remove('active');
    deleteRefTargetId = null;
}

async function executeRefDelete() {
    if (!deleteRefTargetId) return;
    try {
        const res = await fetch(API_URL + '/api/references/' + deleteRefTargetId, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        showToast('Référence supprimée 🗑️', 'info');
    } catch (err) {
        console.error('Delete ref error:', err);
        showToast('Erreur lors de la suppression', 'error');
    }
    cancelRefDelete();
    renderRefsDashboard();
}

// ===== EVENTS =====
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Image upload drag & drop (blog)
    const uploadZone = document.querySelector('#editorPanel .image-upload');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
        uploadZone.addEventListener('drop', e => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) { document.getElementById('imageInput').files = e.dataTransfer.files; handleImageUpload({ target: { files: [file] } }); }
        });
    }

    // Image upload drag & drop (refs)
    const refUploadZone = document.getElementById('refImageUploadZone');
    if (refUploadZone) {
        refUploadZone.addEventListener('dragover', e => { e.preventDefault(); refUploadZone.classList.add('drag-over'); });
        refUploadZone.addEventListener('dragleave', () => refUploadZone.classList.remove('drag-over'));
        refUploadZone.addEventListener('drop', e => {
            e.preventDefault();
            refUploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) { document.getElementById('refImageInput').files = e.dataTransfer.files; handleRefImageUpload({ target: { files: [file] } }); }
        });
    }

    // Close editor on escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeEditor();
            closeRefEditor();
            cancelDelete();
            cancelRefDelete();
        }
    });

    // Editor panel backdrop click
    document.getElementById('editorPanel').addEventListener('click', e => {
        if (e.target === document.getElementById('editorPanel')) closeEditor();
    });
    document.getElementById('refEditorPanel').addEventListener('click', e => {
        if (e.target === document.getElementById('refEditorPanel')) closeRefEditor();
    });

    // Mobile sidebar
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            sidebarOverlay.classList.toggle('active');
        });
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Render filter tags
    renderFilterTags();

    // Load refs data
    loadRefs();
}
