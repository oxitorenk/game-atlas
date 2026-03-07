let _state = {
    currentView: 'home', // 'home', 'detail'
    selectedGame: null,
    games: [],
    searchQuery: '',
    version: '1.0.0'
};

const ui = {
    navbar: document.getElementById('navbar'),
    viewHome: document.getElementById('view-home'),
    viewDetail: document.getElementById('view-detail'),
    gamesList: document.getElementById('games-list'),
    searchInput: document.getElementById('search-input'),
    backBtn: document.getElementById('back-btn'),
    detailHero: document.getElementById('detail-hero'),
    detailName: document.getElementById('detail-name'),
    detailSections: document.getElementById('detail-sections'),
    detailParallax: document.getElementById('detail-parallax-container')
};

async function init() {
    loadState();
    await fetchGames();

    // Bind Events
    ui.searchInput.addEventListener('input', (e) => {
        _state.searchQuery = e.target.value;
        renderHome();
        saveState();
    });

    ui.backBtn.addEventListener('click', () => {
        navigate('home');
    });

    // Routing
    window.addEventListener('popstate', handleRouting);
    handleRouting();

    // WikiLink Scroll Handler
    document.addEventListener('click', (e) => {
        const wikiLink = e.target.closest('.wiki-link');
        if (wikiLink) {
            e.preventDefault();
            const targetId = wikiLink.getAttribute('href').replace('#', '');
            const targetEl = document.getElementById(`section-${slugify(targetId)}`);
            if (targetEl && ui.detailParallax) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    // Global access for simple onclicks
    window.setView = setView;
    window.navigate = navigate;
}

const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('game');

    if (gameId) {
        _state.currentView = 'detail';
        _state.selectedGame = gameId;
        renderDetail(gameId);
    } else {
        _state.currentView = 'home';
        _state.selectedGame = null;
        renderHome();
    }
    updateViewDOM();
}

function navigate(view, gameId = null) {
    const url = new URL(window.location);
    if (view === 'detail' && gameId) {
        url.searchParams.set('game', gameId);
    } else {
        url.searchParams.delete('game');
    }

    window.history.pushState({}, '', url);
    handleRouting();
}

function setView(view, gameId = null) {
    navigate(view, gameId);
}

function updateViewDOM() {
    ui.viewHome.classList.toggle('hidden', _state.currentView !== 'home');
    ui.viewDetail.classList.toggle('hidden', _state.currentView !== 'detail');
    ui.backBtn.classList.toggle('hidden', _state.currentView === 'home');

    window.scrollTo(0, 0);
}

function saveState() {
    localStorage.setItem('game_atlas_state', JSON.stringify({
        searchQuery: _state.searchQuery,
        version: _state.version
    }));
}

function loadState() {
    const saved = localStorage.getItem('game_atlas_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        _state.searchQuery = parsed.searchQuery || '';
        ui.searchInput.value = _state.searchQuery;
    }
}

async function fetchGames() {
    try {
        const response = await fetch('data/data.json');
        _state.games = await response.json();
    } catch (err) {
        console.error('Error fetching games:', err);
        if (window.location.protocol === 'file:') {
            ui.gamesList.innerHTML = `<div class="ios-list-group">
                <div class="ios-cell"><div class="ios-cell-content">
                    <span class="ios-cell-label" style="color: var(--ios-red)">
                        Error: File protocol access denied.<br>
                        Please run via 'npx serve'.
                    </span>
                </div></div>
            </div>`;
        }
    }
}

function renderHome() {
    const query = _state.searchQuery.toLowerCase();
    const filtered = _state.games.filter(g =>
        g.name.toLowerCase().includes(query) ||
        (g.tags && g.tags.some(t => t.toLowerCase().includes(query))) ||
        (g.mechanics && g.mechanics.some(m => m.title && m.title.toLowerCase().includes(query))) ||
        (g.uiux && g.uiux.some(u => u.title && u.title.toLowerCase().includes(query)))
    );

    if (filtered.length === 0) {
        ui.gamesList.innerHTML = '<div class="ios-cell"><div class="ios-cell-content"><span class="ios-cell-label">Oyun bulunamadı.</span></div></div>';
        ui.gamesList.className = 'ios-list';
        return;
    }

    ui.gamesList.className = 'ios-grid';
    ui.gamesList.innerHTML = filtered.map(game => `
        <div class="ios-grid-card" onclick="navigate('detail', '${game.id}')">
            <img class="ios-grid-card-image" src="${game.thumbnail || ''}" alt="${game.name}">
            <div class="ios-grid-card-info">
                <div class="ios-grid-card-title">${game.name}</div>
                <div class="ios-grid-card-tag-wrapper">
                    ${(game.tags || []).map(tag => `<span class="ios-grid-card-tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderDetail(gameId) {
    const game = _state.games.find(g => g.id === gameId);
    if (!game) return;

    ui.detailHero.src = game.hero || '';
    ui.detailName.textContent = game.name;

    const sections = [
        { id: 'perfect', title: 'MÜKEMMEL', icon: 'star.fill', color: '#FFD60A', content: game.perfect },
        { id: 'good', title: 'İYİ', icon: 'hand.thumbsup.fill', color: '#32D74B', content: game.good },
        { id: 'poor', title: 'KÖTÜ', icon: 'hand.point.down.fill', color: '#FF9F0A', content: game.poor },
        { id: 'terrible', title: 'BERBAT', icon: 'hand.thumbsdown.fill', color: '#FF453A', content: game.terrible },
        { id: 'mechanics', title: 'MEKANİKLER', icon: 'gearshape.fill', color: '#0A84FF', content: game.mechanics },
        { id: 'uiux', title: 'ARAYÜZ / DENEYİM', icon: 'eye.fill', color: '#AF52DE', content: game.uiux }
    ];

    const iconPaths = {
        'star.fill': 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        'hand.thumbsup.fill': 'M13.12 2.06L7.58 7.6c-.37.37-.58.88-.58 1.41V19c0 1.1.9 2 2 2h9c.8 0 1.52-.48 1.84-1.21l3.26-7.61C23.94 10.2 23.94 10 23.94 9.8c0-1.1-.9-2-2-2H14.69l.92-4.44c.08-.34 0-.7-.21-.99-.21-.29-.54-.46-.9-.46h-.5l-.88.15z',
        'hand.point.down.fill': 'M11 2h2v10.24l3.29-3.29 1.42 1.42L12 16.08l-5.71-5.71 1.42-1.42L11 12.24V2zM7 18h10v2H7v-2z',
        'hand.thumbsdown.fill': 'M10.88 21.94l5.54-5.54c.37-.37.58-.88.58-1.41V5c0-1.1-.9-2-2-2H6c-.8 0-1.52.48-1.84 1.21L.9 11.82c-.06.14-.09.31-.09.49 0 1.1.9 2 2 2h7.25l-.92 4.44c-.08.34 0 .7.21.99.21.29.54.46.9.46h.5l.88-.15z',
        'gearshape.fill': 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.01-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
        'eye.fill': 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'
    };

    const renderList = (items, iconClass) => {
        if (!items || items.length === 0) return '';

        return `
            <ul class="ios-bullet-list ${iconClass}">
                ${items.map(item => {
            if (typeof item === 'string') {
                return `<li>${item}</li>`;
            } else if (typeof item === 'object') {
                return `
                            <li>
                                ${item.text}
                                ${item.children ? renderList(item.children, '') : ''}
                            </li>
                        `;
            }
            return '';
        }).join('')}
            </ul>
        `;
    };

    const renderStructuredSection = (sectionData, color, icon) => {
        if (!sectionData || sectionData.length === 0) return '';

        return sectionData.map(sub => {
            const sectionId = sub.title ? slugify(sub.title) : '';
            return `
                <div class="detail-subsection" ${sectionId ? `id="section-${sectionId}"` : ''}>
                    ${sub.title ? `<div class="detail-subsection-title">${sub.title}</div>` : ''}
                    ${sub.text ? `<div class="detail-card">${sub.text.replace(/\n/g, '<br>')}</div>` : ''}
                    ${sub.images && sub.images.length > 0 ? `
                        <div class="detail-gallery">
                            ${sub.images.map(img => `
                                <img class="detail-gallery-image" src="${img}" alt="${sub.title || 'Image'}" onclick="window.open('${img}', '_blank')">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    };

    ui.detailSections.innerHTML = sections.map(s => {
        const isStructured = Array.isArray(s.content) && s.content.length > 0 && typeof s.content[0] === 'object' && ('title' in s.content[0]);

        if (isStructured) {
            return `
                <div class="detail-section">
                    <div class="detail-section-header">
                        <svg class="detail-section-icon" viewBox="0 0 24 24" fill="${s.color}">
                            <path d="${iconPaths[s.icon] || ''}"/>
                        </svg>
                        <span class="detail-section-title">${s.title}</span>
                    </div>
                    ${renderStructuredSection(s.content, s.color, s.icon)}
                </div>
            `;
        } else {
            const hasContent = Array.isArray(s.content) ? s.content.length > 0 : s.content && s.content.trim();
            if (!hasContent) return '';

            return `
                <div class="detail-section">
                    <div class="detail-section-header">
                        <svg class="detail-section-icon" viewBox="0 0 24 24" fill="${s.color}">
                            <path d="${iconPaths[s.icon] || ''}"/>
                        </svg>
                        <span class="detail-section-title">${s.title}</span>
                    </div>
                    <div class="detail-card">
                        ${Array.isArray(s.content)
                    ? renderList(s.content, `ios-bullet-list-${s.icon.replace(/\./g, '-')}`)
                    : s.content.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        }
    }).join('');


    let ticking = false;
    ui.detailParallax.onscroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = ui.detailParallax.scrollTop;
                const blurVal = Math.min(scrollTop / 15, 12);
                const scaleVal = 1 + (scrollTop / 1000);

                ui.detailHero.style.filter = `blur(${blurVal}px)`;
                ui.detailHero.style.transform = `scale(${scaleVal}) translateY(${scrollTop * 0.3}px)`;

                ticking = false;
            });
            ticking = true;
        }
    };

    ui.detailParallax.scrollTop = 0;
    ui.detailHero.style.filter = 'blur(0px)';
    ui.detailHero.style.transform = 'scale(1) translateY(0px)';
}

init();
