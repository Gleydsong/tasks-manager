# 📚 Tasks Manager API - Documentação

API REST para gerenciamento de tarefas com autenticação JWT, controle de permissões por roles e organização por equipes.

## 📋 Índice

- [Informações Gerais](#informações-gerais)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Teams](#teams)
  - [Tasks](#tasks)
- [Códigos de Erro](#códigos-de-erro)

---

## 🔧 Informações Gerais

### Base URL

```
http://localhost:3000/api
```

### Formato de Resposta

**Sucesso:**

```json
{
  "data": { ... },
  "meta": { ... }  // opcional, usado em listagens paginadas
}
```

**Erro:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro",
    "details": [ ... ]  // opcional, detalhes de validação
  }
}
```

### Headers Padrão

```
Content-Type: application/json
Authorization: Bearer <token>  // para rotas protegidas
```

### Mapeamento de Status e Prioridade

| Campo      | Valor API (PT-BR) | Valor Banco   |
| ---------- | ----------------- | ------------- |
| Status     | `Pendente`        | `pending`     |
| Status     | `Em progresso`    | `in_progress` |
| Status     | `Concluído`       | `completed`   |
| Prioridade | `Alta`            | `high`        |
| Prioridade | `Média`           | `medium`      |
| Prioridade | `Baixa`           | `low`         |

### Roles de Usuário

| Role     | Descrição                                 |
| -------- | ----------------------------------------- |
| `admin`  | Acesso total ao sistema                   |
| `member` | Acesso restrito às suas equipes e tarefas |

---

## 🔐 Autenticação

A API utiliza **JWT (JSON Web Token)** para autenticação. O token tem validade de **24 horas**.

Para acessar rotas protegidas, inclua o header:

```
Authorization: Bearer <seu_token_jwt>
```

---

## 📡 Endpoints

### Auth

#### Registrar Usuário

```http
POST /api/auth/register
```

Cria um novo usuário com role `member`.

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome (2-100 caracteres) |
| `email` | string | ✅ | Email válido (max 150) |
| `password` | string | ✅ | Senha (8-255 caracteres) |

**Exemplo:**

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "MinhaSenh@123"
}
```

**Resposta (201):**

```json
{
  "data": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "member",
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

#### Login

```http
POST /api/auth/login
```

Autentica o usuário e retorna um token JWT.

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | ✅ | Email cadastrado |
| `password` | string | ✅ | Senha (8-255 caracteres) |

**Exemplo:**

```json
{
  "email": "joao@example.com",
  "password": "MinhaSenh@123"
}
```

**Resposta (200):**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "member"
    }
  }
}
```

---

#### Obter Usuário Atual

```http
GET /api/auth/me
```

Retorna os dados do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Resposta (200):**

```json
{
  "data": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "member",
    "createdAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### Users

> ⚠️ **Todas as rotas de usuários requerem role `admin`**

#### Listar Usuários

```http
GET /api/users
```

Retorna todos os usuários cadastrados.

**Headers:** `Authorization: Bearer <token>`

**Resposta (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2025-12-12T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "member",
      "createdAt": "2025-12-12T10:05:00.000Z"
    }
  ]
}
```

---

#### Obter Usuário por ID

```http
GET /api/users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID do usuário |

**Resposta (200):**

```json
{
  "data": {
    "id": 2,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "member",
    "createdAt": "2025-12-12T10:05:00.000Z"
  }
}
```

---

#### Atualizar Usuário

```http
PATCH /api/users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID do usuário |

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ❌ | Novo nome (2-100 caracteres) |
| `role` | string | ❌ | Nova role (`admin` ou `member`) |

> ℹ️ Pelo menos um campo deve ser fornecido.

**Exemplo:**

```json
{
  "name": "João Silva Santos",
  "role": "admin"
}
```

**Resposta (200):**

```json
{
  "data": {
    "id": 2,
    "name": "João Silva Santos",
    "email": "joao@example.com",
    "role": "admin",
    "createdAt": "2025-12-12T10:05:00.000Z"
  }
}
```

---

#### Deletar Usuário

```http
DELETE /api/users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID do usuário |

**Resposta (204):** Sem conteúdo

---

### Teams

#### Listar Equipes

```http
GET /api/teams
```

- **Admin:** Retorna todas as equipes
- **Member:** Retorna apenas equipes das quais é membro

**Headers:** `Authorization: Bearer <token>`

**Resposta (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Equipe Backend",
      "description": "Desenvolvimento de APIs",
      "createdAt": "2025-12-12T10:00:00.000Z",
      "members": [
        {
          "id": 1,
          "userId": 2,
          "teamId": 1,
          "user": {
            "id": 2,
            "name": "João Silva",
            "email": "joao@example.com"
          }
        }
      ]
    }
  ]
}
```

---

#### Obter Equipe por ID

```http
GET /api/teams/:teamId
```

- **Admin:** Pode ver qualquer equipe
- **Member:** Apenas equipes das quais é membro

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `teamId` | number | ID da equipe |

**Resposta (200):**

```json
{
  "data": {
    "id": 1,
    "name": "Equipe Backend",
    "description": "Desenvolvimento de APIs",
    "createdAt": "2025-12-12T10:00:00.000Z",
    "members": [
      {
        "id": 1,
        "userId": 2,
        "teamId": 1,
        "user": {
          "id": 2,
          "name": "João Silva",
          "email": "joao@example.com"
        }
      }
    ]
  }
}
```

---

#### Criar Equipe

```http
POST /api/teams
```

> ⚠️ **Requer role `admin`**

**Headers:** `Authorization: Bearer <token>`

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome da equipe (2-100 caracteres) |
| `description` | string | ❌ | Descrição (max 500 caracteres) |

**Exemplo:**

```json
{
  "name": "Equipe Frontend",
  "description": "Desenvolvimento de interfaces"
}
```

**Resposta (201):**

```json
{
  "data": {
    "id": 2,
    "name": "Equipe Frontend",
    "description": "Desenvolvimento de interfaces",
    "createdAt": "2025-12-12T11:00:00.000Z"
  }
}
```

---

#### Atualizar Equipe

```http
PATCH /api/teams/:teamId
```

> ⚠️ **Requer role `admin`**

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `teamId` | number | ID da equipe |

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ❌ | Novo nome (2-100 caracteres) |
| `description` | string | ❌ | Nova descrição (max 500) |

**Exemplo:**

```json
{
  "description": "Desenvolvimento de interfaces web e mobile"
}
```

**Resposta (200):**

```json
{
  "data": {
    "id": 2,
    "name": "Equipe Frontend",
    "description": "Desenvolvimento de interfaces web e mobile",
    "createdAt": "2025-12-12T11:00:00.000Z"
  }
}
```

---

#### Deletar Equipe

```http
DELETE /api/teams/:teamId
```

> ⚠️ **Requer role `admin`**

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `teamId` | number | ID da equipe |

**Resposta (204):** Sem conteúdo

---

#### Adicionar Membro à Equipe

```http
POST /api/teams/:teamId/members
```

> ⚠️ **Requer role `admin`**

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `teamId` | number | ID da equipe |

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `userId` | number | ✅ | ID do usuário a adicionar |

**Exemplo:**

```json
{
  "userId": 3
}
```

**Resposta (201):**

```json
{
  "data": {
    "id": 5,
    "userId": 3,
    "teamId": 1,
    "createdAt": "2025-12-12T12:00:00.000Z"
  }
}
```

---

#### Remover Membro da Equipe

```http
DELETE /api/teams/:teamId/members/:userId
```

> ⚠️ **Requer role `admin`**

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `teamId` | number | ID da equipe |
| `userId` | number | ID do usuário a remover |

**Resposta (204):** Sem conteúdo

---

### Tasks

#### Listar Tarefas

```http
GET /api/tasks
```

- **Admin:** Pode ver todas as tarefas
- **Member:** Apenas tarefas de equipes das quais é membro

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `teamId` | number | ❌ | Filtrar por equipe |
| `assignedTo` | number | ❌ | Filtrar por responsável |
| `status` | string | ❌ | Filtrar por status (`Pendente`, `Em progresso`, `Concluído`) |
| `priority` | string | ❌ | Filtrar por prioridade (`Alta`, `Média`, `Baixa`) |
| `search` | string | ❌ | Busca no título e descrição |
| `page` | number | ❌ | Página (default: 1) |
| `pageSize` | number | ❌ | Itens por página (default: 10, max: 100) |

**Exemplo:**

```
GET /api/tasks?teamId=1&status=Pendente&page=1&pageSize=20
```

**Resposta (200):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Implementar autenticação",
      "description": "Criar sistema de login com JWT",
      "status": "Pendente",
      "priority": "Alta",
      "teamId": 1,
      "assignedTo": 2,
      "createdAt": "2025-12-12T10:00:00.000Z",
      "updatedAt": "2025-12-12T10:00:00.000Z",
      "team": {
        "id": 1,
        "name": "Equipe Backend"
      },
      "assignee": {
        "id": 2,
        "name": "João Silva",
        "email": "joao@example.com"
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### Criar Tarefa

```http
POST /api/tasks
```

**Regras de criação:**

- **Admin:** Pode criar tarefas para qualquer equipe e usuário
- **Member:**
  - Deve pertencer à equipe especificada
  - `assignedTo` deve ser o próprio usuário

**Headers:** `Authorization: Bearer <token>`

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | string | ✅ | Título (2-200 caracteres) |
| `description` | string | ❌ | Descrição (max 2000 caracteres) |
| `status` | string | ❌ | Status (default: `Pendente`) |
| `priority` | string | ❌ | Prioridade (default: `Média`) |
| `teamId` | number | ✅ | ID da equipe |
| `assignedTo` | number | ✅ | ID do responsável |

**Exemplo:**

```json
{
  "title": "Criar endpoint de relatórios",
  "description": "Implementar geração de relatórios em PDF",
  "priority": "Alta",
  "teamId": 1,
  "assignedTo": 2
}
```

**Resposta (201):**

```json
{
  "data": {
    "id": 2,
    "title": "Criar endpoint de relatórios",
    "description": "Implementar geração de relatórios em PDF",
    "status": "Pendente",
    "priority": "Alta",
    "teamId": 1,
    "assignedTo": 2,
    "createdAt": "2025-12-12T14:00:00.000Z",
    "updatedAt": "2025-12-12T14:00:00.000Z"
  }
}
```

---

#### Obter Tarefa por ID

```http
GET /api/tasks/:id
```

- **Admin:** Pode ver qualquer tarefa
- **Member:** Apenas tarefas de equipes das quais é membro

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID da tarefa |

**Resposta (200):**

```json
{
  "data": {
    "id": 1,
    "title": "Implementar autenticação",
    "description": "Criar sistema de login com JWT",
    "status": "Pendente",
    "priority": "Alta",
    "teamId": 1,
    "assignedTo": 2,
    "createdAt": "2025-12-12T10:00:00.000Z",
    "updatedAt": "2025-12-12T10:00:00.000Z",
    "team": {
      "id": 1,
      "name": "Equipe Backend"
    },
    "assignee": {
      "id": 2,
      "name": "João Silva",
      "email": "joao@example.com"
    }
  }
}
```

---

#### Atualizar Tarefa

```http
PUT /api/tasks/:id
```

**Regras de atualização:**

- **Admin:** Pode atualizar todos os campos
- **Member:**
  - Deve ser o responsável pela tarefa
  - Não pode alterar `assignedTo` e `teamId`

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID da tarefa |

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | string | ❌ | Novo título (2-200 caracteres) |
| `description` | string | ❌ | Nova descrição (max 2000) |
| `status` | string | ❌ | Novo status |
| `priority` | string | ❌ | Nova prioridade |
| `assignedTo` | number | ❌ | Novo responsável (apenas admin) |
| `teamId` | number | ❌ | Nova equipe (apenas admin) |

> ℹ️ Pelo menos um campo deve ser fornecido.

**Exemplo:**

```json
{
  "title": "Implementar autenticação OAuth",
  "priority": "Média"
}
```

**Resposta (200):**

```json
{
  "data": {
    "id": 1,
    "title": "Implementar autenticação OAuth",
    "description": "Criar sistema de login com JWT",
    "status": "Pendente",
    "priority": "Média",
    "teamId": 1,
    "assignedTo": 2,
    "createdAt": "2025-12-12T10:00:00.000Z",
    "updatedAt": "2025-12-12T15:00:00.000Z"
  }
}
```

---

#### Atualizar Status da Tarefa

```http
PATCH /api/tasks/:id/status
```

Atualiza apenas o status da tarefa e registra no histórico.

- **Admin:** Pode atualizar qualquer tarefa
- **Member:** Apenas se for o responsável

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID da tarefa |

**Body:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `status` | string | ✅ | Novo status (`Pendente`, `Em progresso`, `Concluído`) |

**Exemplo:**

```json
{
  "status": "Em progresso"
}
```

**Resposta (200):**

```json
{
  "data": {
    "id": 1,
    "title": "Implementar autenticação OAuth",
    "description": "Criar sistema de login com JWT",
    "status": "Em progresso",
    "priority": "Média",
    "teamId": 1,
    "assignedTo": 2,
    "createdAt": "2025-12-12T10:00:00.000Z",
    "updatedAt": "2025-12-12T16:00:00.000Z"
  }
}
```

---

#### Obter Histórico da Tarefa

```http
GET /api/tasks/:id/history
```

Retorna o histórico de alterações de status da tarefa.

- **Admin:** Pode ver histórico de qualquer tarefa
- **Member:** Apenas tarefas de equipes das quais é membro

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID da tarefa |

**Resposta (200):**

```json
{
  "data": [
    {
      "id": 1,
      "taskId": 1,
      "previousStatus": "Pendente",
      "newStatus": "Em progresso",
      "changedBy": 2,
      "changedAt": "2025-12-12T16:00:00.000Z",
      "user": {
        "id": 2,
        "name": "João Silva",
        "email": "joao@example.com"
      }
    },
    {
      "id": 2,
      "taskId": 1,
      "previousStatus": "Em progresso",
      "newStatus": "Concluído",
      "changedBy": 2,
      "changedAt": "2025-12-12T18:00:00.000Z",
      "user": {
        "id": 2,
        "name": "João Silva",
        "email": "joao@example.com"
      }
    }
  ]
}
```

---

#### Deletar Tarefa

```http
DELETE /api/tasks/:id
```

- **Admin:** Pode deletar qualquer tarefa
- **Member:** Apenas se for o responsável

**Headers:** `Authorization: Bearer <token>`

**Parâmetros URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | number | ID da tarefa |

**Resposta (204):** Sem conteúdo

---

## ❌ Códigos de Erro

| Código HTTP | Código Erro        | Descrição                            |
| ----------- | ------------------ | ------------------------------------ |
| 400         | `VALIDATION_ERROR` | Dados inválidos na requisição        |
| 401         | `UNAUTHORIZED`     | Token ausente ou inválido            |
| 403         | `FORBIDDEN`        | Sem permissão para acessar o recurso |
| 404         | `NOT_FOUND`        | Recurso não encontrado               |
| 409         | `CONFLICT`         | Conflito (ex: email já cadastrado)   |
| 500         | `INTERNAL_ERROR`   | Erro interno do servidor             |

**Exemplo de erro de validação:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "String must contain at least 8 character(s)"
      }
    ]
  }
}
```

---

## 🧪 Exemplos com cURL

### Registro e Login

```bash
# Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"João Silva","email":"joao@example.com","password":"MinhaSenh@123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@example.com","password":"MinhaSenh@123"}'

# Salvar token em variável (Linux/Mac)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@example.com","password":"MinhaSenh@123"}' | jq -r '.data.token')
```

### Operações com Token

```bash
# Obter usuário atual
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Criar equipe (admin)
curl -X POST http://localhost:3000/api/teams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Equipe Dev","description":"Desenvolvimento"}'

# Adicionar membro (admin)
curl -X POST http://localhost:3000/api/teams/1/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":2}'

# Criar tarefa
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nova tarefa","teamId":1,"assignedTo":2,"priority":"Alta"}'

# Listar tarefas com filtros
curl "http://localhost:3000/api/tasks?status=Pendente&priority=Alta&page=1" \
  -H "Authorization: Bearer $TOKEN"

# Atualizar status
curl -X PATCH http://localhost:3000/api/tasks/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Em progresso"}'

# Ver histórico
curl http://localhost:3000/api/tasks/1/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Notas Adicionais

- O endpoint `/health` retorna `{ "status": "ok" }` para verificação de saúde da API
- Todas as datas são retornadas em formato ISO 8601 (UTC)
- IDs são números inteiros positivos
- A paginação começa em página 1
