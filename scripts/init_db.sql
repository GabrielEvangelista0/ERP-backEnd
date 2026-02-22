-- Schema inicial para ERP

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  contato TEXT,
  email TEXT,
  endereco JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(12,2) DEFAULT 0,
  estoque INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  total NUMERIC(12,2) DEFAULT 0,
  items JSONB,
  data TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
  total NUMERIC(12,2) DEFAULT 0,
  items JSONB,
  data TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financeiro (
  id SERIAL PRIMARY KEY,
  tipo TEXT,
  valor NUMERIC(12,2),
  data TIMESTAMPTZ DEFAULT now(),
  descricao TEXT
);
