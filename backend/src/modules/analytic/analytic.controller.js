import { AnalyticService, DoctorStatsService } from "./analytic.service.js";

export const AnalyticController = {
  // GET /analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
  // or ?year=2025&month=10
  // or ?year=2025
  async summary(req, res, next) {
    try {
      const { from, to, year, month } = req.query;
      const view = await AnalyticService.summary({
        from, to,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
      });
      res.json(view);
    } catch (e) {
      next(e);
    }
  },
};

export const DoctorStatsController = {
  // GET /doctor/appointments/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&maBacSi=BS00000001
  async stats(req, res, next) {
    try {
      const ctx = {
        role: req.user?.role,
        maBacSi: req.user?.maBacSi, // nếu đăng nhập map với bác sĩ
      };
      const view = await DoctorStatsService.stats(req.query || {}, ctx);
      res.json(view);
    } catch (e) {
      next(e);
    }
  },
};
