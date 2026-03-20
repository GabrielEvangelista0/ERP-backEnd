const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// Todas as rotas de clientes requerem autenticação
router.use(verifyToken);

// GET /api/clientes - Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.nome, c.email, c.telefone, c.endereco, c.usuario_id,
              u.nome as usuario_nome
       FROM clientes c
       LEFT JOIN usuarios u ON c.usuario_id = u.id
       ORDER BY c.id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clientes/:id - Obter detalhes do cliente
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT c.id, c.nome, c.email, c.telefone, c.endereco, c.usuario_id,
              u.nome as usuario_nome
       FROM clientes c
       LEFT JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes - Criar novo cliente
router.post('/', async (req, res) => {
  try {
    const { nome, email, telefone, endereco } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await db.query(
      'INSERT INTO clientes (nome, email, telefone, endereco, usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, email || null, telefone || null, endereco || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id - Editar cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, endereco } = req.body;

    const result = await db.query(
      'UPDATE clientes SET nome=$1, email=$2, telefone=$3, endereco=$4, updated_at=now() WHERE id=$5 RETURNING *',
      [nome, email || null, telefone || null, endereco || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clientes/:id - Deletar cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se há vendas relacionadas
    const vendas = await db.query(
      'SELECT COUNT(*) as count FROM vendas WHERE cliente_id = $1',
      [id]
    );

    if (parseInt(vendas.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar este cliente. Existem vendas relacionadas. Exclua as vendas primeiro ou marque o cliente como inativo.' 
      });
    }

    // Verificar se há contas a receber relacionadas
    const contas = await db.query(
      'SELECT COUNT(*) as count FROM contas_receber WHERE cliente_id = $1',
      [id]
    );

    if (parseInt(contas.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar este cliente. Existem contas a receber relacionadas. Resolva as contas primeiro ou marque o cliente como inativo.' 
      });
    }

    // Se não houver registros relacionados, proceder com a deleção
    const result = await db.query('DELETE FROM clientes WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
