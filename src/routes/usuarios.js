const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, comparePassword } = require('../utils/security');
const { verifyToken, requireRole } = require('../middleware/auth');

// Todas as rotas de usuários requerem autenticação
router.use(verifyToken);

// GET /api/usuarios - Listar todos os usuários (admin/gerente)
router.get('/', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const result = await db.query('SELECT id, login, nome, email, tipo, ativo, created_at FROM usuarios ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/:id - Obter detalhes do usuário
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Usuário pode ver apenas seus dados (ou admin/gerente veem todos)
    if (req.user.id !== parseInt(id) && !['admin', 'gerente'].includes(req.user.tipo)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await db.query('SELECT id, login, nome, email, tipo, ativo, created_at FROM usuarios WHERE id = $1', [id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id - Editar usuário
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, tipo, ativo } = req.body;

    // Usuário pode editar apenas seus dados (ou admin/gerente)
    if (req.user.id !== parseInt(id) && !['admin', 'gerente'].includes(req.user.tipo)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Admin/gerente podem alterar tipo, operadores não
    const tipoFinal = ['admin', 'gerente'].includes(req.user.tipo) ? tipo : undefined;

    const result = await db.query(
      'UPDATE usuarios SET nome=$1, email=$2, tipo=COALESCE($3, tipo), ativo=$4, updated_at=now() WHERE id=$5 RETURNING id, login, nome, email, tipo, ativo',
      [nome, email, tipoFinal, ativo !== undefined ? ativo : true, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/usuarios/:id - Deletar usuário (admin apenas)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Não é permitido deletar sua própria conta' });
    }

    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
