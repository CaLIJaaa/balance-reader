# Balance Reader

Микросервис для получения балансов токенов в различных блокчейн сетях. Поддерживает чтение балансов через REST API для кошельков в сетях Arbitrum, Ethereum и TRON.

## 🎯 Возможности

- Получение балансов заданных заранее токенов на кошельке
- Поддержка множественных блокчейн сетей
- REST API с JSON форматом
- Готовый Docker контейнер
- Быстрая настройка и развертывание

## 🌍 Поддерживаемые сети

| Сеть | Chain ID | Поддерживаемые токены |
|------|----------|----------------------|
| **Arbitrum One** | 42161 | ARB, USDC, USDT, WBTC, WETH |
| **Ethereum Mainnet** | 1 | USDC, USDT, WBTC, WETH, UNI |
| **TRON Mainnet** | 728126428 | USDT (TRC20), USDC (TRC20), JUST, PePe |

## 🚀 Быстрый старт

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

## 📡 API Endpoints

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

## 🔧 Примеры использования

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

## 🛠 Разработка

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
│   ├── balanceService.ts    # Логика работы с блокчейнами
│   └── server.ts           # Express сервер
├── web3_config.json        # Конфигурация сетей и токенов
├── package.json           # Зависимости проекта
├── tsconfig.json          # Конфигурация TypeScript
├── Dockerfile            # Конфигурация Docker
└── docker-compose.yml    # Docker Compose конфигурация
```

## 📝 Примечания

- Используются публичные RPC endpoints для демонстрации
- Для продакшен использования рекомендуется получить собственные API ключи
- Приложение возвращает только токены с ненулевым балансом
- Все токены заданы хардкодом, поэтому приложение может возвращать не все токены
- Поддерживается автоматическое определение типа сети (EVM/TVM)