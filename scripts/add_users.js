require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Hash da senha "admin123"
    const senhaHash = await bcrypt.hash('admin123', 10);

    // Insere usuário admin
    await pool.query(
      `INSERT INTO usuarios (login, nome, email, tipo, senha) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (login) DO NOTHING;`,
      ['admin', 'Administrador', 'admin@erp.com', 'admin', senhaHash]
    );

    // Insere usuário operador
    const senhaHashOp = await bcrypt.hash('operador123', 10);
    await pool.query(
      `INSERT INTO usuarios (login, nome, email, tipo, senha) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (login) DO NOTHING;`,
      ['operador', 'Operador', 'operador@erp.com', 'operador', senhaHashOp]
    );

    console.log('✓ Usuários criados com sucesso!');
    console.log('\nCredenciais padrão:');
    console.log('  Admin:     login=admin     | senha=admin123');
    console.log('  Operador:  login=operador  | senha=operador123');

    await pool.end();
  } catch (error) {
    console.error('Erro ao criar usuários:', error.message);
    process.exit(1);
  }
}

createAdminUser();
