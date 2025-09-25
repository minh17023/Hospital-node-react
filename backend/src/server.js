import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

(async () => {
  // kiểm tra kết nối DB (tùy chọn)
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("DB ping: OK");
  } catch (e) {
    console.error("DB ping: FAIL", e.message);
  }

  const PORT = process.env.PORT || env.port || 3000;   // Render cấp PORT
  const HOST = "0.0.0.0";                               // phải bind 0.0.0.0

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
})();
