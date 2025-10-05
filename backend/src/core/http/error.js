export class AppError extends Error {
  constructor(status = 500, message = "Server error") {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = { message: err.message || "Server error" };
  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}