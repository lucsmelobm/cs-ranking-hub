# 📝 Snippets de Código para Nodes JavaScript

Copie e cole esses trechos nos nodes de "Code" do workflow.

---

## 1️⃣ Code Node: "Processar Dados"

**Localização**: Após o node "Filter - Produtos Válidos"

```javascript
// Extrair ID do produto da URL
const urlMatch = $json.productUrl.match(/MLB(\d+)/);
const productId = urlMatch ? 'MLB' + urlMatch[1] : null;

// Limpar e formatar preço
const cleanPrice = (priceStr) => {
  if (!priceStr) return '0.00';
  return parseFloat(
    priceStr
      .replace(/[^\d,]/g, '')
      .replace(',', '.')
  ).toFixed(2);
};

const priceCurrentFormatted = cleanPrice($json.priceCurrent);
const priceOriginalFormatted = cleanPrice($json.priceOriginal);

// Calcular desconto em percentual
let discountPercent = 0;
if (priceOriginalFormatted > 0 && priceCurrentFormatted > 0) {
  discountPercent = Math.round(
    ((priceOriginalFormatted - priceCurrentFormatted) / priceOriginalFormatted) * 100
  );
}

// Extrair título limpo
const productName = $json.productName 
  ? $json.productName.substring(0, 80) 
  : 'Produto sem nome';

// Retornar dados processados
return {
  ...item,
  productId: productId || 'UNKNOWN',
  productName: productName,
  priceCurrentFormatted: priceCurrentFormatted,
  priceOriginalFormatted: priceOriginalFormatted,
  discountPercent: discountPercent,
  status: 'processando',
  createdAt: new Date().toISOString(),
  randomOrder: Math.random(),
  affiliateLink: '' // Preenchido depois
};
```

---

## 2️⃣ Code Node: "Gerar Link Afiliado"

**Localização**: Após o node "Filter - Produtos Pendentes Links"

```javascript
// Obter ID de afiliado de variáveis de ambiente
const AFFILIATE_ID = $env.AFFILIATE_ID || 'seu_id_aqui';

if (!AFFILIATE_ID || AFFILIATE_ID === 'seu_id_aqui') {
  throw new Error('❌ Erro: AFFILIATE_ID não configurado. Configure em variáveis de ambiente.');
}

// Limpar URL original de parâmetros desnecessários
const cleanUrl = (url) => {
  if (!url) return '';
  
  // Remover parâmetros após ?
  const baseUrl = url.split('?')[0];
  
  // Remover parâmetros após #
  return baseUrl.split('#')[0];
};

const cleanProductUrl = cleanUrl($json.productUrl);

// Gerar link de afiliado
let affiliateLink = '';
if (cleanProductUrl) {
  const separator = cleanProductUrl.includes('?') ? '&' : '?';
  affiliateLink = `${cleanProductUrl}${separator}affiliate_id=${AFFILIATE_ID}`;
}

// Validação
if (!affiliateLink) {
  throw new Error('❌ Erro: Não foi possível gerar link de afiliado');
}

return {
  ...item,
  affiliateLink: affiliateLink,
  status: 'pronto',
  updatedAt: new Date().toISOString()
};
```

---

## 3️⃣ Code Node: "Delay Aleatório (1-2min)"

**Localização**: Antes do node "Wait - Aguardar"

```javascript
// Gerar delay aleatório entre 1-2 minutos
// Isso evita que Meta/WhatsApp detecte comportamento de robô
const minSeconds = 60;  // 1 minuto
const maxSeconds = 120; // 2 minutos

const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
const delayMs = randomSeconds * 1000;

return {
  delayMs: delayMs,
  delaySeconds: randomSeconds,
  timestamp: new Date().toISOString()
};
```

---

## 4️⃣ Code Node: "Validar Produto Antes de Enviar" (Opcional)

**Localização**: Antes de enviar para WhatsApp (novo node após Wait)

```javascript
// Validações finais antes de enviar
const validations = {
  hasProductName: !!$json.productName && $json.productName.length > 0,
  hasPrice: !!$json.priceCurrentFormatted && parseFloat($json.priceCurrentFormatted) > 0,
  hasAffiliateLink: !!$json.affiliateLink && $json.affiliateLink.includes('http'),
  hasImage: !!$json.productImage && $json.productImage.includes('http'),
  hasStatus: $json.status === 'pronto'
};

const isValid = Object.values(validations).every(v => v === true);

if (!isValid) {
  throw new Error(`
    ❌ Produto inválido para envio:
    - Nome: ${validations.hasProductName ? '✅' : '❌'}
    - Preço: ${validations.hasPrice ? '✅' : '❌'}
    - Link: ${validations.hasAffiliateLink ? '✅' : '❌'}
    - Imagem: ${validations.hasImage ? '✅' : '❌'}
    - Status: ${validations.hasStatus ? '✅' : '❌'}
  `);
}

return {
  ...item,
  validatedAt: new Date().toISOString(),
  isValid: true
};
```

---

## 5️⃣ Code Node: "Criar Legenda Inteligente" (Opcional - Com AI)

**Localização**: Antes de enviar a mensagem (novo node)

```javascript
// Criar legenda/manchete interessante para o produto
// Pode integrar com OpenAI se desejar
const productName = $json.productName;
const discount = $json.discountPercent;
const price = $json.priceCurrentFormatted;

// Estrutura da legenda
const titles = [
  `🔥 ${discount}% OFF - ${productName}`,
  `💰 Super oferta! ${productName} por apenas R$${price}`,
  `⚡ Imperdível: ${productName} com ${discount}% de desconto`,
  `🛍️ ${productName} em promoção especial!`,
  `🎯 Aproveita! ${productName} saiu mais barato!`
];

// Selecionar uma legenda aleatória
const randomTitle = titles[Math.floor(Math.random() * titles.length)];

return {
  ...item,
  caption: randomTitle,
  messageReady: true
};
```

---

## 6️⃣ Code Node: "Formatar Mensagem Final" (Opcional)

**Localização**: Antes de enviar (novo node)

```javascript
// Formatar mensagem completa para WhatsApp
const message = `
🏷️ *${$json.productName}*

💰 *Preço Atual:* R$ ${$json.priceCurrentFormatted}
💸 *Preço Original:* R$ ${$json.priceOriginalFormatted}
📉 *Desconto:* ${$json.discountPercent}% OFF

✨ ${$json.discount || 'Oferta imperdível!'}

🔗 *Link de Compra:*
${$json.affiliateLink}

⏰ ${new Date().toLocaleString('pt-BR')}
`.trim();

return {
  ...item,
  formattedMessage: message,
  readyToSend: true
};
```

---

## 7️⃣ Code Node: "Tratamento de Erros" (Opcional)

**Localização**: Em qualquer ponto onde possa haver falha

```javascript
// Wrapper de tratamento de erro
try {
  // Seu código aqui
  const result = $json.productId;
  
  if (!result) {
    throw new Error('Campo crítico não encontrado');
  }
  
  return {
    success: true,
    data: result,
    error: null
  };
  
} catch (error) {
  return {
    success: false,
    data: null,
    error: error.message,
    timestamp: new Date().toISOString()
  };
}
```

---

## 📋 Resumo dos Nodes de Código

| Node | Função | Quando Usar |
|------|--------|-----------|
| Processar Dados | Limpar e formatar dados brutos | Obrigatório |
| Gerar Link Afiliado | Criar link com ID de afiliado | Obrigatório |
| Delay Aleatório | Evitar bloqueio | Obrigatório |
| Validar Produto | Garantir dados válidos | Recomendado |
| Legenda Inteligente | Criar títulos atraentes | Opcional |
| Formatar Mensagem | Melhorar apresentação | Opcional |

---

## 🔧 DICAS DE DEBUGGING

### Ver variáveis disponíveis:
```javascript
console.log(JSON.stringify($json, null, 2));
console.log(JSON.stringify($env, null, 2));
```

### Simular erro proposital:
```javascript
throw new Error('Teste de erro');
```

### Adicionar logs:
```javascript
// No painel, vá em Execution → Logs
console.log('Minha variável:', minhaVariavel);
```

### Validar JSON:
```javascript
try {
  const obj = JSON.parse(jsonString);
} catch (e) {
  throw new Error('JSON inválido: ' + e.message);
}
```

---

**Pronto! Use esses snippets para melhorar seu workflow! 🚀**
