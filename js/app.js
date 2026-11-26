/* ==========================================================================
   FORMULA 1 QATAR AIRWAYS QATAR GRAND PRIX 2026 — APPLICATION LOGIC
   Features:
   - Live WIB Clock & Real-Time Session Countdown (Auto + Manual Target)
   - URL Personalization (?to, role, pass, tribun + Admin Schedule Overrides)
   - Deterministic Pass ID & High-Density SVG Code-128 Style Barcode
   - WIB Schedule with AST (UTC+3) Toggle, Day Filter & .ics Downloads
   - Lusail Circuit Interactive SVG Sector Explorer & Leaflet Map (Street/Topo)
   - Interactive Guest RSVP stored in localStorage
   - PIN-Protected Organizer Admin Panel (Ctrl+Shift+A / Footer Button)
   - Zero native alert()/confirm() — Custom Modals & Toast Notifications
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     STORAGE KEYS & FACTORY DEFAULTS
     ------------------------------------------------------------------------ */
  const STORAGE_KEYS = {
    PIN: 'f1_qatar2026_admin_pin',
    CONFIG: 'f1_qatar2026_event_config',
    SCHEDULE: 'f1_qatar2026_schedule_wib',
    GUESTS: 'f1_qatar2026_guests',
    RSVPS: 'f1_qatar2026_rsvps',
    AUDIO: 'f1_qatar2026_audio_enabled'
  };

  const DEFAULT_PIN = '291126';

  /* Masukkan Project URL & Anon Key Supabase di sini agar aktif otomatis di semua perangkat */
  const DEFAULT_SUPABASE = {
    url: 'https://iibkptqxqwtuiekjpftn.supabase.co',
    anonKey: 'sb_publishable_xFZqbBmsib-VqlQqTMk7eg_A_YyWCDg'
  };

  const FACTORY_CONFIG = {
    title: 'Formula 1 Qatar Airways Qatar Grand Prix 2026',
    host: 'Paddock Club Indonesia & Lusail Motorsport Hospitality',
    dressCode: 'Smart Motorsport Casual / Team Apparel Resmi',
    defaultTribun: 'Main Grandstand - Zona A (Start/Finish)',
    baseUrl: '',
    supabaseUrl: 'https://iibkptqxqwtuiekjpftn.supabase.co',
    supabaseAnonKey: 'sb_publishable_xFZqbBmsib-VqlQqTMk7eg_A_YyWCDg'
  };

  const DEFAULT_GUEST = {
    name: 'Tamu Undangan VIP',
    role: 'Tamu Kehormatan Paddock & Komunitas Motorsport',
    pass: 'Paddock Club VIP',
    tribun: ''
  };

  const FACTORY_SESSIONS = [
    {
      id: 'fp1',
      code: 'FP1',
      shortLabel: 'FP1',
      name: 'Free Practice 1 (FP1)',
      subtitle: 'Sesi Latihan Bebas Pertama',
      dayKey: 'jumat',
      dayDisplay: 'Jumat, 27 Nov 2026',
      dateIso: '2026-11-27',
      startWib: '20:30',
      endWib: '21:30',
      isRace: false
    },
    {
      id: 'fp2',
      code: 'FP2',
      shortLabel: 'FP2',
      name: 'Free Practice 2 (FP2)',
      subtitle: 'Sesi Latihan Bebas Kedua (Malam)',
      dayKey: 'sabtu',
      dayDisplay: 'Sabtu, 28 Nov 2026',
      dateIso: '2026-11-28',
      startWib: '00:00',
      endWib: '01:00',
      isRace: false
    },
    {
      id: 'fp3',
      code: 'FP3',
      shortLabel: 'FP3',
      name: 'Free Practice 3 (FP3)',
      subtitle: 'Sesi Persiapan Kualifikasi',
      dayKey: 'sabtu',
      dayDisplay: 'Sabtu, 28 Nov 2026',
      dateIso: '2026-11-28',
      startWib: '21:30',
      endWib: '22:30',
      isRace: false
    },
    {
      id: 'quali',
      code: 'QUALI',
      shortLabel: 'Qualifying',
      name: 'Qualifying (Kualifikasi)',
      subtitle: 'Penentuan Posisi Grid Q1, Q2 & Q3',
      dayKey: 'minggu',
      dayDisplay: 'Minggu, 29 Nov 2026',
      dateIso: '2026-11-29',
      startWib: '01:00',
      endWib: '02:00',
      isRace: false
    },
    {
      id: 'race',
      code: 'RACE',
      shortLabel: 'Grand Prix Race',
      name: 'Grand Prix Race (57 Lap)',
      subtitle: 'Balapan Utama Malam Hari - Round 22',
      dayKey: 'minggu',
      dayDisplay: 'Minggu, 29 Nov 2026',
      dateIso: '2026-11-29',
      startWib: '23:00',
      endWib: '01:00',
      isRace: true
    }
  ];

  const SEED_GUESTS = [
    {
      id: 'g_seed_1',
      name: 'Bagas Prakoso',
      role: 'Ketua Komunitas F1 Jakarta',
      pass: 'Paddock Club VIP',
      tribun: 'Main Grandstand - Zona A (Start/Finish)',
      createdAt: '2026-11-20T10:00:00+07:00'
    },
    {
      id: 'g_seed_2',
      name: 'Nadia Pramesti',
      role: 'Scuderia Ferrari Club Indonesia',
      pass: 'Lusail Hospitality Lounge',
      tribun: 'Hospitality Deck - Paddock Utara',
      createdAt: '2026-11-21T14:15:00+07:00'
    },
    {
      id: 'g_seed_3',
      name: 'Rangga Mahendra',
      role: 'McLaren Papaya Crew ID',
      pass: 'Turn 1 Grandstand',
      tribun: 'Turn 1 Braking Zone - Blok B',
      createdAt: '2026-11-22T19:30:00+07:00'
    }
  ];

  const ID_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  /* ------------------------------------------------------------------------
     APPLICATION STATE
     ------------------------------------------------------------------------ */
  const state = {
    adminUnlocked: false,
    previewGuest: null,
    initialUrlParams: new URLSearchParams(window.location.search),
    countdownTargetMode: 'auto',
    activeScheduleDay: 'all',
    showAstReference: true,
    guestSearchQuery: '',
    activeSector: 'all',
    config: { ...FACTORY_CONFIG },
    sessions: [],
    guests: [],
    rsvps: [],
    audioPlaying: false,
    supabase: null,
    supabaseChannel: null,
    dbStatus: 'local',
    leafletMap: null,
    mapLayers: {}
  };

  /* ------------------------------------------------------------------------
     UTILITIES: SAFE STORAGE, ESCAPING, HASHING & TIME CONVERSION
     ------------------------------------------------------------------------ */
  function readStorageJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function writeStorageJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_err) {
      showToast('error', 'Penyimpanan Penuh', 'Gagal menyimpan perubahan ke localStorage browser.');
    }
  }

  function getAdminPin() {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.PIN) || DEFAULT_PIN;
    } catch (_err) {
      return DEFAULT_PIN;
    }
  }

  function setAdminPin(newPin) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.PIN, String(newPin));
    } catch (_err) {
      showToast('error', 'Gagal Menyimpan PIN', 'Tidak dapat mengakses penyimpanan lokal.');
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function pad2(num) {
    return String(Math.max(0, Math.floor(num))).padStart(2, '0');
  }

  function isValidTimeHm(val) {
    return typeof val === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(val.trim());
  }

  /**
   * Computes exact UTC start & end timestamps + AST (UTC+3) formatted strings
   * from a session's WIB base date (YYYY-MM-DD) and WIB start/end HH:MM.
   */
  function getSessionTiming(session) {
    const startMs = Date.parse(`${session.dateIso}T${session.startWib}:00+07:00`);
    let endMs = Date.parse(`${session.dateIso}T${session.endWib}:00+07:00`);
    if (endMs <= startMs) {
      endMs += 24 * 60 * 60 * 1000;
    }

    // AST is UTC+3
    const astOffsetMs = 3 * 60 * 60 * 1000;
    const wibOffsetMs = 7 * 60 * 60 * 1000;

    const startAstClock = new Date(startMs + astOffsetMs);
    const endAstClock = new Date(endMs + astOffsetMs);
    const startWibClock = new Date(startMs + wibOffsetMs);

    const startAstHm = `${pad2(startAstClock.getUTCHours())}:${pad2(startAstClock.getUTCMinutes())}`;
    const endAstHm = `${pad2(endAstClock.getUTCHours())}:${pad2(endAstClock.getUTCMinutes())}`;

    const astDayIndex = startAstClock.getUTCDay();
    const wibDayIndex = startWibClock.getUTCDay();
    const astDayPrefix = astDayIndex !== wibDayIndex ? `${ID_DAYS[astDayIndex]} ` : '';

    return {
      startMs,
      endMs,
      wibRange: `${session.startWib} \u2013 ${session.endWib} WIB`,
      wibRangePlain: `${session.startWib} - ${session.endWib} WIB`,
      astRange: `${astDayPrefix}${startAstHm} \u2013 ${endAstHm} AST`,
      astRangePlain: `${astDayPrefix}${startAstHm} - ${endAstHm} AST`
    };
  }

  /**
   * Deterministic FNV-1a 32-bit hash for Pass Code & SVG Barcode
   */
  function hashFnv1a(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function getPassTierMeta(passName) {
    const norm = String(passName || '').toLowerCase();
    if (norm.includes('paddock') || norm.includes('vip')) {
      return { tierAttr: 'vip', shortCode: 'VIP', gate: 'GATE 01 // PADDOCK CLUB' };
    }
    if (norm.includes('hospitality') || norm.includes('lounge')) {
      return { tierAttr: 'hospitality', shortCode: 'HSP', gate: 'GATE 02 // HOSPITALITY' };
    }
    if (norm.includes('grandstand') || norm.includes('turn')) {
      return { tierAttr: 'grandstand', shortCode: 'GRS', gate: 'GATE 04 // GRANDSTAND' };
    }
    return { tierAttr: 'general', shortCode: 'GEN', gate: 'GATE 06 // LUSAIL HILL' };
  }

  function generateDeterministicPassCode(guest) {
    const tribunVal = guest.tribun || state.config.defaultTribun;
    const rawKey = [
      guest.name.trim().toLowerCase(),
      guest.role.trim().toLowerCase(),
      guest.pass.trim().toLowerCase(),
      tribunVal.trim().toLowerCase()
    ].join('|');

    const hash = hashFnv1a(rawKey);
    const hexSegment = hash.toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
    const checkDigit = (hash % 90) + 10;
    const tierMeta = getPassTierMeta(guest.pass);
    return `QAT26-R22-${hexSegment}${checkDigit}-${tierMeta.shortCode}`;
  }

  /**
   * Renders a crisp deterministic high-density barcode into an <svg> element
   */
  function renderBarcodeSvg(svgEl, codeText) {
    if (!svgEl) return;
    const bits = ['11010010000']; // Start Code B guard

    for (let i = 0; i < codeText.length; i += 1) {
      const charHash = hashFnv1a(`${codeText}:${i}:${codeText.charCodeAt(i)}`);
      let pattern = '1';
      for (let b = 0; b < 9; b += 1) {
        pattern += ((charHash >> b) & 1) ? '1' : '0';
      }
      pattern += '0';
      // Prevent >4 consecutive identical modules for authentic scanner density
      pattern = pattern.replace(/11111/g, '11011').replace(/00000/g, '00100');
      bits.push(pattern);
    }
    bits.push('1100011101011'); // Stop guard

    const bitStream = bits.join('');
    const totalModules = bitStream.length;
    const viewWidth = 320;
    const viewHeight = 56;
    const quietZone = 8;
    const usableWidth = viewWidth - quietZone * 2;
    const moduleW = usableWidth / totalModules;

    const rects = [];
    let idx = 0;
    while (idx < totalModules) {
      if (bitStream[idx] === '1') {
        let run = 1;
        while (idx + run < totalModules && bitStream[idx + run] === '1') {
          run += 1;
        }
        const x = (quietZone + idx * moduleW).toFixed(2);
        const w = Math.max(0.85, run * moduleW).toFixed(2);
        rects.push(`<rect x="${x}" y="2" width="${w}" height="${viewHeight - 4}" fill="#0B0C0E" />`);
        idx += run;
      } else {
        idx += 1;
      }
    }

    svgEl.innerHTML = `<rect width="${viewWidth}" height="${viewHeight}" fill="#FFFFFF" />${rects.join('')}`;
  }

  /* ------------------------------------------------------------------------
     CUSTOM TOAST & CONFIRMATION MODAL (No window.alert / window.confirm)
     ------------------------------------------------------------------------ */
  function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const iconMap = {
      success: 'check-circle-2',
      error: 'alert-circle',
      info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.setAttribute('data-type', type || 'info');
    toast.innerHTML = `
      <i data-lucide="${iconMap[type] || 'info'}"></i>
      <div class="toast-content">
        <span class="toast-title">${escapeHtml(title)}</span>
        <span>${escapeHtml(message)}</span>
      </div>
      <button type="button" class="toast-close" aria-label="Tutup notifikasi">
        <i data-lucide="x"></i>
      </button>
    `;

    const dismiss = () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    };

    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    container.appendChild(toast);
    refreshIcons();

    window.setTimeout(dismiss, 4200);
  }

  function showConfirmModal(title, message, confirmLabel = 'Lanjutkan') {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmModalTitle');
      const msgEl = document.getElementById('confirmModalMessage');
      const btnOk = document.getElementById('btnConfirmOk');
      const btnCancel = document.getElementById('btnConfirmCancel');

      titleEl.textContent = title;
      msgEl.textContent = message;
      btnOk.textContent = confirmLabel;
      modal.classList.remove('hidden');

      const cleanup = (result) => {
        modal.classList.add('hidden');
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        resolve(result);
      };

      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
    });
  }

  async function copyTextToClipboard(text, successTitle, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const tempArea = document.createElement('textarea');
        tempArea.value = text;
        tempArea.style.position = 'fixed';
        tempArea.style.left = '-9999px';
        document.body.appendChild(tempArea);
        tempArea.focus();
        tempArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempArea);
      }
      showToast('success', successTitle, successMessage);
    } catch (_err) {
      showToast('error', 'Gagal Menyalin', 'Browser membatasi akses papan klip otomatis.');
    }
  }

  /* ------------------------------------------------------------------------
     INITIALIZE STATE FROM LOCALSTORAGE + URL OVERRIDES
     ------------------------------------------------------------------------ */
  function loadState() {
    // 1. Load Event Config
    const savedConfig = readStorageJson(STORAGE_KEYS.CONFIG, null);
    state.config = { ...FACTORY_CONFIG, ...(savedConfig || {}) };

    // 2. Load Schedule Sessions
    const savedSchedule = readStorageJson(STORAGE_KEYS.SCHEDULE, null);
    state.sessions = FACTORY_SESSIONS.map((def) => {
      const match = Array.isArray(savedSchedule)
        ? savedSchedule.find((item) => item.id === def.id)
        : null;
      return {
        ...def,
        startWib: match && isValidTimeHm(match.startWib) ? match.startWib : def.startWib,
        endWib: match && isValidTimeHm(match.endWib) ? match.endWib : def.endWib
      };
    });

    // 3. Apply URL Schedule & Event Overrides if present in personal invitation link
    const params = state.initialUrlParams;
    if (params.get('title')) state.config.title = params.get('title').trim();
    if (params.get('host')) state.config.host = params.get('host').trim();
    if (params.get('dress')) state.config.dressCode = params.get('dress').trim();

    state.sessions.forEach((session) => {
      const rawRange = params.get(session.id);
      if (rawRange && rawRange.includes('-')) {
        const [st, en] = rawRange.split('-').map((s) => s.trim());
        if (isValidTimeHm(st) && isValidTimeHm(en)) {
          session.startWib = st;
          session.endWib = en;
        }
      }
    });

    // 4. Load Guests (Seed 3 realistic VIP entries on first visit)
    const savedGuests = readStorageJson(STORAGE_KEYS.GUESTS, null);
    if (Array.isArray(savedGuests)) {
      state.guests = savedGuests;
    } else {
      state.guests = [...SEED_GUESTS];
      writeStorageJson(STORAGE_KEYS.GUESTS, state.guests);
    }

    // 5. Load RSVPs
    const savedRsvps = readStorageJson(STORAGE_KEYS.RSVPS, []);
    state.rsvps = Array.isArray(savedRsvps) ? savedRsvps : [];
  }

  /**
   * Resolves the currently displayed guest profile (Preview Guest > URL Params > Default VIP)
   */
  function getActiveGuestProfile() {
    if (state.previewGuest) {
      return {
        name: state.previewGuest.name || DEFAULT_GUEST.name,
        role: state.previewGuest.role || DEFAULT_GUEST.role,
        pass: state.previewGuest.pass || DEFAULT_GUEST.pass,
        tribun: state.previewGuest.tribun || state.config.defaultTribun,
        isPersonalized: true
      };
    }

    const params = state.initialUrlParams;
    const urlName = (params.get('to') || '').trim();
    const urlRole = (params.get('role') || '').trim();
    const urlPass = (params.get('pass') || '').trim();
    const urlTribun = (params.get('tribun') || '').trim();

    return {
      name: urlName || DEFAULT_GUEST.name,
      role: urlRole || DEFAULT_GUEST.role,
      pass: urlPass || DEFAULT_GUEST.pass,
      tribun: urlTribun || state.config.defaultTribun,
      isPersonalized: Boolean(urlName)
    };
  }

  /* ------------------------------------------------------------------------
     PERSONALIZED URL BUILDER (SYNCS ADMIN SCHEDULE & EVENT OVERRIDES)
     ------------------------------------------------------------------------ */
  function getEffectiveBaseUrl() {
    const custom = (state.config.baseUrl || '').trim();
    if (custom) {
      return custom.split('?')[0].split('#')[0];
    }
    return window.location.href.split('?')[0].split('#')[0];
  }

  function buildGuestUrl(guest) {
    const base = getEffectiveBaseUrl();
    const query = new URLSearchParams();

    query.set('to', guest.name);
    if (guest.role) query.set('role', guest.role);
    if (guest.pass) query.set('pass', guest.pass);
    query.set('tribun', guest.tribun || state.config.defaultTribun);

    // Sync event metadata if modified from factory defaults
    if (state.config.title !== FACTORY_CONFIG.title) {
      query.set('title', state.config.title);
    }
    if (state.config.host !== FACTORY_CONFIG.host) {
      query.set('host', state.config.host);
    }
    if (state.config.dressCode !== FACTORY_CONFIG.dressCode) {
      query.set('dress', state.config.dressCode);
    }

    // Sync WIB session hours if modified by Admin
    state.sessions.forEach((session) => {
      const factory = FACTORY_SESSIONS.find((f) => f.id === session.id);
      if (
        factory &&
        (session.startWib !== factory.startWib || session.endWib !== factory.endWib)
      ) {
        query.set(session.id, `${session.startWib}-${session.endWib}`);
      }
    });

    return `${base}?${query.toString()}`;
  }

  function buildWhatsAppInviteMessage(guest) {
    const link = buildGuestUrl(guest);
    const passCode = generateDeterministicPassCode(guest);
    const raceSession = state.sessions.find((s) => s.id === 'race') || state.sessions[4];
    const raceTiming = getSessionTiming(raceSession);

    return [
      '*UNDANGAN RESMI MOTORSPORT HOSPITALITY*',
      `*${state.config.title.toUpperCase()}*`,
      'Lusail International Circuit, Qatar | 27-29 November 2026',
      '----------------------------------------',
      `Kepada Yth. *${guest.name}*`,
      guest.role ? `(${guest.role})` : '',
      '',
      `Dengan hormat, *${state.config.host}* mengundang Anda untuk menghadiri acara menonton bersama dan hospitality seri ke-22 Formula 1 Qatar Grand Prix 2026.`,
      '',
      '*DETAIL AKREDITASI ANDA:*',
      `- Kategori Pass: ${guest.pass}`,
      `- Tribun / Zona: ${guest.tribun || state.config.defaultTribun}`,
      `- Kode Digital Pass: ${passCode}`,
      `- Balapan Utama (57 Lap): Minggu, 29 Nov 2026 | ${raceTiming.wibRangePlain}`,
      `- Dress Code: ${state.config.dressCode}`,
      '',
      'Buka surat undangan resmi, Digital Race Pass, jadwal lengkap WIB, dan konfirmasi kehadiran (RSVP) melalui tautan personal berikut:',
      link,
      '',
      'Terima kasih dan sampai jumpa di Paddock.'
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\n');
  }

  /* ------------------------------------------------------------------------
     RENDER GUEST PAGE: HERO, FORMAL LETTER & DIGITAL RACE PASS
     ------------------------------------------------------------------------ */
  function renderPersonalizationAndEventDetails() {
    const guest = getActiveGuestProfile();
    const passCode = generateDeterministicPassCode(guest);
    const tierMeta = getPassTierMeta(guest.pass);
    const raceSession = state.sessions.find((s) => s.id === 'race') || state.sessions[4];
    const raceTiming = getSessionTiming(raceSession);

    // Event Title & Host in Cover + Hero
    const coverTitleEl = document.getElementById('coverEventTitle');
    const coverHostEl = document.getElementById('coverHostName');
    const coverGuestEl = document.getElementById('coverGuestName');
    const coverRoleEl = document.getElementById('coverGuestRole');
    const coverPassEl = document.getElementById('coverGuestPass');

    if (coverTitleEl) coverTitleEl.textContent = state.config.title.toUpperCase();
    if (coverHostEl) coverHostEl.textContent = state.config.host;
    if (coverGuestEl) coverGuestEl.textContent = guest.name;
    if (coverRoleEl) coverRoleEl.textContent = guest.role;
    if (coverPassEl) coverPassEl.textContent = guest.pass.toUpperCase();

    document.getElementById('heroEventTitle').textContent = state.config.title.toUpperCase();
    document.getElementById('heroHostName').textContent = state.config.host;

    // Hero VIP Addressee Card
    document.getElementById('heroPassCodeBadge').textContent = passCode;
    document.getElementById('heroGuestName').textContent = guest.name;
    document.getElementById('heroGuestRole').textContent = guest.role;
    document.getElementById('heroGuestPass').textContent = guest.pass;
    document.getElementById('heroGuestTribun').textContent = guest.tribun;

    // Formal Letter Dossier
    document.getElementById('letterDocId').textContent = `REF: FIA-F1-QAT26/${passCode.slice(-8)}`;
    document.getElementById('letterGuestName').textContent = guest.name;
    document.getElementById('letterGuestRole').textContent = guest.role;
    document.getElementById('letterHostInline').textContent = state.config.host;
    document.getElementById('letterTitleInline').textContent = `${state.config.title} (Round 22)`;
    document.getElementById('letterEventTitle').textContent = state.config.title;
    document.getElementById('letterHost').textContent = state.config.host;
    document.getElementById('letterRaceSchedule').textContent = `${raceSession.dayDisplay} | ${raceTiming.wibRangePlain}`;
    document.getElementById('letterDressCode').textContent = state.config.dressCode;
    document.getElementById('letterPassCategory').textContent = guest.pass;
    document.getElementById('letterTribun').textContent = guest.tribun;
    document.getElementById('letterSignatureHost').textContent = state.config.host;
    document.getElementById('letterPassCodeRef').textContent = `PASS: ${passCode}`;

    // Digital Race Pass Credential Card
    const passCard = document.getElementById('digitalRacePass');
    passCard.setAttribute('data-tier', tierMeta.tierAttr);
    document.getElementById('passTierBadge').textContent = guest.pass.toUpperCase();
    document.getElementById('passGuestName').textContent = guest.name;
    document.getElementById('passGuestRole').textContent = guest.role;
    document.getElementById('passGuestTribun').textContent = guest.tribun;
    document.getElementById('passGateAccess').textContent = tierMeta.gate;
    document.getElementById('passLightsOutWib').textContent = `29 NOV // ${raceSession.startWib} WIB`;
    document.getElementById('passCodeDisplay').textContent = passCode;
    renderBarcodeSvg(document.getElementById('passBarcodeSvg'), passCode);

    // Protocol Dress Code & RSVP Session Quick Times
    document.getElementById('protocolDressCode').textContent = `${state.config.dressCode}.`;
    state.sessions.forEach((s) => {
      const badgeEl = document.querySelector(`[data-rsvp-session-time="${s.id}"]`);
      if (badgeEl) badgeEl.textContent = s.startWib;
    });

    // Pre-fill RSVP Guest Name if personalized & field is empty or matches previous preview
    const rsvpNameInput = document.getElementById('rsvpName');
    if (rsvpNameInput && (guest.isPersonalized || !rsvpNameInput.dataset.userEdited)) {
      rsvpNameInput.value = guest.isPersonalized ? guest.name : '';
    }

    // Preview Mode Sticky Banner
    const previewBanner = document.getElementById('previewBanner');
    const previewLabel = document.getElementById('previewGuestLabel');
    if (state.previewGuest) {
      previewLabel.textContent = `${guest.name} (${guest.pass} - ${guest.tribun})`;
      previewBanner.classList.remove('hidden');
    } else {
      previewBanner.classList.add('hidden');
    }

    renderGuestRsvpReceipt();
  }

  /* ------------------------------------------------------------------------
     LIVE WIB CLOCK & REAL-TIME COUNTDOWN ENGINE
     ------------------------------------------------------------------------ */
  function resolveCountdownTarget(nowMs) {
    if (state.countdownTargetMode !== 'auto') {
      const chosen = state.sessions.find((s) => s.id === state.countdownTargetMode) || state.sessions[0];
      const timing = getSessionTiming(chosen);
      let status = 'upcoming';
      if (nowMs >= timing.startMs && nowMs <= timing.endMs) {
        status = 'live';
      } else if (nowMs > timing.endMs) {
        status = 'finished';
      }
      return { session: chosen, timing, status };
    }

    // Auto mode: 1) Check if any session is currently live
    for (let i = 0; i < state.sessions.length; i += 1) {
      const s = state.sessions[i];
      const timing = getSessionTiming(s);
      if (nowMs >= timing.startMs && nowMs <= timing.endMs) {
        return { session: s, timing, status: 'live' };
      }
    }

    // 2) Find next upcoming session
    for (let i = 0; i < state.sessions.length; i += 1) {
      const s = state.sessions[i];
      const timing = getSessionTiming(s);
      if (timing.startMs > nowMs) {
        return { session: s, timing, status: 'upcoming' };
      }
    }

    // 3) All sessions completed
    const lastSession = state.sessions[state.sessions.length - 1];
    return {
      session: lastSession,
      timing: getSessionTiming(lastSession),
      status: 'finished'
    };
  }

  function updateClocksAndCountdown() {
    const nowMs = Date.now();

    // Update Live WIB Header Clock (UTC+7 independent of device local timezone)
    const wibClockDate = new Date(nowMs + 7 * 60 * 60 * 1000);
    const wibStr = `WIB ${pad2(wibClockDate.getUTCHours())}:${pad2(wibClockDate.getUTCMinutes())}:${pad2(wibClockDate.getUTCSeconds())}`;
    const clockEl = document.getElementById('liveWibClock');
    if (clockEl) clockEl.textContent = wibStr;

    // Resolve Target Session
    const { session, timing, status } = resolveCountdownTarget(nowMs);

    const statusWrap = document.getElementById('countdownStatusWrap');
    const statusText = document.getElementById('countdownStatusText');
    const titleEl = document.getElementById('countdownSessionTitle');
    const wibEl = document.getElementById('countdownSessionWib');
    const astEl = document.getElementById('countdownSessionAst');

    titleEl.textContent = session.name.toUpperCase();
    wibEl.textContent = `${session.dayDisplay} | ${timing.wibRange}`;
    astEl.textContent = `Waktu Lokal Sirkuit: ${timing.astRange} (UTC+3)`;

    let diffMs = 0;
    if (status === 'live') {
      statusWrap.classList.add('is-live');
      statusText.textContent = 'SEDANG BERLANGSUNG';
      diffMs = Math.max(0, timing.endMs - nowMs);
    } else if (status === 'upcoming') {
      statusWrap.classList.remove('is-live');
      statusText.textContent =
        state.countdownTargetMode === 'auto'
          ? `MENUJU SESI TERDEKAT (${session.code})`
          : `HITUNG MUNDUR TARGET (${session.code})`;
      diffMs = Math.max(0, timing.startMs - nowMs);
    } else {
      statusWrap.classList.remove('is-live');
      statusText.textContent = 'SESI TELAH SELESAI';
      diffMs = 0;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    document.getElementById('cdDays').textContent = pad2(days);
    document.getElementById('cdHours').textContent = pad2(hours);
    document.getElementById('cdMinutes').textContent = pad2(minutes);
    document.getElementById('cdSeconds').textContent = pad2(seconds);

    // Render 5-step Weekend Progression Track
    const stepsContainer = document.getElementById('weekendStepsTrack');
    const summaryEl = document.getElementById('weekendProgressSummary');
    if (stepsContainer) {
      let completedCount = 0;
      const htmlSteps = state.sessions
        .map((s) => {
          const st = getSessionTiming(s);
          const isDone = nowMs > st.endMs;
          const isTarget = s.id === session.id;
          if (isDone) completedCount += 1;
          const cls = ['prog-step', isDone ? 'is-done' : '', isTarget ? 'is-target' : '']
            .filter(Boolean)
            .join(' ');
          return `<button type="button" class="${cls}" data-step-session="${s.id}" title="Fokus ke ${escapeHtml(s.name)}">${escapeHtml(s.code)}</button>`;
        })
        .join('');

      if (stepsContainer.dataset.lastHtml !== htmlSteps) {
        stepsContainer.innerHTML = htmlSteps;
        stepsContainer.dataset.lastHtml = htmlSteps;
      }
      if (summaryEl) {
        summaryEl.textContent = `${completedCount}/5 SESI SELESAI`;
      }
    }
  }

  /* ------------------------------------------------------------------------
     OFFICIAL WIB SCHEDULE CARDS, AST TOGGLE & .ICS CALENDAR EXPORT
     ------------------------------------------------------------------------ */
  function renderScheduleSection() {
    const container = document.getElementById('scheduleCardsContainer');
    if (!container) return;

    container.classList.toggle('hide-ast', !state.showAstReference);

    const nowMs = Date.now();
    const filtered = state.sessions.filter((s) =>
      state.activeScheduleDay === 'all' ? true : s.dayKey === state.activeScheduleDay
    );

    container.innerHTML = filtered
      .map((s) => {
        const timing = getSessionTiming(s);
        const isLive = nowMs >= timing.startMs && nowMs <= timing.endMs;
        const isDone = nowMs > timing.endMs;

        let chipLabel = 'TERJADWAL';
        let chipClass = 'session-live-chip';
        if (isLive) {
          chipLabel = 'SEDANG BERLANGSUNG';
          chipClass = 'session-live-chip live';
        } else if (isDone) {
          chipLabel = 'SELESAI';
        }

        const cardClasses = [
          'schedule-card',
          s.isRace ? 'is-race' : '',
          isLive ? 'is-live' : ''
        ]
          .filter(Boolean)
          .join(' ');

        return `
          <article class="${cardClasses}">
            <div class="session-code-box">
              <span class="session-code-pill">${escapeHtml(s.code)}</span>
              <span class="${chipClass}">${chipLabel}</span>
            </div>

            <div class="session-info-main">
              <h3>${escapeHtml(s.name)}</h3>
              <div class="session-day-date">${escapeHtml(s.dayDisplay)} &bull; ${escapeHtml(s.subtitle)}</div>
            </div>

            <div class="session-time-col">
              <div class="session-wib-primary mono">
                ${escapeHtml(s.startWib)} &ndash; ${escapeHtml(s.endWib)} <span class="tz-tag">WIB</span>
              </div>
              <div class="session-ast-secondary mono">
                Lokal Qatar: ${escapeHtml(timing.astRange)} (UTC+3)
              </div>
            </div>

            <div class="session-card-actions">
              <button type="button" class="btn btn-outline-light btn-sm" data-ics-id="${escapeHtml(s.id)}">
                <i data-lucide="calendar"></i>
                <span>Unduh .ics</span>
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    refreshIcons();
  }

  function formatUtcForIcs(timestampMs) {
    const d = new Date(timestampMs);
    return (
      d.getUTCFullYear().toString() +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) +
      'T' +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) +
      pad2(d.getUTCSeconds()) +
      'Z'
    );
  }

  function escapeIcsText(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function downloadIcsForSessions(sessionList, filename) {
    const guest = getActiveGuestProfile();
    const passCode = generateDeterministicPassCode(guest);
    const dtStamp = formatUtcForIcs(Date.now());

    const vevents = sessionList.map((s) => {
      const timing = getSessionTiming(s);
      const description = [
        `${state.config.title} (Round 22)`,
        `Penyelenggara: ${state.config.host}`,
        ` Jadwal WIB: ${s.dayDisplay} | ${timing.wibRangePlain}`,
        ` Waktu Lokal Qatar: ${timing.astRangePlain}`,
        ` Tamu: ${guest.name} (${guest.pass} - ${guest.tribun})`,
        ` Kode Pass: ${passCode}`
      ].join('\n');

      return [
        'BEGIN:VEVENT',
        `UID:qatargp2026-${s.id}-${passCode}@lusail.invitation`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${formatUtcForIcs(timing.startMs)}`,
        `DTEND:${formatUtcForIcs(timing.endMs)}`,
        `SUMMARY:${escapeIcsText(`F1 Qatar GP 2026 - ${s.name}`)}`,
        'LOCATION:Lusail International Circuit\\, Lusail\\, Qatar (25.49\\, 51.45417)',
        `DESCRIPTION:${escapeIcsText(description)}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].join('\r\n');
    });

    const calendarContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//F1 Qatar Airways Qatar Grand Prix 2026//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:F1 Qatar GP 2026 (WIB)',
      ...vevents,
      'END:VCALENDAR'
    ].join('\r\n');

    triggerFileDownload(calendarContent, filename, 'text/calendar;charset=utf-8');
    showToast('success', 'Kalender Diunduh', `File ${filename} siap diimpor ke aplikasi kalender Anda.`);
  }

  function triggerFileDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------------------
     CIRCUIT SECTOR INTERACTION & LEAFLET MAP (25.49, 51.45417)
     ------------------------------------------------------------------------ */
  function setSectorHighlight(sectorId) {
    state.activeSector = sectorId;
    const svg = document.getElementById('lusailTrackSvg');
    const badge = document.getElementById('activeSectorBadge');
    const paths = document.querySelectorAll('.track-sector-path');
    const pills = document.querySelectorAll('[data-sector-select]');
    const cards = document.querySelectorAll('[data-sector-card]');

    pills.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sectorSelect === sectorId);
    });

    cards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.sectorCard === sectorId);
    });

    if (sectorId === 'all') {
      svg.classList.remove('sector-focus');
      paths.forEach((p) => p.classList.remove('is-active'));
      badge.textContent = 'SEMUA SEKTOR';
    } else {
      svg.classList.add('sector-focus');
      paths.forEach((p) => {
        p.classList.toggle('is-active', p.dataset.sector === sectorId);
      });
      badge.textContent = `FOKUS SEKTOR 0${sectorId}`;
    }
  }

  function initLeafletCircuitMap() {
    const mapEl = document.getElementById('circuitMap');
    if (!mapEl || typeof window.L === 'undefined') return;

    const LUSAIL_COORDS = [25.49, 51.45417];

    const streetLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });

    const topoLayer = window.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
    });

    const map = window.L.map(mapEl, {
      center: LUSAIL_COORDS,
      zoom: 15,
      layers: [streetLayer],
      scrollWheelZoom: false
    });

    // Custom Motorsport Pin
    const pinIcon = window.L.divIcon({
      className: 'f1-map-pin',
      html: '<div class="f1-pin-core"></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34]
    });

    const marker = window.L.marker(LUSAIL_COORDS, { icon: pinIcon }).addTo(map);
    marker.bindPopup(
      `
      <div style="font-family: Inter, sans-serif; min-width: 210px; color: #0B0C0E;">
        <strong style="font-family: Oswald, sans-serif; font-size: 15px; letter-spacing: 0.03em; display:block; margin-bottom:3px;">
          LUSAIL INTERNATIONAL CIRCUIT
        </strong>
        <span style="font-size: 12px; color: #3E424B; display:block; margin-bottom:6px;">
          Formula 1 Qatar Airways Qatar Grand Prix 2026 (Round 22)
        </span>
        <code style="font-family: JetBrains Mono, monospace; font-size: 11px; background:#F4F3EE; padding:2px 6px; display:inline-block; margin-bottom:8px;">
          25.49000, 51.45417
        </code>
        <br/>
        <a href="https://www.google.com/maps/dir/?api=1&destination=25.49,51.45417" target="_blank" rel="noopener noreferrer"
           style="color: #D91E18; font-weight: 700; font-size: 12px; text-decoration: underline;">
          Buka Navigasi Google Maps
        </a>
      </div>
      `
    ).openPopup();

    // Subtle Hospitality Zone Perimeter Circle
    window.L.circle(LUSAIL_COORDS, {
      color: '#8A1538',
      weight: 2,
      fillColor: '#D91E18',
      fillOpacity: 0.08,
      radius: 680
    }).addTo(map);

    state.leafletMap = map;
    state.mapLayers = { street: streetLayer, topo: topoLayer };

    const btnStreet = document.getElementById('btnMapStreet');
    const btnTopo = document.getElementById('btnMapTopo');
    const btnRecenter = document.getElementById('btnMapRecenter');

    btnStreet.addEventListener('click', () => {
      if (map.hasLayer(topoLayer)) map.removeLayer(topoLayer);
      if (!map.hasLayer(streetLayer)) map.addLayer(streetLayer);
      btnStreet.classList.add('active');
      btnTopo.classList.remove('active');
    });

    btnTopo.addEventListener('click', () => {
      if (map.getZoom() > 17) map.setZoom(17);
      if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
      if (!map.hasLayer(topoLayer)) map.addLayer(topoLayer);
      btnTopo.classList.add('active');
      btnStreet.classList.remove('active');
    });

    btnRecenter.addEventListener('click', () => {
      map.setView(LUSAIL_COORDS, 15, { animate: true });
      marker.openPopup();
    });

    // Ensure crisp tile layout on resize or visibility change
    window.setTimeout(() => map.invalidateSize(), 250);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(mapEl);
    }
  }

  /* ------------------------------------------------------------------------
     SUPABASE CLOUD DATABASE & REALTIME RSVP ENGINE
     ------------------------------------------------------------------------ */
  const SUPABASE_SCHEMA_SQL = [
    'create table if not exists public.rsvps (',
    '  id uuid primary key default gen_random_uuid(),',
    '  guest_key text not null unique,',
    '  name text not null check (char_length(btrim(name)) > 0),',
    "  status text not null check (status in ('Hadir', 'Mungkin', 'Tidak Hadir')),",
    "  sessions text[] not null default '{}',",
    "  team text not null default '',",
    "  notes text not null default '',",
    "  pass text not null default '',",
    "  tribun text not null default '',",
    '  updated_at timestamptz not null default now()',
    ');',
    'create index if not exists idx_rsvps_updated_at on public.rsvps (updated_at desc);',
    'grant usage on schema public to anon, authenticated;',
    'grant select, insert, update, delete on table public.rsvps to anon, authenticated;',
    'alter table public.rsvps enable row level security;',
    'drop policy if exists "Public can read rsvps" on public.rsvps;',
    'drop policy if exists "Public can insert rsvps" on public.rsvps;',
    'drop policy if exists "Public can update rsvps" on public.rsvps;',
    'drop policy if exists "Organizer can delete rsvps" on public.rsvps;',
    'create policy "Public can read rsvps" on public.rsvps for select to anon, authenticated using (true);',
    "create policy \"Public can insert rsvps\" on public.rsvps for insert to anon, authenticated with check (char_length(btrim(name)) > 0 and status in ('Hadir', 'Mungkin', 'Tidak Hadir'));",
    "create policy \"Public can update rsvps\" on public.rsvps for update to anon, authenticated using (true) with check (char_length(btrim(name)) > 0 and status in ('Hadir', 'Mungkin', 'Tidak Hadir'));",
    'create policy "Organizer can delete rsvps" on public.rsvps for delete to anon, authenticated using (true);'
  ].join('\n');

  function getSupabaseCredentials() {
    const url = (state.config.supabaseUrl || DEFAULT_SUPABASE.url || '').trim();
    const anonKey = (state.config.supabaseAnonKey || DEFAULT_SUPABASE.anonKey || '').trim();
    return { url, anonKey };
  }

  function updateDbStatusUi(status) {
    state.dbStatus = status;
    const publicBadge = document.getElementById('rsvpDbBadge');
    const adminBadge = document.getElementById('adminDbStatusBadge');

    if (publicBadge) {
      publicBadge.setAttribute('data-state', status);
      if (status === 'online') {
        publicBadge.textContent = 'LIVE CLOUD';
      } else if (status === 'error') {
        publicBadge.textContent = 'GANGGUAN DB';
      } else {
        publicBadge.textContent = 'MODE LOKAL';
      }
    }

    if (adminBadge) {
      if (status === 'online') {
        adminBadge.className = 'badge badge-gold mono';
        adminBadge.textContent = 'TERHUBUNG KE SUPABASE';
      } else if (status === 'error') {
        adminBadge.className = 'badge badge-maroon mono';
        adminBadge.textContent = 'ERROR KONEKSI / TABEL';
      } else {
        adminBadge.className = 'badge badge-carbon mono';
        adminBadge.textContent = 'BELUM TERSAMBUNG (LOKAL)';
      }
    }
  }

  function mapDbRowToRsvp(row) {
    return {
      id: row.id,
      guestKey: row.guest_key || String(row.name || '').trim().toLowerCase(),
      name: row.name,
      status: row.status,
      sessions: Array.isArray(row.sessions) ? row.sessions : [],
      team: row.team || '',
      notes: row.notes || '',
      pass: row.pass || '',
      tribun: row.tribun || '',
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  async function fetchCloudRsvps(silent = true) {
    if (!state.supabase) return false;
    try {
      const { data, error } = await state.supabase
        .from('rsvps')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      state.rsvps = Array.isArray(data) ? data.map(mapDbRowToRsvp) : [];
      writeStorageJson(STORAGE_KEYS.RSVPS, state.rsvps);
      updateDbStatusUi('online');
      renderPublicRsvpCounters();
      renderGuestRsvpReceipt();
      renderAdminRsvpTab();

      if (!silent) {
        showToast('success', 'Data Cloud Dimuat', `${state.rsvps.length} data RSVP tersinkron dari Supabase.`);
      }
      return true;
    } catch (err) {
      updateDbStatusUi('error');
      if (!silent) {
        const msg =
          err && String(err.message || '').includes('rsvps')
            ? 'Tabel public.rsvps belum ditemukan. Jalankan script SQL di menu SQL Editor Supabase.'
            : 'Periksa kembali Project URL dan Anon Key Supabase Anda.';
        showToast('error', 'Gagal Memuat Supabase', msg);
      }
      return false;
    }
  }

  async function initSupabaseConnection(showFeedback = false) {
    if (state.supabase && state.supabaseChannel && typeof state.supabase.removeChannel === 'function') {
      try {
        state.supabase.removeChannel(state.supabaseChannel);
      } catch (_err) {}
    }
    state.supabase = null;
    state.supabaseChannel = null;

    const { url, anonKey } = getSupabaseCredentials();
    if (!url || !anonKey) {
      updateDbStatusUi('local');
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      updateDbStatusUi('error');
      if (showFeedback) {
        showToast('error', 'SDK Supabase Belum Siap', 'Pastikan koneksi internet aktif untuk memuat library Supabase.');
      }
      return;
    }

    try {
      state.supabase = window.supabase.createClient(url, anonKey);
      const ok = await fetchCloudRsvps(!showFeedback);
      if (ok && showFeedback) {
        showToast('success', 'Supabase Terhubung', 'Statistik kehadiran tamu kini aktif secara online untuk semua perangkat.');
      }

      if (typeof state.supabase.channel === 'function') {
        state.supabaseChannel = state.supabase
          .channel('public:rsvps')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rsvps' },
            () => {
              fetchCloudRsvps(true);
            }
          )
          .subscribe();
      }
    } catch (_err) {
      updateDbStatusUi('error');
      if (showFeedback) {
        showToast('error', 'URL Supabase Tidak Valid', 'Format Project URL harus berupa https://xxxx.supabase.co');
      }
    }
  }

  /* ------------------------------------------------------------------------
     GUEST RSVP MANAGEMENT (SUPABASE CLOUD + LOCALSTORAGE FALLBACK)
     ------------------------------------------------------------------------ */
  function renderPublicRsvpCounters() {
    const total = state.rsvps.length;
    const hadir = state.rsvps.filter((r) => r.status === 'Hadir').length;
    const mungkin = state.rsvps.filter((r) => r.status === 'Mungkin').length;

    document.getElementById('publicCountHadir').textContent = String(hadir);
    document.getElementById('publicCountMungkin').textContent = String(mungkin);
    document.getElementById('publicCountTotal').textContent = String(total);
    renderPublicGuestbook();
  }

  function renderPublicGuestbook() {
    const listEl = document.getElementById('publicGuestbookList');
    const badgeEl = document.getElementById('guestbookCountBadge');
    if (!listEl) return;

    if (badgeEl) {
      badgeEl.textContent = `${state.rsvps.length} RESPON TAMU`;
    }

    if (state.rsvps.length === 0) {
      listEl.innerHTML = `
        <div class="guestbook-empty">
          Belum ada ucapan atau konfirmasi yang masuk. Jadilah tamu pertama yang mengisi Buku Tamu Paddock.
        </div>
      `;
      return;
    }

    listEl.innerHTML = state.rsvps
      .map((r) => {
        const dt = new Date(r.updatedAt);
        const timeStr = Number.isNaN(dt.getTime())
          ? 'Baru saja'
          : dt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        const msg = r.notes && r.notes.trim()
          ? r.notes.trim()
          : `Konfirmasi status kehadiran: ${r.status}${r.sessions && r.sessions.length ? ` (${r.sessions.join(', ')})` : ''}.`;

        return `
          <article class="guestbook-card" data-status="${escapeHtml(r.status)}">
            <div class="guestbook-card-top">
              <div>
                <div class="guestbook-author">${escapeHtml(r.name)}</div>
                <div class="guestbook-team">${escapeHtml(r.team || 'Motorsport Guest')}</div>
              </div>
              <span class="badge badge-carbon">${escapeHtml(r.status)}</span>
            </div>
            <p class="guestbook-msg">${escapeHtml(msg)}</p>
            <span class="guestbook-time mono">${escapeHtml(timeStr)}</span>
          </article>
        `;
      })
      .join('');
  }

  function renderGuestRsvpReceipt() {
    const receiptCard = document.getElementById('rsvpReceiptCard');
    if (!receiptCard) return;

    const guest = getActiveGuestProfile();
    const lookupName = (
      document.getElementById('rsvpName').value.trim() ||
      (guest.isPersonalized ? guest.name : '')
    ).toLowerCase();

    const matched = lookupName
      ? state.rsvps.find((item) => item.name.toLowerCase() === lookupName)
      : null;

    if (!matched) {
      receiptCard.classList.add('hidden');
      return;
    }

    receiptCard.classList.remove('hidden');
    document.getElementById('receiptName').textContent = matched.name;
    document.getElementById('receiptStatus').textContent = matched.status;
    document.getElementById('receiptSessions').textContent =
      matched.sessions && matched.sessions.length ? matched.sessions.join(', ') : 'Tidak ada sesi';
    document.getElementById('receiptTeam').textContent = matched.team || '-';
    document.getElementById('receiptNotes').textContent = matched.notes || '-';

    const dt = new Date(matched.updatedAt);
    document.getElementById('receiptTimestamp').textContent = Number.isNaN(dt.getTime())
      ? 'Tersimpan'
      : dt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function initRsvpInteractions() {
    const form = document.getElementById('rsvpForm');
    const nameInput = document.getElementById('rsvpName');
    const statusRadios = document.querySelectorAll('input[name="rsvpStatus"]');
    const sessionChecks = document.querySelectorAll('input[name="rsvpSessions"]');

    nameInput.addEventListener('input', () => {
      nameInput.dataset.userEdited = 'true';
    });

    const syncSessionCheckState = () => {
      const selectedStatus = document.querySelector('input[name="rsvpStatus"]:checked')?.value;
      const isDeclined = selectedStatus === 'Tidak Hadir';
      sessionChecks.forEach((chk) => {
        chk.disabled = isDeclined;
        if (isDeclined) chk.checked = false;
      });
    };

    statusRadios.forEach((radio) => radio.addEventListener('change', syncSessionCheckState));

    document.getElementById('btnSelectAllSessions').addEventListener('click', () => {
      const selectedStatus = document.querySelector('input[name="rsvpStatus"]:checked')?.value;
      if (selectedStatus === 'Tidak Hadir') {
        showToast('info', 'Status Tidak Hadir', 'Ubah status kehadiran ke Hadir atau Mungkin terlebih dahulu.');
        return;
      }
      sessionChecks.forEach((chk) => {
        chk.checked = true;
      });
    });

    document.getElementById('btnClearSessions').addEventListener('click', () => {
      sessionChecks.forEach((chk) => {
        chk.checked = false;
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        showToast('error', 'Nama Wajib Diisi', 'Mohon masukkan nama lengkap Anda sebelum mengirim RSVP.');
        nameInput.focus();
        return;
      }

      const status = document.querySelector('input[name="rsvpStatus"]:checked')?.value || 'Hadir';
      const sessions = Array.from(sessionChecks)
        .filter((c) => c.checked && !c.disabled)
        .map((c) => c.value);

      if (status !== 'Tidak Hadir' && sessions.length === 0) {
        showToast('error', 'Pilih Minimal 1 Sesi', 'Pilih setidaknya satu sesi akhir pekan yang akan Anda ikuti.');
        return;
      }

      const team = document.getElementById('rsvpTeam').value;
      const notes = document.getElementById('rsvpNotes').value.trim();
      const guest = getActiveGuestProfile();
      const submitBtn = form.querySelector('button[type="submit"]');
      const submitTextEl = document.getElementById('rsvpSubmitText');

      if (submitBtn) submitBtn.disabled = true;
      if (submitTextEl) submitTextEl.textContent = 'Menyimpan RSVP...';

      try {
        if (state.supabase) {
          const guestKey = name.toLowerCase();
          const existedBefore = state.rsvps.some(
            (item) => item.name.trim().toLowerCase() === guestKey
          );

          const { error } = await state.supabase
            .from('rsvps')
            .upsert(
              {
                guest_key: guestKey,
                name,
                status,
                sessions,
                team,
                notes,
                pass: guest.pass,
                tribun: guest.tribun,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'guest_key' }
            );

          if (error) throw error;

          await fetchCloudRsvps(true);
          showToast(
            'success',
            existedBefore ? 'RSVP Cloud Diperbarui' : 'RSVP Cloud Tersimpan',
            `Terima kasih ${name}, konfirmasi kehadiran Anda kini tampil untuk seluruh tamu.`
          );
          return;
        }

        // Fallback mode lokal apabila Supabase belum dikonfigurasi
        const payload = {
          id: `rsvp_${Date.now()}`,
          name,
          status,
          sessions,
          team,
          notes,
          pass: guest.pass,
          tribun: guest.tribun,
          updatedAt: new Date().toISOString()
        };

        const existingIdx = state.rsvps.findIndex(
          (item) => item.name.trim().toLowerCase() === name.toLowerCase()
        );

        if (existingIdx >= 0) {
          payload.id = state.rsvps[existingIdx].id;
          state.rsvps[existingIdx] = payload;
          showToast('success', 'RSVP Diperbarui', `Konfirmasi kehadiran atas nama ${name} berhasil diperbarui.`);
        } else {
          state.rsvps.unshift(payload);
          showToast('success', 'RSVP Tersimpan', `Terima kasih ${name}, konfirmasi kehadiran Anda telah tercatat.`);
        }

        writeStorageJson(STORAGE_KEYS.RSVPS, state.rsvps);
        renderPublicRsvpCounters();
        renderGuestRsvpReceipt();
        renderAdminRsvpTab();
      } catch (_err) {
        showToast(
          'error',
          'Gagal Menyimpan ke Cloud',
          'Pastikan tabel rsvps dan policy RLS di Supabase sudah dibuat sesuai schema.sql.'
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitTextEl) submitTextEl.textContent = 'Simpan Konfirmasi RSVP';
      }
    });
  }

  /* ------------------------------------------------------------------------
     ADMIN PANEL: PIN PROTECTION, 3 TABS, GUEST LINKS, SCHEDULE & BACKUP
     ------------------------------------------------------------------------ */
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('hidden');
    }
    const anyOpen = Array.from(document.querySelectorAll('.modal-backdrop')).some(
      (m) => !m.classList.contains('hidden')
    );
    if (!anyOpen) {
      document.body.style.overflow = '';
    }
  }

  function requestOrganizerAccess() {
    if (state.adminUnlocked) {
      syncAdminFormsFromState();
      openModal('adminModal');
      return;
    }
    const pinInput = document.getElementById('pinInput');
    const pinError = document.getElementById('pinErrorMsg');
    pinInput.value = '';
    pinError.classList.add('hidden');
    openModal('pinModal');
    window.setTimeout(() => pinInput.focus(), 60);
  }

  function switchAdminTab(tabKey) {
    const tabMap = {
      guests: 'adminPaneGuests',
      schedule: 'adminPaneSchedule',
      hosting: 'adminPaneHosting'
    };

    document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
      const isMatch = btn.dataset.adminTab === tabKey;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    Object.entries(tabMap).forEach(([key, paneId]) => {
      const pane = document.getElementById(paneId);
      if (pane) pane.classList.toggle('active', key === tabKey);
    });
  }

  function syncAdminFormsFromState() {
    // Tab 1: Default Tribun placeholder & table
    document.getElementById('guestInputTribun').placeholder = state.config.defaultTribun;
    renderAdminGuestTable();

    // Tab 2: Event details & WIB session time inputs
    document.getElementById('cfgEventTitle').value = state.config.title;
    document.getElementById('cfgHostName').value = state.config.host;
    document.getElementById('cfgDressCode').value = state.config.dressCode;
    document.getElementById('cfgDefaultTribun').value = state.config.defaultTribun;
    renderAdminSessionTimeEditors();

    // Tab 3: Base URL, Supabase Config & RSVP Stats
    document.getElementById('cfgBaseUrl').value = state.config.baseUrl || '';
    const creds = getSupabaseCredentials();
    document.getElementById('cfgSupabaseUrl').value = creds.url;
    document.getElementById('cfgSupabaseKey').value = creds.anonKey;
    updateDbStatusUi(state.dbStatus);
    renderAdminRsvpTab();
  }

  function getFilteredGuests() {
    const q = state.guestSearchQuery.trim().toLowerCase();
    if (!q) return state.guests;
    return state.guests.filter((g) => {
      const code = generateDeterministicPassCode(g).toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        (g.role || '').toLowerCase().includes(q) ||
        (g.pass || '').toLowerCase().includes(q) ||
        (g.tribun || '').toLowerCase().includes(q) ||
        code.includes(q)
      );
    });
  }

  function renderAdminGuestTable() {
    const tbody = document.getElementById('adminGuestTableBody');
    const counter = document.getElementById('guestTotalCounter');
    if (!tbody) return;

    const filtered = getFilteredGuests();
    counter.textContent = `${filtered.length} / ${state.guests.length} TAMU`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-table-cell">
            Belum ada data tamu yang cocok dengan pencarian Anda.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((g) => {
        const tribunVal = g.tribun || state.config.defaultTribun;
        const passCode = generateDeterministicPassCode({ ...g, tribun: tribunVal });
        return `
          <tr>
            <td>
              <div class="guest-row-name">${escapeHtml(g.name)}</div>
              <div class="guest-row-role">${escapeHtml(g.role || '-')}</div>
            </td>
            <td>
              <div><strong>${escapeHtml(g.pass)}</strong></div>
              <div class="guest-row-role">${escapeHtml(tribunVal)}</div>
            </td>
            <td class="mono">${escapeHtml(passCode)}</td>
            <td>
              <div class="guest-row-actions">
                <button type="button" class="action-chip action-chip-preview" data-guest-action="preview" data-guest-id="${escapeHtml(g.id)}">
                  <i data-lucide="eye"></i>
                  <span>Preview</span>
                </button>
                <button type="button" class="action-chip" data-guest-action="copy" data-guest-id="${escapeHtml(g.id)}">
                  <i data-lucide="copy"></i>
                  <span>Salin Link</span>
                </button>
                <button type="button" class="action-chip action-chip-wa" data-guest-action="wa" data-guest-id="${escapeHtml(g.id)}">
                  <i data-lucide="send"></i>
                  <span>Kirim WA</span>
                </button>
                <button type="button" class="action-chip action-chip-del" data-guest-action="delete" data-guest-id="${escapeHtml(g.id)}">
                  <i data-lucide="trash-2"></i>
                  <span>Hapus</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    refreshIcons();
  }

  function renderAdminSessionTimeEditors() {
    const wrap = document.getElementById('adminSessionEditors');
    if (!wrap) return;

    wrap.innerHTML = state.sessions
      .map((s) => {
        const timing = getSessionTiming(s);
        return `
          <div class="session-edit-row" data-session-editor="${escapeHtml(s.id)}">
            <div>
              <span class="session-edit-title">${escapeHtml(s.name)}</span>
              <span class="session-edit-sub mono" data-ast-preview="${escapeHtml(s.id)}">
                ${escapeHtml(s.dayDisplay)} &bull; Lokal: ${escapeHtml(timing.astRange)}
              </span>
            </div>
            <div class="time-field-mini">
              <label for="editStart_${escapeHtml(s.id)}">MULAI (WIB)</label>
              <input type="time" id="editStart_${escapeHtml(s.id)}" class="form-input form-input-dark mono" value="${escapeHtml(s.startWib)}" required />
            </div>
            <div class="time-field-mini">
              <label for="editEnd_${escapeHtml(s.id)}">SELESAI (WIB)</label>
              <input type="time" id="editEnd_${escapeHtml(s.id)}" class="form-input form-input-dark mono" value="${escapeHtml(s.endWib)}" required />
            </div>
          </div>
        `;
      })
      .join('');

    // Live AST preview as Admin adjusts WIB inputs
    state.sessions.forEach((s) => {
      const startInput = document.getElementById(`editStart_${s.id}`);
      const endInput = document.getElementById(`editEnd_${s.id}`);
      const previewEl = wrap.querySelector(`[data-ast-preview="${s.id}"]`);

      const updateRowPreview = () => {
        if (isValidTimeHm(startInput.value) && isValidTimeHm(endInput.value)) {
          const tempTiming = getSessionTiming({
            ...s,
            startWib: startInput.value,
            endWib: endInput.value
          });
          previewEl.textContent = `${s.dayDisplay} \u2022 Lokal: ${tempTiming.astRange}`;
        }
      };

      startInput.addEventListener('input', updateRowPreview);
      endInput.addEventListener('input', updateRowPreview);
    });
  }

  function renderAdminRsvpTab() {
    const statsGrid = document.getElementById('adminRsvpStatsGrid');
    const tbody = document.getElementById('adminRsvpTableBody');
    if (!statsGrid || !tbody) return;

    const total = state.rsvps.length;
    const countHadir = state.rsvps.filter((r) => r.status === 'Hadir').length;
    const countMungkin = state.rsvps.filter((r) => r.status === 'Mungkin').length;
    const countTidak = state.rsvps.filter((r) => r.status === 'Tidak Hadir').length;

    statsGrid.innerHTML = `
      <div class="rsvp-stat-tile">
        <span class="num mono">${total}</span>
        <span class="lbl">Total Respons RSVP</span>
      </div>
      <div class="rsvp-stat-tile">
        <span class="num mono" style="color:#4ade80;">${countHadir}</span>
        <span class="lbl">Konfirmasi Hadir</span>
      </div>
      <div class="rsvp-stat-tile">
        <span class="num mono" style="color:#D4A017;">${countMungkin}</span>
        <span class="lbl">Masih Mungkin</span>
      </div>
      <div class="rsvp-stat-tile">
        <span class="num mono" style="color:#ff6b66;">${countTidak}</span>
        <span class="lbl">Tidak Hadir</span>
      </div>
    `;

    if (state.rsvps.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-table-cell">
            Belum ada data konfirmasi RSVP yang masuk.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.rsvps
      .map((r) => {
        const dt = new Date(r.updatedAt);
        const formattedTime = Number.isNaN(dt.getTime())
          ? '-'
          : dt.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

        return `
          <tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td><span class="badge badge-carbon">${escapeHtml(r.status)}</span></td>
            <td class="mono">${escapeHtml((r.sessions || []).join(', ') || '-')}</td>
            <td>
              <div>${escapeHtml(r.team || '-')}</div>
              <div class="guest-row-role">${escapeHtml(r.notes || '')}</div>
            </td>
            <td class="mono">${escapeHtml(formattedTime)}</td>
            <td>
              <button type="button" class="action-chip action-chip-del" data-rsvp-del="${escapeHtml(r.id)}">
                <i data-lucide="trash-2"></i>
                <span>Hapus</span>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    refreshIcons();
  }

  /* ------------------------------------------------------------------------
     CSV EXPORT HELPERS
     ------------------------------------------------------------------------ */
  function toCsvCell(val) {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  }

  function exportGuestsToCsv() {
    if (state.guests.length === 0) {
      showToast('info', 'Daftar Kosong', 'Belum ada tamu untuk diekspor ke CSV.');
      return;
    }
    const headers = ['Nama Tamu', 'Peran / Komunitas', 'Kategori Pass', 'Tribun', 'Kode Pass', 'Link Undangan Personal'];
    const rows = state.guests.map((g) => {
      const tribunVal = g.tribun || state.config.defaultTribun;
      const code = generateDeterministicPassCode({ ...g, tribun: tribunVal });
      const url = buildGuestUrl(g);
      return [g.name, g.role, g.pass, tribunVal, code, url].map(toCsvCell).join(',');
    });

    const csv = '\uFEFF' + [headers.map(toCsvCell).join(','), ...rows].join('\r\n');
    triggerFileDownload(csv, 'daftar-tamu-f1-qatar-2026.csv', 'text/csv;charset=utf-8');
    showToast('success', 'CSV Tamu Diekspor', `${state.guests.length} baris link tamu berhasil diunduh.`);
  }

  function exportRsvpsToCsv() {
    if (state.rsvps.length === 0) {
      showToast('info', 'RSVP Kosong', 'Belum ada data RSVP yang masuk untuk diekspor.');
      return;
    }
    const headers = ['Nama Tamu', 'Status Kehadiran', 'Sesi Diikuti', 'Tim Dukungan', 'Catatan', 'Waktu Input'];
    const rows = state.rsvps.map((r) =>
      [r.name, r.status, (r.sessions || []).join(' | '), r.team, r.notes, r.updatedAt]
        .map(toCsvCell)
        .join(',')
    );

    const csv = '\uFEFF' + [headers.map(toCsvCell).join(','), ...rows].join('\r\n');
    triggerFileDownload(csv, 'rekap-rsvp-f1-qatar-2026.csv', 'text/csv;charset=utf-8');
    showToast('success', 'CSV RSVP Diekspor', `${state.rsvps.length} respons RSVP berhasil diunduh.`);
  }

  /* ------------------------------------------------------------------------
     BIND ALL DOM EVENTS
     ------------------------------------------------------------------------ */
  function bindEvents() {
    // Mobile Menu Toggle
    const btnMobileMenu = document.getElementById('btnMobileMenu');
    const navLinks = document.getElementById('navLinks');
    btnMobileMenu.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      btnMobileMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });

    // Countdown Target Selector & Progression Step Clicks
    const targetSelect = document.getElementById('countdownTargetSelect');
    targetSelect.addEventListener('change', () => {
      state.countdownTargetMode = targetSelect.value;
      updateClocksAndCountdown();
    });

    document.getElementById('weekendStepsTrack').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-step-session]');
      if (!btn) return;
      state.countdownTargetMode = btn.dataset.stepSession;
      targetSelect.value = state.countdownTargetMode;
      updateClocksAndCountdown();
    });

    // Digital Race Pass Buttons
    document.getElementById('btnCopyPassCode').addEventListener('click', () => {
      const code = document.getElementById('passCodeDisplay').textContent;
      copyTextToClipboard(code, 'Kode Pass Disalin', `Kode ${code} berhasil disalin ke papan klip.`);
    });

    document.getElementById('btnPrintPass').addEventListener('click', () => {
      window.print();
    });

    // Schedule Filters, AST Toggle & .ics Downloads
    document.querySelectorAll('.day-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeScheduleDay = btn.dataset.day;
        document.querySelectorAll('.day-filter-btn').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        renderScheduleSection();
      });
    });

    const btnToggleAst = document.getElementById('btnToggleAst');
    btnToggleAst.addEventListener('click', () => {
      state.showAstReference = !state.showAstReference;
      btnToggleAst.classList.toggle('active', state.showAstReference);
      btnToggleAst.setAttribute('aria-pressed', state.showAstReference ? 'true' : 'false');
      document.getElementById('astToggleStateText').textContent = state.showAstReference
        ? 'Tampil'
        : 'Sembunyi';
      renderScheduleSection();
    });

    document.getElementById('btnDownloadAllIcs').addEventListener('click', () => {
      downloadIcsForSessions(state.sessions, 'f1-qatar-gp-2026-semua-sesi.ics');
    });

    document.getElementById('scheduleCardsContainer').addEventListener('click', (e) => {
      const icsBtn = e.target.closest('[data-ics-id]');
      if (!icsBtn) return;
      const targetSession = state.sessions.find((s) => s.id === icsBtn.dataset.icsId);
      if (targetSession) {
        downloadIcsForSessions([targetSession], `f1-qatar-gp-2026-${targetSession.id}.ics`);
      }
    });

    // Circuit Interactive Sector Explorer
    document.querySelectorAll('[data-sector-select]').forEach((btn) => {
      btn.addEventListener('click', () => setSectorHighlight(btn.dataset.sectorSelect));
    });

    document.querySelectorAll('.track-sector-path').forEach((path) => {
      path.addEventListener('click', () => {
        const sec = path.dataset.sector;
        setSectorHighlight(state.activeSector === sec ? 'all' : sec);
      });
    });

    document.querySelectorAll('[data-sector-card]').forEach((card) => {
      card.addEventListener('mouseenter', () => setSectorHighlight(card.dataset.sectorCard));
      card.addEventListener('mouseleave', () => setSectorHighlight('all'));
      card.addEventListener('click', () => setSectorHighlight(card.dataset.sectorCard));
    });

    // Admin Panel Triggers: Footer Button + Keyboard Shortcut Ctrl+Shift+A
    document.getElementById('btnOpenAdmin').addEventListener('click', requestOrganizerAccess);

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        requestOrganizerAccess();
      } else if (e.key === 'Escape') {
        if (!document.getElementById('confirmModal').classList.contains('hidden')) {
          document.getElementById('btnConfirmCancel').click();
        } else if (!document.getElementById('pinModal').classList.contains('hidden')) {
          closeModal('pinModal');
        } else if (!document.getElementById('adminModal').classList.contains('hidden')) {
          closeModal('adminModal');
        }
      }
    });

    // Modal Backdrop & Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    ['pinModal', 'adminModal'].forEach((modalId) => {
      const backdrop = document.getElementById(modalId);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal(modalId);
      });
    });

    // PIN Visibility Toggle & Form Verification
    const pinInput = document.getElementById('pinInput');
    document.getElementById('btnTogglePinVis').addEventListener('click', () => {
      pinInput.type = pinInput.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('pinForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = pinInput.value.trim();
      if (entered === getAdminPin()) {
        state.adminUnlocked = true;
        document.getElementById('pinErrorMsg').classList.add('hidden');
        closeModal('pinModal');
        syncAdminFormsFromState();
        openModal('adminModal');
        showToast('success', 'Akses Diberikan', 'Selamat datang di Panel Admin Penyelenggara.');
      } else {
        document.getElementById('pinErrorMsg').classList.remove('hidden');
        pinInput.select();
      }
    });

    // Lock Admin Button
    document.getElementById('btnLockAdmin').addEventListener('click', () => {
      state.adminUnlocked = false;
      closeModal('adminModal');
      showToast('info', 'Panel Dikunci', 'Sesi Admin telah dikunci kembali.');
    });

    // Admin Tab Navigation
    document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchAdminTab(btn.dataset.adminTab));
    });

    // Preview Sticky Banner Actions
    document.getElementById('btnBackToAdmin').addEventListener('click', () => {
      syncAdminFormsFromState();
      switchAdminTab('guests');
      openModal('adminModal');
    });

    document.getElementById('btnExitPreview').addEventListener('click', () => {
      state.previewGuest = null;
      renderPersonalizationAndEventDetails();
      showToast('info', 'Pratinjau Ditutup', 'Tampilan dikembalikan ke mode tamu utama.');
    });

    // Admin Tab 1: Add Single Guest
    document.getElementById('singleGuestForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = document.getElementById('guestInputName');
      const roleEl = document.getElementById('guestInputRole');
      const passEl = document.getElementById('guestInputPass');
      const tribunEl = document.getElementById('guestInputTribun');

      const name = nameEl.value.trim();
      if (!name) {
        showToast('error', 'Nama Tamu Kosong', 'Masukkan nama tamu untuk membuat link undangan.');
        nameEl.focus();
        return;
      }

      const newGuest = {
        id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        role: roleEl.value.trim() || 'Tamu Undangan Komunitas F1',
        pass: passEl.value,
        tribun: tribunEl.value.trim() || state.config.defaultTribun,
        createdAt: new Date().toISOString()
      };

      state.guests.unshift(newGuest);
      writeStorageJson(STORAGE_KEYS.GUESTS, state.guests);
      renderAdminGuestTable();

      nameEl.value = '';
      roleEl.value = '';
      tribunEl.value = '';
      showToast('success', 'Link Tamu Dibuat', `Link undangan untuk ${newGuest.name} siap dibagikan.`);
    });

    // Admin Tab 1: Bulk Guest Import
    document.getElementById('bulkGuestForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const rawText = document.getElementById('bulkGuestTextarea').value;
      const defaultPass = document.getElementById('bulkDefaultPass').value;
      const defaultRole =
        document.getElementById('bulkDefaultRole').value.trim() || 'Tamu Undangan Komunitas F1';

      const lines = rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        showToast('error', 'Input Massal Kosong', 'Masukkan minimal satu baris nama tamu.');
        return;
      }

      const added = lines.map((line, idx) => {
        const parts = line.split('|').map((p) => p.trim());
        return {
          id: `g_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
          name: parts[0],
          role: parts[1] || defaultRole,
          pass: parts[2] || defaultPass,
          tribun: parts[3] || state.config.defaultTribun,
          createdAt: new Date().toISOString()
        };
      }).filter((item) => Boolean(item.name));

      state.guests = [...added, ...state.guests];
      writeStorageJson(STORAGE_KEYS.GUESTS, state.guests);
      renderAdminGuestTable();
      document.getElementById('bulkGuestTextarea').value = '';
      showToast('success', 'Input Massal Berhasil', `${added.length} link tamu baru berhasil ditambahkan.`);
    });

    // Admin Tab 1: Guest Search, Row Actions, Copy All & CSV Export
    document.getElementById('guestSearchInput').addEventListener('input', (e) => {
      state.guestSearchQuery = e.target.value;
      renderAdminGuestTable();
    });

    document.getElementById('adminGuestTableBody').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-guest-action]');
      if (!btn) return;
      const action = btn.dataset.guestAction;
      const guest = state.guests.find((g) => g.id === btn.dataset.guestId);
      if (!guest) return;

      if (action === 'preview') {
        state.previewGuest = { ...guest };
        closeModal('adminModal');
        renderPersonalizationAndEventDetails();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('info', 'Mode Pratinjau Aktif', `Menampilkan undangan sebagai ${guest.name}.`);
      } else if (action === 'copy') {
        const url = buildGuestUrl(guest);
        copyTextToClipboard(url, 'Link Disalin', `Tautan personal untuk ${guest.name} berhasil disalin.`);
      } else if (action === 'wa') {
        const msg = buildWhatsAppInviteMessage(guest);
        const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      } else if (action === 'delete') {
        const ok = await showConfirmModal(
          'HAPUS TAMU',
          `Apakah Anda yakin ingin menghapus data dan link undangan milik "${guest.name}"?`,
          'Hapus Tamu'
        );
        if (ok) {
          state.guests = state.guests.filter((g) => g.id !== guest.id);
          if (state.previewGuest && state.previewGuest.id === guest.id) {
            state.previewGuest = null;
            renderPersonalizationAndEventDetails();
          }
          writeStorageJson(STORAGE_KEYS.GUESTS, state.guests);
          renderAdminGuestTable();
          showToast('info', 'Tamu Dihapus', `Data ${guest.name} telah dihapus dari daftar.`);
        }
      }
    });

    document.getElementById('btnCopyAllLinks').addEventListener('click', () => {
      const list = getFilteredGuests();
      if (list.length === 0) {
        showToast('info', 'Daftar Kosong', 'Tidak ada link tamu untuk disalin.');
        return;
      }
      const formatted = list
        .map((g, idx) => `${idx + 1}. ${g.name} (${g.pass})\n${buildGuestUrl(g)}`)
        .join('\n\n');
      copyTextToClipboard(
        formatted,
        'Semua Link Disalin',
        `${list.length} tautan undangan tamu berhasil disalin sekaligus.`
      );
    });

    document.getElementById('btnExportGuestsCsv').addEventListener('click', exportGuestsToCsv);

    // Admin Tab 2: Save Schedule & Event Details
    document.getElementById('scheduleConfigForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('cfgEventTitle').value.trim();
      const host = document.getElementById('cfgHostName').value.trim();
      const dressCode = document.getElementById('cfgDressCode').value.trim();
      const defaultTribun = document.getElementById('cfgDefaultTribun').value.trim();

      if (!title || !host || !dressCode || !defaultTribun) {
        showToast('error', 'Data Belum Lengkap', 'Seluruh kolom detail acara wajib diisi.');
        return;
      }

      for (let i = 0; i < state.sessions.length; i += 1) {
        const s = state.sessions[i];
        const stVal = document.getElementById(`editStart_${s.id}`).value;
        const enVal = document.getElementById(`editEnd_${s.id}`).value;
        if (!isValidTimeHm(stVal) || !isValidTimeHm(enVal)) {
          showToast('error', 'Format Jam Tidak Valid', `Periksa kembali jam WIB pada sesi ${s.name}.`);
          return;
        }
        s.startWib = stVal;
        s.endWib = enVal;
      }

      state.config.title = title;
      state.config.host = host;
      state.config.dressCode = dressCode;
      state.config.defaultTribun = defaultTribun;

      writeStorageJson(STORAGE_KEYS.CONFIG, state.config);
      writeStorageJson(
        STORAGE_KEYS.SCHEDULE,
        state.sessions.map((s) => ({ id: s.id, startWib: s.startWib, endWib: s.endWib }))
      );

      renderPersonalizationAndEventDetails();
      renderScheduleSection();
      updateClocksAndCountdown();
      renderAdminGuestTable();
      showToast(
        'success',
        'Jadwal & Acara Tersinkron',
        'Perubahan WIB telah diterapkan ke countdown, kalender .ics, dan seluruh link tamu.'
      );
    });

    document.getElementById('btnResetScheduleDefaults').addEventListener('click', async () => {
      const ok = await showConfirmModal(
        'RESET JADWAL RESMI FIA',
        'Kembalikan judul acara, detail penyelenggara, dan seluruh jam sesi WIB ke jadwal resmi FIA Qatar GP 2026?',
        'Reset ke Default'
      );
      if (!ok) return;

      const preservedBaseUrl = state.config.baseUrl;
      state.config = { ...FACTORY_CONFIG, baseUrl: preservedBaseUrl };
      state.sessions = FACTORY_SESSIONS.map((s) => ({ ...s }));

      writeStorageJson(STORAGE_KEYS.CONFIG, state.config);
      writeStorageJson(STORAGE_KEYS.SCHEDULE, state.sessions);

      syncAdminFormsFromState();
      renderPersonalizationAndEventDetails();
      renderScheduleSection();
      updateClocksAndCountdown();
      showToast('success', 'Jadwal Direset', 'Seluruh jam sesi kembali ke jadwal resmi FIA WIB.');
    });

    // Admin Tab 3: Base URL & GitHub Pages Preset
    document.getElementById('btnApplyGhPreset').addEventListener('click', () => {
      const user = (document.getElementById('ghUsername').value.trim() || 'username').replace(/[^a-zA-Z0-9-]/g, '');
      const repo = (document.getElementById('ghRepo').value.trim() || 'f1-qatar-gp-2026').replace(/[^a-zA-Z0-9._-]/g, '');
      const ghUrl = `https://${user}.github.io/${repo}/`;
      document.getElementById('cfgBaseUrl').value = ghUrl;
      showToast('info', 'Preset GitHub Pages Siap', 'Klik Simpan Base URL untuk menerapkan ke seluruh link tamu.');
    });

    document.getElementById('btnUseCurrentOrigin').addEventListener('click', () => {
      document.getElementById('cfgBaseUrl').value = window.location.href.split('?')[0].split('#')[0];
    });

    document.getElementById('btnSaveBaseUrl').addEventListener('click', () => {
      const val = document.getElementById('cfgBaseUrl').value.trim();
      state.config.baseUrl = val;
      writeStorageJson(STORAGE_KEYS.CONFIG, state.config);
      renderAdminGuestTable();
      showToast('success', 'Base URL Disimpan', 'Seluruh link undangan tamu telah diperbarui.');
    });

    // Admin Tab 3: Change Admin PIN
    document.getElementById('changePinForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const oldPinEl = document.getElementById('oldPinInput');
      const newPinEl = document.getElementById('newPinInput');

      if (oldPinEl.value.trim() !== getAdminPin()) {
        showToast('error', 'PIN Lama Salah', 'PIN saat ini yang Anda masukkan tidak cocok.');
        oldPinEl.focus();
        return;
      }

      const nextPin = newPinEl.value.trim();
      if (nextPin.length < 4) {
        showToast('error', 'PIN Terlalu Pendek', 'Gunakan minimal 4 karakter atau angka untuk keamanan.');
        newPinEl.focus();
        return;
      }

      setAdminPin(nextPin);
      oldPinEl.value = '';
      newPinEl.value = '';
      showToast('success', 'PIN Diperbarui', 'PIN akses penyelenggara berhasil diganti.');
    });

    // Admin Tab 3: Supabase Cloud Configuration & Actions
    document.getElementById('btnSaveSupabaseConfig').addEventListener('click', async () => {
      const urlVal = document.getElementById('cfgSupabaseUrl').value.trim();
      const keyVal = document.getElementById('cfgSupabaseKey').value.trim();

      state.config.supabaseUrl = urlVal;
      state.config.supabaseAnonKey = keyVal;
      writeStorageJson(STORAGE_KEYS.CONFIG, state.config);

      if (!urlVal || !keyVal) {
        await initSupabaseConnection(false);
        showToast('info', 'Mode Lokal Aktif', 'Kredensial Supabase dikosongkan; menggunakan penyimpanan lokal.');
        return;
      }

      await initSupabaseConnection(true);
    });

    document.getElementById('btnRefreshCloudRsvp').addEventListener('click', async () => {
      if (!state.supabase) {
        showToast('info', 'Belum Terhubung', 'Masukkan Project URL dan Anon Key Supabase terlebih dahulu.');
        return;
      }
      await fetchCloudRsvps(false);
    });

    document.getElementById('btnCopySupabaseSql').addEventListener('click', () => {
      copyTextToClipboard(
        SUPABASE_SCHEMA_SQL,
        'Script SQL Disalin',
        'Tempel (Paste) dan jalankan di menu SQL Editor pada Dashboard Supabase.'
      );
    });

    // Admin Tab 3: RSVP Row Deletion & Bulk Clear
    document.getElementById('adminRsvpTableBody').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-rsvp-del]');
      if (!btn) return;
      const target = state.rsvps.find((r) => String(r.id) === String(btn.dataset.rsvpDel));
      if (!target) return;

      const ok = await showConfirmModal(
        'HAPUS DATA RSVP',
        `Hapus konfirmasi RSVP atas nama "${target.name}"?`,
        'Hapus'
      );
      if (ok) {
        if (state.supabase) {
          const { error } = await state.supabase.from('rsvps').delete().eq('id', target.id);
          if (error) {
            showToast('error', 'Gagal Menghapus di Cloud', 'Periksa policy DELETE pada tabel rsvps di Supabase.');
            return;
          }
          await fetchCloudRsvps(true);
        } else {
          state.rsvps = state.rsvps.filter((r) => String(r.id) !== String(target.id));
          writeStorageJson(STORAGE_KEYS.RSVPS, state.rsvps);
          renderAdminRsvpTab();
          renderPublicRsvpCounters();
          renderGuestRsvpReceipt();
        }
        showToast('info', 'RSVP Dihapus', `Data RSVP ${target.name} telah dihapus.`);
      }
    });

    document.getElementById('btnExportRsvpCsv').addEventListener('click', exportRsvpsToCsv);

    document.getElementById('btnClearAllRsvps').addEventListener('click', async () => {
      if (state.rsvps.length === 0) {
        showToast('info', 'Data Kosong', 'Tidak ada data RSVP untuk dihapus.');
        return;
      }
      const ok = await showConfirmModal(
        'HAPUS SEMUA RSVP',
        `Apakah Anda yakin ingin menghapus seluruh ${state.rsvps.length} data RSVP tamu secara permanen?`,
        'Hapus Semua'
      );
      if (ok) {
        if (state.supabase) {
          const { error } = await state.supabase.from('rsvps').delete().neq('guest_key', '');
          if (error) {
            showToast('error', 'Gagal Mengosongkan Cloud', 'Periksa policy DELETE pada tabel rsvps di Supabase.');
            return;
          }
          await fetchCloudRsvps(true);
        } else {
          state.rsvps = [];
          writeStorageJson(STORAGE_KEYS.RSVPS, state.rsvps);
          renderAdminRsvpTab();
          renderPublicRsvpCounters();
          renderGuestRsvpReceipt();
        }
        showToast('info', 'RSVP Dibersihkan', 'Seluruh rekapitulasi RSVP telah dikosongkan.');
      }
    });

    // Admin Tab 3: Export & Import Full JSON Backup
    document.getElementById('btnExportBackupJson').addEventListener('click', () => {
      const snapshot = {
        app: 'F1-Qatar-GP-2026-Official-Invitation',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        config: state.config,
        sessions: state.sessions.map((s) => ({
          id: s.id,
          startWib: s.startWib,
          endWib: s.endWib
        })),
        guests: state.guests,
        rsvps: state.rsvps
      };

      const jsonStr = JSON.stringify(snapshot, null, 2);
      triggerFileDownload(jsonStr, 'backup-f1-qatar-gp-2026.json', 'application/json;charset=utf-8');
      showToast('success', 'Backup JSON Diekspor', 'File cadangan konfigurasi, tamu, dan RSVP berhasil diunduh.');
    });

    const importInput = document.getElementById('importBackupFileInput');
    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;

      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.guests)) {
          throw new Error('Invalid schema');
        }

        const ok = await showConfirmModal(
          'IMPOR BACKUP JSON',
          `Pulihkan data dari file "${file.name}" (${parsed.guests.length} tamu, ${(parsed.rsvps || []).length} RSVP)? Data saat ini akan ditimpa.`,
          'Pulihkan Data'
        );

        if (ok) {
          state.config = { ...FACTORY_CONFIG, ...(parsed.config || {}) };
          state.sessions = FACTORY_SESSIONS.map((def) => {
            const m = Array.isArray(parsed.sessions)
              ? parsed.sessions.find((item) => item.id === def.id)
              : null;
            return {
              ...def,
              startWib: m && isValidTimeHm(m.startWib) ? m.startWib : def.startWib,
              endWib: m && isValidTimeHm(m.endWib) ? m.endWib : def.endWib
            };
          });
          state.guests = parsed.guests;
          state.rsvps = Array.isArray(parsed.rsvps) ? parsed.rsvps : [];

          writeStorageJson(STORAGE_KEYS.CONFIG, state.config);
          writeStorageJson(STORAGE_KEYS.SCHEDULE, state.sessions);
          writeStorageJson(STORAGE_KEYS.GUESTS, state.guests);
          writeStorageJson(STORAGE_KEYS.RSVPS, state.rsvps);

          syncAdminFormsFromState();
          renderPersonalizationAndEventDetails();
          renderScheduleSection();
          renderPublicRsvpCounters();
          updateClocksAndCountdown();
          showToast('success', 'Backup Dipulihkan', 'Seluruh data tamu, jadwal, dan RSVP berhasil diimpor.');
        }
      } catch (_err) {
        showToast('error', 'File JSON Tidak Valid', 'Pastikan Anda memilih file backup JSON resmi dari aplikasi ini.');
      } finally {
        importInput.value = '';
      }
    });
  }

  /* ------------------------------------------------------------------------
     BACKGROUND AUDIO PLAYER (lagu/f1 theme.mp3)
     ------------------------------------------------------------------------ */
  function updateAudioUi(isPlaying) {
    state.audioPlaying = Boolean(isPlaying);

    const floatingBtn = document.getElementById('btnFloatingAudio');
    const floatingLabel = document.getElementById('floatingAudioLabel');
    const floatingIconWrap = document.getElementById('floatingAudioIconWrap');

    const navBtn = document.getElementById('btnNavAudioToggle');
    const navLabel = document.getElementById('navAudioLabel');

    const iconName = state.audioPlaying ? 'volume-2' : 'volume-x';

    if (floatingBtn && floatingLabel && floatingIconWrap) {
      floatingBtn.classList.toggle('is-playing', state.audioPlaying);
      floatingBtn.setAttribute('aria-pressed', state.audioPlaying ? 'true' : 'false');
      floatingLabel.textContent = state.audioPlaying ? 'Matikan Lagu' : 'Aktifkan Lagu';
      floatingIconWrap.innerHTML = `<i data-lucide="${iconName}"></i>`;
    }

    if (navBtn && navLabel) {
      navBtn.classList.toggle('is-playing', state.audioPlaying);
      navBtn.setAttribute('aria-pressed', state.audioPlaying ? 'true' : 'false');
      navLabel.textContent = state.audioPlaying ? 'LAGU: AKTIF' : 'LAGU: MATI';
      const existingIcon = navBtn.querySelector('svg.lucide, [data-lucide]');
      if (existingIcon) {
        existingIcon.outerHTML = `<i data-lucide="${iconName}"></i>`;
      }
    }

    refreshIcons();
  }

  function initAudioPlayer() {
    const audio = document.getElementById('bgAudio');
    if (!audio || typeof audio.play !== 'function') return;

    audio.volume = 0.55;

    let savedPref = null;
    try {
      savedPref = window.localStorage.getItem(STORAGE_KEYS.AUDIO);
    } catch (_err) {
      savedPref = null;
    }

    // Default to enabled unless user explicitly turned music off previously
    const shouldAutoStart = savedPref !== 'false';
    let gestureUnlockActive = false;

    const removeGestureListeners = () => {
      if (!gestureUnlockActive) return;
      gestureUnlockActive = false;
      document.removeEventListener('click', onFirstGesture);
      document.removeEventListener('keydown', onFirstGesture);
    };

    const onFirstGesture = (e) => {
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('[data-audio-toggle]')) {
        return;
      }
      removeGestureListeners();
      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.then === 'function') {
        playAttempt
          .then(() => {
            updateAudioUi(true);
          })
          .catch(() => {
            updateAudioUi(false);
          });
      }
    };

    const toggleAudio = () => {
      removeGestureListeners();
      if (!audio.paused) {
        audio.pause();
        updateAudioUi(false);
        try {
          window.localStorage.setItem(STORAGE_KEYS.AUDIO, 'false');
        } catch (_err) {}
        showToast('info', 'Lagu Dimatikan', 'Musik latar Formula 1 Theme dihentikan.');
      } else {
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              updateAudioUi(true);
              try {
                window.localStorage.setItem(STORAGE_KEYS.AUDIO, 'true');
              } catch (_err) {}
              showToast('success', 'Lagu Diaktifkan', 'Memutar musik latar Formula 1 Official Theme.');
            })
            .catch(() => {
              updateAudioUi(false);
              showToast('error', 'Gagal Memutar Audio', 'Pastikan file lagu tersedia dan izin suara browser aktif.');
            });
        } else {
          updateAudioUi(!audio.paused);
        }
      }
    };

    document.querySelectorAll('[data-audio-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggleAudio);
    });

    audio.addEventListener('play', () => updateAudioUi(true));
    audio.addEventListener('pause', () => updateAudioUi(false));

    updateAudioUi(false);

    if (shouldAutoStart) {
      const initialPlay = audio.play();
      if (initialPlay && typeof initialPlay.then === 'function') {
        initialPlay
          .then(() => {
            updateAudioUi(true);
          })
          .catch(() => {
            // Browser blocked autoplay prior to user interaction; unlock on first click/tap
            gestureUnlockActive = true;
            document.addEventListener('click', onFirstGesture);
            document.addEventListener('keydown', onFirstGesture);
          });
      }
    }
  }

  /* ------------------------------------------------------------------------
     HERO COVER GATE, PHOTO GALLERY, LIGHTBOX & SCROLL REVEAL ANIMATIONS
     ------------------------------------------------------------------------ */
  const GALLERY_ITEMS = [
    {
      src: 'img/gallery/lusail-floodlit-straight.jpg',
      title: 'Lintasan Lurus Utama 1,068 KM',
      desc: 'Percikan titanium di bawah ribuan lampu sorot malam Lusail International Circuit.'
    },
    {
      src: 'img/gallery/lusail-paddock-hospitality.jpg',
      title: 'Lusail Paddock Club Hospitality',
      desc: 'Teras pandang VIP tepat di atas garasi tim dan garis start/finish.'
    },
    {
      src: 'img/gallery/lusail-triple-apex.jpg',
      title: 'Triple-Right-Hander Tikungan 12-14',
      desc: 'Beban gravitasi lateral 4.8G melewati kerb khas Qatar Maroon dan emas.'
    },
    {
      src: 'img/gallery/f1-starting-grid.jpg',
      title: 'Spektakel Balap Malam',
      desc: 'Kontras dramatis antara aspal gelap dan tata cahaya sirkuit berstandar FIA Grade 1.'
    },
    {
      src: 'img/gallery/f1-paddock-garage.jpg',
      title: 'Fokus Kokpit & Telemetri',
      desc: 'Konsentrasi penuh pembalap menghadapi suhu malam gurun Qatar selama 57 lap.'
    },
    {
      src: 'img/gallery/f1-pitstop-crew.jpg',
      title: 'Strategi & Presisi Pit Stop',
      desc: 'Koordinasi 20 kru mekanik mengeksekusi pergantian ban di bawah 2,5 detik.'
    }
  ];

  function initCoverGate() {
    const cover = document.getElementById('invitationCover');
    const openBtn = document.getElementById('btnOpenInvitation');
    if (!cover || !openBtn) return;

    let alreadyOpened = false;
    try {
      alreadyOpened = window.sessionStorage && window.sessionStorage.getItem('f1_qatar2026_cover_opened') === '1';
    } catch (_err) {
      alreadyOpened = false;
    }

    if (alreadyOpened || state.previewGuest) {
      cover.classList.add('hidden');
      return;
    }

    document.body.style.overflow = 'hidden';

    openBtn.addEventListener('click', () => {
      cover.classList.add('is-opening');
      document.body.style.overflow = '';
      try {
        if (window.sessionStorage) {
          window.sessionStorage.setItem('f1_qatar2026_cover_opened', '1');
        }
      } catch (_err) {}

      // Start F1 Official Theme music smoothly when guest clicks "Buka Undangan"
      let allowMusic = true;
      try {
        allowMusic = window.localStorage.getItem(STORAGE_KEYS.AUDIO) !== 'false';
      } catch (_err) {}
      const audio = document.getElementById('bgAudio');
      if (allowMusic && audio && audio.paused && typeof audio.play === 'function') {
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => updateAudioUi(true)).catch(() => {});
        }
      }

      window.setTimeout(() => {
        cover.classList.add('hidden');
      }, 660);
    });
  }

  function initGalleryAndLightbox() {
    const viewport = document.getElementById('galleryViewport');
    const track = document.getElementById('galleryTrack');
    const btnGrid = document.getElementById('btnGalleryGridMode');
    const btnCarousel = document.getElementById('btnGalleryCarouselMode');
    const carouselControls = document.getElementById('galleryCarouselControls');
    const dotsContainer = document.getElementById('galleryCarouselDots');
    const btnPrev = document.getElementById('btnCarouselPrev');
    const btnNext = document.getElementById('btnCarouselNext');

    const lightboxModal = document.getElementById('galleryLightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxCaptionTitle');
    const lightboxDesc = document.getElementById('lightboxCaptionDesc');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const btnLbPrev = document.getElementById('btnLightboxPrev');
    const btnLbNext = document.getElementById('btnLightboxNext');

    if (!viewport || !track) return;

    let currentSlide = 0;
    let activeLightboxIdx = 0;

    if (dotsContainer) {
      dotsContainer.innerHTML = GALLERY_ITEMS.map(
        (_item, idx) =>
          `<button type="button" class="carousel-dot${idx === 0 ? ' active' : ''}" data-carousel-dot="${idx}" aria-label="Lompat ke foto ${idx + 1}"></button>`
      ).join('');
    }

    const scrollToCarouselIndex = (index) => {
      const items = track.querySelectorAll('.gallery-item');
      if (!items.length) return;
      currentSlide = (index + items.length) % items.length;
      const targetEl = items[currentSlide];
      if (targetEl && typeof targetEl.scrollIntoView === 'function') {
        targetEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
          d.classList.toggle('active', i === currentSlide);
        });
      }
    };

    if (btnGrid && btnCarousel && carouselControls) {
      btnGrid.addEventListener('click', () => {
        viewport.classList.remove('mode-carousel');
        viewport.classList.add('mode-grid');
        btnGrid.classList.add('active');
        btnCarousel.classList.remove('active');
        carouselControls.classList.add('hidden');
      });

      btnCarousel.addEventListener('click', () => {
        viewport.classList.remove('mode-grid');
        viewport.classList.add('mode-carousel');
        btnCarousel.classList.add('active');
        btnGrid.classList.remove('active');
        carouselControls.classList.remove('hidden');
        scrollToCarouselIndex(0);
      });
    }

    if (btnPrev) btnPrev.addEventListener('click', () => scrollToCarouselIndex(currentSlide - 1));
    if (btnNext) btnNext.addEventListener('click', () => scrollToCarouselIndex(currentSlide + 1));

    if (dotsContainer) {
      dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('[data-carousel-dot]');
        if (!dot) return;
        scrollToCarouselIndex(Number(dot.dataset.carouselDot) || 0);
      });
    }

    const showLightboxAt = (idx) => {
      if (!lightboxModal || !lightboxImg) return;
      activeLightboxIdx = (idx + GALLERY_ITEMS.length) % GALLERY_ITEMS.length;
      const item = GALLERY_ITEMS[activeLightboxIdx];
      lightboxImg.src = item.src;
      lightboxImg.alt = item.title;
      if (lightboxTitle) lightboxTitle.textContent = item.title;
      if (lightboxDesc) lightboxDesc.textContent = item.desc;
      if (lightboxCounter) lightboxCounter.textContent = `${pad2(activeLightboxIdx + 1)} / ${pad2(GALLERY_ITEMS.length)}`;
      openModal('galleryLightboxModal');
    };

    track.addEventListener('click', (e) => {
      const fig = e.target.closest('[data-gallery-idx]');
      if (!fig) return;
      showLightboxAt(Number(fig.dataset.galleryIdx) || 0);
    });

    if (btnLbPrev) btnLbPrev.addEventListener('click', () => showLightboxAt(activeLightboxIdx - 1));
    if (btnLbNext) btnLbNext.addEventListener('click', () => showLightboxAt(activeLightboxIdx + 1));

    if (lightboxModal) {
      lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeModal('galleryLightboxModal');
      });
    }

    document.addEventListener('keydown', (e) => {
      if (!lightboxModal || lightboxModal.classList.contains('hidden')) return;
      if (e.key === 'ArrowLeft') showLightboxAt(activeLightboxIdx - 1);
      if (e.key === 'ArrowRight') showLightboxAt(activeLightboxIdx + 1);
      if (e.key === 'Escape') closeModal('galleryLightboxModal');
    });

    // Generic Copy Account / Address buttons with Toast feedback
    document.querySelectorAll('[data-copy-text]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-copy-text') || '';
        const lbl = btn.getAttribute('data-copy-label') || 'Teks';
        copyTextToClipboard(val, `${lbl} Disalin`, `${val} berhasil disalin ke papan klip.`);
      });
    });
  }

  function initScrollRevealAnimations() {
    if (typeof window.IntersectionObserver !== 'function') return;

    // Automatically tag major editorial blocks & apply staggered delays inside grids
    const autoRevealSelectors = [
      '.hero-editorial',
      '.countdown-tower',
      '.formal-letter',
      '.pass-column',
      '.schedule-controls',
      '.schedule-card',
      '.circuit-metric-card',
      '.track-diagram-card',
      '.sector-card',
      '.map-panel',
      '.rsvp-form-card',
      '.paddock-pulse-card',
      '.protocol-card',
      '.copy-info-card'
    ];

    autoRevealSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el, idx) => {
        if (!el.classList.contains('reveal-on-scroll')) {
          el.classList.add('reveal-on-scroll');
        }
        const staggerMs = (idx % 5) * 65;
        if (el.style) {
          el.style.setProperty?.('--reveal-delay', `${staggerMs}ms`);
        }
      });
    });

    document.querySelectorAll('.gallery-item.reveal-on-scroll').forEach((el, idx) => {
      if (el.style) {
        el.style.setProperty?.('--reveal-delay', `${(idx % 3) * 85}ms`);
      }
    });

    document.body.classList.add('scroll-anim-ready');

    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -36px 0px' }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     BOOT APPLICATION
     ------------------------------------------------------------------------ */
  function initApp() {
    loadState();
    refreshIcons();
    renderPersonalizationAndEventDetails();
    renderScheduleSection();
    renderPublicRsvpCounters();
    updateClocksAndCountdown();
    initRsvpInteractions();
    bindEvents();
    initCoverGate();
    initGalleryAndLightbox();
    initScrollRevealAnimations();
    initAudioPlayer();
    initSupabaseConnection(false);
    initLeafletCircuitMap();

    // Tick every second for real-time countdown and live WIB clock
    window.setInterval(updateClocksAndCountdown, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
