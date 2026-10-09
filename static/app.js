/**
 * Sovereign Music - Motor con Smart Balanced Shuffle y Hero Card Dinámica en Tiempo Real
 * Interfaz Monocromática Stealth Dark (Estilo Spotify Desktop con Panel Lateral Derecho)
 * Incluye corrección de reproducción continua y metadatos en pantalla bloqueada para iOS / Safari PWA
 */

// Estado Global
let allTracks = [];
let displayedTracks = [];
let currentQueue = [];
let currentTrackIndex = -1;
let currentPlaylistId = null;

let isShuffle = true;
let repeatMode = 'none'; // 'none' | 'all' | 'one'
let playlists = [];
let likedTracks = [];
let historyTracks = [];
let recentAlbumIds = [];
let activeSleepTimer = null;
let trackToAddToPlaylist = null;
let currentVolume = 1.0;
let previousVolume = 1.0;
let isSeeking = false;

// Elementos DOM
const audioEl = document.getElementById('audioElement');
const homeView = document.getElementById('homeView');
const listView = document.getElementById('listView');
const queueView = document.getElementById('queueView');
const searchView = document.getElementById('searchView');

const homeGreeting = document.getElementById('homeGreeting');
const homeRecentGrid = document.getElementById('homeRecentGrid');
const homeFeaturedCard = document.getElementById('homeFeaturedCard');
const featuredCover = document.getElementById('featuredCover');
const featuredTitle = document.getElementById('featuredTitle');
const featuredSubtitle = document.getElementById('featuredSubtitle');
const featuredCount = document.getElementById('featuredCount');
const featuredPlayBtn = document.getElementById('featuredPlayBtn');

const recentCarousel = document.getElementById('recentCarousel');
const trackListEl = document.getElementById('trackList');
const queueList = document.getElementById('queueList');
const trackCountLabel = document.getElementById('trackCountLabel');

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

const viewTitle = document.getElementById('viewTitle');
const bannerType = document.getElementById('bannerType');
const viewCover = document.getElementById('viewCover');
const viewCoverIcon = document.getElementById('viewCoverIcon');
const playAllBtn = document.getElementById('playAllBtn');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const mobileBackBtn = document.getElementById('mobileBackBtn');
const addTracksToPlaylistBtn = document.getElementById('addTracksToPlaylistBtn');

// Mini Player DOM
const playerInfoArea = document.getElementById('playerInfoArea');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const playerCover = document.getElementById('playerCover');
const defaultCoverIcon = document.getElementById('defaultCoverIcon');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const mobilePlayPauseBtn = document.getElementById('mobilePlayPauseBtn');
const mobilePlayIcon = document.getElementById('mobilePlayIcon');
const mobilePauseIcon = document.getElementById('mobilePauseIcon');
const mobileProgressBarFill = document.getElementById('mobileProgressBarFill');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const repeatBtn = document.getElementById('repeatBtn');
const repeatDot = document.getElementById('repeatDot');
const repeatOneBadge = document.getElementById('repeatOneBadge');
const shuffleBtn = document.getElementById('shuffleBtn');
const shuffleDot = document.getElementById('shuffleDot');

const mobileLikeBtn = document.getElementById('mobileLikeBtn');
const likeCurrentBtnDesktop = document.getElementById('likeCurrentBtnDesktop');

const progressBar = document.getElementById('progressBar');
const currentTimeLabel = document.getElementById('currentTimeLabel');
const durationLabel = document.getElementById('durationLabel');
const viewQueueBtn = document.getElementById('viewQueueBtn');
const clearQueueBtn = document.getElementById('clearQueueBtn');

// Panel Derecho (Now Playing Desktop)
const panelRightCover = document.getElementById('panelRightCover');
const panelRightTitle = document.getElementById('panelRightTitle');
const panelRightArtist = document.getElementById('panelRightArtist');
const panelRightLikeBtn = document.getElementById('panelRightLikeBtn');
const panelAlbumHeader = document.getElementById('panelAlbumHeader');
const panelRightMetaAlbum = document.getElementById('panelRightMetaAlbum');
const panelRightMetaDuration = document.getElementById('panelRightMetaDuration');

// Filtros de Home (Pills)
const filterAllBtn = document.getElementById('filterAllBtn');
const filterMusicBtn = document.getElementById('filterMusicBtn');
const filterFoldersBtn = document.getElementById('filterFoldersBtn');

// Volumen DOM
const volumeBtn = document.getElementById('volumeBtn');
const volIconHigh = document.getElementById('volIconHigh');
const volIconMuted = document.getElementById('volIconMuted');
const volumeSlider = document.getElementById('volumeSlider');

// Modal Fullscreen Player (Móvil)
const fullPlayerModal = document.getElementById('fullPlayerModal');
const closeFullPlayerBtn = document.getElementById('closeFullPlayerBtn');
const fullCover = document.getElementById('fullCover');
const fullCoverIcon = document.getElementById('fullCoverIcon');
const fullTitle = document.getElementById('fullTitle');
const fullArtist = document.getElementById('fullArtist');
const fullLikeBtn = document.getElementById('fullLikeBtn');
const fullProgressBar = document.getElementById('fullProgressBar');
const fullCurrentTime = document.getElementById('fullCurrentTime');
const fullDuration = document.getElementById('fullDuration');
const fullShuffleBtn = document.getElementById('fullShuffleBtn');
const fullPrevBtn = document.getElementById('fullPrevBtn');
const fullPlayPauseBtn = document.getElementById('fullPlayPauseBtn');
const fullPlayIcon = document.getElementById('fullPlayIcon');
const fullPauseIcon = document.getElementById('fullPauseIcon');
const fullNextBtn = document.getElementById('fullNextBtn');
const fullRepeatBtn = document.getElementById('fullRepeatBtn');
const fullQueueBtn = document.getElementById('fullQueueBtn');

// Navegación
const navHomeBtn = document.getElementById('navHomeBtn');
const navSearchBtn = document.getElementById('navSearchBtn');
const navLibBtn = document.getElementById('navLibBtn');
const navLikedBtn = document.getElementById('navLikedBtn');
const navCreateBtn = document.getElementById('navCreateBtn');

const deskHomeBtn = document.getElementById('deskHomeBtn');
const deskLibBtn = document.getElementById('deskLibBtn');
const deskCreatePlaylistBtn = document.getElementById('deskCreatePlaylistBtn');
const deskPlaylistList = document.getElementById('deskPlaylistList');

// Modales DOM
const playlistModal = document.getElementById('playlistModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTrackTitle = document.getElementById('modalTrackTitle');
const modalPlaylistOptions = document.getElementById('modalPlaylistOptions');
const modalAddToQueueBtn = document.getElementById('modalAddToQueueBtn');
const modalCreateNewBtn = document.getElementById('modalCreateNewBtn');

const bulkAddModal = document.getElementById('bulkAddModal');
const closeBulkAddBtn = document.getElementById('closeBulkAddBtn');
const bulkSearchInput = document.getElementById('bulkSearchInput');
const bulkTrackList = document.getElementById('bulkTrackList');
const bulkModalSubtitle = document.getElementById('bulkModalSubtitle');

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Barra de progreso Monocromática
const updateSliderBackground = (slider, pct) => {
  if (!slider) return;
  slider.style.background = `linear-gradient(to right, #ffffff 0%, #ffffff ${pct}%, #4d4d4d ${pct}%, #4d4d4d 100%)`;
};

// Saludo dinámico según la hora del día
const updateGreeting = () => {
  if (!homeGreeting) return;
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    homeGreeting.textContent = 'Buenos días';
  } else if (hour >= 12 && hour < 20) {
    homeGreeting.textContent = 'Buenas tardes';
  } else {
    homeGreeting.textContent = 'Buenas noches';
  }
};

// Algoritmo Spotify Dither Balanced Shuffle
const spotifySmartShuffle = (trackList, startingTrackId = null) => {
  if (!trackList || trackList.length <= 1) return [...(trackList || [])];

  const total = trackList.length;
  const artistGroups = {};
  trackList.forEach(track => {
    const artistKey = (track.artist || 'Desconocido').trim().toLowerCase();
    if (!artistGroups[artistKey]) artistGroups[artistKey] = [];
    artistGroups[artistKey].push(track);
  });

  Object.keys(artistGroups).forEach(artist => {
    const group = artistGroups[artist];
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  });

  const positionedTracks = [];
  const recentHistoryIds = historyTracks.slice(0, 15).map(t => t.id);

  Object.values(artistGroups).forEach(group => {
    const step = total / group.length;
    group.forEach((track, idx) => {
      const jitter = (Math.random() - 0.5) * (step * 0.4);
      let targetIndex = (idx * step) + jitter;

      const historyIndex = recentHistoryIds.indexOf(track.id);
      if (historyIndex !== -1) {
        targetIndex += (15 - historyIndex) * (total / 15);
      }

      positionedTracks.push({ track, pos: targetIndex });
    });
  });

  positionedTracks.sort((a, b) => a.pos - b.pos);
  let finalQueue = positionedTracks.map(item => item.track);

  if (startingTrackId) {
    const startIdx = finalQueue.findIndex(t => t.id === startingTrackId);
    if (startIdx > 0) {
      const [startTrack] = finalQueue.splice(startIdx, 1);
      finalQueue.unshift(startTrack);
    }
  }

  return finalQueue;
};

const registerRecentAlbum = (playlistId) => {
  if (!playlistId) return;
  recentAlbumIds = [playlistId, ...recentAlbumIds.filter(id => id !== playlistId)].slice(0, 10);
  localStorage.setItem('sovereign_recent_albums', JSON.stringify(recentAlbumIds));
};

const playPlaylistDirectly = (tracks, playlistId = null) => {
  if (!tracks || tracks.length === 0) return;
  
  if (playlistId) {
    registerRecentAlbum(playlistId);
  }

  if (isShuffle) {
    currentQueue = spotifySmartShuffle(tracks);
  } else {
    currentQueue = [...tracks];
  }
  
  loadTrack(0);
};

const updateShuffleUI = () => {
  [shuffleBtn, fullShuffleBtn].forEach(btn => {
    if (!btn) return;
    if (isShuffle) {
      btn.classList.add('text-white');
      btn.classList.remove('text-spSubtext');
      if (shuffleDot) shuffleDot.classList.remove('hidden');
    } else {
      btn.classList.remove('text-white');
      btn.classList.add('text-spSubtext');
      if (shuffleDot) shuffleDot.classList.add('hidden');
    }
  });
};

// Sincronización blindada de metadatos y carátula para iOS Lock Screen / WebKit
const updateMediaSession = (track) => {
  if (!('mediaSession' in navigator) || !track) return;

  const origin = window.location.origin;
  const rawCoverUrl = track.has_cover ? track.cover_url : '/static/logotipo.jpg';
  const coverUrl = rawCoverUrl.startsWith('http') ? rawCoverUrl : `${origin}${rawCoverUrl}`;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Sovereign Music',
      artist: track.artist || 'Sovereign',
      album: track.album && track.album !== 'Desconocido' ? track.album : 'Sovereign Music',
      artwork: [
        { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
      ]
    });
  } catch (err) {
    console.warn("Error al registrar MediaMetadata:", err);
  }

  navigator.mediaSession.setActionHandler('play', () => audioEl.play().catch(() => {}));
  navigator.mediaSession.setActionHandler('pause', () => audioEl.pause());
  navigator.mediaSession.setActionHandler('previoustrack', playPreviousTrack);
  navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);

  try {
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && audioEl.duration) {
        audioEl.currentTime = details.seekTime;
      }
    });
  } catch (e) {}
};

// Actualiza el Hero Card y el Panel Lateral Derecho en tiempo real
const updateFeaturedCard = () => {
  const currentTrack = currentTrackIndex >= 0 ? currentQueue[currentTrackIndex] : historyTracks[0];

  if (currentTrack) {
    const isPlaying = !audioEl.paused && audioEl.src;
    
    // Panel Hero Central
    if (homeFeaturedCard) {
      const badge = homeFeaturedCard.querySelector('span');
      if (badge) {
        badge.textContent = isPlaying ? "REPRODUCIENDO AHORA" : "ÚLTIMA PISTA ESCUCHADA";
      }
      if (featuredTitle) featuredTitle.textContent = currentTrack.title;
      if (featuredSubtitle) featuredSubtitle.textContent = currentTrack.artist + (currentTrack.album && currentTrack.album !== 'Desconocido' ? ` • ${currentTrack.album}` : '');
      if (featuredCount) featuredCount.textContent = formatTime(currentTrack.duration_seconds);
      if (featuredCover) featuredCover.src = currentTrack.has_cover ? currentTrack.cover_url : '/static/logotipo.jpg';
      if (featuredPlayBtn) {
        featuredPlayBtn.innerHTML = isPlaying 
          ? `<span class="text-black">❚❚</span> Pausar` 
          : `<span class="text-black">▶</span> Reproducir`;
        featuredPlayBtn.onclick = (e) => {
          e.stopPropagation();
          togglePlayPause();
        };
      }
    }

    // Panel Derecho (Now Playing View Desktop)
    if (panelRightCover) {
      panelRightCover.src = currentTrack.has_cover ? currentTrack.cover_url : '/static/logotipo.jpg';
    }
    if (panelRightTitle) panelRightTitle.textContent = currentTrack.title;
    if (panelRightArtist) panelRightArtist.textContent = currentTrack.artist;
    if (panelAlbumHeader) {
      panelAlbumHeader.textContent = currentTrack.album && currentTrack.album !== 'Desconocido' ? currentTrack.album : 'Reproduciendo';
    }
    if (panelRightMetaAlbum) {
      panelRightMetaAlbum.textContent = `Álbum: ${currentTrack.album && currentTrack.album !== 'Desconocido' ? currentTrack.album : 'Sovereign'}`;
    }
    if (panelRightMetaDuration) {
      panelRightMetaDuration.textContent = `Duración: ${formatTime(currentTrack.duration_seconds)}`;
    }

  } else if (playlists.length > 0) {
    const pl = playlists[0];
    if (featuredTitle) featuredTitle.textContent = pl.name;
    if (featuredSubtitle) featuredSubtitle.textContent = pl.is_folder ? 'Carpeta local' : 'Playlist';
    if (featuredCount) featuredCount.textContent = `${pl.tracks.length} canciones`;
    if (featuredCover && pl.tracks[0]?.has_cover) featuredCover.src = pl.tracks[0].cover_url;
  }
};

const highlightCurrentRow = () => {
  const currentTrack = currentQueue[currentTrackIndex];
  if (!trackListEl) return;

  const isPlaying = !audioEl.paused && audioEl.src;

  Array.from(trackListEl.children).forEach((row) => {
    const isThisTrack = currentTrack && row.dataset.trackId === currentTrack.id;
    const numberEl = row.querySelector('.track-number');
    const eqEl = row.querySelector('.track-eq-indicator');
    const titleEl = row.querySelector('.track-title');

    if (isThisTrack) {
      row.classList.add('bg-[#242424]', 'border-l-4', 'border-white');
      if (titleEl) titleEl.classList.add('font-bold');
      if (numberEl) numberEl.classList.add('hidden');
      if (eqEl) {
        eqEl.classList.remove('hidden');
        eqEl.classList.add('flex');
        eqEl.querySelectorAll('span').forEach(bar => {
          bar.style.animationPlayState = isPlaying ? 'running' : 'paused';
        });
      }
    } else {
      row.classList.remove('bg-[#242424]', 'border-l-4', 'border-white');
      if (titleEl) titleEl.classList.remove('font-bold');
      if (numberEl) numberEl.classList.remove('hidden');
      if (eqEl) {
        eqEl.classList.add('hidden');
        eqEl.classList.remove('flex');
      }
    }
  });
};

// Carga y reproducción continua protegida para iOS
const loadTrack = (queueIndex) => {
  if (queueIndex < 0 || queueIndex >= currentQueue.length) return;

  currentTrackIndex = queueIndex;
  const track = currentQueue[queueIndex];

  audioEl.src = track.stream_url;
  audioEl.volume = currentVolume;
  
  const playPromise = audioEl.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.warn("Autoplay diferido en iOS:", err);
      setTimeout(() => {
        if (audioEl.paused) audioEl.play().catch(() => {});
      }, 100);
    });
  }

  if (progressBar) { progressBar.value = 0; updateSliderBackground(progressBar, 0); }
  if (fullProgressBar) { fullProgressBar.value = 0; updateSliderBackground(fullProgressBar, 0); }
  if (mobileProgressBarFill) mobileProgressBarFill.style.width = '0%';
  if (currentTimeLabel) currentTimeLabel.textContent = '0:00';
  if (fullCurrentTime) fullCurrentTime.textContent = '0:00';

  playerTitle.textContent = track.title;
  playerArtist.textContent = track.artist;
  if (durationLabel) durationLabel.textContent = formatTime(track.duration_seconds);

  if (track.has_cover) {
    playerCover.src = track.cover_url;
    playerCover.classList.remove('hidden');
    defaultCoverIcon.classList.add('hidden');
  } else {
    playerCover.src = '/static/logotipo.jpg';
    playerCover.classList.remove('hidden');
    defaultCoverIcon.classList.add('hidden');
  }

  if (fullTitle) fullTitle.textContent = track.title;
  if (fullArtist) fullArtist.textContent = track.artist;
  if (fullDuration) fullDuration.textContent = formatTime(track.duration_seconds);

  if (track.has_cover) {
    if (fullCover) { fullCover.src = track.cover_url; fullCover.classList.remove('hidden'); }
    if (fullCoverIcon) fullCoverIcon.classList.add('hidden');
  } else {
    if (fullCover) { fullCover.src = '/static/logotipo.jpg'; fullCover.classList.remove('hidden'); }
    if (fullCoverIcon) fullCoverIcon.classList.add('hidden');
  }

  updateLikeButton();
  updateMediaSession(track);
  highlightCurrentRow();
  logHistory(track);
  updateFeaturedCard();
};

const togglePlayPause = () => {
  if (!audioEl.src) {
    if (allTracks.length > 0) {
      playPlaylistDirectly(allTracks);
    }
    return;
  }
  if (audioEl.paused) audioEl.play().catch(() => {});
  else audioEl.pause();
  updateFeaturedCard();
  highlightCurrentRow();
};

const playPreviousTrack = () => {
  if (currentQueue.length === 0) return;
  if (audioEl.currentTime > 4) {
    audioEl.currentTime = 0;
    return;
  }
  const newIndex = (currentTrackIndex - 1 + currentQueue.length) % currentQueue.length;
  loadTrack(newIndex);
};

const playNextTrack = () => {
  if (currentQueue.length === 0) return;
  
  if (repeatMode === 'one') {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    return;
  }

  const nextIndex = currentTrackIndex + 1;
  if (nextIndex < currentQueue.length) {
    loadTrack(nextIndex);
  } else if (repeatMode === 'all') {
    if (isShuffle) {
      currentQueue = spotifySmartShuffle(currentQueue);
    }
    loadTrack(0);
  }
};

audioEl.addEventListener('ended', () => {
  playNextTrack();
});

const toggleShuffle = () => {
  isShuffle = !isShuffle;
  updateShuffleUI();

  if (currentQueue.length > 0 && currentTrackIndex >= 0) {
    const currentTrack = currentQueue[currentTrackIndex];
    if (isShuffle) {
      const remaining = currentQueue.slice(currentTrackIndex + 1);
      const shuffledRemaining = spotifySmartShuffle(remaining);
      currentQueue = [currentTrack, ...shuffledRemaining];
      currentTrackIndex = 0;
    } else {
      currentQueue = [...displayedTracks];
      const newIdx = currentQueue.findIndex(t => t.id === currentTrack.id);
      currentTrackIndex = newIdx >= 0 ? newIdx : 0;
    }
  }
};

const toggleRepeat = () => {
  if (repeatMode === 'none') {
    repeatMode = 'all';
  } else if (repeatMode === 'all') {
    repeatMode = 'one';
  } else {
    repeatMode = 'none';
  }

  if (repeatBtn) {
    if (repeatMode === 'all' || repeatMode === 'one') {
      repeatBtn.classList.add('text-white');
      repeatBtn.classList.remove('text-spSubtext');
      if (repeatDot) repeatDot.classList.remove('hidden');
      if (repeatOneBadge) {
        if (repeatMode === 'one') repeatOneBadge.classList.remove('hidden');
        else repeatOneBadge.classList.add('hidden');
      }
    } else {
      repeatBtn.classList.remove('text-white');
      repeatBtn.classList.add('text-spSubtext');
      if (repeatDot) repeatDot.classList.add('hidden');
      if (repeatOneBadge) repeatOneBadge.classList.add('hidden');
    }
  }

  if (fullRepeatBtn) {
    if (repeatMode === 'all' || repeatMode === 'one') {
      fullRepeatBtn.classList.add('text-white');
      fullRepeatBtn.classList.remove('text-spSubtext');
    } else {
      fullRepeatBtn.classList.remove('text-white');
      fullRepeatBtn.classList.add('text-spSubtext');
    }
  }
};

const setVolume = (val) => {
  val = Math.max(0, Math.min(1, val));
  currentVolume = val;
  audioEl.volume = val;
  
  if (volumeSlider) {
    volumeSlider.value = val;
    volumeSlider.style.background = `linear-gradient(to right, #ffffff 0%, #ffffff ${val * 100}%, #4d4d4d ${val * 100}%, #4d4d4d 100%)`;
  }
  
  if (volIconHigh && volIconMuted) {
    if (val === 0) {
      volIconHigh.classList.add('hidden');
      volIconMuted.classList.remove('hidden');
    } else {
      volIconHigh.classList.remove('hidden');
      volIconMuted.classList.add('hidden');
    }
  }
};

if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) previousVolume = val;
  });
}

if (volumeBtn) {
  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audioEl.volume > 0) {
      previousVolume = audioEl.volume;
      setVolume(0);
    } else {
      setVolume(previousVolume > 0 ? previousVolume : 0.8);
    }
  });
}

const setupSliderListeners = (slider) => {
  if (!slider) return;

  const onStart = () => { isSeeking = true; };
  const onMove = (e) => {
    const pct = parseFloat(e.target.value);
    updateSliderBackground(slider, pct);
    if (audioEl.duration) {
      const currentSec = (pct / 100) * audioEl.duration;
      if (currentTimeLabel) currentTimeLabel.textContent = formatTime(currentSec);
      if (fullCurrentTime) fullCurrentTime.textContent = formatTime(currentSec);
    }
  };
  const onEnd = (e) => {
    if (audioEl.duration) {
      audioEl.currentTime = (parseFloat(e.target.value) / 100) * audioEl.duration;
    }
    isSeeking = false;
  };

  slider.addEventListener('input', onMove);
  slider.addEventListener('change', onEnd);
  slider.addEventListener('mousedown', onStart);
  slider.addEventListener('touchstart', onStart, { passive: true });
  slider.addEventListener('mouseup', onEnd);
  slider.addEventListener('touchend', onEnd);
};

setupSliderListeners(progressBar);
setupSliderListeners(fullProgressBar);

audioEl.addEventListener('timeupdate', () => {
  if (!isSeeking && audioEl.duration) {
    const pct = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    
    if (progressBar) {
      progressBar.value = pct;
      updateSliderBackground(progressBar, pct);
    }
    if (fullProgressBar) {
      fullProgressBar.value = pct;
      updateSliderBackground(fullProgressBar, pct);
    }
    if (mobileProgressBarFill) mobileProgressBarFill.style.width = `${pct}%`;
    
    const formatted = formatTime(audioEl.currentTime);
    if (currentTimeLabel) currentTimeLabel.textContent = formatted;
    if (fullCurrentTime) fullCurrentTime.textContent = formatted;

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audioEl.duration || 0,
          playbackRate: audioEl.playbackRate,
          position: audioEl.currentTime || 0
        });
      } catch (e) {}
    }
  }
});

audioEl.addEventListener('loadedmetadata', () => {
  const dur = formatTime(audioEl.duration);
  if (durationLabel) durationLabel.textContent = dur;
  if (fullDuration) fullDuration.textContent = dur;
});

const hideAllViews = () => {
  homeView.classList.add('hidden');
  listView.classList.add('hidden');
  queueView.classList.add('hidden');
  if (searchView) searchView.classList.add('hidden');
};

const updateNavHighlight = (activeType) => {
  const tabs = [
    { el: navHomeBtn, type: 'home' },
    { el: navSearchBtn, type: 'search' },
    { el: navLibBtn, type: 'lib' },
    { el: navLikedBtn, type: 'liked' }
  ];

  tabs.forEach(tab => {
    if (!tab.el) return;
    if (tab.type === activeType) {
      tab.el.classList.add('text-white');
      tab.el.classList.remove('text-spSubtext');
    } else {
      tab.el.classList.remove('text-white');
      tab.el.classList.add('text-spSubtext');
    }
  });
};

const showHomePage = () => {
  hideAllViews();
  homeView.classList.remove('hidden');
  updateNavHighlight('home');
  renderHome();
};

const showCatalogPage = () => {
  hideAllViews();
  listView.classList.remove('hidden');
  currentPlaylistId = null;
  viewTitle.textContent = 'Tu Colección';
  bannerType.textContent = 'BIBLIOTECA';
  deletePlaylistBtn.classList.add('hidden');
  if (addTracksToPlaylistBtn) addTracksToPlaylistBtn.classList.add('hidden');
  viewCover.classList.add('hidden');
  viewCoverIcon.classList.remove('hidden');

  updateNavHighlight('lib');
  displayedTracks = [...allTracks];
  renderTracks(displayedTracks);
};

const showLikedPage = () => {
  hideAllViews();
  listView.classList.remove('hidden');
  currentPlaylistId = 'liked';
  viewTitle.textContent = 'Canciones que te gustan';
  bannerType.textContent = 'FAVORITOS';
  deletePlaylistBtn.classList.add('hidden');
  if (addTracksToPlaylistBtn) addTracksToPlaylistBtn.classList.add('hidden');
  viewCover.classList.add('hidden');
  viewCoverIcon.classList.remove('hidden');

  updateNavHighlight('liked');
  displayedTracks = [...likedTracks];
  renderTracks(displayedTracks);
};

const showPlaylistPage = (playlistId) => {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  registerRecentAlbum(playlistId);

  hideAllViews();
  listView.classList.remove('hidden');
  currentPlaylistId = playlistId;
  viewTitle.textContent = pl.name;
  bannerType.textContent = pl.is_folder ? 'CARPETA / ÁLBUM' : 'PLAYLIST';

  if (pl.is_folder) {
    deletePlaylistBtn.classList.add('hidden');
    if (addTracksToPlaylistBtn) addTracksToPlaylistBtn.classList.add('hidden');
  } else {
    deletePlaylistBtn.classList.remove('hidden');
    if (addTracksToPlaylistBtn) addTracksToPlaylistBtn.classList.remove('hidden');
  }

  if (pl.tracks.length > 0 && pl.tracks[0].has_cover) {
    viewCover.src = pl.tracks[0].cover_url;
    viewCover.classList.remove('hidden');
    viewCoverIcon.classList.add('hidden');
  } else {
    viewCover.src = '';
    viewCover.classList.add('hidden');
    viewCoverIcon.classList.remove('hidden');
  }

  displayedTracks = [...pl.tracks];
  renderTracks(displayedTracks);
};

const showQueuePage = () => {
  hideAllViews();
  queueView.classList.remove('hidden');
  renderQueue();
};

const showSearchPage = () => {
  hideAllViews();
  if (searchView) {
    searchView.classList.remove('hidden');
    if (searchInput) searchInput.focus();
  }
  updateNavHighlight('search');
};

// Renderizado Home: Exclusivo para Playlists y Álbumes organizados
const renderHome = () => {
  updateGreeting();

  if (!homeRecentGrid) return;
  homeRecentGrid.innerHTML = '';

  let recentItems = [];

  // 1. Tarjeta de Canciones que te gustan
  if (likedTracks.length > 0) {
    recentItems.push({
      id: 'liked',
      title: 'Canciones que te gustan',
      subtitle: `Playlist • ${likedTracks.length} canciones`,
      cover: likedTracks[0]?.has_cover ? likedTracks[0].cover_url : null,
      color: 'from-indigo-900 to-zinc-950',
      action: showLikedPage,
      tracks: likedTracks
    });
  }

  // 2. Playlists y Álbumes ordenados por actividad reciente
  const sortedPlaylists = [...playlists].sort((a, b) => {
    const idxA = recentAlbumIds.indexOf(a.id);
    const idxB = recentAlbumIds.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  sortedPlaylists.forEach(p => {
    recentItems.push({
      id: p.id,
      title: p.name,
      subtitle: p.is_folder ? `Álbum • ${p.tracks.length} canciones` : `Playlist • ${p.tracks.length} canciones`,
      cover: p.tracks[0]?.has_cover ? p.tracks[0].cover_url : null,
      color: 'from-zinc-800 to-zinc-950',
      action: () => showPlaylistPage(p.id),
      tracks: p.tracks
    });
  });

  // Accesos rápidos rectangulares superiores
  const topRecent = recentItems.slice(0, 6);
  topRecent.forEach(item => {
    const card = document.createElement('div');
    card.className = 'group relative flex items-center bg-[#242424]/90 hover:bg-[#303030] rounded-md overflow-hidden cursor-pointer transition-all duration-200 border border-white/5 h-14 shadow';

    const coverHtml = item.cover 
      ? `<img src="${item.cover}" class="w-14 h-14 object-cover flex-shrink-0">`
      : `<div class="w-14 h-14 bg-gradient-to-br ${item.color} flex items-center justify-center font-bold text-white flex-shrink-0 text-base">♫</div>`;

    card.innerHTML = `
      ${coverHtml}
      <div class="px-3 flex-1 min-w-0 flex items-center justify-between">
        <span class="text-xs font-bold text-white line-clamp-2 leading-tight">${item.title}</span>
      </div>
      <button class="grid-play-btn opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-2xl mr-2 flex-shrink-0 transition-all duration-200 hover:scale-105" title="Reproducir">
        <svg class="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    `;

    card.addEventListener('click', item.action);

    const playBtn = card.querySelector('.grid-play-btn');
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playPlaylistDirectly(item.tracks, item.id);
    });

    homeRecentGrid.appendChild(card);
  });

  updateFeaturedCard();

  // Tarjetas cuadradas amigables de Playlists y Álbumes
  if (recentCarousel) {
    recentCarousel.innerHTML = '';

    if (recentItems.length === 0) {
      recentCarousel.innerHTML = `
        <div class="text-spSubtext text-xs py-8 text-center w-full">
          No tienes playlists creadas. Pulsa en <b>"＋ Crear lista"</b> para comenzar.
        </div>
      `;
      return;
    }

    recentItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'group w-40 md:w-48 flex-shrink-0 bg-[#181818] hover:bg-[#222222] p-3 rounded-lg cursor-pointer transition-all duration-200 flex flex-col border border-white/5 hover:border-white/10 shadow-lg';
      
      const coverHtml = item.cover 
        ? `<img src="${item.cover}" class="w-full aspect-square object-cover rounded-md shadow-md">`
        : `<div class="w-full aspect-square bg-gradient-to-br ${item.color} rounded-md flex items-center justify-center text-4xl text-white/70 shadow-inner">♫</div>`;
      
      card.innerHTML = `
        <div class="relative w-full aspect-square mb-3">
          ${coverHtml}
          <button class="carousel-play-btn absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:scale-105 transition-all duration-200" title="Reproducir">
            <svg class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        </div>
        <p class="text-xs font-bold truncate text-white leading-snug">${item.title}</p>
        <p class="text-[11px] text-spSubtext mt-1 truncate">${item.subtitle}</p>
      `;

      card.addEventListener('click', item.action);

      const playBtn = card.querySelector('.carousel-play-btn');
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playPlaylistDirectly(item.tracks, item.id);
      });

      recentCarousel.appendChild(card);
    });
  }
};

const renderTracks = (trackArray) => {
  trackListEl.innerHTML = '';
  if (trackCountLabel) trackCountLabel.textContent = `${trackArray.length} ${trackArray.length === 1 ? 'canción' : 'canciones'}`;

  const currentPl = playlists.find(p => p.id === currentPlaylistId);

  if (trackArray.length === 0) {
    trackListEl.innerHTML = `
      <div class="text-center py-12 text-spSubtext text-xs space-y-3">
        <p>No hay canciones en esta lista.</p>
        ${currentPlaylistId && !currentPl?.is_folder && currentPlaylistId !== 'liked' && currentPlaylistId !== 'history' ? '<button onclick="openBulkAddModal()" class="px-5 py-2.5 bg-white text-black font-bold text-xs rounded-full hover:scale-105 transition shadow-lg">＋ Agregar canciones ahora</button>' : ''}
      </div>
    `;
    return;
  }

  trackArray.forEach((track, index) => {
    const item = document.createElement('div');
    item.dataset.trackId = track.id;
    item.className = 'group flex md:grid md:grid-cols-[48px_1fr_1fr_120px] items-center justify-between p-2 md:px-3 rounded-md hover:bg-white/10 transition cursor-pointer text-xs';

    const coverSnippet = track.has_cover 
      ? `<img src="${track.cover_url}" class="w-10 h-10 rounded object-cover flex-shrink-0 shadow">`
      : `<img src="/static/logotipo.jpg" class="w-10 h-10 rounded object-cover flex-shrink-0 opacity-80 shadow">`;

    const isLiked = likedTracks.some(t => t.id === track.id);
    const albumName = track.album && track.album !== 'Desconocido' ? track.album : (currentPl?.name || 'Sovereign');

    item.innerHTML = `
      <!-- Columna 1: Número de pista / Botón Play en hover / Ecualizador activo -->
      <div class="w-8 md:w-full flex items-center justify-center text-center">
        <span class="track-number text-spSubtext text-xs group-hover:hidden">${index + 1}</span>
        <button class="track-hover-play hidden group-hover:flex items-center justify-center text-white" title="Reproducir">
          <svg class="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <div class="track-eq-indicator hidden items-end justify-center gap-[2.5px] w-4 h-4">
          <span class="w-[3px] bg-white rounded-full eq-bar-1 inline-block"></span>
          <span class="w-[3px] bg-white rounded-full eq-bar-2 inline-block"></span>
          <span class="w-[3px] bg-white rounded-full eq-bar-3 inline-block"></span>
        </div>
      </div>

      <!-- Columna 2: Portada + Título + Artista -->
      <div class="flex items-center gap-3 min-w-0 flex-1 md:flex-none pr-3">
        ${coverSnippet}
        <div class="flex flex-col min-w-0">
          <span class="track-title text-sm font-medium text-white truncate leading-tight">${track.title}</span>
          <span class="text-xs text-spSubtext truncate leading-tight mt-0.5">${track.artist}</span>
        </div>
      </div>

      <!-- Columna 3: Álbum (visible en desktop) -->
      <div class="hidden md:flex items-center text-spSubtext truncate pr-4">
        <span class="truncate hover:underline">${albumName}</span>
      </div>

      <!-- Columna 4: Favorito + Opciones + Duración -->
      <div class="flex items-center justify-end gap-3 text-spSubtext">
        <button class="track-like-btn p-1 text-sm ${isLiked ? 'text-white font-bold opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-white transition'}">♥</button>
        <button class="track-opt-btn p-1 text-sm opacity-0 group-hover:opacity-100 hover:text-white font-bold transition">⋮</button>
        <span class="font-mono text-xs w-10 text-right pr-2">${formatTime(track.duration_seconds)}</span>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.track-like-btn')) {
        e.stopPropagation();
        toggleLikeTrack(track);
        renderTracks(displayedTracks);
        return;
      }
      if (e.target.closest('.track-opt-btn')) {
        e.stopPropagation();
        openTrackModal(track);
        return;
      }
      
      if (isShuffle) {
        currentQueue = spotifySmartShuffle(displayedTracks, track.id);
        loadTrack(0);
      } else {
        currentQueue = [...displayedTracks];
        const targetIdx = currentQueue.findIndex(t => t.id === track.id);
        loadTrack(targetIdx >= 0 ? targetIdx : 0);
      }
    });

    trackListEl.appendChild(item);
  });

  highlightCurrentRow();
};

const openBulkAddModal = () => {
  if (!currentPlaylistId) return;
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl || pl.is_folder) return;

  if (bulkModalSubtitle) bulkModalSubtitle.textContent = `Añadiendo a "${pl.name}"`;
  if (bulkSearchInput) bulkSearchInput.value = '';
  renderBulkTrackList(allTracks);
  bulkAddModal.classList.remove('hidden');
};

const renderBulkTrackList = (tracksToRender) => {
  if (!bulkTrackList) return;
  bulkTrackList.innerHTML = '';
  const currentPl = playlists.find(p => p.id === currentPlaylistId);
  if (!currentPl) return;

  if (tracksToRender.length === 0) {
    bulkTrackList.innerHTML = `<p class="text-xs text-spSubtext text-center py-6">No se encontraron canciones.</p>`;
    return;
  }

  tracksToRender.forEach(track => {
    const isAlreadyIn = currentPl.tracks.some(t => t.id === track.id);
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between py-2 px-1 hover:bg-white/5 rounded transition';

    const coverSnippet = track.has_cover 
      ? `<img src="${track.cover_url}" class="w-9 h-9 rounded object-cover flex-shrink-0">`
      : `<img src="/static/logotipo.jpg" class="w-9 h-9 rounded object-cover flex-shrink-0 opacity-80">`;

    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0 flex-1">
        ${coverSnippet}
        <div class="flex flex-col min-w-0">
          <span class="text-xs font-semibold text-white truncate">${track.title}</span>
          <span class="text-[11px] text-spSubtext truncate">${track.artist}</span>
        </div>
      </div>
      <button class="bulk-add-btn px-3 py-1 text-xs font-bold rounded-full transition ${isAlreadyIn ? 'text-black bg-white border border-white' : 'text-white bg-[#282828] hover:bg-[#383838]'}" data-track-id="${track.id}">
        ${isAlreadyIn ? '✓ Agregada' : '＋'}
      </button>
    `;

    const btn = row.querySelector('.bulk-add-btn');
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const inNow = currentPl.tracks.some(t => t.id === track.id);
      if (inNow) {
        currentPl.tracks = currentPl.tracks.filter(t => t.id !== track.id);
        btn.textContent = '＋';
        btn.className = 'bulk-add-btn px-3 py-1 text-xs font-bold rounded-full transition text-white bg-[#282828] hover:bg-[#383838]';
      } else {
        currentPl.tracks.push(track);
        btn.textContent = '✓ Agregada';
        btn.className = 'bulk-add-btn px-3 py-1 text-xs font-bold rounded-full transition text-black bg-white border border-white';
      }
      await savePlaylists();
      displayedTracks = [...currentPl.tracks];
      renderTracks(displayedTracks);
    });

    bulkTrackList.appendChild(row);
  });
};

if (bulkSearchInput) {
  bulkSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allTracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    renderBulkTrackList(filtered);
  });
}

if (addTracksToPlaylistBtn) addTracksToPlaylistBtn.addEventListener('click', openBulkAddModal);
if (closeBulkAddBtn) closeBulkAddBtn.addEventListener('click', () => bulkAddModal.classList.add('hidden'));

const renderQueue = () => {
  queueList.innerHTML = '';
  if (currentQueue.length === 0) {
    queueList.innerHTML = `<p class="text-xs text-spSubtext py-4">La cola está vacía.</p>`;
    return;
  }

  currentQueue.forEach((track, idx) => {
    const row = document.createElement('div');
    const isPlaying = idx === currentTrackIndex;
    row.className = `flex items-center justify-between p-2 rounded-lg text-xs ${isPlaying ? 'bg-[#242424] border-l-4 border-white' : 'hover:bg-white/5'}`;
    row.innerHTML = `
      <div class="flex items-center gap-3 truncate flex-1">
        <span class="text-spSubtext w-4">${idx + 1}</span>
        <span class="truncate ${isPlaying ? 'text-white font-bold' : 'text-zinc-300'}">${track.title} - ${track.artist}</span>
      </div>
      <button class="delete-queue-item text-spSubtext hover:text-white px-2" data-idx="${idx}">✕</button>
    `;
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-queue-item')) {
        e.stopPropagation();
        currentQueue.splice(idx, 1);
        if (currentTrackIndex > idx) currentTrackIndex--;
        renderQueue();
        return;
      }
      loadTrack(idx);
    });
    queueList.appendChild(row);
  });
};

// Optimización: filtra únicamente las listas manuales para el payload POST
const savePlaylists = async () => {
  const manualOnly = playlists.filter(p => !p.is_folder);
  await fetch('/playlists', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(manualOnly) 
  });
  renderHome();
  renderDeskPlaylists();
};

const saveLiked = async () => {
  await fetch('/liked', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(likedTracks) });
  updateLikeButton();
};

const logHistory = async (track) => {
  historyTracks = [track, ...historyTracks.filter(t => t.id !== track.id)].slice(0, 50);
  await fetch('/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(track) });
};

const toggleLikeTrack = async (track) => {
  const exists = likedTracks.some(t => t.id === track.id);
  if (exists) likedTracks = likedTracks.filter(t => t.id !== track.id);
  else likedTracks.unshift(track);
  await saveLiked();
};

const updateLikeButton = () => {
  const currentTrack = currentQueue[currentTrackIndex];
  if (!currentTrack) return;
  const isLiked = likedTracks.some(t => t.id === currentTrack.id);

  [mobileLikeBtn, likeCurrentBtnDesktop, panelRightLikeBtn].forEach(btn => {
    if (!btn) return;
    const heart = btn.querySelector('.like-icon-heart');
    const plus = btn.querySelector('.like-icon-plus');
    if (heart && plus) {
      if (isLiked) {
        heart.classList.remove('hidden');
        plus.classList.add('hidden');
      } else {
        heart.classList.add('hidden');
        plus.classList.remove('hidden');
      }
    } else {
      btn.innerHTML = isLiked ? '♥' : '♡';
      btn.className = isLiked ? 'text-white font-bold p-1 text-xl transition' : 'text-spSubtext hover:text-white p-1 text-xl transition';
    }
  });

  if (fullLikeBtn) {
    fullLikeBtn.innerHTML = isLiked ? '♥' : '♡';
    fullLikeBtn.className = isLiked ? 'text-2xl text-white p-2 transition font-bold' : 'text-2xl text-spSubtext p-2 transition';
  }
};

const createNewPlaylist = async () => {
  const name = prompt('Nombre de la playlist:');
  if (!name || !name.trim()) return null;
  const newPl = { id: 'pl_' + Date.now(), name: name.trim(), tracks: [], is_folder: false };
  playlists.push(newPl);
  await savePlaylists();
  showPlaylistPage(newPl.id);
  openBulkAddModal();
  return newPl;
};

const openTrackModal = (track) => {
  trackToAddToPlaylist = track;
  modalTrackTitle.textContent = track.title;
  modalPlaylistOptions.innerHTML = '';

  const manualPlaylists = playlists.filter(p => !p.is_folder);

  manualPlaylists.forEach(pl => {
    const btn = document.createElement('button');
    const inPl = pl.tracks.some(t => t.id === track.id);
    btn.className = `w-full text-left px-3 py-2 text-xs rounded flex justify-between ${inPl ? 'text-white font-bold bg-[#242424]' : 'text-zinc-300 hover:bg-[#242424]'}`;
    btn.innerHTML = `<span>${pl.name}</span><span>${inPl ? '✓' : '+'}</span>`;
    btn.addEventListener('click', async () => {
      if (!inPl) {
        pl.tracks.push(track);
        await savePlaylists();
      }
      playlistModal.classList.add('hidden');
    });
    modalPlaylistOptions.appendChild(btn);
  });

  playlistModal.classList.remove('hidden');
};

// Sincronización continua de estado y metadatos cuando iOS inicia la reproducción
audioEl.addEventListener('play', () => {
  if (playIcon) playIcon.classList.add('hidden');
  if (pauseIcon) pauseIcon.classList.remove('hidden');
  if (fullPlayIcon) fullPlayIcon.classList.add('hidden');
  if (fullPauseIcon) fullPauseIcon.classList.remove('hidden');
  if (mobilePlayIcon) mobilePlayIcon.classList.add('hidden');
  if (mobilePauseIcon) mobilePauseIcon.classList.remove('hidden');
  
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing';
    const currentTrack = currentQueue[currentTrackIndex];
    if (currentTrack) updateMediaSession(currentTrack);
  }
  
  updateFeaturedCard();
  highlightCurrentRow();
});

audioEl.addEventListener('pause', () => {
  if (playIcon) playIcon.classList.remove('hidden');
  if (pauseIcon) pauseIcon.classList.add('hidden');
  if (fullPlayIcon) fullPlayIcon.classList.remove('hidden');
  if (fullPauseIcon) fullPauseIcon.classList.add('hidden');
  if (mobilePlayIcon) mobilePlayIcon.classList.remove('hidden');
  if (mobilePauseIcon) mobilePauseIcon.classList.add('hidden');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  updateFeaturedCard();
  highlightCurrentRow();
});

if (playerInfoArea) {
  playerInfoArea.addEventListener('click', (e) => {
    if (e.target.closest('#mobileLikeBtn')) return;
    if (window.innerWidth < 768 && currentTrackIndex >= 0) {
      fullPlayerModal.classList.remove('hidden');
    }
  });
}

if (closeFullPlayerBtn) {
  closeFullPlayerBtn.addEventListener('click', () => {
    fullPlayerModal.classList.add('hidden');
  });
}

if (fullQueueBtn) {
  fullQueueBtn.addEventListener('click', () => {
    fullPlayerModal.classList.add('hidden');
    showQueuePage();
  });
}

[playPauseBtn, fullPlayPauseBtn, mobilePlayPauseBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); togglePlayPause(); });
});

[prevBtn, fullPrevBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); playPreviousTrack(); });
});

[nextBtn, fullNextBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); playNextTrack(); });
});

[shuffleBtn, fullShuffleBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); toggleShuffle(); });
});

[repeatBtn, fullRepeatBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); toggleRepeat(); });
});

[mobileLikeBtn, likeCurrentBtnDesktop, fullLikeBtn, panelRightLikeBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const track = currentQueue[currentTrackIndex];
    if (track) toggleLikeTrack(track);
  });
});

if (viewQueueBtn) viewQueueBtn.addEventListener('click', showQueuePage);
if (clearQueueBtn) {
  clearQueueBtn.addEventListener('click', () => {
    currentQueue = currentTrackIndex >= 0 ? [currentQueue[currentTrackIndex]] : [];
    currentTrackIndex = 0;
    renderQueue();
  });
}

if (modalAddToQueueBtn) {
  modalAddToQueueBtn.addEventListener('click', () => {
    if (trackToAddToPlaylist) {
      currentQueue.push(trackToAddToPlaylist);
      playlistModal.classList.add('hidden');
    }
  });
}

if (modalCreateNewBtn) {
  modalCreateNewBtn.addEventListener('click', async () => {
    const pl = await createNewPlaylist();
    if (pl && trackToAddToPlaylist) {
      pl.tracks.push(trackToAddToPlaylist);
      await savePlaylists();
      playlistModal.classList.add('hidden');
    }
  });
}

if (closeModalBtn) closeModalBtn.addEventListener('click', () => playlistModal.classList.add('hidden'));

// Filtros Rápidos
if (filterAllBtn) {
  filterAllBtn.addEventListener('click', () => {
    filterAllBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-black transition shadow-sm';
    filterMusicBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#242424] text-white hover:bg-[#303030] transition';
    filterFoldersBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#242424] text-white hover:bg-[#303030] transition';
    showHomePage();
  });
}

if (filterMusicBtn) {
  filterMusicBtn.addEventListener('click', () => {
    filterMusicBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-black transition shadow-sm';
    filterAllBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#242424] text-white hover:bg-[#303030] transition';
    filterFoldersBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#242424] text-white hover:bg-[#303030] transition';
    showCatalogPage();
  });
}

if (filterFoldersBtn) {
  filterFoldersBtn.addEventListener('click', () => {
    filterFoldersBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-black transition shadow-sm';
    filterAllBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#242424] text-white hover:bg-[#303030] transition';
    filterMusicBtn.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#242424] text-white hover:bg-[#303030] transition';
    showHomePage();
  });
}

// Navegación
navHomeBtn.addEventListener('click', showHomePage);
navLibBtn.addEventListener('click', showCatalogPage);
navLikedBtn.addEventListener('click', showLikedPage);
navCreateBtn.addEventListener('click', createNewPlaylist);
navSearchBtn.addEventListener('click', showSearchPage);

deskHomeBtn.addEventListener('click', showHomePage);
deskLibBtn.addEventListener('click', showCatalogPage);
deskCreatePlaylistBtn.addEventListener('click', createNewPlaylist);

if (backToHomeBtn) backToHomeBtn.addEventListener('click', showHomePage);
if (mobileBackBtn) mobileBackBtn.addEventListener('click', showHomePage);

playAllBtn.addEventListener('click', () => {
  if (displayedTracks.length > 0) {
    playPlaylistDirectly(displayedTracks);
  }
});

deletePlaylistBtn.addEventListener('click', async () => {
  if (currentPlaylistId && confirm('¿Eliminar esta playlist?')) {
    playlists = playlists.filter(p => p.id !== currentPlaylistId);
    await savePlaylists();
    showHomePage();
  }
});

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allTracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    if (searchResults) {
      searchResults.innerHTML = '';
      filtered.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition cursor-pointer';
        item.innerHTML = `
          <div class="flex items-center gap-3 truncate flex-1">
            <span class="text-xs text-spSubtext">${index + 1}</span>
            <div class="flex flex-col truncate">
              <span class="text-sm font-medium text-white truncate">${track.title}</span>
              <span class="text-xs text-spSubtext truncate">${track.artist}</span>
            </div>
          </div>
          <button class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow hover:scale-105 transition">▶</button>
        `;
        item.addEventListener('click', () => {
          if (isShuffle) {
            currentQueue = spotifySmartShuffle(filtered, track.id);
            loadTrack(0);
          } else {
            currentQueue = [...filtered];
            loadTrack(index);
          }
        });
        searchResults.appendChild(item);
      });
    }
  });
}

// Renderizado de la barra lateral izquierda (Estilo Spotify con carátula cuadrada y subtítulo)
const renderDeskPlaylists = () => {
  if (!deskPlaylistList) return;
  deskPlaylistList.innerHTML = '';

  // 1. Entrada de Canciones que te gustan
  if (likedTracks.length > 0) {
    const likedItem = document.createElement('div');
    likedItem.className = 'group flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer transition';
    likedItem.innerHTML = `
      <div class="w-12 h-12 rounded bg-gradient-to-br from-indigo-700 via-purple-800 to-indigo-950 flex items-center justify-center text-white text-lg flex-shrink-0 shadow">
        ♥
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-xs font-bold text-white truncate group-hover:text-white">Canciones que te gustan</span>
        <span class="text-[11px] text-spSubtext truncate mt-0.5">Playlist • ${likedTracks.length} canciones</span>
      </div>
    `;
    likedItem.addEventListener('click', showLikedPage);
    deskPlaylistList.appendChild(likedItem);
  }

  // 2. Colección completa
  const allItem = document.createElement('div');
  allItem.className = 'group flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer transition';
  allItem.innerHTML = `
    <div class="w-12 h-12 rounded bg-[#242424] flex items-center justify-center text-zinc-400 text-lg flex-shrink-0 shadow border border-white/5">
      ♫
    </div>
    <div class="flex flex-col min-w-0 flex-1">
      <span class="text-xs font-bold text-white truncate group-hover:text-white">Toda la Colección</span>
      <span class="text-[11px] text-spSubtext truncate mt-0.5">Biblioteca • ${allTracks.length} canciones</span>
    </div>
  `;
  allItem.addEventListener('click', showCatalogPage);
  deskPlaylistList.appendChild(allItem);

  // 3. Playlists y Álbumes con su portada real
  playlists.forEach(pl => {
    const item = document.createElement('div');
    item.className = 'group flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer transition';
    
    const coverHtml = pl.tracks[0]?.has_cover 
      ? `<img src="${pl.tracks[0].cover_url}" class="w-12 h-12 rounded object-cover flex-shrink-0 shadow">`
      : `<div class="w-12 h-12 rounded bg-[#242424] flex items-center justify-center text-zinc-400 text-lg flex-shrink-0 shadow border border-white/5">${pl.is_folder ? '📁' : '♫'}</div>`;

    const subtitle = pl.is_folder ? `Álbum • ${pl.tracks.length} canciones` : `Playlist • ${pl.tracks.length} canciones`;

    item.innerHTML = `
      ${coverHtml}
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-xs font-bold text-white truncate group-hover:text-white">${pl.name}</span>
        <span class="text-[11px] text-spSubtext truncate mt-0.5">${subtitle}</span>
      </div>
    `;
    item.addEventListener('click', () => showPlaylistPage(pl.id));
    deskPlaylistList.appendChild(item);
  });
};

// Atajos de teclado globales
window.addEventListener('keydown', (e) => {
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
    return;
  }

  if (tag === 'button' && e.code === 'Space') {
    e.preventDefault();
    e.target.blur();
    togglePlayPause();
    return;
  }

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'ArrowRight':
      e.preventDefault();
      playNextTrack();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      playPreviousTrack();
      break;
    case 'ArrowUp':
      e.preventDefault();
      setVolume(currentVolume + 0.05);
      break;
    case 'ArrowDown':
      e.preventDefault();
      setVolume(currentVolume - 0.05);
      break;
    case 'KeyM':
      e.preventDefault();
      if (audioEl.volume > 0) {
        previousVolume = audioEl.volume;
        setVolume(0);
      } else {
        setVolume(previousVolume > 0 ? previousVolume : 0.8);
      }
      break;
  }
});

// Inicialización
const init = async () => {
  try {
    setVolume(1.0);
    isShuffle = true;
    updateShuffleUI();

    try {
      recentAlbumIds = JSON.parse(localStorage.getItem('sovereign_recent_albums')) || [];
    } catch (e) {
      recentAlbumIds = [];
    }

    const [t, manualPlaylists, folderPlaylists, l, h] = await Promise.all([
      fetch('/tracks').then(r => r.json()),
      fetch('/playlists').then(r => r.json()),
      fetch('/folder-playlists').then(r => r.json()).catch(() => []),
      fetch('/liked').then(r => r.json()),
      fetch('/history').then(r => r.json())
    ]);
    allTracks = t || [];
    playlists = [...(folderPlaylists || []), ...(manualPlaylists || [])];
    likedTracks = l || [];
    historyTracks = h || [];

    showHomePage();
    renderDeskPlaylists();
  } catch (err) {
    console.error('Error al inicializar Sovereign:', err);
  }
};

document.addEventListener('DOMContentLoaded', init);