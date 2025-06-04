import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import Sidebar from "@/components/sidebar";
import ProgressPanel from "@/components/progress-panel";
import Recommendations from "@/components/recommendations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Lightbulb, Building, User, Database } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Contact } from "@shared/schema";

interface CollectedData {
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
    fullResponse?: string;
    timestamp: string;
  }>;
}
import { useToast } from "@/hooks/use-toast";

export default function ContactDetail() {
  const [, params] = useRoute("/contact/:id");
  const contactId = parseInt(params?.id || "0");
  const [showProgress, setShowProgress] = useState(false);
  const { toast } = useToast();

  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: [`/api/contacts/${contactId}`],
    enabled: !!contactId,
  });

  const collectDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/collect-data`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}`] });
      setShowProgress(false);
      toast({
        title: "Успешно",
        description: "Данные собраны",
      });
    },
    onError: (error) => {
      setShowProgress(false);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateRecommendationsMutation = useMutation({
    mutationFn: async (model: string) => {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/recommendations`, { model });
      return response.json();
    },
    onSuccess: (data) => {
      // Update contact in cache with new recommendations
      queryClient.setQueryData([`/api/contacts/${contactId}`], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            recommendations: data
          };
        }
        return oldData;
      });
      
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}`] });
      
      toast({
        title: "Успешно",
        description: "Рекомендации сгенерированы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCollectData = () => {
    setShowProgress(true);
    collectDataMutation.mutate();
  };

  const handleGenerateRecommendations = (model: string) => {
    generateRecommendationsMutation.mutate(model);
  };

  if (isLoading || !contact) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'активный': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'новый': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'в процессе': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const hasCollectedData = contact.collectedData && Object.keys(contact.collectedData).length > 0;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к списку
              </Button>
            </Link>
            
            {/* Contact Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-2xl font-semibold">
                      {getInitials(contact.name)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                      {contact.name}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
                      {contact.position || 'Должность не указана'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Компания:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contact.company || 'Не указана'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Email:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contact.email || 'Не указан'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Телефон:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contact.phone || 'Не указан'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Статус:</span>
                        <Badge className={`ml-2 ${getStatusColor(contact.status || '')}`}>
                          {contact.status || 'Не указан'}
                        </Badge>
                      </div>
                      {/* LinkedIn Field */}
                      {(contact.amoCrmData as any)?.custom_fields_values?.find((field: any) => 
                        field.field_name?.toLowerCase().includes('linkedin'))?.values?.[0]?.value && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">LinkedIn:</span>
                          <p className="font-medium text-blue-600 dark:text-blue-400">
                            <a 
                              href={(contact.amoCrmData as any)?.custom_fields_values?.find((field: any) => 
                                field.field_name?.toLowerCase().includes('linkedin'))?.values?.[0]?.value}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {(contact.amoCrmData as any)?.custom_fields_values?.find((field: any) => 
                                field.field_name?.toLowerCase().includes('linkedin'))?.values?.[0]?.value}
                            </a>
                          </p>
                        </div>
                      )}
                      {/* VK Field */}
                      {(contact.amoCrmData as any)?.custom_fields_values?.find((field: any) => 
                        field.field_name?.toLowerCase().includes('вк'))?.values?.[0]?.value && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">ВКонтакте:</span>
                          <p className="font-medium text-blue-600 dark:text-blue-400">
                            <a 
                              href={(contact.amoCrmData as any)?.custom_fields_values?.find((field: any) => 
                                field.field_name?.toLowerCase().includes('вк'))?.values?.[0]?.value}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {(contact.amoCrmData as any)?.custom_fields_values?.find((field: any) => 
                                field.field_name?.toLowerCase().includes('вк'))?.values?.[0]?.value}
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AmoCRM Data */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-3 text-primary-500" />
                Данные из AmoCRM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Контактная информация
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">AmoCRM ID:</span>
                      <span className="text-gray-900 dark:text-white">{contact.amoCrmId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Последнее обновление:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(contact.lastUpdated).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Дополнительные данные
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Id:</span>
                      <span className="text-gray-900 dark:text-white">{(contact.amoCrmData as any)?.id || 'Не найдено'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Name:</span>
                      <span className="text-gray-900 dark:text-white">{(contact.amoCrmData as any)?.name || 'Не найдено'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Links:</span>
                      <span className="text-gray-900 dark:text-white">{(contact.amoCrmData as any)?._links ? 'Есть' : 'Нет'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Group Id:</span>
                      <span className="text-gray-900 dark:text-white">{(contact.amoCrmData as any)?.group_id || 'Не найдено'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4 mb-6">
            <Button 
              onClick={handleCollectData}
              disabled={collectDataMutation.isPending}
              className="flex-1 py-4 text-lg"
            >
              <Search className="w-5 h-5 mr-3" />
              {collectDataMutation.isPending ? 'Собираем данные...' : 'Собрать данные'}
            </Button>
            <Button 
              onClick={() => handleGenerateRecommendations('gpt-4o')}
              disabled={!hasCollectedData || generateRecommendationsMutation.isPending}
              variant={hasCollectedData ? "default" : "secondary"}
              className="flex-1 py-4 text-lg"
            >
              <Lightbulb className="w-5 h-5 mr-3" />
              {generateRecommendationsMutation.isPending ? 'Генерируем...' : 'Рекомендации'}
              {!hasCollectedData && (
                <span className="text-sm ml-2">(после сбора данных)</span>
              )}
            </Button>
          </div>

          {/* Progress Panel */}
          {showProgress && (
            <ProgressPanel 
              isVisible={showProgress}
              onToggle={() => setShowProgress(!showProgress)}
            />
          )}

          {/* Results Section */}
          {hasCollectedData && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Company Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-3 text-primary-500" />
                    Данные о компании
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(contact.collectedData as CollectedData)?.companySummary && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                          РЕЗЮМЕ КОМПАНИИ
                        </span>
                        <p className="mt-2 text-gray-900 dark:text-white leading-relaxed">
                          {(contact.collectedData as CollectedData).companySummary}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        ОТРАСЛЬ
                      </span>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {(contact.collectedData as CollectedData)?.industry || 'Не найдено'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        ВЫРУЧКА
                      </span>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {(contact.collectedData as CollectedData)?.revenue || 'Не найдено'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        КОЛИЧЕСТВО СОТРУДНИКОВ
                      </span>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {(contact.collectedData as CollectedData)?.employees || 'Не найдено'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        ОСНОВНЫЕ ПРОДУКТЫ
                      </span>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {(contact.collectedData as CollectedData)?.products || 'Не найдено'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-3 text-accent-400" />
                    Данные о контакте
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(contact.collectedData as CollectedData)?.contactSummary && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                          РЕЗЮМЕ КОНТАКТА
                        </span>
                        <p className="mt-2 text-gray-900 dark:text-white leading-relaxed">
                          {(contact.collectedData as CollectedData).contactSummary}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        ДОЛЖНОСТЬ
                      </span>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {(contact.collectedData as CollectedData)?.jobTitle || contact.position || 'Не найдено'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        ПОСЛЕДНИЕ ПУБЛИКАЦИИ
                      </span>
                      <div className="mt-2 space-y-2">
                        {(contact.collectedData as CollectedData)?.socialPosts && (contact.collectedData as CollectedData).socialPosts!.length > 0 ? (
                          (contact.collectedData as CollectedData).socialPosts!.slice(0, 3).map((post: any, index: number) => (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {post.platform} • {post.date}
                              </p>
                              <p className="text-gray-600 dark:text-gray-300 mt-1">
                                {post.content.length > 100 
                                  ? `${post.content.substring(0, 100)}...` 
                                  : post.content
                                }
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400">Публикации не найдены</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search Queries and Responses */}
          {(contact.collectedData as CollectedData)?.searchQueries && (contact.collectedData as CollectedData).searchQueries!.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="w-5 h-5 mr-3 text-yellow-500" />
                  Запросы и ответы от поисковых сервисов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(contact.collectedData as CollectedData).searchQueries!.map((searchQuery, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            searchQuery.service === 'brave' 
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                          }`}>
                            {searchQuery.service === 'brave' ? 'Brave Search' : 'Perplexity AI'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(searchQuery.timestamp).toLocaleString('ru-RU')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Запрос:
                          </span>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded border">
                            {searchQuery.query}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Извлеченные данные:
                          </span>
                          <div className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded border">
                            {(() => {
                              try {
                                const data = JSON.parse(searchQuery.response);
                                return (
                                  <div className="space-y-2">
                                    {data.industry && (
                                      <div className="flex">
                                        <span className="font-medium w-24">Отрасль:</span>
                                        <span>{data.industry}</span>
                                      </div>
                                    )}
                                    {data.revenue && (
                                      <div className="flex">
                                        <span className="font-medium w-24">Выручка:</span>
                                        <span>{data.revenue}</span>
                                      </div>
                                    )}
                                    {data.employees && (
                                      <div className="flex">
                                        <span className="font-medium w-24">Сотрудники:</span>
                                        <span>{data.employees}</span>
                                      </div>
                                    )}
                                    {data.products && (
                                      <div className="flex">
                                        <span className="font-medium w-24">Продукты:</span>
                                        <span>{data.products}</span>
                                      </div>
                                    )}
                                    {data.jobTitle && (
                                      <div className="flex">
                                        <span className="font-medium w-24">Должность:</span>
                                        <span>{data.jobTitle}</span>
                                      </div>
                                    )}
                                    {data.socialPosts && data.socialPosts.length > 0 && (
                                      <div>
                                        <span className="font-medium">Публикации:</span>
                                        <ul className="mt-1 space-y-1">
                                          {data.socialPosts.filter((post: any) => post && post.platform && post.content).map((post: any, idx: number) => (
                                            <li key={idx} className="text-sm pl-4">
                                              • {post.platform}: {post.content}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              } catch (e) {
                                return <span className="text-gray-500">Ошибка парсинга данных</span>;
                              }
                            })()}
                          </div>
                        </div>
                        
                        {searchQuery.fullResponse && (
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Полный ответ от поисковой системы:
                            </span>
                            <div className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded border max-h-60 overflow-y-auto">
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {JSON.stringify(JSON.parse(searchQuery.fullResponse), null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {contact.recommendations && (
            <Recommendations 
              recommendations={contact.recommendations}
              onRegenerate={handleGenerateRecommendations}
              isGenerating={generateRecommendationsMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
