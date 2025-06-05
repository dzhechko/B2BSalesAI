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
      res.json(settings || { 
        theme: "light", 
        playbook: null, 
        searchSystems: ["brave", "perplexity"],
        preferences: {} 
      });
    } catch (error) {
      console.error('Failed to get user settings:', error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedSettings = insertUserSettingsSchema.parse(req.body);
      const settings = await storage.createOrUpdateUserSettings(req.user!.id, validatedSettings);
      res.json(settings);
    } catch (error) {
      console.error('Failed to update user settings:', error);
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Contacts from AmoCRM
  app.get("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const apiKeys = await storage.getApiKeys(req.user!.id);
      if (!apiKeys?.amoCrmApiKey || !apiKeys?.amoCrmSubdomain) {
        return res.status(400).json({ message: "AmoCRM credentials not configured" });
      }

      // Fetch contacts from AmoCRM with companies embedded
      const amoCrmResponse = await fetch(`https://${apiKeys.amoCrmSubdomain}.amocrm.ru/api/v4/contacts?with=companies`, {
        headers: {
          'Authorization': `Bearer ${apiKeys.amoCrmApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!amoCrmResponse.ok) {
        throw new Error(`AmoCRM API error: ${amoCrmResponse.status}`);
      }

      const amoCrmData = await amoCrmResponse.json();
      const contacts = amoCrmData._embedded?.contacts || [];

      // Store/update contacts in our database
      const processedContacts = [];
      for (const contact of contacts) {
        // Extract company name from embedded companies or fetch separately
        let companyName = '';
        if (contact._embedded?.companies?.[0]) {
          const embeddedCompany = contact._embedded.companies[0];
          companyName = embeddedCompany.name || '';
          
          // If no name in embedded data, fetch full company details
          if (!companyName && embeddedCompany.id) {
            try {
              const companyResponse = await fetch(`https://${apiKeys.amoCrmSubdomain}.amocrm.ru/api/v4/companies/${embeddedCompany.id}`, {
                headers: {
                  'Authorization': `Bearer ${apiKeys.amoCrmApiKey}`,
                  'Content-Type': 'application/json',
                },
              });
              if (companyResponse.ok) {
                const companyData = await companyResponse.json();
                companyName = companyData.name || '';
                console.log(`Fetched company name: ${companyName} for contact ${contact.name}`);
              }
            } catch (error) {
              console.error(`Failed to fetch company ${embeddedCompany.id}:`, error);
            }
          }
        }

        const processedContact = await storage.createOrUpdateContact({
          userId: req.user!.id,
          amoCrmId: contact.id.toString(),
          name: contact.name,
          email: extractContactField(contact, 'EMAIL'),
          phone: extractContactField(contact, 'PHONE'),
          position: extractContactField(contact, 'POSITION'),
          company: companyName || extractContactField(contact, 'COMPANY'),
          status: getContactStatus(contact),
          amoCrmData: contact,
          collectedData: null,
          recommendations: null,
        });
        processedContacts.push(processedContact);
      }

      res.json(processedContacts);
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
      
      console.log('Enabled systems:', enabledSystems);
      console.log('Has Brave API key:', !!apiKeys?.braveSearchApiKey);
      console.log('Has Perplexity API key:', !!apiKeys?.perplexityApiKey);
      console.log('Brave enabled:', hasBraveEnabled);
      console.log('Perplexity enabled:', hasPerplexityEnabled);
      
      if (!hasBraveEnabled && !hasPerplexityEnabled) {
        return res.status(400).json({ message: "No search systems configured or enabled in settings" });
      }

      const collectedData: SearchResult = {
        searchQueries: []
      };

      // Extract company name from AmoCRM data if not set
      let companyName = contact.company;
      if (!companyName && contact.amoCrmData) {
        const amoCrmData = contact.amoCrmData as any;
        if (amoCrmData._embedded?.companies?.[0]) {
          // Fetch company details from AmoCRM
          const companyId = amoCrmData._embedded.companies[0].id;
          try {
            const companyResponse = await fetch(`https://${apiKeys.amoCrmSubdomain}.amocrm.ru/api/v4/companies/${companyId}`, {
              headers: {
                'Authorization': `Bearer ${apiKeys.amoCrmApiKey}`,
                'Content-Type': 'application/json',
              },
            });
            if (companyResponse.ok) {
              const companyData = await companyResponse.json();
              companyName = companyData.name;
              console.log(`Extracted company name from AmoCRM: ${companyName}`);
            }
          } catch (error) {
            console.error('Failed to fetch company from AmoCRM:', error);
          }
        }
      }

      // Search for company information
      let companySearchResults = [];
      if (companyName) {
        const companyQuery = `${companyName} отрасль выручка доходы сотрудники основные продукты финансовые результаты`;
        console.log(`Starting data collection for company: ${companyName}`);
        console.log(`Search query: ${companyQuery}`);
        
        if (hasBraveEnabled) {
          console.log('Using Brave Search API');
          try {
            const braveResult = await searchWithBrave(companyQuery, apiKeys.braveSearchApiKey!);
            console.log('Brave Search result:', braveResult);
            if (braveResult) {
              collectedData.industry = braveResult.industry;
              collectedData.revenue = braveResult.revenue;
              collectedData.employees = braveResult.employees;
              collectedData.products = braveResult.products;
              companySearchResults.push(`Brave Search: ${JSON.stringify(braveResult)}`);
              
              // Save detailed query and response
              collectedData.searchQueries!.push({
                service: 'brave',
                query: companyQuery,
                response: JSON.stringify(braveResult),
                fullResponse: braveResult.fullResponse,
                timestamp: new Date().toISOString()
              });
            } else {
              console.log('Brave Search returned null - check API key or quota');
              // Still save the query attempt even if it failed
              collectedData.searchQueries!.push({
                service: 'brave',
                query: companyQuery,
                response: 'Поиск не выполнен - проверьте API ключ или квоту',
                fullResponse: 'Ошибка выполнения запроса',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Brave Search error:', error);
            collectedData.searchQueries!.push({
              service: 'brave',
              query: companyQuery,
              response: `Ошибка: ${error instanceof Error ? error.message : String(error)}`,
              fullResponse: 'Ошибка выполнения запроса',
              timestamp: new Date().toISOString()
            });
          }
        }

        if (hasPerplexityEnabled) {
          console.log('Using Perplexity API');
          const perplexityResult = await searchWithPerplexity(companyQuery, apiKeys.perplexityApiKey!);
          console.log('Perplexity Search result:', perplexityResult);
          if (perplexityResult) {
            // Perplexity has priority - overwrite data from Brave Search if better
            collectedData.industry = perplexityResult.industry || collectedData.industry;
            collectedData.revenue = perplexityResult.revenue || collectedData.revenue;
            collectedData.employees = perplexityResult.employees || collectedData.employees;
            collectedData.products = perplexityResult.products || collectedData.products;
            companySearchResults.push(`Perplexity: ${JSON.stringify(perplexityResult)}`);
            
            // Save detailed query and response
            collectedData.searchQueries!.push({
              service: 'perplexity',
              query: companyQuery,
              response: JSON.stringify(perplexityResult),
              fullResponse: perplexityResult.fullResponse,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Use GPT-4o to extract structured company data from search results
        if (apiKeys.openaiApiKey && companySearchResults.length > 0) {
          const openai = new OpenAI({ apiKey: apiKeys.openaiApiKey });
          const dataExtractionPrompt = `
Извлеки структурированную информацию о компании "${companyName}" из результатов поиска:

${companySearchResults.join('\n\n')}

Верни ответ строго в JSON формате:
{
  "industry": "точная отрасль деятельности",
  "revenue": "выручка с цифрами и валютой",
  "employees": 50000,
  "products": ["продукт 1", "продукт 2", "продукт 3"]
}

ПРИМЕРЫ ПРАВИЛЬНЫХ ЗНАЧЕНИЙ:
- revenue: "500 млрд руб", "1,2 трлн руб", "$50 billion", null
- employees: 50000, 120000, 75000, null
- products: ["Поисковая система", "Маркетплейс", "Такси"]

КРИТИЧЕСКИ ВАЖНЫЕ ТРЕБОВАНИЯ:
- Если информации нет, ставь null
- Для выручки: ищи ТОЛЬКО ЧИСЛА с валютой (например: "100 млрд руб", "5,2 трлн руб", "$10 billion"). Если точных цифр нет - ставь null
- Для сотрудников: ищи ТОЛЬКО ЧИСТЫЕ ЧИСЛА (например: 50000, 120000). Если точного числа нет - ставь null
- Для отрасли: одно точное название ("Информационные технологии", "Финансовые услуги", и т.д.)
- Для продуктов: список основных направлений без лишних слов
- НЕ извлекай фрагменты текста или неполные фразы
- НЕ путай разные типы данных между собой`;

          try {
            const extractionResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: dataExtractionPrompt }],
              temperature: 0.1,
              response_format: { type: "json_object" },
            });
            
            const extractedData = JSON.parse(extractionResponse.choices[0].message.content || '{}');
            console.log('GPT-4o extracted company data:', extractedData);
            
            // Override parsed data with LLM-extracted data
            collectedData.industry = extractedData.industry || collectedData.industry;
            collectedData.revenue = extractedData.revenue || collectedData.revenue;
            collectedData.employees = extractedData.employees || collectedData.employees;
            collectedData.products = extractedData.products || collectedData.products;
            
          } catch (error) {
            console.error('Failed to extract company data with GPT-4o:', error);
          }
        }

        // Generate company summary using GPT-4o
        if (apiKeys.openaiApiKey && companySearchResults.length > 0) {
          const openai = new OpenAI({ apiKey: apiKeys.openaiApiKey });
          const companyPrompt = `
Создай краткое саммари данных о компании ${companyName} на основе результатов поиска:

${companySearchResults.join('\n\n')}

Саммари должно быть структурированным и включать:
- Отрасль деятельности
- Финансовые показатели
- Размер компании
- Ключевые продукты/услуги

Ответь коротким текстом на русском языке (максимум 150 слов).`;

          try {
            const summaryResponse = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "user", content: companyPrompt }],
              temperature: 0.3,
            });
            
            collectedData.companySummary = summaryResponse.choices[0].message.content || undefined;
          } catch (error) {
            console.error('Failed to generate company summary:', error);
          }
        }
      } else {
        console.log('No company name found for contact');
      }

      // Search for contact information
      let contactSearchResults = [];
      if (contact.name && companyName) {
        const contactQuery = `${contact.name} должность в ${companyName} 3 последние публикации в соц сетях`;
        console.log(`Starting contact search: ${contactQuery}`);
        
        if (hasBraveEnabled) {
          try {
            const braveContactResult = await searchWithBrave(contactQuery, apiKeys.braveSearchApiKey!);
            if (braveContactResult) {
              collectedData.jobTitle = braveContactResult.jobTitle;
              collectedData.socialPosts = braveContactResult.socialPosts;
              contactSearchResults.push(`Brave Search: ${JSON.stringify(braveContactResult)}`);
              
              // Save detailed query and response
              collectedData.searchQueries!.push({
                service: 'brave',
                query: contactQuery,
                response: JSON.stringify(braveContactResult),
                fullResponse: braveContactResult.fullResponse,
                timestamp: new Date().toISOString()
              });
            } else {
              console.log('Brave Contact Search returned null - check API key or quota');
              collectedData.searchQueries!.push({
                service: 'brave',
                query: contactQuery,
                response: 'Поиск контакта не выполнен - проверьте API ключ или квоту',
                fullResponse: 'Ошибка выполнения запроса',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Brave Contact Search error:', error);
            collectedData.searchQueries!.push({
              service: 'brave',
              query: contactQuery,
              response: `Ошибка поиска контакта: ${error instanceof Error ? error.message : String(error)}`,
              fullResponse: 'Ошибка выполнения запроса',
              timestamp: new Date().toISOString()
            });
          }
        }

        if (hasPerplexityEnabled) {
          const perplexityContactResult = await searchWithPerplexity(contactQuery, apiKeys.perplexityApiKey!);
          if (perplexityContactResult) {
            // Perplexity has priority for contact data too
            collectedData.jobTitle = perplexityContactResult.jobTitle || collectedData.jobTitle;
            collectedData.socialPosts = perplexityContactResult.socialPosts || collectedData.socialPosts;
            contactSearchResults.push(`Perplexity: ${JSON.stringify(perplexityContactResult)}`);
            
            // Save detailed query and response
            collectedData.searchQueries!.push({
              service: 'perplexity',
              query: contactQuery,
              response: JSON.stringify(perplexityContactResult),
              fullResponse: perplexityContactResult.fullResponse,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Use GPT-4o to extract structured contact data from search results
        if (apiKeys.openaiApiKey && contactSearchResults.length > 0) {
          const openai = new OpenAI({ apiKey: apiKeys.openaiApiKey });
          const contactDataExtractionPrompt = `
Извлеки структурированную информацию о контакте "${contact.name}" из компании "${companyName}" из результатов поиска:

${contactSearchResults.join('\n\n')}

Верни ответ строго в JSON формате:
{
  "jobTitle": "точная должность контакта",
  "socialPosts": [
    {
      "platform": "название платформы",
      "date": "дата публикации",
      "content": "содержание поста"
    }
  ]
}

Требования:
- Если информации нет, ставь null
- Для должности используй точное название позиции
- Для социальных постов найди максимум 3 последние публикации
- Даты в формате DD.MM.YYYY`;

          try {
            const contactExtractionResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: contactDataExtractionPrompt }],
              temperature: 0.1,
              response_format: { type: "json_object" },
            });
            
            const extractedContactData = JSON.parse(contactExtractionResponse.choices[0].message.content || '{}');
            console.log('GPT-4o extracted contact data:', extractedContactData);
            
            // Override parsed data with LLM-extracted data
            collectedData.jobTitle = extractedContactData.jobTitle || collectedData.jobTitle;
            collectedData.socialPosts = extractedContactData.socialPosts || collectedData.socialPosts;
            
          } catch (error) {
            console.error('Failed to extract contact data with GPT-4o:', error);
          }
        }

        // Generate contact summary using GPT-4o
        if (apiKeys.openaiApiKey && contactSearchResults.length > 0) {
          const openai = new OpenAI({ apiKey: apiKeys.openaiApiKey });
          const contactPrompt = `
Создай краткое резюме данных о контакте ${contact.name} из компании ${companyName} на основе результатов поиска:

${contactSearchResults.join('\n\n')}

Резюме должно включать:
- Текущую должность
- Профессиональную активность
- Ключевые темы публикаций

Ответь коротким текстом на русском языке (максимум 100 слов).`;

          try {
            const contactSummaryResponse = await openai.chat.completions.create({
              model: "gpt-4o", 
              messages: [{ role: "user", content: contactPrompt }],
              temperature: 0.3,
            });
            
            collectedData.contactSummary = contactSummaryResponse.choices[0].message.content || undefined;
          } catch (error) {
            console.error('Failed to generate contact summary:', error);
          }
        }
      }

      console.log('Final collected data:', collectedData);

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
        recommendations: contact.recommendations as any,
      });

      console.log('Updated contact with collected data');
      res.json(updatedContact);
    } catch (error) {
      console.error('Failed to collect data:', error);
      res.status(500).json({ message: "Failed to collect data" });
    }
  });

  // Generate recommendations
  app.post("/api/contacts/:id/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { model = "gpt-4o" } = req.body;
      const contact = await storage.getContact(parseInt(req.params.id), req.user!.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const apiKeys = await storage.getApiKeys(req.user!.id);
      if (!apiKeys?.openaiApiKey) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      const settings = await storage.getUserSettings(req.user!.id);
      const playbook = settings?.playbook || getDefaultPlaybook();

      const openai = new OpenAI({ apiKey: apiKeys.openaiApiKey });

      const prompt = `
Ты - эксперт по B2B продажам. На основе следующей информации создай 3 персонализированные рекомендации продуктов для продажи:

СПРАВОЧНИК ПРОДУКТОВ:
${playbook}

ИНФОРМАЦИЯ О КОМПАНИИ:
- Название: ${contact.company}
- Отрасль: ${(contact.collectedData as any)?.industry || 'Не указана'}
- Выручка: ${(contact.collectedData as any)?.revenue || 'Не указана'}
- Количество сотрудников: ${(contact.collectedData as any)?.employees || 'Не указано'}
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
}
`;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: model,
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
  
  // Map field types to field codes and names
  const fieldMapping: Record<string, string[]> = {
    'PHONE': ['PHONE', 'Телефон'],
    'EMAIL': ['EMAIL', 'Email'],
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
            content: 'Ты - эксперт по анализу компаний. Извлеки структурированную информацию из поискового запроса и верни в JSON формате.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.2,
        return_related_questions: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      const result = parsePerplexityResponse(content);
      result.fullResponse = JSON.stringify(data, null, 2);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Perplexity Search failed:', error);
    return null;
  }
}

function parseSearchResults(results: any[]): SearchResult {
  if (!results || results.length === 0) {
    console.log('No search results to parse');
    return {};
  }
  
  const combinedText = results.map(r => `${r.title || ''} ${r.description || ''} ${r.snippet || ''}`).join(' ').toLowerCase();
  console.log('Combined search text for parsing:', combinedText.substring(0, 200) + '...');
  
  const result = {
    industry: extractIndustry(combinedText),
    revenue: extractRevenue(combinedText),
    employees: extractEmployees(combinedText),
    products: extractProducts(combinedText),
    jobTitle: extractJobTitle(combinedText),
    socialPosts: extractSocialPosts(results),
  };
  
  console.log('Parsed search results:', result);
  return result;
}

function parsePerplexityResponse(content: string): SearchResult {
  // Parse Perplexity's structured response
  try {
    return JSON.parse(content);
  } catch {
    // Fallback to text parsing
    return {
      industry: extractIndustry(content),
      revenue: extractRevenue(content),
      employees: extractEmployees(content),
      products: extractProducts(content),
      jobTitle: extractJobTitle(content),
    };
  }
}

function extractIndustry(text: string): string | undefined {
  const patterns = [
    /отрасль[:\s]*([^.,\n]+)/i,
    /сфера[:\s]*([^.,\n]+)/i,
    /индустрия[:\s]*([^.,\n]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return undefined;
}

function extractRevenue(text: string): string | undefined {
  const patterns = [
    /выручка[:\s]*([^.,\n]+)/i,
    /доход[:\s]*([^.,\n]+)/i,
    /оборот[:\s]*([^.,\n]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return undefined;
}

function extractEmployees(text: string): string | undefined {
  const patterns = [
    /сотрудник[ов]*[:\s]*([^.,\n]+)/i,
    /персонал[:\s]*([^.,\n]+)/i,
    /штат[:\s]*([^.,\n]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return undefined;
}

function extractProducts(text: string): string | undefined {
  const patterns = [
    /продукт[ыи]*[:\s]*([^.,\n]+)/i,
    /услуг[аи]*[:\s]*([^.,\n]+)/i,
    /решени[яе]*[:\s]*([^.,\n]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return undefined;
}

function extractJobTitle(text: string): string | undefined {
  const patterns = [
    /должность[:\s]*([^.,\n]+)/i,
    /позиция[:\s]*([^.,\n]+)/i,
    /директор[:\s]*([^.,\n]*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
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
