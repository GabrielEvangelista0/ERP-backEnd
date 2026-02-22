const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const sqlPath = path.join(__dirname, 'init_db.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Arquivo scripts/init_db.sql não encontrado.');
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION;
if (!connectionString) {
  console.error('DATABASE_URL não definido no .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });

(async () => {
  const client = await pool.connect();
  try {
    console.log('Iniciando aplicação do schema...');
    const parts = sql.split(';');
    for (let i = 0; i < parts.length; i++) {
      const stmt = parts[i].trim();
      if (!stmt) continue;
      await client.query(stmt);
    }
    console.log('Schema aplicado com sucesso.');
  } catch (err) {
    console.error('Erro ao aplicar schema:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
