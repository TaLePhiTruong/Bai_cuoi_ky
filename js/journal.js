(function () {
  "use strict";

  const STORAGE_KEY = "ugarden_journal";
  const MAX_IMAGE_BYTES = 700 * 1024; // 700KB

  let currentImageDataUrl = "";
  let toastTimerId = null;

  const elements = {
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    openSidebarBtn: document.getElementById("openSidebarBtn"),
    closeSidebarBtn: document.getElementById("closeSidebarBtn"),
    form: document.getElementById("journalForm"),
    plantSelect: document.getElementById("plantSelect"),
    catalogNotice: document.getElementById("catalogNotice"),
    journalDate: document.getElementById("journalDate"),
    journalNote: document.getElementById("journalNote"),
    journalImage: document.getElementById("journalImage"),
    imagePreviewBox: document.getElementById("imagePreviewBox"),
    imagePreview: document.getElementById("imagePreview"),
    removeImageBtn: document.getElementById("removeImageBtn"),
    plantError: document.getElementById("plantError"),
    dateError: document.getElementById("dateError"),
    noteError: document.getElementById("noteError"),
    imageError: document.getElementById("imageError"),
    statusToast: document.getElementById("statusToast"),
    journalTimeline: document.getElementById("journalTimeline"),
    journalEmptyState: document.getElementById("journalEmptyState"),
    journalCountBadge: document.getElementById("journalCountBadge")
  };

  /**
   * Lấy danh mục cây từ window.PLANT_CATALOG.
   * @returns {Array<{id: string, name: string}>}
   */
  function getPlantCatalog() {
    if (!Array.isArray(window.PLANT_CATALOG)) {
      return [];
    }

    return window.PLANT_CATALOG
      .filter((item) => item && (item.id !== undefined && item.id !== null))
      .map((item) => ({
        id: String(item.id),
        name: String(item.name || item.plantName || item.title || item.id)
      }));
  }

  /**
   * Đổ danh sách cây từ window.PLANT_CATALOG vào thẻ select.
   */
  function populatePlantSelect() {
    const catalog = getPlantCatalog();
    const select = elements.plantSelect;

    select.innerHTML = '<option value="">-- Chọn loại cây --</option>';

    if (catalog.length === 0) {
      elements.catalogNotice.textContent =
        "Chưa có dữ liệu cây từ window.PLANT_CATALOG.";
      elements.catalogNotice.hidden = false;
      return;
    }

    elements.catalogNotice.hidden = true;

    const optionsHtml = catalog
      .map(
        (plant) =>
          `<option value="${escapeHtml(plant.id)}">${escapeHtml(plant.name)}</option>`
      )
      .join("");

    select.insertAdjacentHTML("beforeend", optionsHtml);
  }

  /**
   * Đọc danh sách nhật ký từ LocalStorage.
   * @returns {Array<Object>}
   */
  function loadJournalEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Lưu danh sách nhật ký vào LocalStorage.
   * @param {Array<Object>} entries
   * @returns {boolean}
   */
  function saveJournalEntries(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      showToast(
        "Không thể lưu dữ liệu do bộ nhớ trình duyệt (LocalStorage) đã đầy.",
        "error"
      );
      return false;
    }
  }

  /**
   * Đặt ngày mặc định là hôm nay cho input date.
   */
  function setDefaultDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    elements.journalDate.value = `${year}-${month}-${day}`;
  }

  /**
   * Kiểm tra chuỗi ngày YYYY-MM-DD có hợp lệ hay không.
   * @param {string} dateStr
   * @returns {boolean}
   */
  function isValidDateString(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return false;
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);

    return (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    );
  }

  /**
   * Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY để hiển thị.
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDisplayDate(dateStr) {
    if (!isValidDateString(dateStr)) {
      return dateStr || "";
    }
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  /**
   * Escape ký tự đặc biệt tránh lỗi XSS khi render HTML.
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
   * Hiển thị hoặc ẩn lỗi từng trường dữ liệu.
   */
  function setFieldError(inputEl, errorEl, message) {
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      if (inputEl) {
        inputEl.classList.add("is-invalid");
      }
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
      if (inputEl) {
        inputEl.classList.remove("is-invalid");
      }
    }
  }

  function clearAllErrors() {
    setFieldError(elements.plantSelect, elements.plantError, "");
    setFieldError(elements.journalDate, elements.dateError, "");
    setFieldError(elements.journalNote, elements.noteError, "");
    setFieldError(elements.journalImage, elements.imageError, "");
  }

  /**
   * Hiển thị thông báo trạng thái.
   * @param {string} message
   * @param {"success" | "error"} type
   */
  function showToast(message, type) {
    if (toastTimerId) {
      clearTimeout(toastTimerId);
    }

    elements.statusToast.textContent = message;
    elements.statusToast.className = `status-toast ${type}`;
    elements.statusToast.hidden = false;

    toastTimerId = setTimeout(() => {
      elements.statusToast.hidden = true;
    }, 3500);
  }

  /**
   * Xóa ảnh preview hiện tại và reset input file.
   */
  function clearImageSelection() {
    currentImageDataUrl = "";
    elements.journalImage.value = "";
    elements.imagePreview.src = "";
    elements.imagePreviewBox.hidden = true;
  }

  /**
   * Xử lý chọn file ảnh, kiểm tra định dạng/kích thước và đọc Data URL bằng FileReader.
   */
  function handleImageChange(event) {
    const file = event.target.files && event.target.files[0];
    setFieldError(elements.journalImage, elements.imageError, "");

    if (!file) {
      clearImageSelection();
      return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
      clearImageSelection();
      setFieldError(
        elements.journalImage,
        elements.imageError,
        "Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP...)."
      );
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      clearImageSelection();
      setFieldError(
        elements.journalImage,
        elements.imageError,
        "Kích thước ảnh vượt quá 700KB. Vui lòng chọn ảnh nhỏ hơn."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = function (loadEvent) {
      const result = loadEvent.target && loadEvent.target.result;
      if (typeof result === "string" && result.startsWith("data:image/")) {
        currentImageDataUrl = result;
        elements.imagePreview.src = result;
        elements.imagePreviewBox.hidden = false;
      } else {
        clearImageSelection();
        setFieldError(
          elements.journalImage,
          elements.imageError,
          "Không thể đọc tệp hình ảnh đã chọn."
        );
      }
    };

    reader.onerror = function () {
      clearImageSelection();
      setFieldError(
        elements.journalImage,
        elements.imageError,
        "Đã xảy ra lỗi khi đọc ảnh từ thiết bị."
      );
    };

    reader.readAsDataURL(file);
  }

  /**
   * Lấy tên cây hiển thị từ bản ghi hoặc tra cứu lại trong window.PLANT_CATALOG.
   * @param {Object} entry
   * @param {Map<string, string>} plantMap
   * @returns {string}
   */
  function resolvePlantName(entry, plantMap) {
    const catalogName = plantMap.get(String(entry.plantId));
    if (catalogName) {
      return catalogName;
    }
    return entry.plantName || String(entry.plantId || "Cây trồng");
  }

  /**
   * Sắp xếp bản ghi mới nhất lên trước theo ngày ghi nhận.
   * @param {Array<Object>} entries
   * @returns {Array<Object>}
   */
  function sortEntriesNewestFirst(entries) {
    return entries
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => {
        const dateA = String(a.entry.date || "");
        const dateB = String(b.entry.date || "");
        if (dateB !== dateA) {
          return dateB.localeCompare(dateA);
        }
        return b.index - a.index;
      })
      .map((item) => item.entry);
  }

  /**
   * Render danh sách nhật ký ra giao diện Timeline bằng Array.prototype.map().
   */
  function renderJournalList() {
    const entries = loadJournalEntries();
    const catalog = getPlantCatalog();
    const plantMap = new Map(catalog.map((plant) => [plant.id, plant.name]));

    elements.journalCountBadge.textContent = `${entries.length} ghi chép`;

    if (entries.length === 0) {
      elements.journalTimeline.innerHTML = "";
      elements.journalEmptyState.hidden = false;
      return;
    }

    elements.journalEmptyState.hidden = true;

    const sortedEntries = sortEntriesNewestFirst(entries);

    const timelineHtml = sortedEntries
      .map((entry) => {
        const safeId = escapeHtml(entry.id);
        const safePlantName = escapeHtml(resolvePlantName(entry, plantMap));
        const safeDate = escapeHtml(formatDisplayDate(entry.date));
        const safeNote = escapeHtml(entry.note || "");
        const hasValidImage =
          typeof entry.imageDataUrl === "string" &&
          entry.imageDataUrl.startsWith("data:image/");

        const imageBlock = hasValidImage
          ? `
            <div class="timeline-image-wrap">
              <img
                src="${escapeHtml(entry.imageDataUrl)}"
                alt="Hình ảnh ${safePlantName} ngày ${safeDate}"
                class="timeline-image"
                loading="lazy"
              >
            </div>
          `
          : "";

        return `
          <article class="timeline-item" data-id="${safeId}">
            <span class="timeline-marker" aria-hidden="true"></span>
            <div class="card timeline-card">
              <div class="timeline-card-top">
                <div class="timeline-meta">
                  <span class="plant-tag">${safePlantName}</span>
                  <time class="entry-date" datetime="${escapeHtml(entry.date || "")}">${safeDate}</time>
                </div>
                <button
                  type="button"
                  class="btn-delete"
                  data-action="delete"
                  data-id="${safeId}"
                  aria-label="Xóa nhật ký ngày ${safeDate}"
                >
                  Xóa
                </button>
              </div>
              <div class="timeline-body">
                ${imageBlock}
                <p class="timeline-note">${safeNote}</p>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    elements.journalTimeline.innerHTML = timelineHtml;
  }

  /**
   * Tạo mã định danh duy nhất cho mỗi bản ghi.
   * @returns {string}
   */
  function generateEntryId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `jrn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Xử lý submit form thêm nhật ký.
   */
  function handleFormSubmit(event) {
    event.preventDefault();
    clearAllErrors();

    const plantId = elements.plantSelect.value.trim();
    const dateValue = elements.journalDate.value.trim();
    const noteValue = elements.journalNote.value.trim();

    let isValid = true;

    if (!plantId) {
      setFieldError(
        elements.plantSelect,
        elements.plantError,
        "Vui lòng chọn loại cây."
      );
      isValid = false;
    }

    if (!isValidDateString(dateValue)) {
      setFieldError(
        elements.journalDate,
        elements.dateError,
        "Vui lòng nhập ngày ghi nhận hợp lệ."
      );
      isValid = false;
    }

    if (!noteValue) {
      setFieldError(
        elements.journalNote,
        elements.noteError,
        "Ghi chú không được để trống."
      );
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    const catalog = getPlantCatalog();
    const selectedPlant = catalog.find((plant) => plant.id === plantId);
    const selectedOptionText =
      elements.plantSelect.options[elements.plantSelect.selectedIndex]?.textContent ||
      "";
    const plantName = selectedPlant ? selectedPlant.name : selectedOptionText;

    const newEntry = {
      id: generateEntryId(),
      plantId: plantId,
      plantName: plantName,
      date: dateValue,
      note: noteValue,
      imageDataUrl: currentImageDataUrl
    };

    const entries = loadJournalEntries();
    entries.push(newEntry);

    if (!saveJournalEntries(entries)) {
      return;
    }

    elements.form.reset();
    setDefaultDate();
    clearImageSelection();
    renderJournalList();
    showToast("Đã lưu nhật ký tăng trưởng thành công!", "success");
  }

  /**
   * Xử lý sự kiện xóa nhật ký trên Timeline.
   */
  function handleTimelineClick(event) {
    const deleteBtn = event.target.closest('button[data-action="delete"]');
    if (!deleteBtn) {
      return;
    }

    const entryId = deleteBtn.getAttribute("data-id");
    if (!entryId) {
      return;
    }

    const entries = loadJournalEntries();
    const updatedEntries = entries.filter((entry) => String(entry.id) !== entryId);

    if (saveJournalEntries(updatedEntries)) {
      renderJournalList();
      showToast("Đã xóa nhật ký.", "success");
    }
  }

  /**
   * Đóng/mở sidebar trên màn hình nhỏ.
   */
  function toggleSidebar(open) {
    elements.sidebar.classList.toggle("is-open", open);
    elements.sidebarBackdrop.classList.toggle("is-visible", open);
    elements.openSidebarBtn.setAttribute("aria-expanded", String(open));
  }

  /**
   * Khởi tạo các sự kiện và dữ liệu ban đầu.
   */
  function init() {
    populatePlantSelect();
    setDefaultDate();
    renderJournalList();

    elements.form.addEventListener("submit", handleFormSubmit);
    elements.journalImage.addEventListener("change", handleImageChange);
    elements.removeImageBtn.addEventListener("click", () => {
      clearImageSelection();
      setFieldError(elements.journalImage, elements.imageError, "");
    });
    elements.journalTimeline.addEventListener("click", handleTimelineClick);

    elements.plantSelect.addEventListener("change", () =>
      setFieldError(elements.plantSelect, elements.plantError, "")
    );
    elements.journalDate.addEventListener("input", () =>
      setFieldError(elements.journalDate, elements.dateError, "")
    );
    elements.journalNote.addEventListener("input", () =>
      setFieldError(elements.journalNote, elements.noteError, "")
    );

    elements.openSidebarBtn.addEventListener("click", () => toggleSidebar(true));
    elements.closeSidebarBtn.addEventListener("click", () => toggleSidebar(false));
    elements.sidebarBackdrop.addEventListener("click", () => toggleSidebar(false));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
