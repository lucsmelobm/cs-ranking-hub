# 📋 Guia Completo - Fluxo N8N Mercado Livre → WhatsApp

## 1️⃣ PRÉ-REQUISITOS

Você precisa ter:
- ✅ Conta no N8N (Cloud ou Self-Hosted)
- ✅ Conta Google (para Google Sheets)
- ✅ Conta Mercado Livre (com credenciais de API)
- ✅ WhatsApp Business ou pessoal
- ✅ USAP instalado (para API WhatsApp)
- ✅ Redis instalado (opcional - para armazenar cookies)

---

## 2️⃣ IMPORTAR O WORKFLOW

### Via N8N Cloud:
1. Acesse https://n8n.cloud
2. Faça login
3. Clique em **"Projects"** → **"Create New"**
4. Clique em **"Workflows"** → **"Import"**
5. Escolha **"From File"** e selecione o arquivo:
   ```
   n8n-mercado-livre-whatsapp-workflow.json
   ```
6. Clique em **"Import"** e aguarde

### Via N8N Self-Hosted:
1. Acesse seu painel N8N local
2. Menu → **"Import"**
3. Selecione o arquivo JSON
4. Clique em **"Open"**

---

## 3️⃣ CONFIGURAR CREDENCIAIS

### A. Google Sheets

#### Passo 1: Criar Google Sheets
1. Acesse https://sheets.google.com
2. Crie uma nova planilha chamada **"ML Produtos Afiliados"**
3. Crie 2 abas:
   - **Aba 1: "Categorias"** com colunas:
     - `A: url` (URL da categoria no ML)
     - `B: status` (ativo/inativo)
     - `C: nome` (nome da categoria)
   
   - **Aba 2: "Produtos"** com colunas:
     - `A: productId` (MLB123456789)
     - `B: productName` (nome do produto)
     - `C: productImage` (URL da imagem)
     - `D: productUrl` (URL original)
     - `E: priceCurrentFormatted` (preço atual)
     - `F: priceOriginalFormatted` (preço original)
     - `G: discountPercent` (% desconto)
     - `H: discount` (texto desconto)
     - `I: affiliateLink` (link de afiliado)
     - `J: status` (processando/pronto/enviado)
     - `K: createdAt` (data criação)
     - `L: randomOrder` (ordem aleatória)

#### Passo 2: Autorizar N8N no Google Sheets
1. No N8N, vá para **Credentials** → **New**
2. Procure por **"Google Sheets OAuth2"**
3. Clique em **"Create New Credential"**
4. Autorize o N8N a acessar suas planilhas Google
5. Copie o **Sheet ID** da sua planilha:
   - URL: `https://docs.google.com/spreadsheets/d/AQUI_E_SEU_SHEET_ID/edit`
6. Cole este ID em cada node do Google Sheets do workflow

---

### B. Mercado Livre API

#### Passo 1: Obter API Key
1. Acesse https://developers.mercadolibre.com.br
2. Faça login com sua conta ML
3. Acesse **"Meus Aplicativos"**
4. Clique em **"Criar novo aplicativo"**
5. Preencha os dados necessários
6. Copie seu **Client ID** e **Client Secret**

#### Passo 2: Autorizar no N8N
1. No N8N, vá para **Credentials** → **New**
2. Procure por **"Mercado Libre OAuth2"** ou **"HTTP Basic Auth"**
3. Use seu Client ID e Client Secret
4. Cole a credencial em todos os nodes HTTP do Mercado Livre

---

### C. WhatsApp (USAP)

#### Passo 1: Instalar USAP
```bash
# Via Docker (Recomendado)
docker pull zendriver/usap-js
docker run -d --name usap -p 3000:3000 zendriver/usap-js

# Via npm
npm install -g usap
usap
```

#### Passo 2: Conectar WhatsApp
1. Abra a interface USAP em `http://localhost:3000`
2. Escaneie o QR Code com seu WhatsApp
3. Seu número será autenticado

#### Passo 3: Configurar N8N
1. No N8N, crie uma **nova credencial** do tipo **"HTTP Headers"**
2. Adicione header:
   - Nome: `Authorization`
   - Valor: `Bearer YOUR_USAP_API_KEY`
3. Também defina a **variável de ambiente**:
   - `WHATSAPP_GROUP_JID`: ID do seu grupo WhatsApp

---

### D. Redis (Opcional - para armazenar cookies)

#### Instalação:
```bash
# Windows (via WSL ou Docker)
docker run -d -p 6379:6379 redis

# Ou via Docker Desktop direto
```

#### Configurar no N8N:
1. Vá para **Credentials** → **New**
2. Procure por **"Redis"**
3. Defina:
   - Host: `localhost`
   - Port: `6379`
   - Database: `0` (padrão)

---

## 4️⃣ CONFIGURAR VARIÁVEIS DE AMBIENTE

Adicione ao seu arquivo `.env` do N8N:

```env
# Google Sheets
GOOGLE_SHEET_ID=aqui_seu_sheet_id_completo

# WhatsApp
WHATSAPP_GROUP_JID=120363123456789@g.us
USAP_API_KEY=sua_chave_api_usap

# Mercado Livre
MERCADO_LIVRE_CLIENT_ID=seu_client_id
MERCADO_LIVRE_CLIENT_SECRET=seu_client_secret
MERCADO_LIVRE_ACCESS_TOKEN=seu_access_token

# ID de Afiliado (importante!)
AFFILIATE_ID=seu_id_afiliado_mercado_livre
```

---

## 5️⃣ CONFIGURAR COOKIES DO MERCADO LIVRE

### Método 1: Via Navegador
1. Acesse https://www.mercadolivre.com.br
2. Faça login com sua conta
3. Abra o **Inspetor (F12)**
4. Vá para a aba **"Network"**
5. Recarregue a página
6. Clique na primeira requisição (tipo Document)
7. Na seção **"Request Headers"**, procure por **"Cookie"**
8. Copie o valor inteiro do Cookie

### Método 2: Via JavaScript Console
```javascript
// No console (F12 → Console)
document.cookie
```

### Método 3: Salvar em Redis
1. No primeiro node do workflow (**"HTTP - Atualizar Cookies"**)
2. Configure o header `Cookie` com o valor copiado acima

⚠️ **IMPORTANTE**: Os cookies expiram. Configure o fluxo para atualizar diariamente (7h da manhã está pré-configurado).

---

## 6️⃣ OBTER JID DO GRUPO WHATSAPP

O JID é o ID único do seu grupo. Para conseguir:

### Via USAP API:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/groups
```

Procure seu grupo na resposta. O JID será algo como:
```
120363123456789@g.us
```

### Via Interface USAP:
1. Abra http://localhost:3000
2. Vá em **"Grupos"**
3. Procure seu grupo
4. Copie o **JID**

---

## 7️⃣ TESTAR O WORKFLOW

### Teste 1: Atualizar Cookies
1. No painel do N8N, clique no primeiro node
2. Clique em **"Execute Node"**
3. Verifique se os cookies foram salvos no Redis

### Teste 2: Buscar Produtos
1. Adicione uma categoria na aba "Categorias" da planilha
2. Clique no node **"Schedule - Buscar Produtos"**
3. Clique em **"Execute Node"**
4. Verifique se os produtos aparecem na aba "Produtos"

### Teste 3: Enviar para WhatsApp
1. Marque um produto com status **"pronto"**
2. Clique no node **"Schedule - Enviar WhatsApp"**
3. Clique em **"Execute Node"**
4. Verifique se a mensagem chegou no seu grupo WhatsApp

---

## 8️⃣ SELADORES (AJUSTES FINAIS)

### Ajustar Horários
Cada Schedule node tem um horário pré-configurado:
- ⏰ **7h**: Atualizar Cookies e Buscar Produtos
- ⏰ **8h**: Gerar Links de Afiliado
- ⏰ **20h-21h a cada 8min**: Enviar Mensagens

Para mudar:
1. Clique no node Schedule
2. Vá em **"Schedule"**
3. Modifique **"Trigger at"** conforme necessário

### Ajustar ID de Afiliado
No node **"Code - Gerar Link Afiliado"**:
```javascript
const affiliateId = 'SEU_ID_AFILIADO'; // ← Mude aqui
```

### Ajustar Grupo WhatsApp
No node **"HTTP - USAP Enviar Mensagem"**:
```javascript
"chatId": "{{$env.WHATSAPP_GROUP_JID}}", // ← Mude a variável de ambiente
```

### Ajustar Intervalo de Envio
No node **"Schedule - Enviar WhatsApp"**:
- Mude **"Rule"** → **"Interval"** → **"Every X minutes"** (padrão: 8)

---

## 9️⃣ RESOLVER PROBLEMAS

### ❌ Erro: "Cookies expirados"
**Solução**: Os cookies precisam ser atualizados. Configure para atualizar diariamente ou execute manualmente.

### ❌ Erro: "Produtos não encontrados"
**Solução**: Verifique se:
1. A categoria está com status **"ativo"** na planilha
2. A URL está correta
3. Você está logado no Mercado Livre

### ❌ Erro: "Mensagem não enviada"
**Solução**: Verifique se:
1. USAP está rodando (`http://localhost:3000`)
2. O WhatsApp foi autenticado
3. O JID do grupo está correto

### ❌ Erro: "Credencial inválida"
**Solução**: Reasigne a credencial no node:
1. Clique no node
2. Vá em **"Credentials"**
3. Selecione a credencial correta

---

## 🔟 PRÓXIMOS PASSOS

✅ Workflow importado e testado?  
✅ Todas as credenciais configuradas?  
✅ Planilha criada e preenchida?  

**Próximas ações:**
1. Ative o workflow clicando em **"Activate"** (canto superior direito)
2. Deixe rodando 24/7 para automação completa
3. Monitore os logs em **"Executions"**

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs: **Workflow** → **"Executions"**
2. Teste cada node individualmente
3. Verifique as credenciais
4. Reinicie o N8N

---

**Pronto! Seu fluxo de automação está configurado! 🚀**
