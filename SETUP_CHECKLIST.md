# ✅ CHECKLIST RÁPIDO DE SETUP

Siga este checklist para garantir que tudo está configurado corretamente.

---

## 📋 PRÉ-REQUISITOS (15 minutos)

- [ ] Tenho conta no N8N Cloud ou Self-Hosted instalado
- [ ] Tenho conta Google (Gmail)
- [ ] Tenho conta Mercado Livre (com permissão de API)
- [ ] Tenho WhatsApp (pessoal ou Business)
- [ ] Docker instalado (para USAP e Redis)
- [ ] Node.js v16+ instalado

---

## 1️⃣ CRIAR INFRAESTRUTURA (20 minutos)

### Google Sheets
- [ ] Criei planilha em https://sheets.google.com
- [ ] Nomeei: "ML Produtos Afiliados"
- [ ] Criei aba "Categorias" com colunas: url, status, nome
- [ ] Criei aba "Produtos" com 12 colunas (ver GUIA_N8N_SETUP.md)
- [ ] Copiei o Sheet ID: `https://docs.google.com/spreadsheets/d/[AQUI]/edit`
- [ ] Armazei Sheet ID no arquivo `.env`

### WhatsApp (USAP)
- [ ] Docker rodando localmente
- [ ] USAP instalado: `docker run -d --name usap -p 3000:3000 zendriver/usap-js`
- [ ] Interface USAP acessível em `http://localhost:3000`
- [ ] WhatsApp autenticado (escaneei QR Code)
- [ ] Obtive USAP API Key
- [ ] Copiei USAP_API_KEY para `.env`

### Redis (opcional mas recomendado)
- [ ] Redis rodando: `docker run -d -p 6379:6379 redis`
- [ ] Testei conexão: `redis-cli ping` → responde "PONG"

---

## 2️⃣ CREDENCIAIS MERCADO LIVRE (15 minutos)

- [ ] Acessei https://developers.mercadolibre.com.br
- [ ] Criei novo aplicativo
- [ ] Copiei Client ID: `_________________`
- [ ] Copiei Client Secret: `_________________`
- [ ] Obtive Access Token
- [ ] Obtive ID de Afiliado (Painel → https://affiliados.mercadolivre.com.br)
- [ ] Armazei tudo em `.env`:
  - [ ] MERCADO_LIVRE_CLIENT_ID
  - [ ] MERCADO_LIVRE_CLIENT_SECRET
  - [ ] MERCADO_LIVRE_ACCESS_TOKEN
  - [ ] AFFILIATE_ID

---

## 3️⃣ N8N SETUP (30 minutos)

### Importar Workflow
- [ ] Acessei https://n8n.cloud (ou N8N local)
- [ ] Fiz login
- [ ] Cliquei em "Import" → "From File"
- [ ] Selecionei `n8n-mercado-livre-whatsapp-workflow.json`
- [ ] Cliquei "Import"
- [ ] Workflow importado com sucesso ✅

### Configurar Credenciais Google Sheets
- [ ] Criei credencial "Google Sheets OAuth2"
- [ ] Autorizei N8N a acessar minhas planilhas
- [ ] Copiei Sheet ID em CADA node Google Sheets
- [ ] Testei conexão (cliquei em "Execute Node")

### Configurar Credenciais Mercado Livre
- [ ] Criei credencial "HTTP Basic Auth" com Client ID/Secret
- [ ] Vinculei em nodes HTTP do Mercado Livre
- [ ] Testei conexão

### Configurar Credenciais Redis
- [ ] Criei credencial "Redis"
- [ ] Host: `localhost`
- [ ] Port: `6379`
- [ ] Testei conexão

### Configurar USAP
- [ ] Criei credencial com USAP_API_KEY
- [ ] Vinculei nos nodes USAP (WhatsApp)
- [ ] Defini variável de ambiente: `WHATSAPP_GROUP_JID`

---

## 4️⃣ VARIÁVEIS DE AMBIENTE (10 minutos)

No N8N, criei todas as variáveis:

- [ ] `GOOGLE_SHEET_ID` = seu_sheet_id
- [ ] `WHATSAPP_GROUP_JID` = 120363...@g.us
- [ ] `USAP_API_KEY` = sua_chave
- [ ] `AFFILIATE_ID` = seu_id
- [ ] `MERCADO_LIVRE_CLIENT_ID` = seu_id
- [ ] `MERCADO_LIVRE_CLIENT_SECRET` = seu_secret
- [ ] `MERCADO_LIVRE_ACCESS_TOKEN` = seu_token

**Como adicionar no N8N:**
1. Vá em **Settings** → **Variables**
2. Clique em **"Add Variable"**
3. Preencha nome e valor
4. Clique **"Save"**

---

## 5️⃣ TESTAR WORKFLOW (20 minutos)

### Teste 1: Atualizar Cookies ✅
- [ ] Fiz login no Mercado Livre
- [ ] Copiei cookies (F12 → Network)
- [ ] Executei node "HTTP - Atualizar Cookies"
- [ ] Cookies salvos com sucesso

### Teste 2: Buscar Produtos ✅
- [ ] Adicionei categoria na planilha (aba "Categorias")
  - Exemplo: URL = `https://lista.mercadolivre.com.br/esporte-fitness`
  - Status = `ativo`
- [ ] Executei node "Schedule - Buscar Produtos"
- [ ] Verifiquei planilha (aba "Produtos")
- [ ] ≥ 10 produtos aparecem

### Teste 3: Gerar Links Afiliado ✅
- [ ] Executei node "Schedule - Gerar Links Afiliado"
- [ ] Verifiquei se links foram gerados (coluna "affiliateLink")
- [ ] Links começam com `https://...` e contêm `affiliate_id`

### Teste 4: Enviar WhatsApp ✅
- [ ] Marquei um produto com status `"pronto"` na planilha
- [ ] Executei node "Schedule - Enviar WhatsApp"
- [ ] Verifiquei se mensagem chegou no grupo

---

## 6️⃣ AJUSTES FINOS (10 minutos)

- [ ] Ajustei horários dos Schedule nodes:
  - [ ] Atualizar cookies: 7h
  - [ ] Buscar produtos: 7h
  - [ ] Gerar links: 8h
  - [ ] Enviar WhatsApp: 20h-21h a cada 8min
  
- [ ] Ajustei ID de Afiliado no node "Code - Gerar Link Afiliado"
  
- [ ] Ajustei Delay Aleatório (1-2 minutos está OK)
  
- [ ] Verifiquei limite de produtos (máx 300/dia está OK)

---

## 7️⃣ ATIVAR AUTOMAÇÃO (5 minutos)

- [ ] Cliquei em **"Activate"** (canto superior direito do N8N)
- [ ] Workflow está rodando 24/7 ✅
- [ ] Verifiquei "Executions" para confirmar rodadas agendadas

---

## 8️⃣ VALIDAÇÃO FINAL

### Checklist de Funcionalidade
- [ ] Cookies atualizam diariamente sem erro
- [ ] Produtos são buscados automaticamente
- [ ] Links de afiliado são gerados
- [ ] Mensagens chegam no WhatsApp todos os dias
- [ ] Não há bloqueios ou bans
- [ ] Delays aleatórios funcionam

### Checklist de Segurança
- [ ] Arquivo `.env` está em `.gitignore`
- [ ] Credenciais não estão em repositório público
- [ ] Tokens são válidos e não expirados
- [ ] Senhas não estão hardcoded no código
- [ ] Apenas endereços IP confiáveis acessam N8N

---

## 📊 MONITORAMENTO

### Verifiquem regularmente:

```
N8N Dashboard → Executions
├── Todos os workflows rodaram? ✅
├── Há erros ou avisos? ⚠️
├── Timestamps estão corretos? ⏰
└── Produtos foram enviados? 📦
```

### Logs:
- [ ] Vejo logs em tempo real
- [ ] Não há erros 500
- [ ] Timeouts são raros

---

## 🆘 PROBLEMAS COMUNS

| Problema | Solução |
|----------|---------|
| ❌ Cookies expirados | Execute "Atualizar Cookies" manualmente |
| ❌ Sem produtos encontrados | Verifique categoria está "ativo" |
| ❌ Links não gerados | Verifique AFFILIATE_ID em `.env` |
| ❌ Mensagens não chegam | Verifique WHATSAPP_GROUP_JID e USAP rodando |
| ❌ Redis connection error | Execute `docker run -d -p 6379:6379 redis` |

---

## 🎉 PRONTO!

Se todos os itens estão marcados ✅, seu workflow está:
- ✅ Configurado corretamente
- ✅ Testado e funcional
- ✅ Rodando 24/7
- ✅ Enviando ofertas automaticamente

**Próximos passos:**
1. Monitore os logs diariamente (primeira semana)
2. Ajuste horários conforme necessário
3. Adicione mais categorias na planilha
4. Escale para Amazon/Shopee se desejar

---

**Sucesso! Seu afiliado está automatizado! 🚀💰**
