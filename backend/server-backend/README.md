# 🚀 Fury Cloud Sync & Auth Backend (NestJS)

Servidor de nuvem e autenticação do **Fury Antidetect**, inspirado na arquitetura de alta performance e segurança do **Donut Browser (donut-sync)**.

Construído em **NestJS** com **TypeScript**, utilizando **Object Storage compatível com AWS S3 / MinIO** para armazenamento de sessões, perfis, cookies e configurações via **Presigned URLs**.

---

## 🛡️ Sistemas de Segurança Implementados

1. **Proteção contra Timing Attacks:** Validação de tokens utilizando `crypto.timingSafeEqual` para impedir ataques de temporização na autenticação.
2. **Isolamento de Namespace & Path Traversal Guard:** Em modo nuvem, cada usuário só pode ler e gravar dentro de seu próprio prefixo (`users/{userId}/...`). O servidor rejeita qualquer tentativa de `..` ou escape de diretório.
3. **Higienização de Metadados (Metadata Sanitization):** Somente metadados permitidos (como `updated-at` para resolução de conflitos Last-Write-Wins) são assinados nas requisições S3.
4. **Proteção contra DoS em Lotes:** Limite estrito de no máximo 1000 itens por requisição em lote (`MAX_BATCH_ITEMS = 1000`).
5. **Cota de Validade de URLs:** URLs pré-assinadas possuem tempo máximo de vida limitado a 3600s (1 hora).
6. **Autenticação Dupla:** Suporta **Token Estático (SYNC_TOKEN)** para testes/hospedagem própria e **Tokens JWT assinados** com controle de cota de perfis.
7. **Fluxo de Vinculação de Dispositivo com Proof-of-Work (PoW):** Desafio criptográfico para proteger o login do desktop contra força bruta.

---

## 📡 Endpoints da API

### 1. Diagnóstico e Conectividade
* `GET /health`: Healthcheck básico do servidor.
* `GET /readyz`: Valida conectividade real com o bucket S3 e informa o endpoint de storage.

### 2. Autenticação e Vínculo de Dispositivo (`/api/auth/`)
* `POST /api/auth/device-code/challenge`: Solicita prefixo e dificuldade do Proof-of-Work.
* `POST /api/auth/device-code/create`: Gera código legível (`FURY-XXXX`) a partir do painel web.
* `POST /api/auth/device-code/exchange`: Valida código + resposta do PoW e entrega tokens `access_token` e `refresh_token`.

### 3. Operações de Sincronização S3 (`/v1/objects/`) - Requer `Bearer <Token>`
* `POST /v1/objects/stat`: Verifica se o arquivo existe e retorna tamanho e timestamp `updated-at`.
* `POST /v1/objects/presign-upload-batch`: Gera URLs assinadas de `PUT` em lote para upload direto no S3.
* `POST /v1/objects/presign-download-batch`: Gera URLs assinadas de `GET` em lote para download direto do S3.
* `POST /v1/objects/list`: Lista arquivos remotos filtrados por prefixo.
* `POST /v1/objects/delete`: Remove um arquivo individual.
* `POST /v1/objects/delete-prefix`: Remove toda uma árvore/pasta recursivamente (ex: perfil deletado).

---

## 🐳 Como Subir na VPS com Docker Compose

### 1. Configurar o `.env`
Edite o arquivo `.env` inserindo o IP público da sua VPS:
```env
VPS_PUBLIC_IP=123.45.67.89 # Substitua pelo IP da sua VPS
SYNC_TOKEN=sua_chave_secreta_super_segura_de_32_caracteres
S3_ACCESS_KEY_ID=furyadmin
S3_SECRET_ACCESS_KEY=furypassword123
S3_BUCKET=fury-sync
```

### 2. Iniciar os Serviços
```bash
docker compose up -d --build
```

### 3. Verificar se está Rodando
```bash
# 1. Healthcheck
curl http://localhost:12342/health

# 2. Conexão S3
curl http://localhost:12342/readyz

# 3. Teste de Upload em Lote
curl -X POST http://localhost:12342/v1/objects/presign-upload-batch \
  -H "Authorization: Bearer sua_chave_secreta_super_segura_de_32_caracteres" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"key": "profiles/uuid-1/cookies.sqlite"}]}'
```

---

## 💻 Como Rodar Localmente (Desenvolvimento)

```bash
# Instalar dependências
npm install

# Modo desenvolvimento com hot-reload
npm run start:dev

# Build de produção
npm run build
npm run start:prod
```
