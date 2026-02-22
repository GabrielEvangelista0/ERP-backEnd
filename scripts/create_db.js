require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION;
if (!connectionString) {
  console.error('DATABASE_URL não definido no .env');
  process.exit(1);
}

let dbUrl;
try {
  dbUrl = new URL(connectionString);
} catch (err) {
  console.error('DATABASE_URL inválido:', err.message);
  process.exit(1);
}

const targetDb = dbUrl.pathname ? dbUrl.pathname.replace(/^\//, '') : '';
if (!targetDb) {
  console.error('Nome do banco não encontrado na connection string. Ex: postgres://user:pass@host:5432/erp_db');
  process.exit(1);
}

// conecte ao DB 'postgres' para executar CREATE DATABASE
const adminUrl = new URL(connectionString);
adminUrl.pathname = '/postgres';

const pool = new Pool({ connectionString: adminUrl.toString() });

(async () => {
  const client = await pool.connect();
  try {
    const check = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (check.rowCount > 0) {
      console.log(`Banco de dados "${targetDb}" já existe.`);
      process.exit(0);
    }

    // sanitiza nome do DB para evitar injections: permitir letras, números e underscore
    if (!/^[A-Za-z0-9_]+$/.test(targetDb)) {
      console.error('Nome do banco contém caracteres inválidos. Use apenas letras, números e underscore.');
      process.exit(1);
    }

    console.log(`Criando banco de dados "${targetDb}"...`);
    await client.query(`CREATE DATABASE "${targetDb}"`);
    console.log('Banco criado com sucesso.');
  } catch (err) {
    console.error('Erro ao criar banco:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
