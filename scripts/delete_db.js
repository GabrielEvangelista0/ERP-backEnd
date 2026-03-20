require('dotenv').config();
const { Pool } = require('pg');

async function deleteDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL não configurado em .env');
    process.exit(1);
  }

  // Extrai nome do banco da URL
  const match = dbUrl.match(/\/([^/?]+)(\?|$)/);
  const dbName = match ? match[1] : 'erp_db';

  // Conecta ao banco 'postgres' para deletar o banco target
  const adminPool = new Pool({
    connectionString: dbUrl.replace(`/${dbName}`, '/postgres'),
  });

  try {
    // Encerra todas as conexões ativas
    await adminPool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid();
    `, [dbName]);

    // Deleta o banco
    await adminPool.query(`DROP DATABASE IF EXISTS ${dbName};`);
    console.log(`✓ Banco de dados "${dbName}" deletado com sucesso`);

    await adminPool.end();
  } catch (error) {
    console.error('Erro ao deletar banco:', error.message);
    process.exit(1);
  }
}

deleteDatabase();
