# CLAUDE.md — Petshop Ponto

Documento de referência para sessões de desenvolvimento com IA. Leia este arquivo antes de qualquer trabalho no projeto.

---

## O que é este projeto

Sistema de **controle de ponto eletrônico** para a **Pet Patas**, petshop do pai do Leo. Um tablet Android fica fixo na loja — os funcionários batem o ponto nele. O pai (admin) gerencia tudo remotamente pelo painel web.

**Dono do projeto:** Leo (senior software engineer) — quer ser incluído em todas as decisões arquiteturais. Exige código elegante, bem construído e profissional.

---

## Fluxo do funcionário (tablet na loja)

1. Tela inicial mostra os funcionários cadastrados em cards com nome, iniciais coloridas e status (Fora / Presente)
2. Funcionário clica no seu card → tela de **PIN** (4-8 dígitos, validado no servidor antes de abrir a câmera)
3. Se o PIN for válido → câmera abre para tirar a foto
4. Foto tirada → salva o registro de ponto (entrada ou saída) com hora, foto, GPS opcional
5. Tela de confirmação com countdown de 6s, depois volta à tela inicial

## Fluxo do admin (remoto, web)

URL: `/admin` — protegida por login com senha (bcrypt + JWT).

Abas:
- **Registros** — dashboard em tempo real do dia: quem está presente/ausente, última movimentação. Auto-refresh a cada 30s.
- **Relatório** — gera PDF ou exporta JSON por funcionário/mês com horas trabalhadas, saldo CLT e campo de assinatura.
- **Colaboradores** — cards de cada funcionário ativo. Clica para ver registros mensais com horas trabalhadas, esperadas e saldo. Exporta PDF individual ou JSON.
- **Configurações** — gerencia funcionários (adicionar com PIN, remover, reativar, alterar PIN, deletar permanentemente), nome da loja, carga horária semanal, senha do admin, apagar todos os registros.

---

## Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 com App Router |
| Frontend | React 19, Tailwind CSS 3.4 |
| API | Next.js API Routes (app/api/) |
| Banco | PostgreSQL 16 |
| Query builder | Knex 3 |
| Auth | JWT (HS256) + bcryptjs |
| PDF | jsPDF 4.2.1 + jspdf-autotable 5.0.7 (client-side) |
| Runtime | Node.js 24 LTS |
| Container | Docker multi-stage (node:24-alpine) |
| CI/CD | GitHub Actions → ghcr.io → SSH deploy no VPS |

---

## Infraestrutura (VPS)

- **VPS do Leo** com Docker. O app roda em `petshop-ponto` container na porta **3004**.
- **PostgreSQL** compartilhado: container `postgres` (postgres:16), banco `petshop_ponto`, usuário `ponto`.
- Rede Docker: `infra` (externa, compartilhada com outros apps do Leo).
- **Domínio:** `petpatas.leodots.dev` via Cloudflare → nginx reverse proxy → porta 3004.
- Outros apps no VPS: umami (3002), meeting-ai (3003), nginx na 80/443.

### Como executar SQL no banco de produção

```bash
docker exec -it postgres psql -U ponto -d petshop_ponto -c "SEU SQL AQUI;"
```

### Deploy manual (se necessário)

```bash
cd ~/apps/petshop-ponto
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Variáveis de ambiente necessárias

```env
DATABASE_URL=postgresql://ponto:SENHA@postgres:5432/petshop_ponto
JWT_SECRET=string-aleatoria-longa
ADMIN_INITIAL_PASSWORD=senha-inicial-do-admin
STORE_NAME=Pet Patas
```

O `.env` fica em `~/apps/petshop-ponto/.env` no VPS (nunca no git).

---

## Estrutura de arquivos

```
petshop-ponto/
├── app/
│   ├── page.jsx                    # Tela de ponto (tablet) — público
│   ├── admin/page.jsx              # Painel admin — requer login
│   ├── layout.jsx
│   ├── globals.css
│   └── api/
│       ├── auth/route.js           # POST /api/auth — login admin
│       ├── employees/
│       │   ├── route.js            # GET (público/ativo), POST (admin)
│       │   └── [id]/
│       │       ├── route.js        # PATCH, DELETE (admin)
│       │       └── verify-pin/
│       │           └── route.js    # POST — verifica PIN antes da câmera
│       ├── records/
│       │   ├── route.js            # GET (admin), POST (PIN do funcionário)
│       │   ├── [id]/route.js       # GET foto por id (admin)
│       │   └── clear/route.js      # DELETE todos + confirmação de senha (admin)
│       └── settings/route.js       # GET (público), PUT (admin)
├── lib/
│   ├── db.js                       # Knex singleton (global._knex)
│   ├── auth.js                     # verifyAuth() — JWT HS256
│   └── rate-limit.js               # Rate limiter em memória
├── migrations/
│   ├── 001_initial.js              # Tabelas: employees, records, settings
│   ├── 002_remove_employee_name_unique.js
│   └── 003_add_employee_pin.js     # Coluna pin_hash em employees
├── seeds/
│   └── 001_initial.js              # admin_password, store_name, weekly_hours
├── Dockerfile                      # Multi-stage build
├── docker-compose.yml              # Dev local (com postgres local)
├── docker-compose.prod.yml         # Produção (usa rede infra externa)
├── knexfile.js
└── .github/workflows/deploy.yml   # CI/CD: build → push ghcr → deploy VPS
```

---

## Banco de dados

### Tabela `employees`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | serial PK | |
| name | varchar(255) | sem unique (migration 002) |
| active | boolean | soft delete padrão |
| pin_hash | varchar(255) | bcrypt custo 10, nullable |
| created_at | timestamp | |

### Tabela `records`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | serial PK | |
| employee_id | int FK | CASCADE delete |
| type | enum | 'entrada' ou 'saida' |
| timestamp | timestamp | |
| photo | text | base64, max ~7MB |
| lat | decimal(10,8) | opcional |
| lng | decimal(11,8) | opcional |
| created_at | timestamp | |

### Tabela `settings`
| key | Valor padrão | Descrição |
|-----|-------------|-----------|
| admin_password | (hash bcrypt 12) | Senha do painel admin |
| store_name | Pet Patas | Nome exibido na interface |
| weekly_hours | 44 | Carga horária semanal (CLT) |

---

## Segurança implementada

- **PINs de funcionários:** bcrypt custo 10, nunca retornados pela API (`pin_hash` removido, substitutído por `hasPin: bool`)
- **Senha admin:** bcrypt custo 12, mínimo 8 caracteres
- **JWT:** HS256 explícito, verificação de `JWT_SECRET` em runtime (não no build)
- **Rate limiting (em memória):**
  - Login admin: 5 tentativas / 15min por IP
  - PIN de funcionário: 10 tentativas / 15min por `employee_id` (compartilhado entre verify-pin e records)
- **Security headers:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy
- **Validações:** formato de data (evita SQL injection), tamanho da foto (7MB), range de coordenadas GPS
- **include_inactive=true** no GET /api/employees requer autenticação admin
- **Delete permanente de funcionário** requer confirmação de senha admin
- **Apagar todos os registros** requer confirmação de senha admin
- **Fotos** não retornadas na listagem geral — carregadas individualmente sob demanda (lazy)

---

## Cálculo de horas

Função `calcWorkedHours(records)` em `app/admin/page.jsx`:
- Ordena registros cronologicamente, emparelha entrada→saída
- Ignora pares com intervalo > 24h (registros inválidos)
- Detecta "entrada aberta" (entrada sem saída correspondente)

Horas esperadas — cálculo proporcional:
- **Mês atual** → `(weeklyHours / 7) × dias decorridos até hoje`
- **Mês passado** → `(weeklyHours / 7) × dias do mês inteiro`
- **Mês futuro** → 0

Ex: dia 5 do mês com 44h/semana → esperado = (44/7) × 5 × 60 ≈ 188 min (≈3h08).

Saldo = trabalhadas − esperadas (verde se positivo, amarelo se negativo).

---

## CI/CD (GitHub Actions)

Arquivo: `.github/workflows/deploy.yml`

**Jobs:**
1. `build-check` — `npm ci` + `npm run build` (Node 24)
2. `build-and-push` — Docker build + push para `ghcr.io/leodots/petshop-ponto:latest`
3. `deploy` — SCP do `docker-compose.prod.yml` para o VPS, SSH + `docker compose pull && up -d`

**Secrets necessários no GitHub:**
- `DEPLOY_KEY` — chave SSH privada em base64 (`base64 -w0 ~/.ssh/gh-actions`)
- `VPS_HOST`, `VPS_USER`

O workflow decodifica a chave: `echo "${{ secrets.DEPLOY_KEY }}" | base64 -d > ~/.ssh/id_ed25519`

---

## Desenvolvimento local

```bash
cp .env.example .env
# Preencha as variáveis

docker compose up -d        # Sobe postgres local
npm install
npm run db:setup            # Migrations + seeds
npm run dev                 # http://localhost:3000
```

---

## Decisões arquiteturais importantes

- **Sem Redux/Zustand** — estado local com useState/useCallback, suficiente para o escopo
- **Sem ORM** — Knex puro como query builder, migrações sequenciais (001, 002, 003...)
- **Fotos em base64 no PostgreSQL** — simplicidade operacional, limite de 7MB por foto
- **Rate limit em memória** — reinicia com o container, aceitável para 5 funcionários
- **PDF gerado no cliente** — jsPDF roda no browser, sem carga no servidor
- **JWT em sessionStorage** — aceito para o painel admin; não persiste ao fechar o browser
- **Soft delete** padrão para funcionários — delete permanente exige confirmação de senha
- **PIN verificado duas vezes** — antes da câmera (`verify-pin`) e ao salvar o registro (`records POST`)

---

## Próximas ideias (não implementadas)

- Notificações para o admin quando funcionário bate ponto
- Relatório de horas por semana (além do mensal)
- Suporte a feriados no cálculo de horas esperadas
- Backup automático agendado
