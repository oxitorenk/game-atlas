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
    searchDropdown: document.getElementById('search-dropdown'),
    backBtn: document.getElementById('back-btn'),
    detailHero: document.getElementById('detail-hero'),
    detailHeroBlur: document.getElementById('detail-hero-blur'),
    detailName: document.getElementById('detail-name'),
    detailStatus: document.getElementById('detail-status'),
    detailSections: document.getElementById('detail-sections'),
    detailParallax: document.getElementById('detail-parallax-container'),
    backToTopBtn: document.getElementById('back-to-top-btn')
};

async function init() {
    loadState();
    await fetchGames();

    // Bind Search Events for Modern Dropdown
    ui.searchInput.addEventListener('input', (e) => {
        _state.searchQuery = e.target.value;
        renderSearchDropdown();
        saveState();
    });

    ui.searchInput.addEventListener('focus', () => {
        if (_state.searchQuery.trim().length > 0) {
            ui.searchDropdown.classList.remove('hidden');
        }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.ios-search-container')) {
            ui.searchDropdown.classList.add('hidden');
        }
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
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;

    // Back to Top Logic
    ui.backToTopBtn.addEventListener('click', () => {
        ui.detailParallax.scrollTo({ top: 0, behavior: 'smooth' });
    });

    ui.detailParallax.addEventListener('scroll', () => {
        if (ui.detailParallax.scrollTop > 300) {
            ui.backToTopBtn.classList.remove('hidden');
        } else {
            ui.backToTopBtn.classList.add('hidden');
        }
    });
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

    // Reset Scroll Positions
    window.scrollTo(0, 0);
    if (_state.currentView === 'detail') {
        ui.detailParallax.scrollTop = 0;
        ui.backToTopBtn.classList.add('hidden');
        ui.detailHeroBlur.style.opacity = 0;
    }
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

function renderSearchDropdown() {
    const query = _state.searchQuery.toLowerCase().trim();
    if (query.length === 0) {
        ui.searchDropdown.classList.add('hidden');
        ui.searchDropdown.innerHTML = '';
        return;
    }

    const results = [];

    _state.games.forEach(g => {
        // Name match
        if (g.name.toLowerCase().includes(query)) {
            results.push({ game: g, type: 'Game', label: g.name, target: '' });
        }

        // Tag match
        if (g.tags) {
            g.tags.forEach(t => {
                if (t.toLowerCase().includes(query)) {
                    results.push({ game: g, type: 'Tag', label: t, target: '' });
                }
            });
        }

        // Mechanic match
        if (g.mechanics) {
            g.mechanics.forEach(m => {
                if (m.title && m.title.toLowerCase().includes(query)) {
                    results.push({ game: g, type: 'Mechanic', label: m.title, target: slugify(m.title) });
                }
            });
        }

        // UI/UX match
        if (g.uiux) {
            g.uiux.forEach(u => {
                if (u.title && u.title.toLowerCase().includes(query)) {
                    results.push({ game: g, type: 'Interface', label: u.title, target: slugify(u.title) });
                }
            });
        }
    });

    if (results.length === 0) {
        ui.searchDropdown.innerHTML = '<div class="search-dropdown-empty">No results found.</div>';
    } else {
        ui.searchDropdown.innerHTML = results.map(res => `
            <div class="search-dropdown-item" onclick="handleDropdownSelect('${res.game.id}', '${res.target}')">
                <img class="search-dropdown-thumb" src="${res.game.thumbnail || ''}" alt="">
                <div class="search-dropdown-info">
                    <span class="search-dropdown-title">${res.game.name}</span>
                    <span class="search-dropdown-tags"><strong>${res.type}:</strong> ${res.label}</span>
                </div>
            </div>
        `).join('');
    }

    ui.searchDropdown.classList.remove('hidden');
}

window.handleDropdownSelect = function (gameId, targetId = '') {
    ui.searchDropdown.classList.add('hidden');

    // Clear search context after selection
    ui.searchInput.value = '';
    _state.searchQuery = '';
    saveState();

    navigate('detail', gameId);

    // Scroll to specific section after detail page is loaded
    if (targetId) {
        setTimeout(() => {
            const targetEl = document.getElementById(`section-${targetId}`);
            if (targetEl && ui.detailParallax) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add highlight pulse
                targetEl.classList.add('highlight-pulse');
                setTimeout(() => {
                    targetEl.classList.remove('highlight-pulse');
                }, 4000);
            }
        }, 500);
    }
}

function renderHome() {
    // The main grid no longer filters on input, serving as the "explore all" view.
    const games = _state.games;

    if (games.length === 0) {
        ui.gamesList.innerHTML = '<div class="ios-cell"><div class="ios-cell-content"><span class="ios-cell-label">Game not found.</span></div></div>';
        ui.gamesList.className = 'ios-list';
        return;
    }

    ui.gamesList.className = 'ios-grid';
    ui.gamesList.innerHTML = games.map(game => `
        <div class="ios-grid-card" onclick="navigate('detail', '${game.id}')">
            <div class="ios-grid-card-image-wrapper">
                <img class="ios-grid-card-image" src="${game.thumbnail || ''}" alt="${game.name}">
                <div class="ios-grid-card-badge ${game.completed === true ? 'completed' : 'dropped'}">
                    <span class="badge-icon">${game.completed === true ? '✓' : 'II'}</span>
                    <span class="badge-text">${game.completed === true ? 'Completed' : 'Dropped'}</span>
                </div>
            </div>
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

    const iconPaths = {
        'star.fill': 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        'hand.thumbsup.fill': 'M13.12 2.06L7.58 7.6c-.37.37-.58.88-.58 1.41V19c0 1.1.9 2 2 2h9c.8 0 1.52-.48 1.84-1.21l3.26-7.61C23.94 10.2 23.94 10 23.94 9.8c0-1.1-.9-2-2-2H14.69l.92-4.44c.08-.34 0-.7-.21-.99-.21-.29-.54-.46-.9-.46h-.5l-.88.15z',
        'hand.point.down.fill': 'M11 2h2v10.24l3.29-3.29 1.42 1.42L12 16.08l-5.71-5.71 1.42-1.42L11 12.24V2zM7 18h10v2H7v-2z',
        'hand.thumbsdown.fill': 'M10.88 21.94l5.54-5.54c.37-.37.58-.88.58-1.41V5c0-1.1-.9-2-2-2H6c-.8 0-1.52.48-1.84 1.21L.9 11.82c-.06.14-.09.31-.09.49 0 1.1.9 2 2 2h7.25l-.92 4.44c-.08.34 0 .7.21.99.21.29.54.46.9.46h.5l.88-.15z',
        'gearshape.fill': 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.01-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
        'eye.fill': 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
        'checkmark': 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
        'pause': 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'
    };

    ui.detailHero.src = game.hero || '';
    ui.detailHeroBlur.src = game.hero || '';
    ui.detailName.textContent = game.name;

    // Status Badge
    const isCompleted = game.completed === true;
    const statusText = isCompleted ? 'Completed' : 'Dropped';
    const statusClass = isCompleted ? 'status-badge-completed' : 'status-badge-dropped';
    const statusIcon = isCompleted ? 'checkmark' : 'pause';

    ui.detailStatus.innerHTML = `
        <div class="status-badge ${statusClass}">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="${iconPaths[statusIcon]}"/>
            </svg>
            <span>${statusText}</span>
        </div>
    `;

    const sections = [
        { id: 'perfect', title: 'PERFECT', icon: 'star.fill', color: '#FFD60A', content: game.perfect },
        { id: 'good', title: 'GOOD', icon: 'hand.thumbsup.fill', color: '#32D74B', content: game.good },
        { id: 'poor', title: 'POOR', icon: 'hand.point.down.fill', color: '#FF9F0A', content: game.poor },
        { id: 'terrible', title: 'TERRIBLE', icon: 'hand.thumbsdown.fill', color: '#FF453A', content: game.terrible },
        { id: 'mechanics', title: 'MECHANICS', icon: 'gearshape.fill', color: '#0A84FF', content: game.mechanics },
        { id: 'uiux', title: 'UI / UX', icon: 'eye.fill', color: '#AF52DE', content: game.uiux }
    ];

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

    const renderStructuredSection = (sectionData, color, icon, sectionId) => {
        if (!sectionData || sectionData.length === 0) return '';

        if (sectionId === 'uiux') {
            return `
                <div class="uiux-gallery">
                    ${sectionData.map(sub => {
                const subSectionId = sub.title ? slugify(sub.title) : '';
                return `
                            <div class="uiux-card" ${subSectionId ? `id="section-${subSectionId}"` : ''} onclick="openLightbox('${sub.images[0]}')">
                                <div class="uiux-card-image-wrapper">
                                    <img class="uiux-card-image" src="${sub.images[0]}" alt="${sub.title || 'Interface'}">
                                </div>
                                ${sub.title ? `<div class="uiux-card-caption">${sub.title}</div>` : ''}
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        return sectionData.map(sub => {
            const subSectionId = sub.title ? slugify(sub.title) : '';

            let contentHtml = '';
            if (sub.text) {
                if (sectionId === 'mechanics') {
                    // Check if the text is a markdown list
                    const listItems = sub.text.split('\n').filter(line => line.trim().startsWith('*'));
                    if (listItems.length > 0) {
                        contentHtml = `
                            <ul class="mechanics-list">
                                ${listItems.map(item => `<li>${item.trim().replace(/^\*\s*/, '')}</li>`).join('')}
                            </ul>
                        `;
                    } else {
                        contentHtml = `<div class="detail-card">${sub.text.replace(/\n/g, '<br>')}</div>`;
                    }
                } else {
                    contentHtml = `<div class="detail-card">${sub.text.replace(/\n/g, '<br>')}</div>`;
                }
            }

            return `
                <div class="detail-subsection" ${subSectionId ? `id="section-${subSectionId}"` : ''}>
                    ${sub.title ? `<div class="detail-subsection-title">${sub.title}</div>` : ''}
                    ${contentHtml}
                    ${sub.images && sub.images.length > 0 ? `
                        <div class="detail-gallery">
                            ${sub.images.map(img => `
                                <img class="detail-gallery-image" src="${img}" alt="${sub.title || 'Image'}" onclick="openLightbox('${img}')">
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
                    ${renderStructuredSection(s.content, s.color, s.icon, s.id)}
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
                
                // PERFORMANCE OPTIMIZATION: 
                // Using opacity blending instead of real-time filter:blur() updates.
                const blurOpacity = Math.min(scrollTop / 200, 1); 
                const scaleVal = 1 + (scrollTop / 1000);
                const transformVal = `scale(${scaleVal}) translateY(${scrollTop * 0.3}px)`;

                ui.detailHeroBlur.style.opacity = blurOpacity;
                ui.detailHero.style.transform = transformVal;
                ui.detailHeroBlur.style.transform = transformVal;

                ticking = false;
            });
            ticking = true;
        }
    };

    // The scroll reset logic is now handled globally in updateViewDOM 
    // to ensure it triggers after the view is made visible.
    ui.detailHero.style.transform = 'scale(1) translateY(0px)';
    ui.detailHeroBlur.style.transform = 'scale(1) translateY(0px)';
    ui.detailHeroBlur.style.opacity = 0;
}

init();
function openLightbox(imgSrc) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    lightboxImg.src = imgSrc;
    lightbox.classList.remove('hidden');
    document.body.classList.add('no-scroll');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('hidden');
    document.body.classList.remove('no-scroll');
}
