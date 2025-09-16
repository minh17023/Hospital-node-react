import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

(async () => {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  app.listen(env.port, () => console.log(`Server running http://localhost:${env.port}`));
})();
