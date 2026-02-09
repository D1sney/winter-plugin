// ==========================================
// WINTER MAGIC - Новогодний плагин
// ==========================================

(function() {
  'use strict';

  if (window.winterMagicInitialized) return;
  window.winterMagicInitialized = true;

  // ==========================================
  // НАСТРОЙКИ
  // ==========================================

  const defaultSettings = {
    snow: {
      enabled: true,
      amount: 50,
      size: 'medium',
      speed: 'normal'
    },
    garland: {
      enabled: true,
      brightness: 80,
      blink: true
    }
  };

  let settings = JSON.parse(JSON.stringify(defaultSettings));
  let snowflakes = [];
  let snowContainer = null;
  let garlandElement = null;
  let menuElement = null;
  let overlayElement = null;
  let animationId = null;
  let lastSpawnTime = 0;
  let isPageVisible = true;

  // Константы оптимизации
  const MAX_SNOWFLAKES = 200;
  const MAX_SNOWFLAKE_LIFETIME = 20000; // 20 секунд

  // ==========================================
  // ХРАНИЛИЩЕ НАСТРОЕК
  // ==========================================

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['winterMagicSettings'], (result) => {
        if (result.winterMagicSettings) {
          settings = { ...defaultSettings, ...result.winterMagicSettings };
        }
        resolve();
      });
    });
  }

  function saveSettings() {
    chrome.storage.local.set({ winterMagicSettings: settings });
    // Уведомляем другие вкладки
    chrome.runtime.sendMessage({ action: 'settingsChanged', settings });
  }

  // ==========================================
  // УТИЛИТЫ
  // ==========================================

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getSnowflakeSize() {
    const sizes = {
      small: { min: 2, max: 5 },
      medium: { min: 4, max: 8 },
      large: { min: 6, max: 12 }
    };
    const size = sizes[settings.snow.size];
    return random(size.min, size.max);
  }

  function getSnowflakeFallSpeed() {
    const speeds = {
      slow: { min: 0.3, max: 0.8 },
      normal: { min: 0.6, max: 1.5 },
      fast: { min: 1.2, max: 2.5 }
    };
    return speeds[settings.snow.speed];
  }

  function getSpawnInterval() {
    // Интервал в мс между созданием снежинок
    return Math.max(30, 150 - settings.snow.amount);
  }

  // ==========================================
  // СНЕЖИНКИ (requestAnimationFrame)
  // ==========================================

  function createSnowContainer() {
    if (snowContainer) return;
    snowContainer = document.createElement('div');
    snowContainer.className = 'winter-magic-snow-container';
    document.body.appendChild(snowContainer);
  }

  function createSnowflake() {
    if (!settings.snow.enabled || !snowContainer) return null;

    // Лимит снежинок
    if (snowflakes.length >= MAX_SNOWFLAKES) return null;

    const snowflake = document.createElement('div');
    snowflake.className = 'winter-magic-snowflake';

    const size = getSnowflakeSize();
    const speedRange = getSnowflakeFallSpeed();

    const flakeData = {
      element: snowflake,
      x: random(0, window.innerWidth),
      y: -10,
      size: size,
      speed: random(speedRange.min, speedRange.max),
      wobble: random(0, Math.PI * 2),
      wobbleSpeed: random(0.02, 0.05),
      opacity: random(0.5, 1),
      birthTime: performance.now()
    };

    snowflake.style.cssText = `
      left: ${flakeData.x}px;
      top: ${flakeData.y}px;
      width: ${size}px;
      height: ${size}px;
      opacity: ${flakeData.opacity};
    `;

    snowContainer.appendChild(snowflake);
    return flakeData;
  }

  function updateSnowflakes(timestamp) {
    if (!settings.snow.enabled) {
      animationId = requestAnimationFrame(updateSnowflakes);
      return;
    }

    // Создаём новые снежинки (только если страница видима)
    if (isPageVisible && timestamp - lastSpawnTime > getSpawnInterval()) {
      const flake = createSnowflake();
      if (flake) snowflakes.push(flake);
      lastSpawnTime = timestamp;
    }

    // Обновляем позиции
    for (let i = snowflakes.length - 1; i >= 0; i--) {
      const flake = snowflakes[i];

      flake.y += flake.speed;
      flake.wobble += flake.wobbleSpeed;
      const wobbleX = Math.sin(flake.wobble) * 0.5;
      flake.x += wobbleX;

      flake.element.style.transform = `translate(${wobbleX}px, ${flake.y}px)`;

      const age = timestamp - flake.birthTime;

      // Удаляем снежинки если:
      // 1. За пределами экрана
      // 2. Слишком старые (живут больше MAX_SNOWFLAKE_LIFETIME)
      if (flake.y > window.innerHeight + 10 || age > MAX_SNOWFLAKE_LIFETIME) {
        flake.element.remove();
        snowflakes.splice(i, 1);
      }
    }

    animationId = requestAnimationFrame(updateSnowflakes);
  }

  function startSnow() {
    createSnowContainer();
    if (!animationId) {
      lastSpawnTime = performance.now();
      animationId = requestAnimationFrame(updateSnowflakes);
    }
  }

  function stopSnow() {
    snowflakes.forEach(flake => flake.element.remove());
    snowflakes = [];
  }

  function restartSnow() {
    stopSnow();
    saveSettings();
  }

  // ==========================================
  // ГИРЛЯНДА
  // ==========================================

  function createGarland() {
    if (garlandElement) return;

    garlandElement = document.createElement('div');
    garlandElement.className = 'winter-magic-garland';

    const wire = document.createElement('div');
    wire.className = 'winter-magic-garland-wire';

    const lightsContainer = document.createElement('div');
    lightsContainer.className = 'winter-magic-garland-lights';

    const colors = ['red', 'yellow', 'green', 'blue'];
    const bulbCount = Math.floor(window.innerWidth / 45);

    for (let i = 0; i < bulbCount; i++) {
      const bulb = document.createElement('div');
      bulb.className = `winter-magic-bulb ${colors[i % colors.length]}`;
      lightsContainer.appendChild(bulb);
    }

    garlandElement.appendChild(wire);
    garlandElement.appendChild(lightsContainer);
    document.body.appendChild(garlandElement);

    updateGarland();
  }

  function updateGarland() {
    if (!garlandElement) return;

    if (settings.garland.enabled) {
      garlandElement.style.display = 'flex';
      garlandElement.style.opacity = settings.garland.brightness / 100;
      garlandElement.classList.toggle('no-blink', !settings.garland.blink);
    } else {
      garlandElement.style.display = 'none';
    }
    saveSettings();
  }

  // ==========================================
  // МЕНЮ НАСТРОЕК (минималистичный дизайн)
  // ==========================================

  function createMenu() {
    if (menuElement) return;

    overlayElement = document.createElement('div');
    overlayElement.className = 'winter-magic-overlay';
    overlayElement.addEventListener('click', hideMenu);
    document.body.appendChild(overlayElement);

    menuElement = document.createElement('div');
    menuElement.className = 'winter-magic-menu';

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const hotkey = isMac ? 'Ctrl+S' : 'Alt+S';

    menuElement.innerHTML = `
      <div class="wm-header">
        <span class="wm-title">Winter Magic</span>
        <button class="wm-close" id="wm-close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="wm-content">
        <div class="wm-section">
          <div class="wm-section-header">
            <span>Снежинки</span>
            <div class="wm-toggle ${settings.snow.enabled ? 'active' : ''}" id="wm-snow-toggle">
              <div class="wm-toggle-knob"></div>
            </div>
          </div>

          <div class="wm-control">
            <div class="wm-control-header">
              <span>Количество</span>
              <span class="wm-value" id="wm-amount-value">${settings.snow.amount}</span>
            </div>
            <input type="range" class="wm-slider" id="wm-snow-amount" min="20" max="100" value="${settings.snow.amount}">
          </div>

          <div class="wm-control">
            <span>Размер</span>
            <div class="wm-tabs" id="wm-snow-size">
              <button class="wm-tab ${settings.snow.size === 'small' ? 'active' : ''}" data-value="small">S</button>
              <button class="wm-tab ${settings.snow.size === 'medium' ? 'active' : ''}" data-value="medium">M</button>
              <button class="wm-tab ${settings.snow.size === 'large' ? 'active' : ''}" data-value="large">L</button>
            </div>
          </div>

          <div class="wm-control">
            <span>Скорость</span>
            <div class="wm-tabs" id="wm-snow-speed">
              <button class="wm-tab ${settings.snow.speed === 'slow' ? 'active' : ''}" data-value="slow">Медл.</button>
              <button class="wm-tab ${settings.snow.speed === 'normal' ? 'active' : ''}" data-value="normal">Норм</button>
              <button class="wm-tab ${settings.snow.speed === 'fast' ? 'active' : ''}" data-value="fast">Быстр.</button>
            </div>
          </div>
        </div>

        <div class="wm-divider"></div>

        <div class="wm-section">
          <div class="wm-section-header">
            <span>Гирлянда</span>
            <div class="wm-toggle ${settings.garland.enabled ? 'active' : ''}" id="wm-garland-toggle">
              <div class="wm-toggle-knob"></div>
            </div>
          </div>

          <div class="wm-control">
            <div class="wm-control-header">
              <span>Яркость</span>
              <span class="wm-value" id="wm-brightness-value">${settings.garland.brightness}%</span>
            </div>
            <input type="range" class="wm-slider" id="wm-garland-brightness" min="20" max="100" value="${settings.garland.brightness}">
          </div>

          <div class="wm-control wm-row">
            <span>Мигание</span>
            <div class="wm-toggle ${settings.garland.blink ? 'active' : ''}" id="wm-garland-blink">
              <div class="wm-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="wm-footer">
        <span class="wm-hotkey">${hotkey}</span>
      </div>
    `;

    document.body.appendChild(menuElement);
    setupMenuHandlers();
  }

  function setupMenuHandlers() {
    document.getElementById('wm-close').addEventListener('click', hideMenu);

    // Снежинки
    document.getElementById('wm-snow-toggle').addEventListener('click', function() {
      settings.snow.enabled = !settings.snow.enabled;
      this.classList.toggle('active', settings.snow.enabled);
      if (!settings.snow.enabled) stopSnow();
      saveSettings();
    });

    document.getElementById('wm-snow-amount').addEventListener('input', function() {
      settings.snow.amount = parseInt(this.value);
      document.getElementById('wm-amount-value').textContent = this.value;
      saveSettings();
    });

    document.getElementById('wm-snow-size').addEventListener('click', function(e) {
      const btn = e.target.closest('.wm-tab');
      if (btn) {
        settings.snow.size = btn.dataset.value;
        this.querySelectorAll('.wm-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        restartSnow();
      }
    });

    document.getElementById('wm-snow-speed').addEventListener('click', function(e) {
      const btn = e.target.closest('.wm-tab');
      if (btn) {
        settings.snow.speed = btn.dataset.value;
        this.querySelectorAll('.wm-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveSettings();
      }
    });

    // Гирлянда
    document.getElementById('wm-garland-toggle').addEventListener('click', function() {
      settings.garland.enabled = !settings.garland.enabled;
      this.classList.toggle('active', settings.garland.enabled);
      updateGarland();
    });

    document.getElementById('wm-garland-brightness').addEventListener('input', function() {
      settings.garland.brightness = parseInt(this.value);
      document.getElementById('wm-brightness-value').textContent = this.value + '%';
      updateGarland();
    });

    document.getElementById('wm-garland-blink').addEventListener('click', function() {
      settings.garland.blink = !settings.garland.blink;
      this.classList.toggle('active', settings.garland.blink);
      updateGarland();
    });
  }

  function updateMenuUI() {
    if (!menuElement) return;

    document.getElementById('wm-snow-toggle').classList.toggle('active', settings.snow.enabled);
    document.getElementById('wm-snow-amount').value = settings.snow.amount;
    document.getElementById('wm-amount-value').textContent = settings.snow.amount;

    document.querySelectorAll('#wm-snow-size .wm-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === settings.snow.size);
    });
    document.querySelectorAll('#wm-snow-speed .wm-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === settings.snow.speed);
    });

    document.getElementById('wm-garland-toggle').classList.toggle('active', settings.garland.enabled);
    document.getElementById('wm-garland-brightness').value = settings.garland.brightness;
    document.getElementById('wm-brightness-value').textContent = settings.garland.brightness + '%';
    document.getElementById('wm-garland-blink').classList.toggle('active', settings.garland.blink);
  }

  function showMenu() {
    if (!menuElement) createMenu();
    menuElement.classList.add('visible');
    overlayElement.classList.add('visible');
  }

  function hideMenu() {
    if (menuElement) menuElement.classList.remove('visible');
    if (overlayElement) overlayElement.classList.remove('visible');
  }

  function toggleMenu() {
    if (menuElement && menuElement.classList.contains('visible')) {
      hideMenu();
    } else {
      showMenu();
    }
  }

  // ==========================================
  // СИНХРОНИЗАЦИЯ МЕЖДУ ВКЛАДКАМИ
  // ==========================================

  function applySettings(newSettings) {
    settings = { ...defaultSettings, ...newSettings };

    // Применяем снежинки
    if (!settings.snow.enabled) {
      stopSnow();
    }

    // Применяем гирлянду
    if (garlandElement) {
      if (settings.garland.enabled) {
        garlandElement.style.display = 'flex';
        garlandElement.style.opacity = settings.garland.brightness / 100;
        garlandElement.classList.toggle('no-blink', !settings.garland.blink);
      } else {
        garlandElement.style.display = 'none';
      }
    }

    updateMenuUI();
  }

  // ==========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ==========================================

  async function init() {
    await loadSettings();

    startSnow();
    createGarland();
    createMenu();

    // Сообщения от background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'toggleMenu') {
        toggleMenu();
      } else if (message.action === 'settingsUpdated' && message.settings) {
        applySettings(message.settings);
      }
    });

    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      if ((isMac && e.ctrlKey && e.key.toLowerCase() === 's') ||
          (!isMac && e.altKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        toggleMenu();
      }

      if (e.key === 'Escape' && menuElement?.classList.contains('visible')) {
        hideMenu();
      }
    });

    // Слушаем изменения в storage (для синхронизации между вкладками)
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.winterMagicSettings?.newValue) {
        applySettings(changes.winterMagicSettings.newValue);
      }
    });

    // Page Visibility API — отслеживаем когда вкладка становится активной/неактивной
    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;

      // При возврате на вкладку сбрасываем lastSpawnTime
      // чтобы избежать массового спавна из-за большой разницы в timestamp
      if (isPageVisible) {
        lastSpawnTime = performance.now();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
