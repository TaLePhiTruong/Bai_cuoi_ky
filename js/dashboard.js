(function (global) {
  'use strict';

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const HEALTHY_THRESHOLD = 75;
  const JOURNAL_STORAGE_KEYS = ['ugarden_logs', 'ugarden_journal', 'ugarden_growth_logs'];
  const SETTINGS_STORAGE_KEY = 'ugarden_settings';

  let activeFilter = 'all';

  const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    menuToggleBtn: document.getElementById('menuToggleBtn'),
    gardenNameDisplay: document.getElementById('gardenNameDisplay'),
    currentDateDisplay: document.getElementById('currentDateDisplay'),
    notificationBtn: document.getElementById('notificationBtn'),
    notificationBadge: document.getElementById('notificationBadge'),
    notificationPanel: document.getElementById('notificationPanel'),
    notificationCountText: document.getElementById('notificationCountText'),
    notificationList: document.getElementById('notificationList'),
    statsGrid: document.getElementById('statsGrid'),
    plantList: document.getElementById('plantList'),
    plantsCountLabel: document.getElementById('plantsCountLabel'),
    scheduleList: document.getElementById('scheduleList'),
    filterButtons: document.querySelectorAll('.filter-btn')
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clampPercent(value) {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(num)));
  }

  function findCatalogPlant(plantId) {
    const catalog = global.PLANT_CATALOG;
    if (!catalog) {
      return null;
    }
    if (Array.isArray(catalog)) {
      return catalog.find((item) => item.id === plantId || item.plantId === plantId) || null;
    }
    if (typeof catalog === 'object') {
      return (
        catalog[plantId] ||
        Object.values(catalog).find((item) => item.id === plantId || item.plantId === plantId) ||
        null
      );
    }
    return null;
  }

  function parseTimestamp(isoString) {
    if (!isoString) {
      return null;
    }
    const time = new Date(isoString).getTime();
    return Number.isNaN(time) ? null : time;
  }

  /**
   * Tính toán trạng thái tưới nước và bón phân dựa trên PLANT_CATALOG.
   */
  function evaluateCareStatus(plant, nowMs) {
    const catalog = findCatalogPlant(plant.plantId);
    const wateringDays = Number(catalog?.wateringDays) > 0 ? Number(catalog.wateringDays) : 3;
    const fertilizingDays = Number(catalog?.fertilizingDays) > 0 ? Number(catalog.fertilizingDays) : 14;

    const lastWaterMs = parseTimestamp(plant.lastWateredAt);
    const lastFertMs = parseTimestamp(plant.lastFertilizedAt);

    let needsWater = false;
    let waterDaysLeft = 0;
    if (lastWaterMs === null) {
      needsWater = true;
      waterDaysLeft = null;
    } else {
      const elapsedWaterDays = (nowMs - lastWaterMs) / MS_PER_DAY;
      waterDaysLeft = wateringDays - elapsedWaterDays;
      needsWater = elapsedWaterDays >= wateringDays;
    }

    let needsFertilize = false;
    let fertilizeDaysLeft = 0;
    if (lastFertMs === null) {
      needsFertilize = true;
      fertilizeDaysLeft = null;
    } else {
      const elapsedFertDays = (nowMs - lastFertMs) / MS_PER_DAY;
      fertilizeDaysLeft = fertilizingDays - elapsedFertDays;
      needsFertilize = elapsedFertDays >= fertilizingDays;
    }

    const messages = [];
    if (needsWater) {
      messages.push('Cần tưới nước');
    }
    if (needsFertilize) {
      messages.push('Cần bón phân');
    }
    if (messages.length === 0) {
      messages.push('Chưa đến lịch chăm sóc');
    }

    let statusClass = 'status-ok';
    if (needsWater && needsFertilize) {
      statusClass = 'status-both';
    } else if (needsWater) {
      statusClass = 'status-water';
    } else if (needsFertilize) {
      statusClass = 'status-fertilize';
    }

    return {
      catalog,
      wateringDays,
      fertilizingDays,
      needsWater,
      needsFertilize,
      waterDaysLeft,
      fertilizeDaysLeft,
      messages,
      statusClass
    };
  }

  function formatCareTimeText(isoString) {
    const time = parseTimestamp(isoString);
    if (time === null) {
      return 'Chưa có lịch sử';
    }
    const diffMs = Date.now() - time;
    if (diffMs < 60 * 1000) {
      return 'Vừa xong';
    }
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  }

  function getGrowthJournalCount() {
    for (let i = 0; i < JOURNAL_STORAGE_KEYS.length; i += 1) {
      try {
        const raw = global.localStorage.getItem(JOURNAL_STORAGE_KEYS[i]);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.length;
          }
        }
      } catch (error) {
        console.error('Lỗi đọc nhật ký tăng trưởng:', error);
      }
    }

    if (Array.isArray(global.INITIAL_LOGS)) {
      return global.INITIAL_LOGS.length;
    }
    return 0;
  }

  function loadHeaderMeta() {
    if (elements.currentDateDisplay) {
      const formattedDate = new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date());
      elements.currentDateDisplay.textContent = formattedDate;
    }

    if (elements.gardenNameDisplay) {
      try {
        const rawSettings = global.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (rawSettings) {
          const parsed = JSON.parse(rawSettings);
          if (parsed && typeof parsed.gardenName === 'string' && parsed.gardenName.trim()) {
            elements.gardenNameDisplay.textContent = parsed.gardenName.trim();
          }
        }
      } catch (error) {
        console.error('Lỗi đọc cài đặt khu vườn:', error);
      }
    }
  }

  function renderStats(enrichedPlants) {
    if (!elements.statsGrid) {
      return;
    }

    const totalPlants = enrichedPlants.length;
    const needWaterCount = enrichedPlants.filter((item) => item.care.needsWater).length;
    const healthyCount = enrichedPlants.filter(
      (item) => clampPercent(item.plant.health) >= HEALTHY_THRESHOLD
    ).length;
    const journalCount = getGrowthJournalCount();

    const stats = [
      {
        icon: '🌱',
        iconClass: 'is-total',
        value: totalPlants,
        label: 'Tổng số cây đang trồng'
      },
      {
        icon: '💧',
        iconClass: 'is-water',
        value: needWaterCount,
        label: 'Số cây cần tưới nước'
      },
      {
        icon: '💚',
        iconClass: 'is-healthy',
        value: healthyCount,
        label: 'Số cây khỏe mạnh'
      },
      {
        icon: '📓',
        iconClass: 'is-journal',
        value: journalCount,
        label: 'Số nhật ký tăng trưởng'
      }
    ];

    elements.statsGrid.innerHTML = stats
      .map(
        (stat) => `
        <article class="stat-card">
          <div class="stat-icon ${stat.iconClass}" aria-hidden="true">${stat.icon}</div>
          <div class="stat-body">
            <strong class="stat-value">${stat.value}</strong>
            <span class="stat-label">${escapeHtml(stat.label)}</span>
          </div>
        </article>
      `
      )
      .join('');
  }

  function renderNotifications(enrichedPlants) {
    const alerts = [];

    enrichedPlants.forEach(({ plant, care }) => {
      const displayName = plant.nickname || care.catalog?.name || plant.plantId;
      if (care.needsWater) {
        alerts.push({
          title: displayName,
          detail:
            care.waterDaysLeft === null
              ? 'Cần tưới nước (chưa có lịch sử tưới)'
              : 'Cần tưới nước theo chu kỳ'
        });
      }
      if (care.needsFertilize) {
        alerts.push({
          title: displayName,
          detail:
            care.fertilizeDaysLeft === null
              ? 'Cần bón phân (chưa có lịch sử bón)'
              : 'Cần bón phân bổ sung dinh dưỡng'
        });
      }
    });

    if (elements.notificationBadge) {
      if (alerts.length > 0) {
        elements.notificationBadge.hidden = false;
        elements.notificationBadge.textContent = String(alerts.length);
      } else {
        elements.notificationBadge.hidden = true;
        elements.notificationBadge.textContent = '0';
      }
    }

    if (elements.notificationCountText) {
      elements.notificationCountText.textContent = `${alerts.length} nhắc nhở`;
    }

    if (!elements.notificationList) {
      return;
    }

    if (alerts.length === 0) {
      elements.notificationList.innerHTML =
        '<li class="notification-empty">Tất cả cây trong vườn đều đã được chăm sóc đúng lịch!</li>';
      return;
    }

    elements.notificationList.innerHTML = alerts
      .map(
        (alert) => `
        <li class="notification-item">
          <strong>${escapeHtml(alert.title)}</strong>
          <span>${escapeHtml(alert.detail)}</span>
        </li>
      `
      )
      .join('');
  }

  function buildPlantAvatarHtml(catalog, displayName) {
    if (catalog && catalog.image) {
      return `<img class="plant-avatar-img" src="${escapeHtml(catalog.image)}" alt="${escapeHtml(displayName)}">`;
    }
    return escapeHtml(catalog?.icon || '🌱');
  }

  function renderPlantCards(enrichedPlants) {
    if (!elements.plantList) {
      return;
    }

    const filteredPlants = enrichedPlants.filter(({ plant, care }) => {
      if (activeFilter === 'water') {
        return care.needsWater;
      }
      if (activeFilter === 'fertilize') {
        return care.needsFertilize;
      }
      if (activeFilter === 'healthy') {
        return clampPercent(plant.health) >= HEALTHY_THRESHOLD;
      }
      return true;
    });

    if (elements.plantsCountLabel) {
      elements.plantsCountLabel.textContent = `Đang hiển thị ${filteredPlants.length} / ${enrichedPlants.length} cây`;
    }

    if (filteredPlants.length === 0) {
      elements.plantList.innerHTML = `
        <div class="empty-state">
          <strong>Không có cây nào phù hợp với bộ lọc hiện tại</strong>
          <span>Hãy chọn "Tất cả" hoặc thêm cây mới từ Thư viện cây.</span>
        </div>
      `;
      return;
    }

    elements.plantList.innerHTML = filteredPlants
      .map(({ plant, care }) => {
        const speciesName = care.catalog?.name || plant.plantId;
        const displayName = plant.nickname || speciesName;
        const moisture = clampPercent(plant.moisture);
        const health = clampPercent(plant.health);
        const moistureLowClass = moisture < 45 ? 'is-low' : '';
        const healthLowClass = health < 65 ? 'is-low' : '';
        const avatarHtml = buildPlantAvatarHtml(care.catalog, displayName);

        const badgesHtml = care.messages
          .map((msg) => `<span class="care-badge">• ${escapeHtml(msg)}</span>`)
          .join('');

        return `
          <article class="plant-card" data-plant-id="${escapeHtml(plant.id)}">
            <div class="plant-card-top">
              <div class="plant-identity">
                <div class="plant-avatar" aria-hidden="true">${avatarHtml}</div>
                <div class="plant-title-group">
                  <h3 class="plant-name">${escapeHtml(displayName)}</h3>
                  <span class="plant-species">${escapeHtml(speciesName)}</span>
                </div>
              </div>
            </div>

            <div class="plant-location">
              <span aria-hidden="true">📍</span>
              <span>${escapeHtml(plant.location || 'Chưa cập nhật vị trí')}</span>
            </div>

            <div class="metrics-group">
              <div class="metric-row">
                <div class="metric-header">
                  <span class="metric-label">Độ ẩm đất</span>
                  <span class="metric-percent">${moisture}%</span>
                </div>
                <div
                  class="progress-track"
                  role="progressbar"
                  aria-label="Độ ẩm đất của ${escapeHtml(displayName)}"
                  aria-valuenow="${moisture}"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div class="progress-fill moisture ${moistureLowClass}" style="width: ${moisture}%"></div>
                </div>
              </div>

              <div class="metric-row">
                <div class="metric-header">
                  <span class="metric-label">Sức khỏe cây</span>
                  <span class="metric-percent">${health}%</span>
                </div>
                <div
                  class="progress-track"
                  role="progressbar"
                  aria-label="Sức khỏe của ${escapeHtml(displayName)}"
                  aria-valuenow="${health}"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div class="progress-fill health ${healthLowClass}" style="width: ${health}%"></div>
                </div>
              </div>
            </div>

            <div class="care-status-box ${care.statusClass}">
              <div class="care-status-badges">${badgesHtml}</div>
              <div class="care-meta">
                Tưới gần nhất: ${escapeHtml(formatCareTimeText(plant.lastWateredAt))} ·
                Bón gần nhất: ${escapeHtml(formatCareTimeText(plant.lastFertilizedAt))}
              </div>
            </div>

            <div class="card-actions">
              <button
                type="button"
                class="btn btn-water"
                data-action="water"
                data-id="${escapeHtml(plant.id)}"
              >
                <span aria-hidden="true">💧</span>
                <span>Đã tưới</span>
              </button>
              <button
                type="button"
                class="btn btn-fertilize"
                data-action="fertilize"
                data-id="${escapeHtml(plant.id)}"
              >
                <span aria-hidden="true">🌱</span>
                <span>Đã bón phân</span>
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function formatScheduleDue(daysLeft) {
    if (daysLeft === null) {
      return {
        label: 'Cần chăm sóc ngay',
        urgent: true
      };
    }
    if (daysLeft <= 0) {
      const overdue = Math.floor(Math.abs(daysLeft));
      return {
        label: overdue >= 1 ? `Quá hạn ${overdue} ngày` : 'Đến lịch hôm nay',
        urgent: true
      };
    }
    const daysAhead = Math.ceil(daysLeft);
    return {
      label: `Còn ${daysAhead} ngày`,
      urgent: false
    };
  }

  function renderSchedule(enrichedPlants) {
    if (!elements.scheduleList) {
      return;
    }

    if (enrichedPlants.length === 0) {
      elements.scheduleList.innerHTML =
        '<li class="notification-empty">Chưa có cây nào để lập lịch chăm sóc.</li>';
      return;
    }

    const tasks = [];
    enrichedPlants.forEach(({ plant, care }) => {
      const displayName = plant.nickname || care.catalog?.name || plant.plantId;
      const icon = care.catalog?.icon || '🌿';

      tasks.push({
        plantName: displayName,
        icon,
        taskLabel: `Tưới nước (chu kỳ ${care.wateringDays} ngày)`,
        daysLeft: care.waterDaysLeft,
        priority: care.waterDaysLeft === null ? -9999 : care.waterDaysLeft
      });

      tasks.push({
        plantName: displayName,
        icon,
        taskLabel: `Bón phân (chu kỳ ${care.fertilizingDays} ngày)`,
        daysLeft: care.fertilizeDaysLeft,
        priority: care.fertilizeDaysLeft === null ? -9999 : care.fertilizeDaysLeft
      });
    });

    tasks.sort((a, b) => a.priority - b.priority);

    elements.scheduleList.innerHTML = tasks
      .map((task) => {
        const due = formatScheduleDue(task.daysLeft);
        return `
          <li class="schedule-item ${due.urgent ? 'is-urgent' : ''}">
            <div class="schedule-left">
              <span class="schedule-icon" aria-hidden="true">${escapeHtml(task.icon)}</span>
              <div class="schedule-info">
                <strong class="schedule-plant">${escapeHtml(task.plantName)}</strong>
                <span class="schedule-task">${escapeHtml(task.taskLabel)}</span>
              </div>
            </div>
            <span class="schedule-due ${due.urgent ? 'due-now' : 'due-soon'}">${escapeHtml(due.label)}</span>
          </li>
        `;
      })
      .join('');
  }

  function renderDashboard() {
    if (!global.GardenStore) {
      return;
    }

    const nowMs = Date.now();
    const plants = global.GardenStore.getPlants();
    const enrichedPlants = plants.map((plant) => ({
      plant,
      care: evaluateCareStatus(plant, nowMs)
    }));

    renderStats(enrichedPlants);
    renderNotifications(enrichedPlants);
    renderPlantCards(enrichedPlants);
    renderSchedule(enrichedPlants);
  }

  function closeMobileSidebar() {
    if (elements.sidebar && elements.sidebarBackdrop && elements.menuToggleBtn) {
      elements.sidebar.classList.remove('is-open');
      elements.sidebarBackdrop.classList.remove('is-open');
      elements.menuToggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleMobileSidebar() {
    if (!elements.sidebar || !elements.sidebarBackdrop || !elements.menuToggleBtn) {
      return;
    }
    const isOpen = elements.sidebar.classList.toggle('is-open');
    elements.sidebarBackdrop.classList.toggle('is-open', isOpen);
    elements.menuToggleBtn.setAttribute('aria-expanded', String(isOpen));
  }

  function closeNotificationPanel() {
    if (elements.notificationPanel && elements.notificationBtn) {
      elements.notificationPanel.hidden = true;
      elements.notificationBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function bindEvents() {
    if (elements.plantList) {
      elements.plantList.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action][data-id]');
        if (!button) {
          return;
        }
        const action = button.dataset.action;
        const plantId = button.dataset.id;
        if (action === 'water' || action === 'fertilize') {
          global.GardenStore.updateCare(plantId, action);
          renderDashboard();
        }
      });
    }

    elements.filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter || 'all';
        elements.filterButtons.forEach((item) => {
          item.classList.toggle('active', item === btn);
        });
        renderDashboard();
      });
    });

    if (elements.menuToggleBtn) {
      elements.menuToggleBtn.addEventListener('click', toggleMobileSidebar);
    }

    if (elements.sidebarBackdrop) {
      elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
    }

    if (elements.notificationBtn && elements.notificationPanel) {
      elements.notificationBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = elements.notificationPanel.hidden;
        elements.notificationPanel.hidden = !willOpen;
        elements.notificationBtn.setAttribute('aria-expanded', String(willOpen));
      });

      document.addEventListener('click', (event) => {
        if (
          !elements.notificationPanel.hidden &&
          !elements.notificationPanel.contains(event.target) &&
          !elements.notificationBtn.contains(event.target)
        ) {
          closeNotificationPanel();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeNotificationPanel();
          closeMobileSidebar();
        }
      });
    }

    // Đồng bộ giao diện nếu LocalStorage thay đổi từ tab/trang khác
    global.addEventListener('storage', (event) => {
      if (event.key === 'ugarden_plants' || JOURNAL_STORAGE_KEYS.includes(event.key)) {
        renderDashboard();
      }
    });
  }

  function init() {
    loadHeaderMeta();
    bindEvents();
    renderDashboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
