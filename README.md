# 🚀 B2B Sales Intelligence Platform

> Платформа интеллектуальных продаж с интеграцией AmoCRM и AI-анализом контактов

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://postgresql.org/)

## 📋 Оглавление

- [🎯 Цель проекта](#-цель-проекта)
- [🏗️ Архитектура системы](#️-архитектура-системы)
  - [High-Level архитектура](#high-level-архитектура)
  - [Low-Level архитектура](#low-level-архитектура)
- [✨ Ключевые возможности](#-ключевые-возможности)
- [🚀 Быстрый старт](#-быстрый-старт)
- [📖 Руководство пользователя](#-руководство-пользователя)
- [🔧 Установка и настройка](#-установка-и-настройка)
- [🛠️ Сопровождение](#️-сопровождение)
- [🔌 API и интеграции](#-api-и-интеграции)

## 🎯 Цель проекта

**B2B Sales Intelligence Platform** — это современная система для автоматизации и интеллектуализации процессов B2B продаж. Платформа объединяет данные из AmoCRM с возможностями AI-поиска и анализа для создания полного профиля потенциальных клиентов.

### Основные задачи:
- **Автоматический сбор данных** о компаниях и контактах из множественных источников
- **AI-анализ и обогащение** информации о потенциальных клиентах
- **Генерация персонализированных рекомендаций** для работы с каждым контактом
- **Интеграция с AmoCRM** для синхронизации и обновления данных
- **Создание и управление playbook'ами** для стандартизации процессов продаж

## 🏗️ Архитектура системы

### High-Level архитектура

```mermaid
graph TB
    subgraph "🌐 External Services"
        A[AmoCRM API]
        B[Brave Search API]
        C[Perplexity API]
        D[OpenAI GPT-4o]
    end
    
    subgraph "🖥️ Frontend Layer"
        E[React SPA]
        F[Vite Dev Server]
    end
    
    subgraph "⚡ Backend Layer"
        G[Express.js Server]
        H[Authentication Layer]
        I[API Routes]
        J[Business Logic]
    end
    
    subgraph "💾 Data Layer"
        K[PostgreSQL Database]
        L[Drizzle ORM]
        M[Session Storage]
    end
    
    subgraph "🔍 AI Processing Pipeline"
        N[Data Collection Engine]
        O[AI Analysis Engine]
        P[Recommendation Engine]
    end
    
    E --> G
    F --> E
    G --> H
    H --> I
    I --> J
    J --> N
    N --> B
    N --> C
    O --> D
    J --> L
    L --> K
    H --> M
    
    J --> A
    N --> O
    O --> P
    
    style E fill:#61dafb
    style G fill:#68d391
    style K fill:#4299e1
    style N fill:#f6ad55
```

### Low-Level архитектура

```mermaid
graph TB
    subgraph "🎨 Frontend Components"
        A1[App.tsx - Router]
        A2[AuthPage - Login/Register]
        A3[Dashboard - Overview]
        A4[ContactDetail - Contact View]
        A5[Settings - API Keys & Config]
        A6[Playbook - Sales Templates]
        
        A1 --> A2
        A1 --> A3
        A1 --> A4
        A1 --> A5
        A1 --> A6
    end
    
    subgraph "🔐 Authentication"
        B1[Passport.js]
        B2[Session Management]
        B3[Protected Routes]
        
        B1 --> B2
        B2 --> B3
    end
    
    subgraph "🛣️ API Endpoints"
        C1["API Auth - Authentication"]
        C2["API Contacts - Contact Management"]
        C3["API Keys - API Keys Management"]
        C4["API Settings - User Settings"]
        C5["API Recommendations - AI Analysis"]
        
        C1 --> B1
    end
    
    subgraph "💡 AI Processing Modules"
        D1["Brave Search - Web Search"]
        D2["Perplexity - AI Search"]
        D3["OpenAI Integration - Content Analysis"]
        D4["Data Fusion Engine - Combine Results"]
        
        D1 --> D4
        D2 --> D4
        D4 --> D3
    end
    
    subgraph "🗄️ Database Schema"
        E1["users - User Accounts"]
        E2["api_keys - Encrypted API Keys"]
        E3["user_settings - Preferences"]
        E4["contacts - Contact Data"]
        
        E1 --> E2
        E1 --> E3
        E1 --> E4
    end
    
    subgraph "🔧 Storage Interface"
        F1["IStorage Interface"]
        F2["DatabaseStorage Implementation"]
        F3["Encryption/Decryption Utils"]
        
        F1 --> F2
        F2 --> F3
        F2 --> E1
    end
    
    A4 --> C2
    C2 --> D1
    C3 --> F2
    C4 --> F2
    
    style D1 fill:#fbb6ce
    style D2 fill:#a78bfa
    style D3 fill:#34d399
    style F2 fill:#60a5fa
```

## ✨ Ключевые возможности

### 🔍 Интеллектуальный сбор данных
- **Многоисточниковый поиск**: Brave Search + Perplexity AI
- **Автоматическое обогащение профилей** компаний и контактов
- **Извлечение структурированных данных**: отрасль, выручка, количество сотрудников
- **Мониторинг социальных сетей** и публичной активности

### 🤖 AI-анализ и рекомендации
- **GPT-4o анализ** собранных данных
- **Персонализированные рекомендации** для каждого контакта
- **Автоматическая генерация саммари** компаний и контактов
- **Выбор модели AI** для генерации рекомендаций

### 📊 AmoCRM интеграция
- **Двусторонняя синхронизация** контактов и компаний
- **Автоматическое обновление** профилей в CRM
- **Сохранение связи** между внутренними и CRM данными

### 🎯 Управление процессами продаж
- **Playbook система** для стандартизации подходов
- **Экспорт рекомендаций** в различных форматах
- **Настройка поисковых систем** под нужды команды

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- PostgreSQL 13+
- Учетные записи для внешних сервисов:
  - AmoCRM (API ключ и поддомен)
  - Brave Search API
  - Perplexity API
  - OpenAI API

### Установка

1. **Клонирование репозитория**
```bash
git clone <repository-url>
cd b2b-sales-platform
```

2. **Установка зависимостей**
```bash
npm install
```

3. **Настройка базы данных**
```bash
# Создайте PostgreSQL базу данных
createdb b2b_sales_platform

# Установите переменную окружения
export DATABASE_URL="postgresql://username:password@localhost:5432/b2b_sales_platform"

# Примените миграции
npm run db:push
```

4. **Настройка переменных окружения**
```bash
# Создайте .env файл
cat > .env << EOF
DATABASE_URL=postgresql://username:password@localhost:5432/b2b_sales_platform
SESSION_SECRET=your-super-secret-session-key
OPENAI_API_KEY=your-openai-api-key
BRAVE_SEARCH_API_KEY=your-brave-search-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
EOF
```

5. **Запуск приложения**
```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5000`

## 📖 Руководство пользователя

### 1. 🔐 Регистрация и аутентификация

1. Откройте приложение в браузере
2. Перейдите на страницу регистрации
3. Создайте учетную запись с логином, паролем и email
4. Войдите в систему

### 2. ⚙️ Настройка API ключей

1. Перейдите в **Настройки** → **API Ключи**
2. Заполните необходимые ключи:
   - **AmoCRM**: API ключ и поддомен
   - **Brave Search**: API ключ для веб-поиска
   - **Perplexity**: API ключ для AI-поиска
   - **OpenAI**: API ключ для GPT-4o анализа
3. Сохраните настройки

### 3. 🔧 Конфигурация поисковых систем

1. В разделе **Настройки** → **Основные**
2. Выберите активные поисковые системы:
   - ☑️ Brave Search (веб-поиск)
   - ☑️ Perplexity AI (интеллектуальный поиск)
3. Настройте тему интерфейса (светлая/темная)

### 4. 📋 Создание Playbook

1. Перейдите в раздел **Playbook**
2. Создайте шаблон для вашей команды продаж:
   ```markdown
   # Playbook компании "Ваша компания"
   
   ## Наши продукты и услуги:
   - Продукт 1: описание и преимущества
   - Продукт 2: описание и преимущества
   
   ## Целевая аудитория:
   - Крупные корпорации (1000+ сотрудников)
   - Средний бизнес с высокими требованиями к IT
   ```
3. Сохраните playbook для использования в рекомендациях

### 5. 👥 Работа с контактами

#### Загрузка контактов из AmoCRM
1. Перейдите в раздел **Контакты**
2. Система автоматически синхронизируется с AmoCRM
3. Просмотрите список импортированных контактов

#### Сбор дополнительных данных
1. Откройте карточку контакта
2. Нажмите кнопку **"Собрать данные"**
3. Система выполнит:
   - Поиск информации о компании
   - Анализ социальной активности контакта
   - Сбор финансовых показателей
   - Определение ключевых продуктов компании

#### Просмотр результатов анализа
После сбора данных вы увидите:
- **Информацию о компании**: отрасль, выручка, количество сотрудников
- **Данные о контакте**: должность, последние публикации
- **Детали поисковых запросов**: что искали и что нашли
- **AI-рекомендации**: персонализированные советы по работе с контактом

### 6. 🤖 Генерация AI-рекомендаций

1. В карточке контакта нажмите **"Сгенерировать рекомендации"**
2. Выберите модель AI:
   - **GPT-4o**: максимальное качество анализа
   - **GPT-3.5-turbo**: быстрые рекомендации
3. Получите персонализированные рекомендации:
   - Стратегии контакта
   - Ключевые точки для обсуждения
   - Потенциальные решения для клиента

### 7. 📊 Экспорт данных

1. В карточке контакта найдите раздел **"Рекомендации"**
2. Нажмите кнопку **"Экспорт"**
3. Выберите формат:
   - **JSON**: для интеграции с другими системами
   - **Markdown**: для документации
   - **PDF**: для презентаций

## 🔧 Установка и настройка

### Системные требования

- **ОС**: Linux, macOS, Windows
- **Node.js**: версия 18 или выше
- **PostgreSQL**: версия 13 или выше
- **Память**: минимум 2GB RAM
- **Дисковое пространство**: 1GB свободного места

### Детальная установка

#### 1. Подготовка окружения

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm postgresql postgresql-contrib

# macOS (с Homebrew)
brew install node postgresql

# Запуск PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

#### 2. Настройка базы данных

```sql
-- Создание пользователя и базы данных
sudo -u postgres psql

CREATE USER b2b_user WITH PASSWORD 'secure_password';
CREATE DATABASE b2b_sales_platform OWNER b2b_user;
GRANT ALL PRIVILEGES ON DATABASE b2b_sales_platform TO b2b_user;
\q
```

#### 3. Конфигурационные файлы

**package.json** (основные скрипты):
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.ts",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate"
  }
}
```

**drizzle.config.ts** (конфигурация ORM):
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

#### 4. Получение API ключей

**AmoCRM**:
1. Войдите в админ-панель AmoCRM
2. Перейдите в Настройки → Интеграции → API
3. Создайте новую интеграцию
4. Получите Access Token и поддомен

**Brave Search**:
1. Зарегистрируйтесь на [Brave Search API](https://api.search.brave.com/)
2. Создайте API ключ в личном кабинете
3. Выберите подходящий тарифный план

**Perplexity AI**:
1. Зарегистрируйтесь на [Perplexity API](https://www.perplexity.ai/api)
2. Получите API ключ в настройках аккаунта
3. Настройте лимиты использования

**OpenAI**:
1. Создайте аккаунт на [OpenAI Platform](https://platform.openai.com/)
2. Сгенерируйте API ключ в разделе API Keys
3. Убедитесь в наличии доступа к GPT-4o

## 🛠️ Сопровождение

### Мониторинг системы

#### Логирование
Система ведет подробные логи всех операций:

```bash
# Просмотр логов в реальном времени
npm run dev

# Уровни логирования:
# - INFO: общая информация о работе
# - WARN: предупреждения о потенциальных проблемах  
# - ERROR: ошибки выполнения операций
```

#### Проверка состояния API
```bash
# Проверка доступности внешних сервисов
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models
curl -H "X-Subscription-Token: YOUR_KEY" https://api.search.brave.com/res/v1/web/search?q=test
```

### Резервное копирование

#### База данных
```bash
# Создание бэкапа
pg_dump -h localhost -U b2b_user -d b2b_sales_platform > backup_$(date +%Y%m%d).sql

# Восстановление из бэкапа
psql -h localhost -U b2b_user -d b2b_sales_platform < backup_20240101.sql
```

#### Файлы конфигурации
```bash
# Резервное копирование важных файлов
tar -czf config_backup_$(date +%Y%m%d).tar.gz .env package.json drizzle.config.ts
```

### Обновление системы

#### Обновление зависимостей
```bash
# Проверка устаревших пакетов
npm outdated

# Обновление пакетов
npm update

# Обновление мажорных версий (осторожно!)
npx npm-check-updates -u
npm install
```

#### Миграция базы данных
```bash
# При изменении схемы
npm run db:generate  # Генерация миграций
npm run db:push      # Применение изменений
```

### Решение проблем

#### Частые проблемы и решения

**1. Ошибка подключения к базе данных**
```bash
# Проверьте строку подключения
echo $DATABASE_URL

# Проверьте доступность PostgreSQL
pg_isready -h localhost -p 5432
```

**2. Ошибки API ключей**
```bash
# Проверьте валидность ключей в настройках
# Убедитесь в корректности лимитов использования
# Проверьте сетевое подключение к внешним сервисам
```

**3. Проблемы с производительностью**
```sql
-- Анализ медленных запросов
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Создание индексов для ускорения
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_amocrm_id ON contacts(amocrm_id);
```

### Масштабирование

#### Горизонтальное масштабирование
- Использование балансировщика нагрузки (nginx)
- Репликация базы данных PostgreSQL
- Кэширование с Redis для сессий

#### Вертикальное масштабирование
- Увеличение ресурсов сервера (CPU, RAM)
- Оптимизация запросов к базе данных
- Настройка пула соединений

## 🔌 API и интеграции

### Основные эндпоинты

```typescript
// Аутентификация
POST /api/register      // Регистрация пользователя
POST /api/login         // Вход в систему
POST /api/logout        // Выход из системы
GET  /api/user          // Текущий пользователь

// Управление контактами
GET  /api/contacts                    // Список контактов
GET  /api/contacts/:id               // Детали контакта
POST /api/contacts/:id/collect-data  // Сбор данных
POST /api/contacts/:id/recommendations // Генерация рекомендаций

// Настройки
GET  /api/keys          // Статус API ключей
POST /api/keys          // Обновление ключей
GET  /api/settings      // Настройки пользователя
POST /api/settings      // Сохранение настроек
```

### Структура данных

#### Контакт
```typescript
interface Contact {
  id: number;
  userId: number;
  amoCrmId: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  status?: string;
  amoCrmData?: any;           // Сырые данные из AmoCRM
  collectedData?: {           // Собранные данные
    industry?: string;
    revenue?: string;
    employees?: string;
    products?: string;
    jobTitle?: string;
    socialPosts?: Array<{
      platform: string;
      date: string;
      content: string;
    }>;
    companySummary?: string;
    contactSummary?: string;
    searchQueries?: Array<{
      service: 'brave' | 'perplexity';
      query: string;
      response: string;
      timestamp: string;
    }>;
  };
  recommendations?: any;       // AI рекомендации
  lastUpdated: Date;
}
```

---

## 📞 Поддержка и контакты

Если у вас возникли вопросы или проблемы с использованием платформы:

1. **Документация**: Проверьте данный README
2. **Issues**: Создайте issue в репозитории GitHub
3. **Логи**: Приложите логи ошибок при обращении в поддержку

---

<div align="center">

**Создано с ❤️ для эффективных B2B продаж**

[⬆ Наверх](#-b2b-sales-intelligence-platform)

</div>