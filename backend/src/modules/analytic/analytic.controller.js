import { AnalyticService } from "./analytic.service.js";

export const AnalyticController = {
  // GET /analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
  // or ?year=2025&month=10
  // or ?year=2025
  async summary(req, res, next) {
    try {
      const { from, to, year, month } = req.query;
      const view = await AnalyticService.summary({
        from, to, year: year ? Number(year) : undefined, month: month ? Number(month) : undefined
      });
      res.json(view);
    } catch (e) {
      next(e);
    }
  },
};
