/**
 * Run this once to create the database tables:
 *   node scripts/setup-db.js
 */
require("dotenv").config({ path: ".env" });
const mysql = require("mysql2/promise");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set in .env");

  const parsed = new URL(url);
  const conn = await mysql.createConnection({
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port) : 3306,
    user: parsed.username || "root",
    password: parsed.password || "",
    multipleStatements: true,
  });

  const dbName = parsed.pathname.replace("/", "");
  console.log(`Setting up database: ${dbName}`);

  await conn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.execute(`USE \`${dbName}\``);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`photos\` (
      \`id\`               VARCHAR(50)    NOT NULL,
      \`originalName\`     VARCHAR(500)   NOT NULL,
      \`storedName\`       VARCHAR(500)   NOT NULL,
      \`filePath\`         VARCHAR(1000)  NOT NULL DEFAULT '',
      \`mimeType\`         VARCHAR(100)   NOT NULL,
      \`fileSize\`         BIGINT         NOT NULL DEFAULT 0,
      \`width\`            INT            NULL,
      \`height\`           INT            NULL,
      \`checksum\`         VARCHAR(64)    NOT NULL DEFAULT '',
      \`uploadedAt\`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`downloadCount\`    INT            NOT NULL DEFAULT 0,
      \`uploaderName\`     VARCHAR(200)   NULL,
      \`uploaderMessage\`  TEXT           NULL,
      \`deviceInfo\`       TEXT           NULL,
      \`exifData\`         JSON           NULL,
      \`status\`           ENUM('UPLOADING','COMPLETE','FAILED') NOT NULL DEFAULT 'COMPLETE',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`photos_storedName_key\` (\`storedName\`),
      INDEX \`photos_uploadedAt_idx\` (\`uploadedAt\`),
      INDEX \`photos_status_idx\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log("✅ Table `photos` ready.");
  await conn.end();
}

main().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
