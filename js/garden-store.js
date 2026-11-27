(function (global) {
  'use strict';

  const STORAGE_KEY = 'ugarden_plants';

  const DEFAULT_PLANT_CATALOG = [
    {
      id: 'cherry-tomato',
      name: 'Cà chua bi',
      icon: '🍅',
      wateringDays: 2,
      fertilizingDays: 14,
      idealMoisture: 70,
      defaultLocation: 'Ban công hướng Nam'
    },
    {
      id: 'basil',
      name: 'Húng quế',
      icon: '🌿',
      wateringDays: 1,
      fertilizingDays: 10,
      idealMoisture: 65,
      defaultLocation: 'Bệ cửa sổ bếp'
    },
    {
      id: 'lettuce',
      name: 'Xà lách thủy canh',
      icon: '🥬',
      wateringDays: 2,
      fertilizingDays: 7,
      idealMoisture: 75,
      defaultLocation: 'Kệ rau tầng 1'
    },
    {
      id: 'mint',
      name: 'Bạc hà',
      icon: '🌱',
      wateringDays: 2,
      fertilizingDays: 14,
      idealMoisture: 68,
      defaultLocation: 'Ban công hướng Đông'
    },
    {
      id: 'aloe-vera',
      name: 'Nha đam',
      icon: '🪴',
      wateringDays: 7,
      fertilizingDays: 30,
      idealMoisture: 40,
      defaultLocation: 'Góc nắng phòng khách'
    },
    {
      id: 'strawberry',
      name: 'Dâu tây đô thị',
      icon: '🍓',
      wateringDays: 2,
      fertilizingDays: 10,
      idealMoisture: 72,
      defaultLocation: 'Chậu treo ban công'
    }
  ];

  function daysAgoIso(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  const DEFAULT_INITIAL_GARDEN = [
    {
      id: 'garden-1',
      plantId: 'cherry-tomato',
      nickname: 'Cà chua bi Ban công',
      location: 'Ban công hướng Nam',
      moisture: 38,
      health: 86,
      plantedAt: daysAgoIso(25),
      lastWateredAt: daysAgoIso(3),
      lastFertilizedAt: daysAgoIso(6)
    },
    {
      id: 'garden-2',
      plantId: 'basil',
      nickname: 'Húng quế Bếp Xanh',
      location: 'Bệ cửa sổ bếp',
      moisture: 72,
      health: 82,
      plantedAt: daysAgoIso(18),
      lastWateredAt: daysAgoIso(0.2),
      lastFertilizedAt: daysAgoIso(12)
    },
    {
      id: 'garden-3',
      plantId: 'lettuce',
      nickname: 'Xà lách Khay 01',
      location: 'Kệ rau tầng 1',
      moisture: 78,
      health: 94,
      plantedAt: daysAgoIso(12),
      lastWateredAt: daysAgoIso(0.5),
      lastFertilizedAt: daysAgoIso(2)
    },
    {
      id: 'garden-4',
      plantId: 'strawberry',
      nickname: 'Dâu tây Chậu treo',
      location: 'Chậu treo ban công',
      moisture: 44,
      health: 68,
      plantedAt: daysAgoIso(10),
      lastWateredAt: null,
      lastFertilizedAt: null
    }
  ];

  // Chỉ khởi tạo dữ liệu mẫu khi dự án chưa nạp sẵn từ file dùng chung.
  if (!global.PLANT_CATALOG) {
    global.PLANT_CATALOG = DEFAULT_PLANT_CATALOG;
  }

  if (!global.INITIAL_GARDEN) {
    global.INITIAL_GARDEN = DEFAULT_INITIAL_GARDEN;
  }

  /**
   * Chuẩn hóa PLANT_CATALOG về dạng mảng dù nguồn là Array hay Object.
   */
  function getCatalogList() {
    const catalog = global.PLANT_CATALOG;
    if (Array.isArray(catalog)) {
      return catalog;
    }
    if (catalog && typeof catalog === 'object') {
      return Object.values(catalog);
    }
    return DEFAULT_PLANT_CATALOG;
  }

  function findCatalogPlant(plantId) {
    if (!plantId) {
      return null;
    }
    const catalog = global.PLANT_CATALOG;
    if (catalog && !Array.isArray(catalog) && typeof catalog === 'object' && catalog[plantId]) {
      return catalog[plantId];
    }
    return getCatalogList().find((item) => item.id === plantId || item.plantId === plantId) || null;
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Lấy danh sách cây từ LocalStorage (khởi tạo từ INITIAL_GARDEN nếu chưa có).
   * @returns {Array<Object>}
   */
  function getPlants() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        const initial = Array.isArray(global.INITIAL_GARDEN)
          ? cloneData(global.INITIAL_GARDEN)
          : cloneData(DEFAULT_INITIAL_GARDEN);
        savePlants(initial);
        return initial;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.error('Không thể đọc dữ liệu cây từ LocalStorage:', error);
    }

    const fallback = Array.isArray(global.INITIAL_GARDEN)
      ? cloneData(global.INITIAL_GARDEN)
      : cloneData(DEFAULT_INITIAL_GARDEN);
    savePlants(fallback);
    return fallback;
  }

  /**
   * Lưu danh sách cây vào LocalStorage dưới dạng JSON.
   * @param {Array<Object>} plants
   * @returns {Array<Object>}
   */
  function savePlants(plants) {
    const safePlants = Array.isArray(plants) ? plants : [];
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(safePlants));
    } catch (error) {
      console.error('Không thể lưu dữ liệu cây vào LocalStorage:', error);
    }
    return safePlants;
  }

  /**
   * Thêm cây mới vào vườn dựa trên plantId trong PLANT_CATALOG.
   * Không thêm trùng nếu cây có plantId tương ứng đã tồn tại.
   * @param {string} plantId
   * @returns {Object|null}
   */
  function addPlant(plantId) {
    const catalogItem = findCatalogPlant(plantId);
    if (!catalogItem) {
      return null;
    }

    const resolvedPlantId = catalogItem.id || catalogItem.plantId || plantId;
    const plants = getPlants();
    const isDuplicate = plants.some(
      (plant) => plant.plantId === resolvedPlantId || plant.plantId === plantId
    );
    if (isDuplicate) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const newPlant = {
      id: `plant-${resolvedPlantId}-${Date.now()}`,
      plantId: resolvedPlantId,
      nickname: catalogItem.name || resolvedPlantId,
      location: catalogItem.defaultLocation || 'Khu vườn ban công',
      moisture: typeof catalogItem.idealMoisture === 'number' ? catalogItem.idealMoisture : 70,
      health: 90,
      plantedAt: nowIso,
      lastWateredAt: nowIso,
      lastFertilizedAt: nowIso
    };

    const updatedPlants = [...plants, newPlant];
    savePlants(updatedPlants);
    return newPlant;
  }

  /**
   * Cập nhật lịch sử chăm sóc ("water" hoặc "fertilize") theo id cây.
   * @param {string|number} id
   * @param {"water"|"fertilize"} careType
   * @returns {Object|null}
   */
  function updateCare(id, careType) {
    if (careType !== 'water' && careType !== 'fertilize') {
      return null;
    }
    if (id === undefined || id === null || id === '') {
      return null;
    }

    const plants = getPlants();
    const targetId = String(id);
    const index = plants.findIndex((plant) => String(plant.id) === targetId);
    if (index === -1) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const target = plants[index];
    const updatedPlant = { ...target };

    if (careType === 'water') {
      updatedPlant.lastWateredAt = nowIso;
      const currentMoisture = Number(target.moisture) || 0;
      updatedPlant.moisture = Math.min(100, Math.max(currentMoisture + 25, 78));
    } else if (careType === 'fertilize') {
      updatedPlant.lastFertilizedAt = nowIso;
      const currentHealth = Number(target.health) || 0;
      updatedPlant.health = Math.min(100, currentHealth + 10);
    }

    const nextPlants = plants.map((plant, idx) => (idx === index ? updatedPlant : plant));
    savePlants(nextPlants);
    return updatedPlant;
  }

  global.GardenStore = {
    getPlants,
    savePlants,
    addPlant,
    updateCare
  };
})(window);
