let soundVolume = 0.5;
let audioContext = null;
const DISCORD_ID = '735161344894042167';
const GITHUB_USERNAME = 'sudiptoodip';
const planets = ['Make her feel like art!', 'Virtually active, Reality sucks!', 'Cloaked in Mystery!', 'You talk like a hater & stare like a lover!', 'Foodie | Traveler | Developer', 'All sins are attempt to fill voids!', 'Every night lost to endless thoughts!'];
const tracks = [null, null, null];
let perfProfile = { low: false };

function detectPerfProfile() {
    const reasons = [];
    try { if (navigator.connection && navigator.connection.saveData) reasons.push('save-data'); } catch {}
    try { const m = navigator.deviceMemory; if (m > 0 && m <= 4) reasons.push('low-memory'); } catch {}
    try { const c = navigator.hardwareConcurrency; if (c > 0 && c <= 4) reasons.push('low-cores'); } catch {}
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) reasons.push('reduced-motion'); } catch {}
    try {
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const cores = navigator.hardwareConcurrency;
        if (coarse && cores > 0 && cores <= 4) reasons.push('coarse-pointer');
    } catch {}
    return { low: reasons.length > 0 };
}

function ensureLazyVideoLoaded(video) {
    if (!video) return;
    const sources = video.querySelectorAll('source[data-src]');
    let changed = false;
    sources.forEach(s => { if (!s.getAttribute('src')) { s.setAttribute('src', s.dataset.src || ''); changed = true; } });
    if (changed) try { video.load(); } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
    perfProfile = detectPerfProfile();
    if (perfProfile.low) document.documentElement.dataset.perf = 'low';

    tracks[0] = document.getElementById('music1');
    tracks[1] = document.getElementById('music2');
    tracks[2] = document.getElementById('music3');

    setupVolumeControl();
    setupMagicCursor();
    setupSocialLinks();
    fetchLanyardData();
    refreshMetaStats();
    trackVisitor();
    setRandomLocation();
    initSwiper();

    let lanyardTimer = null;
    let metaTimer = null;
    const startTimers = () => {
        if (!lanyardTimer) lanyardTimer = setInterval(fetchLanyardData, 30000);
        if (!metaTimer) metaTimer = setInterval(refreshMetaStats, 600000);
    };
    const stopTimers = () => {
        clearInterval(lanyardTimer); lanyardTimer = null;
        clearInterval(metaTimer); metaTimer = null;
    };

    startTimers();
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopTimers();
        else { fetchLanyardData(); refreshMetaStats(); startTimers(); }
    });
});

function ensureAudioContext() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
}

function syncSwiperNavTheme(swiper) {
    const el = document.querySelector('.swiper-container');
    if (el) el.dataset.navTheme = String((swiper.realIndex % 3) + 1);
}

function syncActiveSlideVideo(swiper) {
    document.querySelectorAll('.slide-video').forEach(v => { try { v.pause(); } catch {} });
    const activeSlide = swiper?.slides?.[swiper.activeIndex];
    const activeVideo = activeSlide?.querySelector('.slide-video');
    if (activeVideo) {
        ensureLazyVideoLoaded(activeVideo);
        activeVideo.play().catch(() => {
            document.addEventListener('click', () => activeVideo.play().catch(() => {}), { once: true });
        });
    }
}

function initSwiper() {
    const swiper = new Swiper('.swiper-container', {
        loop: !perfProfile.low,
        speed: 600,
        grabCursor: true,
        centeredSlides: true,
        pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        keyboard: { enabled: true }
    });

    syncSwiperNavTheme(swiper);
    syncActiveSlideVideo(swiper);
    swiper.on('slideChange', () => {
        syncSwiperNavTheme(swiper);
        switchTrack(swiper.realIndex);
        syncActiveSlideVideo(swiper);
    });

    const startMusic = () => {
        ensureAudioContext();
        switchTrack(swiper.realIndex);
        document.removeEventListener('click', startMusic);
        document.removeEventListener('keydown', startMusic);
    };
    document.addEventListener('click', startMusic);
    document.addEventListener('keydown', startMusic);
}

function switchTrack(index) {
    tracks.forEach((t, i) => {
        if (!t) return;
        if (i === index) { t.volume = soundVolume; t.play().catch(() => {}); }
        else { t.pause(); t.currentTime = 0; }
    });
}

function setRandomLocation() {
    const loc = planets[Math.floor(Math.random() * planets.length)];
    ['location', 'location2', 'location3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = loc;
    });
}

function presenceFromLanyard(payload) {
    const d = payload.data;
    if (!d) return null;
    if (d.listening_to_spotify && d.spotify) {
        const sp = d.spotify;
        return { label: 'Now playing', body: `${sp.song} · ${sp.artist}`, art: sp.album_art_url || null };
    }
    const acts = d.activities || [];
    const playing = acts.find(a => a.type === 0 && a.name);
    if (playing) {
        let body = playing.name;
        if (playing.details) body += ` — ${playing.details}`;
        if (playing.state) body += ` · ${playing.state}`;
        return { label: 'In game', body, art: null };
    }
    const watching = acts.find(a => a.type === 3 && a.name);
    if (watching) {
        let body = watching.name;
        if (watching.details) body += ` — ${watching.details}`;
        return { label: 'Watching', body, art: null };
    }
    return null;
}

function applyPresenceToSlides(presence) {
    ['', '2', '3'].forEach(s => {
        const row = document.getElementById(`presenceRow${s}`);
        const art = document.getElementById(`presenceArt${s}`);
        const label = document.getElementById(`presenceLabel${s}`);
        const text = document.getElementById(`presenceText${s}`);
        if (!row || !label || !text) return;
        if (!presence) {
            row.hidden = true;
            if (art) { art.hidden = true; art.removeAttribute('src'); }
            label.textContent = '';
            text.textContent = '';
            return;
        }
        row.hidden = false;
        label.textContent = presence.label;
        text.textContent = presence.body;
        if (art) {
            if (presence.art) { art.src = presence.art; art.hidden = false; }
            else { art.hidden = true; art.removeAttribute('src'); }
        }
    });
}

async function fetchLanyardData() {
    try {
        const data = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`).then(r => r.json());
        if (!data.success) { applyPresenceToSlides(null); return; }

        console.log(data)
        const user = data.data.discord_user;
        const status = data.data.discord_status;
        const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
        const displayName = user.display_name || user.global_name;
        const statusMap = {
            online: { text: 'Online', color: '#43b581' },
            idle:   { text: 'Idle',   color: '#faa61a' },
            dnd:    { text: 'Do Not Disturb', color: '#f04747' },
            offline:{ text: 'Offline', color: '#747f8d' }
        };
        const currentStatus = statusMap[status] || statusMap.offline;

        applyPresenceToSlides(presenceFromLanyard(data));

        ['', '2', '3'].forEach(s => {
            const get = id => document.getElementById(id + s);
            const avatar = get('discordAvatar'), dtAvatar = get('dogtagAvatar');
            const name = get('discordName'), dtName = get('dogtagName');
            const dtUser = get('dogtagUsername'), dot = get('statusDot'), txt = get('statusText');
            if (avatar)   avatar.src = avatarUrl;
            if (dtAvatar) dtAvatar.src = avatarUrl;
            if (name) name.textContent = "Sudipto Chowdhury";
            if (dtName)   dtName.innerHTML = `${displayName} `;
            if (dtUser)   dtUser.textContent = `@${user.username}`;
            if (dot)      dot.style.color = currentStatus.color;
            if (txt)      txt.textContent = currentStatus.text;
        });
    } catch (e) {
        console.error('Lanyard fetch failed:', e);
        applyPresenceToSlides(null);
    }
}

async function fetchGitHubPublicProfile() {
    if (!GITHUB_USERNAME) return null;
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}`);
    if (!res.ok) return null;
    const j = await res.json();
    return { followers: j.followers, repos: j.public_repos };
}

async function refreshMetaStats() {
    try {
        const gh = await fetchGitHubPublicProfile();
        const html = gh
            ? `<span class="badge rounded-pill bg-black bg-opacity-25 text-white border border-white border-opacity-10 px-3 py-2 fw-semibold meta-badge" title="GitHub @${GITHUB_USERNAME}"><i class="fab fa-github" aria-hidden="true"></i>${gh.followers} followers · ${gh.repos} repos</span>`
            : '';
        ['metaStats', 'metaStats2', 'metaStats3'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });
    } catch (e) {
        console.warn('GitHub fetch failed:', e);
    }
}

function trackVisitor() {
    const visitors = (parseInt(localStorage.getItem('visitorCount') || '0') + 1);
    localStorage.setItem('visitorCount', visitors);
    ['visitorCount', 'visitorCount2', 'visitorCount3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = visitors;
    });
}

function setupVolumeControl() {
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeControl = document.getElementById('volumeControl');

    volumeBtn.addEventListener('click', () => volumeSlider.classList.toggle('active'));
    volumeControl.addEventListener('input', e => {
        soundVolume = e.target.value / 100;
        const icon = document.querySelector('#volumeBtn .icon');
        icon.textContent = soundVolume === 0 ? '🔇' : soundVolume < 0.5 ? '🔉' : '🔊';
        tracks.forEach(t => { if (t) t.volume = soundVolume; });
    });
    document.addEventListener('click', e => {
        if (!volumeBtn.contains(e.target) && !volumeSlider.contains(e.target))
            volumeSlider.classList.remove('active');
    });
}

function playSound(soundName) {
    if (soundVolume === 0) return;
    ensureAudioContext();
    const freq = soundName === 'hover' ? 800 : 600;
    const dur  = soundName === 'hover' ? 0.1  : 0.2;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    const t = audioContext.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(soundVolume * 0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur - 0.01);
    osc.start(t); osc.stop(t + dur);
}

function setupSocialLinks() {
    document.querySelectorAll('.social-link').forEach(link => {
        link.addEventListener('mouseenter', () => playSound('hover'));
        link.addEventListener('click', () => playSound('click'));
        link.addEventListener('mouseleave', () => {
            link.classList.add('shatter');
            setTimeout(() => link.classList.remove('shatter'), 500);
        });
    });
}

function setupMagicCursor() {
    const canvas = document.getElementById('cursorCanvas');
    if (!canvas) return;
    if (perfProfile.low || !window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        canvas.style.display = 'none';
        return;
    }

    const ctx = canvas.getContext('2d');
    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    let resizeRaf = null;
    window.addEventListener('resize', () => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => { resizeRaf = null; resize(); });
    }, { passive: true });

    const stars = [];
    const MAX_STARS = 40;

    class Star {
        constructor(x, y) {
            this.x = x; this.y = y;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 1.6;
            this.speedY = (Math.random() - 0.5) * 1.6;
            this.life = 1;
            this.decay = Math.random() * 0.05 + 0.02;
            this.color = `hsl(${Math.random() * 60 + 180},100%,${Math.random() * 30 + 60}%)`;
        }
        update() { this.x += this.speedX; this.y += this.speedY; this.life -= this.decay; this.size *= 0.97; }
        draw() {
            ctx.globalAlpha = this.life;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    let rafId = null, pointerRaf = null, lastPointer = null;

    document.addEventListener('pointermove', e => {
        lastPointer = { x: e.clientX, y: e.clientY };
        if (pointerRaf) return;
        pointerRaf = requestAnimationFrame(() => {
            pointerRaf = null;
            if (!lastPointer) return;
            stars.push(new Star(lastPointer.x, lastPointer.y));
            if (stars.length > MAX_STARS) stars.shift();
            if (!rafId) animate();
        });
    }, { passive: true });

    function animate() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (let i = stars.length - 1; i >= 0; i--) {
            stars[i].update(); stars[i].draw();
            if (stars[i].life <= 0) stars.splice(i, 1);
        }
        rafId = stars.length ? requestAnimationFrame(animate) : null;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = null; }
        else if (!document.hidden && stars.length && !rafId) animate();
    });
}
