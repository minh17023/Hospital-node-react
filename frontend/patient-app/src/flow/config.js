export const FLOW_MODES = {
  bhyt: {
    id: "bhyt",
    title: "Đăng Ký Khám BHYT",
    requiresBhytValid: true,
    showSlotPicker: false,
    price: ({ basePrice, coverage = 1, copay = 0 }) => {
      const bhytPay = Math.round(basePrice * coverage);
      const patientPay = Math.max(0, basePrice - bhytPay + copay);
      return { total: patientPay, note: `BHYT chi trả ${coverage * 100}%` };
    },
    filterServices: (svc) => svc.isCoveredByBhyt === true,
  },
  service: {
    id: "service",
    title: "Khám Dịch Vụ",
    requiresBhytValid: false,
    showSlotPicker: false,
    price: ({ basePrice, surcharge = 0 }) => ({
      total: basePrice + surcharge,
      note: surcharge ? `Phụ thu ${surcharge.toLocaleString("vi-VN")}đ` : "",
    }),
    filterServices: () => true,
  },
  booking: {
    id: "booking",
    title: "Đặt Lịch Hẹn",
    requiresBhytValid: false,
    showSlotPicker: true,
    price: ({ basePrice, deposit = 0 }) => ({
      total: basePrice, deposit,
      note: deposit ? `Cọc ${deposit.toLocaleString("vi-VN")}đ` : "",
    }),
    filterServices: () => true,
  },
};
