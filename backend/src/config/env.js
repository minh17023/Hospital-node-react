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
    qrBase: process.env.PAY_QR_BASE || "https://img.vietqr.io/image",
    bank: process.env.PAY_VIETQR_BANK || "MB",
    account: process.env.PAY_VIETQR_ACCOUNT || "",
    accountName: process.env.PAY_VIETQR_ACCOUNT_NAME || "",
    style: process.env.PAY_VIETQR_STYLE || "compact",
    ttlMinutes: Number(process.env.PAY_TTL_MINUTES || 15),
    sepayWebhookToken: process.env.SEPAY_WEBHOOK_TOKEN || "",
  }
};
