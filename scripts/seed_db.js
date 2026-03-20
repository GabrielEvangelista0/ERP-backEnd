require('dotenv').config();
const db = require('../src/db');
const { hashPassword } = require('../src/utils/security');

async function seedDatabase() {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Limpando dados existentes...');
    await client.query('DELETE FROM logs');
    await client.query('DELETE FROM itens_venda');
    await client.query('DELETE FROM itens_compra');
    await client.query('DELETE FROM contas_receber');
    await client.query('DELETE FROM contas_pagar');
    await client.query('DELETE FROM vendas');
    await client.query('DELETE FROM compras');
    await client.query('DELETE FROM produtos');
    await client.query('DELETE FROM clientes');
    await client.query('DELETE FROM fornecedores');
    await client.query('DELETE FROM usuarios');

    console.log('Inserindo usuários...');
    const senhaAdmin = await hashPassword('admin123');
    const senhaOp = await hashPassword('operador123');

    const adminResult = await client.query(
      `INSERT INTO usuarios (login, nome, email, senha, tipo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['admin', 'Administrador', 'admin@erp.com', senhaAdmin, 'admin']
    );
    const adminId = adminResult.rows[0].id;

    const operadorResult = await client.query(
      `INSERT INTO usuarios (login, nome, email, senha, tipo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['operador', 'Operador Padrão', 'operador@erp.com', senhaOp, 'operador']
    );
    const operadorId = operadorResult.rows[0].id;

    console.log('Inserindo fornecedores...');
    const fornecedores = [];
    const fornecedoresData = [
      { nome: 'Fornecedor A', contato: 'João Silva', email: 'joao@fornecedora.com', telefone: '11999999999' },
      { nome: 'Fornecedor B', contato: 'Maria Santos', email: 'maria@fornecedorb.com', telefone: '11988888888' },
      { nome: 'Fornecedor C', contato: 'Pedro Costa', email: 'pedro@fornecedorc.com', telefone: '11977777777' }
    ];

    for (const f of fornecedoresData) {
      const result = await client.query(
        `INSERT INTO fornecedores (nome, contato, email, telefone, endereco, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [f.nome, f.contato, f.email, f.telefone, 'Endereço do fornecedor', adminId]
      );
      fornecedores.push(result.rows[0].id);
    }

    console.log('Inserindo produtos...');
    const produtos = [];
    const produtosData = [
      { codigo: 'P001', nome: 'Notebook', descricao: 'Notebook 15 polegadas', categoria: 'Eletrônicos', preco: 3500.00, quantidade: 10 },
      { codigo: 'P002', nome: 'Mouse', descricao: 'Mouse óptico wireless', categoria: 'Periféricos', preco: 50.00, quantidade: 100 },
      { codigo: 'P003', nome: 'Teclado', descricao: 'Teclado mecânico RGB', categoria: 'Periféricos', preco: 200.00, quantidade: 50 },
      { codigo: 'P004', nome: 'Monitor', descricao: 'Monitor 24 polegadas Full HD', categoria: 'Monitores', preco: 800.00, quantidade: 20 },
      { codigo: 'P005', nome: 'Webcam', descricao: 'Webcam HD 1080p', categoria: 'Periféricos', preco: 150.00, quantidade: 30 }
    ];

    for (let i = 0; i < produtosData.length; i++) {
      const p = produtosData[i];
      const result = await client.query(
        `INSERT INTO produtos (codigo, nome, descricao, categoria, preco, quantidade, fornecedor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [p.codigo, p.nome, p.descricao, p.categoria, p.preco, p.quantidade, fornecedores[i % fornecedores.length]]
      );
      produtos.push(result.rows[0].id);
    }

    console.log('Inserindo clientes...');
    const clientes = [];
    const clientesData = [
      { nome: 'Cliente A LTDA', email: 'contato@clientea.com.br', telefone: '1133333333' },
      { nome: 'Cliente B S.A.', email: 'vendas@clienteb.com.br', telefone: '1144444444' },
      { nome: 'Cliente C ME', email: 'info@clientec.com.br', telefone: '1155555555' }
    ];

    for (const c of clientesData) {
      const result = await client.query(
        `INSERT INTO clientes (nome, email, telefone, endereco, usuario_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [c.nome, c.email, c.telefone, 'Endereço do cliente', adminId]
      );
      clientes.push(result.rows[0].id);
    }

    console.log('Inserindo venda com itens...');
    const vendaResult = await client.query(
      `INSERT INTO vendas (cliente_id, usuario_id, total, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [clientes[0], operadorId, 3750.00, 'Primeira venda de teste']
    );
    const vendaId = vendaResult.rows[0].id;

    // Itens da venda
    await client.query(
      `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
      [vendaId, produtos[0], 1, 3500.00, 3500.00]
    );
    await client.query(
      `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
      [vendaId, produtos[1], 5, 50.00, 250.00]
    );

    // Atualizar estoque
    await client.query('UPDATE produtos SET quantidade = quantidade - 1 WHERE id = $1', [produtos[0]]);
    await client.query('UPDATE produtos SET quantidade = quantidade - 5 WHERE id = $1', [produtos[1]]);

    // Conta a receber
    const dataVenc = new Date();
    dataVenc.setDate(dataVenc.getDate() + 30);
    await client.query(
      `INSERT INTO contas_receber (venda_id, cliente_id, valor, data_vencimento)
       VALUES ($1, $2, $3, $4)`,
      [vendaId, clientes[0], 3750.00, dataVenc.toISOString().split('T')[0]]
    );

    console.log('Inserindo compra com itens...');
    const compraResult = await client.query(
      `INSERT INTO compras (fornecedor_id, usuario_id, total, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [fornecedores[0], operadorId, 5000.00, 'Compra inicial de estoque']
    );
    const compraId = compraResult.rows[0].id;

    // Itens da compra
    await client.query(
      `INSERT INTO itens_compra (compra_id, produto_id, quantidade, preco_unitario, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
      [compraId, produtos[2], 10, 200.00, 2000.00]
    );
    await client.query(
      `INSERT INTO itens_compra (compra_id, produto_id, quantidade, preco_unitario, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
      [compraId, produtos[3], 3, 800.00, 2400.00]
    );

    // Atualizar estoque
    await client.query('UPDATE produtos SET quantidade = quantidade + 10 WHERE id = $1', [produtos[2]]);
    await client.query('UPDATE produtos SET quantidade = quantidade + 3 WHERE id = $1', [produtos[3]]);

    // Conta a pagar
    await client.query(
      `INSERT INTO contas_pagar (compra_id, fornecedor_id, valor, tipo, data_vencimento)
       VALUES ($1, $2, $3, $4, $5)`,
      [compraId, fornecedores[0], 5000.00, 'compra', dataVenc.toISOString().split('T')[0]]
    );

    await client.query('COMMIT');
    console.log('\n✓ Base de dados populada com sucesso!\n');
    console.log('Usuários padrão:');
    console.log('  Admin: login=admin  |  senha=admin123');
    console.log('  Operador: login=operador  |  senha=operador123\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao popular banco:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

seedDatabase();
