const songs = [
  { title: "Midnight Drive", artist: "Lo-Fi Collective", cover: "images/cover1.png", src: "audio/track1.mp3" },
  { title: "Golden Hour", artist: "Aria Beats", cover: "images/cover2.png", src: "audio/track2.mp3" },
  { title: "Neon Skyline", artist: "Nova Waves", cover: "images/cover3.png", src: "audio/track3.mp3" },
  { title: "Paper Moon", artist: "Echo Room", cover: "images/cover4.png", src: "audio/track4.mp3" },
  { title: "Slow Static", artist: "Velvet Frame", cover: "images/cover5.png", src: "audio/track5.mp3" }
];

const audio = document.getElementById("audio");
const app = document.querySelector(".app");
const cover = document.getElementById("cover");
const title = document.getElementById("title");
const artist = document.getElementById("artist");
const heroPlayBtn = document.getElementById("heroPlayBtn");
const playIcon = document.getElementById("playIcon");
const heroPrevBtn = document.getElementById("heroPrevBtn");
const heroNextBtn = document.getElementById("heroNextBtn");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const progressHandle = document.getElementById("progressHandle");
const currentTimeEl = document.getElementById("currentTime");
const durationTimeEl = document.getElementById("durationTime");
const volumeSlider = document.getElementById("volumeSlider");
const playlistEl = document.getElementById("playlist");
const trackListEl = document.getElementById("trackList");
const trackCount = document.getElementById("trackCount");
const statusDot = document.getElementById("statusDot");
const offlineNote = document.getElementById("offlineNote");
const visualizer = document.getElementById("visualizer");
const visCtx = visualizer.getContext("2d");
const miniCover = document.getElementById("miniCover");
const miniTitle = document.getElementById("miniTitle");
const miniArtist = document.getElementById("miniArtist");
const heroMiniCover = document.getElementById("heroMiniCover");
const heroMiniTitle = document.getElementById("heroMiniTitle");
const heroMiniArtist = document.getElementById("heroMiniArtist");
const searchInput = document.getElementById("searchInput");
const likedCount = document.getElementById("likedCount");
const visCtxRef = visualizer.getContext("2d");

let currentIndex = 0;
let isPlaying = false;
let isDragging = false;
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let animFrame = null;

function loadState() {
  const savedIndex = localStorage.getItem("mp_currentIndex");
  const savedVolume = localStorage.getItem("mp_volume");

  currentIndex = savedIndex !== null ? parseInt(savedIndex, 10) : 0;
  volumeSlider.value = savedVolume !== null ? savedVolume : 1;
}

function saveState() {
  localStorage.setItem("mp_currentIndex", currentIndex);
  localStorage.setItem("mp_volume", volumeSlider.value);
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatViews(value) {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B views`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M views`;
  return `${value.toLocaleString()} views`;
}

function loadSong(index, resumeTime = 0) {
  const song = songs[index];
  title.textContent = song.title;
  artist.textContent = song.artist;
  cover.src = song.cover;
  miniCover.src = song.cover;
  heroMiniCover.src = song.cover;
  miniTitle.textContent = song.title;
  miniArtist.textContent = song.artist;
  heroMiniTitle.textContent = song.title;
  heroMiniArtist.textContent = song.artist;
  audio.src = song.src;
  audio.currentTime = resumeTime;
  trackCount.textContent = `${index + 1} / ${songs.length}`;
  highlightPlaylist(index);
  saveState();
}

function updateLikedCount() {
  if (likedCount) {
    likedCount.textContent = `${songs.length} songs`;
  }
}

function setupAnalyser() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function drawVisualizer() {
  if (!analyser) return;
  const bufferLength = analyser.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(data);

  const w = visualizer.width = visualizer.clientWidth;
  const h = visualizer.height = visualizer.clientHeight;
  visCtxRef.clearRect(0, 0, w, h);

  const barWidth = w / bufferLength;
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (data[i] / 255) * h * 0.9;
    const grad = visCtxRef.createLinearGradient(0, h, 0, h - barHeight);
    grad.addColorStop(0, "rgba(255,111,181,0.7)");
    grad.addColorStop(1, "rgba(160,111,255,0.7)");
    visCtxRef.fillStyle = grad;
    visCtxRef.fillRect(i * barWidth, h - barHeight, barWidth - 2, barHeight);
  }

  animFrame = requestAnimationFrame(drawVisualizer);
}

function playSong() {
  setupAnalyser();
  if (audioCtx.state === "suspended") audioCtx.resume();
  isPlaying = true;
  app.classList.add("playing");
  playIcon.innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/>';
  audio.play();
  drawVisualizer();
}

function pauseSong() {
  isPlaying = false;
  app.classList.remove("playing");
  playIcon.innerHTML = '<path d="M7 5v14l12-7-12-7z" fill="currentColor"/>';
  audio.pause();
  cancelAnimationFrame(animFrame);
}

function togglePlay() {
  isPlaying ? pauseSong() : playSong();
}

function nextSong() {
  currentIndex = (currentIndex + 1) % songs.length;
  loadSong(currentIndex);
  playSong();
}

function prevSong() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  loadSong(currentIndex);
  playSong();
}

function updateProgress() {
  if (isDragging) return;
  const { currentTime, duration } = audio;
  const percent = (currentTime / duration) * 100 || 0;
  progressFill.style.width = `${percent}%`;
  progressHandle.style.left = `${percent}%`;
  currentTimeEl.textContent = formatTime(currentTime);
  durationTimeEl.textContent = formatTime(duration);
  if (Math.floor(currentTime) % 3 === 0) localStorage.setItem("mp_resumeTime", currentTime);
}

function scrubToPercent(percent) {
  percent = Math.min(1, Math.max(0, percent));
  progressFill.style.width = `${percent * 100}%`;
  progressHandle.style.left = `${percent * 100}%`;
  if (!isNaN(audio.duration)) {
    audio.currentTime = percent * audio.duration;
  }
}

function buildPlaylist() {
  playlistEl.innerHTML = "";
  trackListEl.innerHTML = "";

  songs.forEach((song, index) => {
    const item = document.createElement("div");
    item.classList.add("playlist-item");
    item.innerHTML = `
      <div class="meta">
        <div class="song-name">${song.title}</div>
        <div class="song-artist">${song.artist}</div>
      </div>
      <div class="song-duration" data-index="${index}">Play</div>
    `;
    item.addEventListener("click", () => {
      currentIndex = index;
      loadSong(currentIndex);
      playSong();
    });
    playlistEl.appendChild(item);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "track-row";
    row.innerHTML = `
      <span class="track-index">${index + 1}</span>
      <div class="track-main">
        <span class="track-name">${song.title}</span>
        <span class="track-artist">${song.artist}</span>
      </div>
      <span class="track-badge">${formatViews(120 + index * 35)}</span>
    `;
    row.addEventListener("click", () => {
      currentIndex = index;
      loadSong(currentIndex);
      playSong();
    });
    trackListEl.appendChild(row);
  });
}

function highlightPlaylist(index) {
  document.querySelectorAll(".playlist-item").forEach((item, i) => item.classList.toggle("active", i === index));
  document.querySelectorAll(".track-row").forEach((row, i) => row.classList.toggle("active", i === index));
}

function filterPlaylist() {
  const query = searchInput.value.toLowerCase().trim();
  document.querySelectorAll(".playlist-item").forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.classList.toggle("hidden", Boolean(query) && !text.includes(query));
  });
}

function updateOnlineStatus() {
  const online = navigator.onLine;
  statusDot.classList.toggle("offline", !online);
  statusDot.title = online ? "online" : "offline";
  offlineNote.classList.toggle("show", !online);
}

heroPlayBtn.addEventListener("click", togglePlay);
heroNextBtn.addEventListener("click", nextSong);
heroPrevBtn.addEventListener("click", prevSong);
searchInput.addEventListener("input", filterPlaylist);

progressBar.addEventListener("click", (e) => {
  if (isDragging) return;
  const rect = progressBar.getBoundingClientRect();
  scrubToPercent((e.clientX - rect.left) / rect.width);
});

progressHandle.addEventListener("mousedown", () => {
  isDragging = true;
  progressHandle.classList.add("dragging");
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const rect = progressBar.getBoundingClientRect();
  scrubToPercent((e.clientX - rect.left) / rect.width);
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  progressHandle.classList.remove("dragging");
});

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("ended", () => {
  nextSong();
});

volumeSlider.addEventListener("input", () => {
  audio.volume = volumeSlider.value;
  saveState();
});

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  switch (e.code) {
    case "Space":
      e.preventDefault();
      togglePlay();
      break;
    case "ArrowRight":
      nextSong();
      break;
    case "ArrowLeft":
      prevSong();
      break;
    case "ArrowUp":
      e.preventDefault();
      volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.1);
      audio.volume = volumeSlider.value;
      saveState();
      break;
    case "ArrowDown":
      e.preventDefault();
      volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.1);
      audio.volume = volumeSlider.value;
      saveState();
      break;
    case "KeyS":
      toggleShuffle();
      break;
    case "KeyR":
      toggleRepeat();
      break;
  }
});

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

loadState();
buildPlaylist();
loadSong(currentIndex);
audio.volume = volumeSlider.value;
updateLikedCount();
updateOnlineStatus();