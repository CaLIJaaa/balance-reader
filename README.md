# Balance Reader

Микросервис для получения балансов токенов в различных блокчейн сетях. Поддерживает чтение балансов через REST API для кошельков в сетях Arbitrum, Ethereum и TRON.

## Возможности

- Получение балансов заданных заранее токенов на кошельке
- Поддержка множественных блокчейн сетей
- REST API с JSON форматом
- Готовый Docker контейнер
- Быстрая настройка и развертывание

## Поддерживаемые сети

| Сеть | Chain ID | Поддерживаемые токены |
|------|----------|----------------------|
| **Arbitrum One** | 42161 | ARB, USDC, USDT, WBTC, WETH, LINK, UNI, PEPE, GMX, MAGIC |
| **Ethereum Mainnet** | 1 | USDC, USDT, BNB, WBTC, SOL, UNI, LINK, PEPE, SHIB, DAI, MATIC |
| **TRON Mainnet** | 728126428 | USDT (TRC20), USDC (TRC20), JUST, WTRX, WIN, BTT, SUN, APENFT |

## Быстрый старт

### Предварительные требования

- Docker Desktop установлен и запущен
- Свободный порт 3000 на локальной машине

### 1. Клонирование проекта

```bash
git clone https://github.com/CaLIJaaa/balance-reader.git
cd balance-reader
```

### 2. Сборка Docker образа

```bash
docker build -t balance-reader:latest .
```

### 3. Запуск контейнера

```bash
docker run -d --name balance-reader-app -p 3000:3000 balance-reader:latest
```

### 4. Проверка работы

```bash
# Health check
curl http://localhost:3000/api/health

# Должен вернуть:
# {"status":"ok","timestamp":"2025-09-06T12:16:16.297Z"}
```

## API Endpoints

### Health Check
```http
GET /api/health
```

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-06T12:16:16.297Z"
}
```

### Получение балансов

```http
POST /api/balances
Content-Type: application/json

{
  "address": "0x742d35cc6c8b49a7ad6ae1ad5b9dc92b86b6cd9c",
  "chainId": 42161
}
```

**Параметры запроса:**
- `address` (string) - Адрес кошелька
- `chainId` (number) - ID блокчейн сети

**Ответ:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "0x742d35cc6c8b49a7ad6ae1ad5b9dc92b86b6cd9c",
    "chainId": 42161,
    "balances": [
      {
        "address": "0x912CE59144191C1204E64559FE8253a0e49E6548",
        "name": "Arbitrum",
        "symbol": "ARB",
        "balance": "1250.75",
        "rawBalance": "1250750000000000000000"
      }
    ],
    "timestamp": "2025-09-06T12:16:16.297Z"
  }
}
```

## Примеры использования

### Arbitrum One (chainId: 42161)
```bash
curl -X POST http://localhost:3000/api/balances \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35cc6c8b49a7ad6ae1ad5b9dc92b86b6cd9c",
    "chainId": 42161
  }'
```

### Ethereum Mainnet (chainId: 1)
```bash
curl -X POST http://localhost:3000/api/balances \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35cc6c8b49a7ad6ae1ad5b9dc92b86b6cd9c",
    "chainId": 1
  }'
```

### TRON Mainnet (chainId: 728126428)
```bash
curl -X POST http://localhost:3000/api/balances \
  -H "Content-Type: application/json" \
  -d '{
    "address": "TQMNeffbdxHYp9X7B26Sn8dcsrvX7W7Fxm",
    "chainId": 728126428
  }'
```

## Разработка

### Локальный запуск без Docker
```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка TypeScript
npm run build

# Запуск собранного приложения
npm start
```

### Структура проекта
```
balance-reader/
├── src/
│   └── balanceService.ts     # Логика работы с блокчейнами
├── web3_config.json          # Конфигурация сетей и токенов
├── package.json              # Зависимости проекта
├── tsconfig.json             # Конфигурация TypeScript
├── Dockerfile                # Конфигурация Docker
├── docker-compose.yml        # Docker Compose конфигурация
└── server.ts                 # Express сервер (входная точка)
```

## Архитектура и принцип работы

### Компоненты системы

#### 1. **server.ts** - HTTP сервер
```typescript
// Основные функции:
- Express.js сервер на порту 3000
- REST API endpoint: POST /api/balances
- Валидация входных параметров (address, chainId)
- Обработка ошибок и возврат JSON ответов
- Health check endpoint: GET /api/health
```

#### 2. **balanceService.ts** - Бизнес-логика
```typescript
// Ключевые функции:
- readBalances() - главная функция чтения балансов
- getTokenBalance() - баланс ERC20 токенов
- getTronTokenBalance() - баланс TRC20 токенов
- getEthBalance() / getTrxBalance() - нативные балансы
- withTimeout() - защита от зависания запросов
```

#### 3. **web3_config.json** - Конфигурация
```json
// Содержит:
- Список поддерживаемых сетей (chainId, name)
- Адреса токенов для каждой сети
- Метаданные токенов (name, address)
```

### Алгоритм работы

#### Шаг 1: Получение запроса
```javascript
POST /api/balances
{
  "address": "0x742d35cc6c8b49a7ad6ae1ad5b9dc92b86b6cd9c",
  "chainId": 42161
}
```

#### Шаг 2: Определение типа сети
```typescript
function getNetworkType(chainId: number): 'EVM' | 'TVM' {
    return chainId === 728126428 ? 'TVM' : 'EVM';
}
```

#### Шаг 3: Чтение балансов
```typescript
// Для EVM сетей (Ethereum, Arbitrum):
const balancePromises = [
    getEthBalance(provider, walletAddress),           // Нативный токен (ETH/ARB)
    ...network.tokens.map(token =>                    // Все ERC20 токены
        getTokenBalance(provider, token.address, walletAddress)
    )
];

// Для TVM сети (TRON):
const balancePromises = [
    getTrxBalance(tronWeb, walletAddress),            // Нативный TRX
    ...network.tokens.map(token =>                    // Все TRC20 токены
        getTronTokenBalance(tronWeb, token.address, walletAddress)
    )
];
```

#### Шаг 4: Обработка результатов
```typescript
// Promise.allSettled обеспечивает устойчивость к ошибкам:
const balanceResults = await Promise.allSettled(
    balancePromises.map(promise => withTimeout(promise, 30000))
);

// Фильтрация результатов:
for (const result of balanceResults) {
    if (result.status === 'fulfilled' && result.value) {
        if (parseFloat(result.value.balance) > 0) {
            results.push(result.value);  // Только токены с балансом > 0
        }
    }
}
```

## Принятые решения

### Использование web3_config.json для конфигурации токенов

Было принято решение использовать статический файл `web3_config.json` для хранения списка токенов вместо других подходов по следующим причинам:

**Преимущества выбранного решения:**
- **Скорость**: Нет дополнительных API запросов для получения списка токенов
- **Простота**: Понятная структура данных, легко читать и модифицировать
- **Настраиваемость**: Легко добавлять новые токены или сети без изменения кода
- **Надежность**: Нет зависимости от внешних сервисов для получения списка токенов

**Альтернативные варианты, которые были рассмотрены:**

#### 1. Чтение истории ERC20 Transfer событий
```typescript
// Идея: найти все токены, которые когда-либо приходили на адрес
const transferEvents = await contract.queryFilter(
    contract.filters.Transfer(null, walletAddress)
);
```
**Почему не подошло:**
- Слишком медленно для больших кошельков
- Требует сканирования всей истории транзакций
- Неэффективно для кошельков с большим количеством операций

#### 2. Интеграция с CoinMarketCap/CoinGecko API
```typescript
// Идея: получать список популярных токенов из внешних API
const tokens = await fetch('https://api.coinmarketcap.com/...');
```
**Почему не подошло:**
- Добавляет зависимость от внешних сервисов
- Не дает значительного преимущества над статическим списком
- Усложняет развертывание (нужны API ключи)
- Может быть медленнее из-за дополнительных HTTP запросов

## Примечания

- Используются публичные RPC эндпойнты для демонстрации. Эти эндпойнты могут иметь ограничения по запросам или быть временно недоступными. На продакшене я бы обязательно использовал собственные приватные RPC эндпойнты для обеспечения стабильности и производительности.
- Приложение возвращает только токены с ненулевым балансом
- Все токены заданы хардкодом, поэтому приложение может возвращать не все токены
- Поддерживается автоматическое определение типа сети (EVM/TVM)