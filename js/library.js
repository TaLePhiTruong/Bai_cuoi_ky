/**
 * Plant Library controller for Urban Garden.
 * Handles rendering from window.PLANT_CATALOG, combined search + category filtering,
 * and adding plants through window.GardenStore.addPlant(plantId).
 */
(function () {
  "use strict";

  const STORAGE_KEY = "ugarden_plants";

  const state = {
    searchQuery: "",
    selectedCategory: "all"
  };

  const dom = {
    plantGrid: document.getElementById("plantGrid"),
    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    filterButtons: Array.from(document.querySelectorAll(".filter-btn")),
    resultsSummary: document.getElementById("resultsSummary"),
    emptyState: document.getElementById("emptyState"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),
    gardenCount: document.getElementById("gardenCount"),
    toastContainer: document.getElementById("toastContainer"),
    sidebar: document.getElementById("sidebar"),
    sidebarToggle: document.getElementById("sidebarToggle"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop")
  };

  /**
   * Escape HTML special characters before injecting data into templates.
   * @param {string} value
   * @returns {string}
   */
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Normalize Vietnamese text for accent-tolerant search matching.
   * @param {string} text
   * @returns {string}
   */
  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .trim();
  }

  function getCatalog() {
    return Array.isArray(window.PLANT_CATALOG) ? window.PLANT_CATALOG : [];
  }

  /**
   * Read-only lookup of plantIds currently in the garden.
   * Uses GardenStore when available, or reads ugarden_plants without mutating it.
   * @returns {Set<string>}
   */
  function getExistingGardenPlantIds() {
    try {
      let plants = null;
      if (window.GardenStore && typeof window.GardenStore.getPlants === "function") {
        plants = window.GardenStore.getPlants();
      } else {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        plants = raw ? JSON.parse(raw) : [];
      }

      if (!Array.isArray(plants)) {
        return new Set();
      }

      return new Set(
        plants
          .map((item) => (item && (item.plantId || item.id)) || "")
          .filter(Boolean)
      );
    } catch (_error) {
      return new Set();
    }
  }

  function updateGardenCount() {
    if (!dom.gardenCount) return;
    const existingIds = getExistingGardenPlantIds();
    dom.gardenCount.textContent = String(existingIds.size);
  }

  function getFilteredPlants() {
    const catalog = getCatalog();
    const rawQuery = state.searchQuery.trim().toLowerCase();
    const normalizedQuery = normalizeText(state.searchQuery);

    return catalog.filter((plant) => {
      const matchesCategory =
        state.selectedCategory === "all" || plant.category === state.selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!rawQuery) {
        return true;
      }

      const name = String(plant.name || "");
      const description = String(plant.description || "");
      const directMatch =
        name.toLowerCase().includes(rawQuery) ||
        description.toLowerCase().includes(rawQuery);

      const normalizedMatch =
        normalizeText(name).includes(normalizedQuery) ||
        normalizeText(description).includes(normalizedQuery);

      return directMatch || normalizedMatch;
    });
  }

  function createPlantCardMarkup(plant, isInGarden) {
    const btnClass = isInGarden ? "btn-add-plant is-added" : "btn-add-plant";
    const btnText = isInGarden ? "✓ Đã có trong vườn" : "+ Thêm vào khu vườn";

    return `
      <article class="plant-card" data-plant-id="${escapeHtml(plant.id)}">
        <div class="plant-card-header">
          <div class="plant-identity">
            <div class="plant-icon" aria-hidden="true">${escapeHtml(plant.icon || "🌱")}</div>
            <div class="plant-title-wrap">
              <h2 class="plant-name">${escapeHtml(plant.name)}</h2>
              <span class="plant-category">${escapeHtml(plant.category)}</span>
            </div>
          </div>
          ${isInGarden ? '<span class="in-garden-badge">Đang trồng</span>' : ""}
        </div>

        <p class="plant-description">${escapeHtml(plant.description)}</p>

        <dl class="plant-specs">
          <div class="spec-item">
            <dt class="spec-label">☀️ Ánh sáng</dt>
            <dd class="spec-value">${escapeHtml(plant.sunlight)}</dd>
          </div>
          <div class="spec-item">
            <dt class="spec-label">💧 Độ ẩm lý tưởng</dt>
            <dd class="spec-value">${escapeHtml(plant.idealMoisture)}</dd>
          </div>
          <div class="spec-item">
            <dt class="spec-label">🚿 Chu kỳ tưới</dt>
            <dd class="spec-value">Mỗi ${escapeHtml(plant.wateringDays)} ngày</dd>
          </div>
          <div class="spec-item">
            <dt class="spec-label">🧪 Chu kỳ bón phân</dt>
            <dd class="spec-value">Mỗi ${escapeHtml(plant.fertilizingDays)} ngày</dd>
          </div>
        </dl>

        <div class="plant-tips">
          <strong>Hướng dẫn chăm sóc</strong>
          ${escapeHtml(plant.tips)}
        </div>

        <div class="plant-card-footer">
          <button
            type="button"
            class="${btnClass}"
            data-action="add-to-garden"
            data-plant-id="${escapeHtml(plant.id)}"
          >
            ${btnText}
          </button>
        </div>
      </article>
    `;
  }

  function renderPlants() {
    const catalog = getCatalog();
    const filteredPlants = getFilteredPlants();
    const gardenPlantIds = getExistingGardenPlantIds();

    updateGardenCount();

    if (dom.resultsSummary) {
      const categoryLabel =
        state.selectedCategory === "all" ? "tất cả nhóm" : `nhóm "${state.selectedCategory}"`;
      const searchSuffix = state.searchQuery.trim()
        ? ` với từ khóa "${state.searchQuery.trim()}"`
        : "";
      dom.resultsSummary.textContent =
        `Hiển thị ${filteredPlants.length} / ${catalog.length} giống cây (${categoryLabel}${searchSuffix})`;
    }

    if (filteredPlants.length === 0) {
      dom.plantGrid.innerHTML = "";
      dom.emptyState.hidden = false;
      return;
    }

    dom.emptyState.hidden = true;
    dom.plantGrid.innerHTML = filteredPlants
      .map((plant) => createPlantCardMarkup(plant, gardenPlantIds.has(plant.id)))
      .join("");
  }

  /**
   * Show a non-blocking toast message.
   * @param {string} message
   * @param {"success"|"warning"|"error"} [type="success"]
   */
  function showToast(message, type) {
    if (!dom.toastContainer) return;

    const variant = type || "success";
    const iconMap = {
      success: "✅",
      warning: "⚠️",
      error: "❌"
    };

    const toast = document.createElement("div");
    toast.className = `toast toast--${variant}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span aria-hidden="true">${iconMap[variant] || "ℹ️"}</span>
      <span>${escapeHtml(message)}</span>
    `;

    dom.toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function handleAddToGarden(plantId) {
    const plant = getCatalog().find((item) => item.id === plantId);
    const plantName = plant ? plant.name : plantId;

    if (!window.GardenStore || typeof window.GardenStore.addPlant !== "function") {
      showToast(
        "Chưa tìm thấy GardenStore (js/garden-store.js). Vui lòng tích hợp module Dashboard để lưu cây.",
        "error"
      );
      return;
    }

    const existedBefore = getExistingGardenPlantIds().has(plantId);

    try {
      const result = window.GardenStore.addPlant(plantId);

      const isExplicitFailure =
        result === false ||
        (result &&
          typeof result === "object" &&
          (result.ok === false ||
            result.success === false ||
            result.added === false ||
            result.duplicate === true));

      const isExplicitSuccess =
        result === true ||
        (result &&
          typeof result === "object" &&
          (result.ok === true ||
            result.success === true ||
            result.added === true ||
            Boolean(result.id || result.plantId)));

      if (isExplicitFailure || (!isExplicitSuccess && existedBefore)) {
        const duplicateMessage =
          result && typeof result === "object" && result.message
            ? result.message
            : `Cây "${plantName}" đã có trong khu vườn, không thêm trùng.`;
        showToast(duplicateMessage, "warning");
      } else {
        const successMessage =
          result && typeof result === "object" && result.message
            ? result.message
            : `Đã thêm "${plantName}" vào khu vườn của bạn!`;
        showToast(successMessage, "success");
      }

      renderPlants();
    } catch (error) {
      showToast(
        error && error.message
          ? error.message
          : `Không thể thêm "${plantName}" vào khu vườn.`,
        "error"
      );
    }
  }

  function setActiveCategory(category) {
    state.selectedCategory = category;
    dom.filterButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === category);
    });
    renderPlants();
  }

  function resetFilters() {
    state.searchQuery = "";
    if (dom.searchInput) {
      dom.searchInput.value = "";
    }
    if (dom.clearSearchBtn) {
      dom.clearSearchBtn.hidden = true;
    }
    setActiveCategory("all");
  }

  function setSidebarOpen(isOpen) {
    if (!dom.sidebar || !dom.sidebarBackdrop || !dom.sidebarToggle) return;
    dom.sidebar.classList.toggle("open", isOpen);
    dom.sidebarBackdrop.classList.toggle("open", isOpen);
    dom.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function bindEvents() {
    if (dom.searchInput) {
      dom.searchInput.addEventListener("input", (event) => {
        state.searchQuery = event.target.value;
        if (dom.clearSearchBtn) {
          dom.clearSearchBtn.hidden = state.searchQuery.length === 0;
        }
        renderPlants();
      });
    }

    if (dom.clearSearchBtn) {
      dom.clearSearchBtn.addEventListener("click", () => {
        state.searchQuery = "";
        dom.searchInput.value = "";
        dom.clearSearchBtn.hidden = true;
        dom.searchInput.focus();
        renderPlants();
      });
    }

    dom.filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setActiveCategory(btn.dataset.category || "all");
      });
    });

    if (dom.resetFiltersBtn) {
      dom.resetFiltersBtn.addEventListener("click", resetFilters);
    }

    if (dom.plantGrid) {
      dom.plantGrid.addEventListener("click", (event) => {
        const button = event.target.closest('[data-action="add-to-garden"]');
        if (!button) return;
        const plantId = button.dataset.plantId;
        if (plantId) {
          handleAddToGarden(plantId);
        }
      });
    }

    if (dom.sidebarToggle) {
      dom.sidebarToggle.addEventListener("click", () => {
        const isOpen = dom.sidebar.classList.contains("open");
        setSidebarOpen(!isOpen);
      });
    }

    if (dom.sidebarBackdrop) {
      dom.sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    });
  }

  function init() {
    bindEvents();
    renderPlants();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
