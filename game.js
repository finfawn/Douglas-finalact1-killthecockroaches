// Game state
let gameStarted = false;
let isMuted = false;
let cockroachesKilled = 0;
let spawnInterval = 1200; // Initial spawn rate in ms
let timer = 90; // Start from 90 seconds
let timerDuration = 90; // Game duration in seconds
let gameTimerInterval, spawnRateInterval;
let speedUpStep = 0;
const COCKROACH_LIFETIME = 3000; // How long a cockroach stays visible
const DEATH_ANIMATION_TIME = 800; // How long the death animation plays
const SPAWN_DECREASE = 250; // How much to decrease spawn interval per speed up

// DOM elements
const loadingScreen = document.getElementById('loading-screen');
const startButton = document.getElementById('start-button');
const mainContent = document.getElementById('main-content');
const gameArea = document.getElementById('game-area');
const muteButton = document.getElementById('mute-button');
const timerSpan = document.getElementById('timer');
const killsSpan = document.getElementById('kills');
const notification = document.getElementById('notification');
const endScreen = document.getElementById('end-screen');
const finalScore = document.getElementById('final-score');
const playAgainButton = document.getElementById('play-again-button');
const installButton = document.getElementById('install-button');

// Audio elements
const backgroundMusic = new Audio('game-music-loop-4-144341.mp3');
const slapSound = new Audio('hard-slap-46388.mp3');
const tomatoSound = new Audio('tomato-squishwet-103934.mp3');

// Preload assets
const assets = ['game-icon.png', 'cursor.png', 'roach.png', 'roach-dead.png'];
let loadedAssets = 0;
assets.forEach(asset => {
  const img = new Image();
  img.onload = () => {
    loadedAssets++;
  };
  img.src = asset;
});

// Achievement thresholds and labels
const achievementLabels = [
  { score: 200, label: 'The Exterminator Supreme', prefix: 'Transcendent!' },
  { score: 180, label: 'Plague Purger', prefix: 'Unreal!' },
  { score: 160, label: 'Vermin Vanquisher', prefix: 'Legendary!' },
  { score: 140, label: 'Insect Incinerator', prefix: 'Epic!' },
  { score: 120, label: 'Bug Butcher', prefix: 'Savage!' },
  { score: 100, label: 'Apocalypse Bringer', prefix: 'Insane!' },
  { score: 80, label: 'Legendary Exterminator', prefix: 'Godlike!' },
  { score: 60, label: 'Infestation Hunter', prefix: 'Sensational!' },
  { score: 40, label: 'Bug Basher', prefix: 'Awesome!' },
  { score: 20, label: 'Roach Rookie', prefix: 'Nice!' }
];

function showMainContent() {
  loadingScreen.style.display = 'none';
  mainContent.style.display = 'flex';
}

function showEndScreen() {
  mainContent.style.display = 'none';
  endScreen.style.display = 'flex';
  let label = '';
  let prefix = '';
  for (let i = 0; i < achievementLabels.length; i++) {
    if (cockroachesKilled >= achievementLabels[i].score) {
      label = achievementLabels[i].label;
      prefix = achievementLabels[i].prefix;
      break;
    }
  }
  if (label) {
    finalScore.textContent = `${prefix} You are a ${label}!\nYou killed ${cockroachesKilled} cockroach${cockroachesKilled === 1 ? '' : 'es'}!`;
  } else {
    finalScore.textContent = `You killed ${cockroachesKilled} cockroach${cockroachesKilled === 1 ? '' : 'es'}!`;
  }
}

function resetGame() {
  cockroachesKilled = 0;
  timer = timerDuration;
  spawnInterval = 1200;
  speedUpStep = 0;
  killsSpan.textContent = '0 kills';
  timerSpan.textContent = `${timer} sec`;
  notification.style.display = 'none';
  gameArea.innerHTML = '';
}

startButton.addEventListener('click', () => {
  showMainContent();
  startGame();
});

playAgainButton.addEventListener('click', () => {
  endScreen.style.display = 'none';
  showMainContent();
  resetGame();
  startGame();
});

function startGame() {
  gameStarted = true;
  resetGame();
  backgroundMusic.loop = true;
  if (!isMuted) backgroundMusic.play();
  startTimer();
  startSpawning();
  showNotification('Start!', 1000);
}

function startTimer() {
  gameTimerInterval = setInterval(() => {
    timer--;
    timerSpan.textContent = `${timer} sec`;
    if (timer <= 0) {
      endGame();
    }
  }, 1000);
}

function showNotification(msg, duration = 1200, type = '') {
  notification.textContent = msg;
  notification.className = type ? `show-bounce ${type}` : 'show-bounce';
  notification.style.display = 'block';
  setTimeout(() => {
    notification.className = notification.className.replace('show-bounce', '');
    notification.style.display = 'none';
  }, duration);
}

function maybeShowAchievement() {
  for (let i = 0; i < achievementLabels.length; i++) {
    if (cockroachesKilled === achievementLabels[i].score) {
      showNotification(`${achievementLabels[i].prefix} ${achievementLabels[i].label}`, 1800, 'achievement');
      return;
    }
  }
}

function startSpawning() {
  // Initial spawn
  spawnCockroach();
  
  // Regular spawning interval
  let spawnLoop = setInterval(() => {
    if (gameStarted && timer > 0) {
      spawnCockroach();
    } else {
      clearInterval(spawnLoop);
    }
  }, spawnInterval);

  // Speed up every 10 seconds
  spawnRateInterval = setInterval(() => {
    if (gameStarted && timer > 0) {
      spawnInterval = Math.max(250, spawnInterval - SPAWN_DECREASE);
      showNotification('Speed Up!', 1200, '');
      clearInterval(spawnLoop);
      spawnLoop = setInterval(() => {
        if (gameStarted && timer > 0) {
          spawnCockroach();
        } else {
          clearInterval(spawnLoop);
        }
      }, spawnInterval);
    }
  }, 10000);
}

function spawnCockroach() {
  if (!gameStarted || timer <= 0) return;

  const cockroach = document.createElement('div');
  cockroach.className = 'cockroach';
  
  // Get cockroach size based on current styles
  const cockroachStyle = window.getComputedStyle(cockroach);
  const cockroachWidth = parseInt(cockroachStyle.width) || 50;
  const cockroachHeight = parseInt(cockroachStyle.height) || 50;
  
  // Calculate position within the game area bounds with padding
  const padding = 20; // Padding from edges
  const maxX = gameArea.offsetWidth - cockroachWidth - padding;
  const maxY = gameArea.offsetHeight - cockroachHeight - padding;
  
  const x = Math.max(padding, Math.min(maxX, Math.random() * maxX));
  const y = Math.max(padding, Math.min(maxY, Math.random() * maxY));
  
  cockroach.style.left = `${x}px`;
  cockroach.style.top = `${y}px`;
  
  // Random initial rotation and movement
  const rotation = Math.random() * 360;
  cockroach.style.transform = `rotate(${rotation}deg)`;
  
  // Add subtle movement animation
  const moveInterval = setInterval(() => {
    if (!alive) {
      clearInterval(moveInterval);
      return;
    }
    const smallMove = 5;
    const currentX = parseFloat(cockroach.style.left);
    const currentY = parseFloat(cockroach.style.top);
    const newX = currentX + (Math.random() - 0.5) * smallMove;
    const newY = currentY + (Math.random() - 0.5) * smallMove;
    
    // Keep within bounds with padding
    cockroach.style.left = `${Math.max(padding, Math.min(maxX, newX))}px`;
    cockroach.style.top = `${Math.max(padding, Math.min(maxY, newY))}px`;
    
    // Random slight rotation
    const currentRotation = parseFloat(cockroach.style.transform.replace(/[^0-9-]/g, '')) || 0;
    const newRotation = currentRotation + (Math.random() - 0.5) * 10;
    cockroach.style.transform = `rotate(${newRotation}deg)`;
  }, 100);
  
  gameArea.appendChild(cockroach);

  let alive = true;
  cockroach.addEventListener('click', () => {
    if (!alive) return;
    alive = false;
    clearInterval(moveInterval);
    cockroach.classList.add('dead');

    // Create splatter effect
    const splatter = document.createElement('div');
    splatter.className = 'splatter';
    splatter.style.left = cockroach.style.left;
    splatter.style.top = cockroach.style.top;
    gameArea.appendChild(splatter);

    // Apply a dramatic death animation with toe effects
    const newRotation = Math.random() * 360;
    const scaleX = Math.random() < 0.5 ? -1.2 : 1.2;
    cockroach.style.transform = `rotate(${newRotation}deg) scale(${scaleX}, 1.2)`;
    
    // Add toe spreading effect
    const toes = Array.from({length: 6}, () => {
      const toe = document.createElement('div');
      toe.className = 'toe';
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      toe.style.left = `${parseFloat(cockroach.style.left) + Math.cos(angle) * distance}px`;
      toe.style.top = `${parseFloat(cockroach.style.top) + Math.sin(angle) * distance}px`;
      toe.style.transform = `rotate(${angle * (180 / Math.PI)}deg)`;
      return toe;
    });
    
    toes.forEach(toe => gameArea.appendChild(toe));
    
    cockroachesKilled++;
    killsSpan.textContent = `${cockroachesKilled} kill${cockroachesKilled === 1 ? '' : 's'}`;
    maybeShowAchievement();
    
    // Play both sound effects
    if (!isMuted) {
      slapSound.currentTime = 0;
      slapSound.play();
      tomatoSound.currentTime = 0;
      tomatoSound.play();
    }

    // Remove toes and splatter after animation
    setTimeout(() => {
      toes.forEach(toe => toe.remove());
      splatter.remove();
    }, DEATH_ANIMATION_TIME - 100);

    // Remove cockroach after death animation completes
    setTimeout(() => {
      cockroach.remove();
    }, DEATH_ANIMATION_TIME);
  });

  // Remove cockroach if not killed within the lifetime
  setTimeout(() => {
    if (alive) {
      clearInterval(moveInterval);
      if (cockroach.parentNode) {
        cockroach.style.opacity = '0';
        setTimeout(() => cockroach.remove(), 300);
      }
    }
  }, COCKROACH_LIFETIME);
}

function endGame() {
  gameStarted = false;
  clearInterval(gameTimerInterval);
  clearInterval(spawnRateInterval);
  backgroundMusic.pause();
  
  // Allow death animations to complete before showing end screen
  setTimeout(() => {
    showEndScreen();
  }, DEATH_ANIMATION_TIME);
}

// Touch event handling for mobile
gameArea.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent scrolling/zooming
  const touch = e.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  if (element && element.classList.contains('cockroach')) {
    element.click();
  }
});

// Mute button
muteButton.addEventListener('click', () => {
  isMuted = !isMuted;
  muteButton.textContent = isMuted ? '🔇' : '🔊';
  if (isMuted) {
    backgroundMusic.pause();
  } else if (gameStarted) {
    backgroundMusic.play();
  }
});

// Install button
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = 'block';
});

// Check if the app is already installed
window.addEventListener('appinstalled', () => {
  installButton.style.display = 'none';
  deferredPrompt = null;
});

// Check if the app is already installed on page load
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  installButton.style.display = 'none';
}

installButton.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installButton.style.display = 'none';
    }
    deferredPrompt = null;
  }
});

// Offline detection
window.addEventListener('offline', () => {
  showNotification('You are offline. Some features may not work.', 2000);
});
window.addEventListener('online', () => {
  showNotification('You are back online!', 2000);
}); 