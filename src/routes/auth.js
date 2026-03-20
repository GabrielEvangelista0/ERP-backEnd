const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, comparePassword } = require('../utils/security');
const { generateToken } = require('../middleware/auth');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/register - Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    const { login, nome, email, senha, tipo } = req.body;
    
    // Validação básica
    if (!login || !nome || !email || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios: login, nome, email, senha' });
    }

    // Verificar se usuário já existe
    const check = await db.query('SELECT id FROM usuarios WHERE login = $1 OR email = $2', [login, email]);
    if (check.rowCount > 0) {
      return res.status(400).json({ error: 'Login ou email já cadastrado' });
    }

    // Hash da senha
    const senhaHash = await hashPassword(senha);

    // Inserir usuário
    const result = await db.query(
      'INSERT INTO usuarios (login, nome, email, senha, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING id, login, nome, email, tipo',
      [login, nome, email, senhaHash, tipo || 'operador']
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ message: 'Usuário cadastrado com sucesso', user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - Login de usuário
router.post('/login', async (req, res) => {
  try {
    const { login, senha } = req.body;

    if (!login || !senha) {
      return res.status(400).json({ error: 'Login e senha são obrigatórios' });
    }

    // Buscar usuário
    const result = await db.query('SELECT * FROM usuarios WHERE login = $1', [login]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    const user = result.rows[0];

    // Verificar senha
    const senhaValida = await comparePassword(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    // Verificar se usuário está ativo
    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário desativado' });
    }

    // Gerar token
    const token = generateToken(user);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        login: user.login,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Retorna dados do usuário autenticado
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const result = await db.query('SELECT id, login, nome, email, tipo, ativo FROM usuarios WHERE id = $1', [userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = result.rows[0];
    res.json({ user: { id: user.id, login: user.login, nome: user.nome, email: user.email, tipo: user.tipo, ativo: user.ativo } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
