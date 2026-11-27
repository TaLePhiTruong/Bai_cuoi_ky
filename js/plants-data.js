/**
 * Shared plant catalog and initial garden sample data for Urban Garden.
 * Used across Dashboard, Plant Library, and Growth Journal pages.
 */
(function (global) {
  "use strict";

  /**
   * Build an ISO timestamp relative to the current date.
   * Prevents hardcoded sample dates from becoming stale over time.
   * @param {number} daysAgo
   * @param {number} [hoursAgo=0]
   * @returns {string}
   */
  function createRelativeDate(daysAgo, hoursAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    if (typeof hoursAgo === "number" && hoursAgo !== 0) {
      date.setHours(date.getHours() - hoursAgo);
    }
    return date.toISOString();
  }

  /**
   * Master catalog of urban garden plants.
   */
  global.PLANT_CATALOG = [
    {
      id: "tomato",
      name: "Cà chua",
      category: "Rau ăn quả",
      icon: "🍅",
      description: "Cà chua trồng phù hợp ở ban công, dễ chăm sóc và cho quả quanh năm.",
      sunlight: "6-8 giờ/ngày",
      idealMoisture: "60-70%",
      wateringDays: 2,
      fertilizingDays: 14,
      tips: "Tưới gốc vào sáng sớm, làm giàn leo và đảm bảo đất thoát nước tốt."
    },
    {
      id: "mustard-greens",
      name: "Rau cải",
      category: "Rau ăn lá",
      icon: "🥬",
      description: "Rau cải xanh phát triển nhanh, thu hoạch sau 25-35 ngày trồng chậu.",
      sunlight: "4-6 giờ/ngày",
      idealMoisture: "65-75%",
      wateringDays: 1,
      fertilizingDays: 10,
      tips: "Giữ đất ẩm đều, tỉa bớt cây con để chậu thông thoáng và ít sâu bệnh."
    },
    {
      id: "lettuce",
      name: "Xà lách",
      category: "Rau ăn lá",
      icon: "🥗",
      description: "Xà lách giòn ngọt, ưa khí hậu mát và thích hợp trồng khay nông.",
      sunlight: "4-5 giờ/ngày",
      idealMoisture: "60-75%",
      wateringDays: 1,
      fertilizingDays: 12,
      tips: "Tránh nắng gắt buổi trưa, tưới phun sương nhẹ vào sáng và chiều mát."
    },
    {
      id: "chili",
      name: "Ớt",
      category: "Rau ăn quả",
      icon: "🌶️",
      description: "Ớt chỉ thiên sống khỏe, chịu nắng tốt và đậu quả liên tục trên sân thượng.",
      sunlight: "6-8 giờ/ngày",
      idealMoisture: "55-65%",
      wateringDays: 2,
      fertilizingDays: 14,
      tips: "Không để đất úng nước, bổ sung kali khi cây bắt đầu ra hoa kết trái."
    },
    {
      id: "basil",
      name: "Húng quế",
      category: "Cây gia vị",
      icon: "🌿",
      description: "Húng quế thơm nồng, dễ nhân giống bằng cành và ít tốn diện tích.",
      sunlight: "5-6 giờ/ngày",
      idealMoisture: "55-65%",
      wateringDays: 2,
      fertilizingDays: 15,
      tips: "Ngắt ngọn thường xuyên để cây đẻ nhánh nhiều và hạn chế ra hoa sớm."
    },
    {
      id: "cucumber",
      name: "Dưa leo",
      category: "Rau ăn quả",
      icon: "🥒",
      description: "Dưa leo leo giàn gọn gàng, cho trái giòn mát chỉ sau 45-50 ngày.",
      sunlight: "6-8 giờ/ngày",
      idealMoisture: "65-75%",
      wateringDays: 1,
      fertilizingDays: 10,
      tips: "Chuẩn bị lưới leo chắc chắn, tưới đủ ẩm khi cây ra hoa và nuôi quả."
    },
    {
      id: "water-spinach",
      name: "Rau muống",
      category: "Rau ăn lá",
      icon: "🌱",
      description: "Rau muống rất dễ trồng trong thùng xốp, tái sinh nhanh sau mỗi lần cắt.",
      sunlight: "5-7 giờ/ngày",
      idealMoisture: "70-85%",
      wateringDays: 1,
      fertilizingDays: 10,
      tips: "Ưa ẩm cao và đất giàu dinh dưỡng; cắt cách gốc 5cm để cây ra đợt mới."
    },
    {
      id: "green-onion",
      name: "Hành lá",
      category: "Cây gia vị",
      icon: "🧅",
      description: "Hành lá dễ trồng lại từ gốc hành tươi, thu hoạch tỉa lá dùng hàng ngày.",
      sunlight: "4-6 giờ/ngày",
      idealMoisture: "55-65%",
      wateringDays: 2,
      fertilizingDays: 14,
      tips: "Dùng đất tơi xốp thoát nước nhanh để tránh thối củ và vàng đầu lá."
    },
    {
      id: "mint",
      name: "Bạc hà",
      category: "Cây gia vị",
      icon: "🍃",
      description: "Bạc hà tỏa hương mát dịu, thích hợp trồng chậu treo hoặc góc bán râm.",
      sunlight: "3-5 giờ/ngày",
      idealMoisture: "65-75%",
      wateringDays: 1,
      fertilizingDays: 14,
      tips: "Trồng riêng chậu vì rễ lan nhanh; cắt tỉa ngọn đều giúp lá xanh mướt."
    }
  ];

  /**
   * Default sample plants currently growing in the user's garden.
   */
  global.INITIAL_GARDEN = [
    {
      id: "garden-tomato-1",
      plantId: "tomato",
      nickname: "Cà chua bi ban công",
      location: "Ban công hướng Đông",
      moisture: 64,
      health: "Tốt",
      plantedAt: createRelativeDate(28),
      lastWateredAt: createRelativeDate(1, 4),
      lastFertilizedAt: createRelativeDate(9)
    },
    {
      id: "garden-lettuce-1",
      plantId: "lettuce",
      nickname: "Khay xà lách giòn",
      location: "Kệ cửa sổ tầng 2",
      moisture: 71,
      health: "Khỏe mạnh",
      plantedAt: createRelativeDate(16),
      lastWateredAt: createRelativeDate(0, 6),
      lastFertilizedAt: createRelativeDate(6)
    },
    {
      id: "garden-basil-1",
      plantId: "basil",
      nickname: "Chậu húng quế bếp",
      location: "Bệ cửa sổ bếp",
      moisture: 52,
      health: "Cần tưới",
      plantedAt: createRelativeDate(22),
      lastWateredAt: createRelativeDate(2, 2),
      lastFertilizedAt: createRelativeDate(12)
    },
    {
      id: "garden-chili-1",
      plantId: "chili",
      nickname: "Ớt chỉ thiên sân thượng",
      location: "Sân thượng",
      moisture: 60,
      health: "Tốt",
      plantedAt: createRelativeDate(35),
      lastWateredAt: createRelativeDate(1, 8),
      lastFertilizedAt: createRelativeDate(11)
    }
  ];
})(window);
