import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    name: process.env.DB_NAME
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expires: process.env.JWT_EXPIRES,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES
  },
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  pay: {
    // Sepay QR (CHÍNH để tạo QR)
    sepayQrBase: process.env.SEPAY_QR_BASE || "https://qr.sepay.vn/img",
    sepayQrAccount: process.env.SEPAY_QR_ACCOUNT || "",
    sepayQrBank: process.env.SEPAY_QR_BANK || "",
    sepayQrTemplate: process.env.SEPAY_QR_TEMPLATE || "qronly",
    sepayQrDownload: process.env.SEPAY_QR_DOWNLOAD ?? "",
    sepayWebhookKey: process.env.SEPAY_WEBHOOK_KEY || "",
    sepayWebhookToken: process.env.SEPAY_WEBHOOK_TOKEN || "",
  }
};
