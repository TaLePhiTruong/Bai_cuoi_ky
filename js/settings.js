/**
 * Urban Garden - Settings Page Logic
 * File: js/settings.js
 * 
 * Chức năng:
 * 1. Đọc và lưu trữ dữ liệu cài đặt qua LocalStorage với key 'ugarden_settings'.
 * 2. Cung cấp dữ liệu mặc định nếu chưa có dữ liệu trong LocalStorage.
 * 3. Validate form (Tên người dùng, tên khu vườn, email hợp lệ).
 * 4. Hiển thị thông báo lưu thành công (Toast notification).
 * 5. Tự động hiển thị lại dữ liệu khi tải lại trang (reload).
 * 6. Xử lý đóng/mở thanh điều hướng Sidebar trên thiết bị di động.
 */

// Định danh key lưu trữ trong LocalStorage theo đặc tả
const STORAGE_KEY = 'ugarden_settings';

// Dữ liệu mặc định khi người dùng lần đầu truy cập hệ thống
const DEFAULT_SETTINGS = {
  displayName: 'Nguyễn Văn An',
  gardenName: 'Vườn Ban Công Xanh',
  city: 'Hồ Chí Minh',
  email: 'nguyenvanan@example.com',
  remindersEnabled: true
};

// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  initSettingsPage();
});

/**
 * Khởi tạo toàn bộ chức năng trang Settings
 */
function initSettingsPage() {
  // Lấy các phần tử DOM
  const form = document.getElementById('settingsForm');
  const inputDisplayName = document.getElementById('displayName');
  const inputGardenName = document.getElementById('gardenName');
  const selectCity = document.getElementById('city');
  const inputEmail = document.getElementById('email');
  const checkReminders = document.getElementById('remindersEnabled');

  // DOM hiển thị profile tóm tắt
  const topbarDisplayName = document.getElementById('topbarDisplayName');
  const topbarAvatar = document.getElementById('topbarAvatar');
  const profileOverviewAvatar = document.getElementById('profileOverviewAvatar');
  const profileOverviewName = document.getElementById('profileOverviewName');
  const profileOverviewCity = document.getElementById('profileOverviewCity');
  const profileOverviewGarden = document.getElementById('profileOverviewGarden');

  // DOM Toast notification
  const toast = document.getElementById('successToast');
  const toastCloseBtn = document.getElementById('toastCloseBtn');
  let toastTimeout = null;

  // DOM Mobile Sidebar Toggle
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  /**
   * 1. ĐỌC DỮ LIỆU TỪ LOCALSTORAGE
   * Trả về dữ liệu đã lưu hoặc dữ liệu mặc định nếu chưa tồn tại
   */
  function getStoredSettings() {
    try {
      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) {
        return { ...DEFAULT_SETTINGS };
      }
      const parsedData = JSON.parse(rawData);
      // Đảm bảo có đầy đủ các trường
      return {
        displayName: parsedData.displayName || DEFAULT_SETTINGS.displayName,
        gardenName: parsedData.gardenName || DEFAULT_SETTINGS.gardenName,
        city: parsedData.city || DEFAULT_SETTINGS.city,
        email: parsedData.email || DEFAULT_SETTINGS.email,
        remindersEnabled: typeof parsedData.remindersEnabled === 'boolean' 
          ? parsedData.remindersEnabled 
          : DEFAULT_SETTINGS.remindersEnabled
      };
    } catch (error) {
      console.warn('Lỗi khi đọc LocalStorage, sử dụng dữ liệu mặc định:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Cập nhật chữ viết tắt Avatar (Initial letter)
   */
  function getInitials(name) {
    if (!name || typeof name !== 'string') return 'U';
    const trimmed = name.trim();
    if (!trimmed) return 'U';
    const words = trimmed.split(' ');
    const lastWord = words[words.length - 1];
    return lastWord.charAt(0).toUpperCase();
  }

  /**
   * 2. ĐIỀN DỮ LIỆU VÀO FORM & CẬP NHẬT GIAO DIỆN HIỂN THỊ
   */
  function populateForm(data) {
    inputDisplayName.value = data.displayName;
    inputGardenName.value = data.gardenName;
    selectCity.value = data.city;
    inputEmail.value = data.email;
    checkReminders.checked = Boolean(data.remindersEnabled);

    // Cập nhật giao diện trực quan ngoài form
    const initial = getInitials(data.displayName);
    if (topbarDisplayName) topbarDisplayName.textContent = data.displayName;
    if (topbarAvatar) topbarAvatar.textContent = initial;
    if (profileOverviewAvatar) profileOverviewAvatar.textContent = initial;
    if (profileOverviewName) profileOverviewName.textContent = data.displayName;
    if (profileOverviewCity) profileOverviewCity.textContent = data.city;
    if (profileOverviewGarden) profileOverviewGarden.textContent = data.gardenName;
  }

  // Tải dữ liệu ban đầu
  const initialData = getStoredSettings();
  populateForm(initialData);

  /**
   * 3. XỬ LÝ TOAST THÔNG BÁO THÀNH CÔNG
   */
  function showToast(message = 'Thông tin cài đặt đã được lưu thành công.') {
    if (!toast) return;

    const messageEl = document.getElementById('toastMessage');
    if (messageEl) messageEl.textContent = message;

    toast.classList.add('show');

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    // Tự động ẩn thông báo sau 3.5 giây
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  function hideToast() {
    if (toast) {
      toast.classList.remove('show');
    }
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
  }

  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', hideToast);
  }

  /**
   * 4. VALIDATE DỮ LIỆU ĐẦU VÀO
   */
  function validateForm() {
    let isValid = true;
    let firstInvalidField = null;

    // Reset trạng thái lỗi
    [inputDisplayName, inputGardenName, inputEmail].forEach(input => {
      input.classList.remove('is-invalid');
    });

    // A. Validate Tên người dùng (không rỗng, tối thiểu 2 ký tự)
    const displayNameValue = inputDisplayName.value.trim();
    if (displayNameValue.length < 2) {
      inputDisplayName.classList.add('is-invalid');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = inputDisplayName;
    }

    // B. Validate Tên khu vườn (không rỗng)
    const gardenNameValue = inputGardenName.value.trim();
    if (gardenNameValue.length === 0) {
      inputGardenName.classList.add('is-invalid');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = inputGardenName;
    }

    // C. Validate Email hợp lệ
    const emailValue = inputEmail.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      inputEmail.classList.add('is-invalid');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = inputEmail;
    }

    if (!isValid && firstInvalidField) {
      firstInvalidField.focus();
    }

    return isValid;
  }

  // Tự động xóa lỗi khi người dùng chỉnh sửa ô nhập liệu
  [inputDisplayName, inputGardenName, inputEmail].forEach(input => {
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) {
        input.classList.remove('is-invalid');
      }
    });
  });

  /**
   * 5. BẮT SỰ KIỆN SUBMIT FORM & LƯU VÀO LOCALSTORAGE
   */
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Chuẩn bị dữ liệu theo đúng cấu trúc yêu cầu
    const settingsData = {
      displayName: inputDisplayName.value.trim(),
      gardenName: inputGardenName.value.trim(),
      city: selectCity.value,
      email: inputEmail.value.trim(),
      remindersEnabled: checkReminders.checked
    };

    // Lưu vào LocalStorage dưới định dạng JSON
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsData));
      
      // Cập nhật lại UI hiển thị thông tin
      populateForm(settingsData);

      // Hiển thị thông báo lưu thành công
      showToast('Cài đặt hệ thống đã được cập nhật thành công!');
    } catch (err) {
      console.error('Không thể lưu cài đặt vào LocalStorage:', err);
      alert('Đã xảy ra lỗi khi lưu trữ dữ liệu vào trình duyệt.');
    }
  });

  /**
   * 6. XỬ LÝ SIDEBAR CHO THIẾT BỊ DI ĐỘNG (RESPONSIVE DRAWER)
   */
  if (menuToggle && sidebar && sidebarBackdrop) {
    const openSidebar = () => {
      sidebar.classList.add('open');
      sidebarBackdrop.classList.add('active');
    };

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    };

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    sidebarBackdrop.addEventListener('click', closeSidebar);

    // Đóng sidebar khi nhấn phím ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeSidebar();
      }
    });
  }
}
