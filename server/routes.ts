import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertApiKeysSchema, insertUserSettingsSchema } from "@shared/schema";
import OpenAI from "openai";

interface AmoCRMContact {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  custom_fields_values?: Array<{
    field_id: number;
    field_name: string;
    field_code?: string;
    field_type: string;
    values: Array<{ 
      value: string;
      enum_id?: number;
      enum_code?: string;
    }>;
  }>;
  company?: {
    name: string;
  };
  _embedded?: {
    companies?: Array<{
      id: number;
      name?: string;
      _links?: any;
    }>;
    tags?: Array<any>;
  };
}

interface SearchResult {
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
  fullResponse?: string;
  searchQueries?: Array<{
    service: 'brave' | 'perplexity';
    query: string;
    response: string;
    fullResponse?: string;
    timestamp: string;
  }>;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // API Keys management
  app.get("/api/keys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const keys = await storage.getApiKeys(req.user!.id);
      // Don't send actual key values, just indicate if they exist
      res.json({
        hasAmoCrmToken: !!(keys?.amoCrmApiKey),
        hasOpenAiKey: !!(keys?.openaiApiKey),
        hasBraveSearchKey: !!(keys?.braveSearchApiKey),
        hasPerplexityKey: !!(keys?.perplexityApiKey),
        amoCrmSubdomain: keys?.amoCrmSubdomain || null,
      });
    } catch (error) {
      console.error('Failed to get API keys:', error);
      res.status(500).json({ message: "Failed to get API keys" });
    }
  });

  app.post("/api/keys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedKeys = insertApiKeysSchema.parse(req.body);
      await storage.createOrUpdateApiKeys(req.user!.id, validatedKeys);
      res.json({ message: "API keys updated successfully" });
    } catch (error) {
      console.error('Failed to update API keys:', error);
      res.status(400).json({ message: "Invalid API keys data" });
    }
  });

  // User settings
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const settings = await storage.getUserSettings(req.user!.id);
      res.json({
        theme: settings?.theme || 'light',
        playbook: settings?.playbook || getDefaultPlaybook(),
        preferences: settings?.preferences || {},
      });
    } catch (error) {
      console.error('Failed to get settings:', error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedSettings = insertUserSettingsSchema.parse(req.body);
      await storage.createOrUpdateUserSettings(req.user!.id, validatedSettings);
      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error('Failed to update settings:', error);
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Contacts management
  app.get("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const apiKeys = await storage.getApiKeys(req.user!.id);
      if (!apiKeys?.amoCrmApiKey || !apiKeys?.amoCrmSubdomain) {
        return res.status(400).json({ message: "AmoCRM credentials not configured" });
      }

      // Fetch contacts from AmoCRM
      const response = await fetch(`https://${apiKeys.amoCrmSubdomain}.amocrm.ru/api/v4/contacts?limit=20`, {
        headers: {
          'Authorization': `Bearer ${apiKeys.amoCrmApiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`AmoCRM API error: ${response.status}`);
      }

      const data = await response.json();
      const amoCrmContacts = data._embedded?.contacts || [];

      // Store/update contacts in local database
      const contacts = [];
      for (const amoCrmContact of amoCrmContacts) {
        let companyName = amoCrmContact.company?.name;
        
        // Try to get company from embedded companies
        if (!companyName && amoCrmContact._embedded?.companies?.length > 0) {
          const companyId = amoCrmContact._embedded.companies[0].id;
          try {
            const companyResponse = await fetch(`https://${apiKeys.amoCrmSubdomain}.amocrm.ru/api/v4/companies/${companyId}`, {
              headers: {
                'Authorization': `Bearer ${apiKeys.amoCrmApiKey}`,
              },
            });
            if (companyResponse.ok) {
              const companyData = await companyResponse.json();
              companyName = companyData.name;
              console.log(`Fetched company name: ${companyName} for contact ${amoCrmContact.name}`);
            }
          } catch (error) {
            console.error(`Failed to fetch company ${companyId}:`, error);
          }
        }

        const contact = await storage.createOrUpdateContact({
          userId: req.user!.id,
          amoCrmId: amoCrmContact.id.toString(),
          name: amoCrmContact.name,
          email: extractContactField(amoCrmContact, 'EMAIL'),
          phone: extractContactField(amoCrmContact, 'PHONE'),
          position: extractContactField(amoCrmContact, 'POSITION'),
          company: companyName,
          status: getContactStatus(amoCrmContact),
          amoCrmData: amoCrmContact as any,
        });
        contacts.push(contact);
      }

      res.json(contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      res.status(500).json({ message: "Failed to fetch contacts from AmoCRM" });
    }
  });

  // Get specific contact
  app.get("/api/contacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contact = await storage.getContact(parseInt(req.params.id), req.user!.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error('Failed to get contact:', error);
      res.status(500).json({ message: "Failed to get contact" });
    }
  });

  // Collect data for a contact
  app.post("/api/contacts/:id/collect-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contact = await storage.getContact(parseInt(req.params.id), req.user!.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const apiKeys = await storage.getApiKeys(req.user!.id);
      const userSettings = await storage.getUserSettings(req.user!.id);
      
      // Get enabled search systems from user settings
      const enabledSystems = (userSettings?.searchSystems as string[]) || ["brave", "perplexity"];
      
      // Check that at least one enabled system has API credentials
      const hasBraveEnabled = enabledSystems.includes("brave") && apiKeys?.braveSearchApiKey;
      const hasPerplexityEnabled = enabledSystems.includes("perplexity") && apiKeys?.perplexityApiKey;
      
      if (!hasBraveEnabled && !hasPerplexityEnabled) {
        return res.status(400).json({ message: "No search systems configured or enabled in settings" });
      }

      const collectedData: SearchResult = {
        searchQueries: []
      };

      // Extract company name from AmoCRM data if not set
      let companyName = contact.company;
      if (!companyName && contact.amoCrmData) {
        const amoCrmData = contact.amoCrmData as AmoCRMContact;
        companyName = amoCrmData.company?.name || amoCrmData._embedded?.companies?.[0]?.name;
      }

      // Company search query
      if (companyName) {
        const companyQuery = `${companyName} отрасль выручка сотрудники основные продукты 2025`;
        
        // Search with enabled systems
        if (hasBraveEnabled) {
          const braveResult = await searchWithBrave(companyQuery, apiKeys!.braveSearchApiKey!);
          if (braveResult) {
            collectedData.searchQueries!.push({
              service: 'brave',
              query: companyQuery,
              response: JSON.stringify(braveResult),
              fullResponse: braveResult.fullResponse,
              timestamp: new Date().toISOString()
            });
            // Merge company data
            Object.assign(collectedData, braveResult);
          }
        }
        
        if (hasPerplexityEnabled) {
          const perplexityResult = await searchWithPerplexity(companyQuery, apiKeys!.perplexityApiKey!);
          if (perplexityResult) {
            collectedData.searchQueries!.push({
              service: 'perplexity',
              query: companyQuery,
              response: JSON.stringify(perplexityResult),
              fullResponse: perplexityResult.fullResponse,
              timestamp: new Date().toISOString()
            });
            // Merge company data (Perplexity takes precedence)
            Object.assign(collectedData, perplexityResult);
          }
        }
      }

      // Contact search query
      if (contact.name && companyName) {
        const contactQuery = `${contact.name} должность в ${companyName} 3 последние публикации в соц сетях`;
        
        if (hasBraveEnabled) {
          const braveResult = await searchWithBrave(contactQuery, apiKeys!.braveSearchApiKey!);
          if (braveResult) {
            collectedData.searchQueries!.push({
              service: 'brave',
              query: contactQuery,
              response: JSON.stringify(braveResult),
              fullResponse: braveResult.fullResponse,
              timestamp: new Date().toISOString()
            });
            // Merge contact-specific data
            if (braveResult.jobTitle) collectedData.jobTitle = braveResult.jobTitle;
            if (braveResult.socialPosts) collectedData.socialPosts = braveResult.socialPosts;
            if (braveResult.contactSummary) collectedData.contactSummary = braveResult.contactSummary;
          }
        }
        
        if (hasPerplexityEnabled) {
          const perplexityResult = await searchWithPerplexity(contactQuery, apiKeys!.perplexityApiKey!);
          if (perplexityResult) {
            collectedData.searchQueries!.push({
              service: 'perplexity',
              query: contactQuery,
              response: JSON.stringify(perplexityResult),
              fullResponse: perplexityResult.fullResponse,
              timestamp: new Date().toISOString()
            });
            // Merge contact-specific data (Perplexity takes precedence)
            if (perplexityResult.jobTitle) collectedData.jobTitle = perplexityResult.jobTitle;
            if (perplexityResult.socialPosts) collectedData.socialPosts = perplexityResult.socialPosts;
            if (perplexityResult.contactSummary) collectedData.contactSummary = perplexityResult.contactSummary;
          }
        }
      }

      console.log('Collected data:', collectedData);
      
      // Update contact with collected data
      const updatedContact = await storage.createOrUpdateContact({
        userId: contact.userId,
        amoCrmId: contact.amoCrmId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        company: contact.company,
        status: contact.status,
        amoCrmData: contact.amoCrmData as any,
        collectedData: collectedData as any,
      });
      
      console.log('Updated contact with collected data');

      res.json(updatedContact);
    } catch (error) {
      console.error('Failed to collect data:', error);
      res.status(500).json({ message: "Failed to collect data" });
    }
  });

  // Generate recommendations for a contact
  app.post("/api/contacts/:id/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contact = await storage.getContact(parseInt(req.params.id), req.user!.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const apiKeys = await storage.getApiKeys(req.user!.id);
      if (!apiKeys?.openaiApiKey) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      const userSettings = await storage.getUserSettings(req.user!.id);
      const playbook = userSettings?.playbook || getDefaultPlaybook();

      const openai = new OpenAI({ apiKey: apiKeys.openaiApiKey });

      const prompt = `
Ты - эксперт по B2B продажам. На основе данных о клиенте и справочника продуктов создай персонализированные рекомендации.

${playbook}

ИНФОРМАЦИЯ О КОМПАНИИ:
- Название: ${contact.company || 'Не указано'}
- Отрасль: ${(contact.collectedData as any)?.industry || 'Не указана'}
- Выручка: ${(contact.collectedData as any)?.revenue || 'Не указана'}
- Сотрудники: ${(contact.collectedData as any)?.employees || 'Не указано'}
- Основные продукты: ${(contact.collectedData as any)?.products || 'Не указаны'}

ИНФОРМАЦИЯ О КОНТАКТЕ:
- Имя: ${contact.name}
- Должность: ${contact.position || (contact.collectedData as any)?.jobTitle || 'Не указана'}
- Последние публикации: ${(contact.collectedData as any)?.socialPosts?.map((post: any) => post.content).join('; ') || 'Нет данных'}

Для каждой рекомендации укажи:
1. Название продукта/решения
2. Краткое описание (2-3 предложения)
3. Почему это подходит именно этому клиенту
4. Потенциальную выгоду или ROI

Ответь в формате JSON:
{
  "recommendations": [
    {
      "title": "Название продукта",
      "description": "Описание решения",
      "rationale": "Почему подходит клиенту",
      "benefits": "Потенциальные выгоды"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const rawContent = response.choices[0].message.content || '{}';
      console.log('OpenAI response content:', rawContent);
      
      const recommendations = JSON.parse(rawContent);
      console.log('Parsed recommendations:', recommendations);

      // Update contact with recommendations
      const updatedContact = await storage.createOrUpdateContact({
        userId: contact.userId,
        amoCrmId: contact.amoCrmId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        company: contact.company,
        status: contact.status,
        amoCrmData: contact.amoCrmData as any,
        collectedData: contact.collectedData as any,
        recommendations: recommendations as any,
      });
      
      console.log('Updated contact with recommendations:', updatedContact.id);

      res.json(recommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function extractContactField(contact: AmoCRMContact, fieldType: string): string | undefined {
  if (!contact.custom_fields_values) return undefined;
  
  // Map field types to possible field codes/names
  const fieldMapping: Record<string, string[]> = {
    'EMAIL': ['EMAIL', 'E-mail', 'Электронная почта'],
    'PHONE': ['PHONE', 'Телефон', 'Phone'],
    'POSITION': ['POSITION', 'Должность'],
    'COMPANY': ['COMPANY', 'Компания'],
  };
  
  const searchTerms = fieldMapping[fieldType] || [fieldType];
  
  const field = contact.custom_fields_values.find(field => 
    searchTerms.some(term => 
      field.field_code === term || 
      field.field_name?.includes(term)
    )
  );
  
  return field?.values?.[0]?.value;
}

function getContactStatus(contact: AmoCRMContact): string {
  // Simple status mapping - could be enhanced based on AmoCRM status fields
  return "Активный";
}

async function searchWithBrave(query: string, apiKey: string): Promise<SearchResult | null> {
  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse search results to extract structured data
    const result = parseSearchResults(data.web?.results || []);
    result.fullResponse = JSON.stringify(data, null, 2);
    
    return result;
  } catch (error) {
    console.error('Brave Search failed:', error);
    return null;
  }
}

async function searchWithPerplexity(query: string, apiKey: string): Promise<SearchResult | null> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по анализу компаний и контактов. Извлекай структурированную информацию из поисковых результатов.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        search_recency_filter: 'month',
        return_images: false,
        return_related_questions: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse Perplexity response to extract structured data
    const result = parsePerplexityResponse(content);
    result.fullResponse = JSON.stringify(data, null, 2);
    
    return result;
  } catch (error) {
    console.error('Perplexity Search failed:', error);
    return null;
  }
}

function parseSearchResults(results: any[]): SearchResult {
  const combinedText = results.map(r => r.title + ' ' + r.description).join(' ');
  
  return {
    industry: extractIndustry(combinedText),
    revenue: extractRevenue(combinedText),
    employees: extractEmployees(combinedText),
    products: extractProducts(combinedText),
    jobTitle: extractJobTitle(combinedText),
    socialPosts: extractSocialPosts(results),
  };
}

function parsePerplexityResponse(content: string): SearchResult {
  // Use OpenAI to extract structured data from Perplexity response
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // For now, do basic extraction - this could be enhanced with OpenAI parsing
  return {
    industry: extractIndustry(content),
    revenue: extractRevenue(content),
    employees: extractEmployees(content),
    products: extractProducts(content),
    jobTitle: extractJobTitle(content),
    companySummary: content.substring(0, 500) + '...',
    contactSummary: content.substring(0, 300) + '...',
  };
}

function extractIndustry(text: string): string | undefined {
  const industryPatterns = [
    /отрасл[ьи]?\s*[:\-]?\s*([а-яё\s]+)/i,
    /сфер[ае]\s*деятельности\s*[:\-]?\s*([а-яё\s]+)/i,
    /индустри[яи]\s*[:\-]?\s*([а-яё\s]+)/i,
  ];
  
  for (const pattern of industryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().split(/[,.]/)[0];
    }
  }
  
  return undefined;
}

function extractRevenue(text: string): string | undefined {
  const revenuePatterns = [
    /выручк[ае]\s*[:\-]?\s*([\d\s,]+[\s]?(?:млрд|млн|тыс)?\.?\s?рубл)/i,
    /оборот\s*[:\-]?\s*([\d\s,]+[\s]?(?:млрд|млн|тыс)?\.?\s?рубл)/i,
    /доход\s*[:\-]?\s*([\d\s,]+[\s]?(?:млрд|млн|тыс)?\.?\s?рубл)/i,
  ];
  
  for (const pattern of revenuePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

function extractEmployees(text: string): string | undefined {
  const employeePatterns = [
    /сотрудник[ио]в?\s*[:\-]?\s*([\d\s,]+)/i,
    /персонал[а]?\s*[:\-]?\s*([\d\s,]+)/i,
    /штат\s*[:\-]?\s*([\d\s,]+)/i,
  ];
  
  for (const pattern of employeePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

function extractProducts(text: string): string | undefined {
  const productPatterns = [
    /продукт[ыа]?\s*[:\-]?\s*([а-яё\s,]+)/i,
    /услуг[ии]?\s*[:\-]?\s*([а-яё\s,]+)/i,
    /решени[яе]\s*[:\-]?\s*([а-яё\s,]+)/i,
  ];
  
  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().split(/[.!?]/)[0];
    }
  }
  
  return undefined;
}

function extractJobTitle(text: string): string | undefined {
  const titlePatterns = [
    /должност[ьи]\s*[:\-]?\s*([а-яё\s]+)/i,
    /позици[яи]\s*[:\-]?\s*([а-яё\s]+)/i,
    /роль\s*[:\-]?\s*([а-яё\s]+)/i,
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().split(/[,.]/)[0];
    }
  }
  
  return undefined;
}

function extractSocialPosts(results: any[]): Array<{ platform: string; date: string; content: string }> {
  // Simple extraction for social media posts
  return results
    .filter(r => r.url?.includes('linkedin') || r.url?.includes('facebook') || r.url?.includes('twitter'))
    .slice(0, 3)
    .map(r => ({
      platform: r.url?.includes('linkedin') ? 'LinkedIn' : 'Social Media',
      date: new Date().toLocaleDateString('ru-RU'),
      content: r.description || r.title || '',
    }));
}

function getDefaultPlaybook(): string {
  return `
СПРАВОЧНИК ПРОДУКТОВ И УСЛУГ:

1. Система управления закупками с ИИ-аналитикой
   - Автоматизация процессов закупок
   - Оптимизация затрат на 15-20%
   - Анализ поставщиков и рисков
   - Интеграция с ERP-системами
   - Целевая аудитория: Крупные компании, банки, ритейл

2. Аналитическая BI-платформа
   - Бизнес-аналитика и отчетность
   - Прогнозирование и планирование
   - Интеграция данных из разных источников
   - Дашборды и визуализация
   - Целевая аудитория: Все отрасли, особенно финансы и ритейл

3. Система управления поставщиками
   - Оценка и мониторинг поставщиков
   - Управление рисками и соответствием
   - Автоматизация тендерных процессов
   - Интеграция с закупочными системами
   - Целевая аудитория: Производство, строительство, IT

4. Платформа для управления документооборотом
   - Электронный документооборот
   - Цифровые подписи и согласования
   - Архивирование и поиск документов
   - Интеграция с корпоративными системами
   - Целевая аудитория: Все отрасли

5. CRM система для B2B продаж
   - Управление клиентской базой
   - Автоматизация продаж
   - Аналитика эффективности
   - Интеграция с маркетинговыми инструментами
   - Целевая аудитория: B2B компании всех размеров

УНИКАЛЬНЫЕ ПРЕИМУЩЕСТВА:
- Быстрое внедрение (от 2 недель)
- Высокий ROI (окупаемость 6-18 месяцев)
- Российская разработка и поддержка
- Соответствие требованиям безопасности
- Гибкая настройка под бизнес-процессы
`;
}