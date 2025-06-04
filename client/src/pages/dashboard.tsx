import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import ContactCard from "@/components/contact-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, WifiOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Contact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: contacts, isLoading, error, refetch } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: apiKeys } = useQuery({
    queryKey: ["/api/keys"],
  });

  const filteredContacts = contacts?.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Успешно",
        description: "Список контактов обновлен",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить список контактов",
        variant: "destructive",
      });
    }
  };

  const isAmoCrmConnected = apiKeys?.hasAmoCrmKey;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Контакты</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Управление клиентской базой из AmoCRM
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isAmoCrmConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-500 dark:text-gray-400">
                  {isAmoCrmConnected ? 'AmoCRM подключен' : 'AmoCRM не настроен'}
                </span>
              </div>
              {isAmoCrmConnected && (
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {!isAmoCrmConnected ? (
            <div className="text-center py-12">
              <WifiOff className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                AmoCRM не настроен
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Для работы с контактами необходимо настроить подключение к AmoCRM в настройках
              </p>
              <Link href="/settings">
                <Button>Перейти к настройкам</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Поиск по имени или компании..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 py-3"
                  />
                </div>
              </div>

              {/* Contact List */}
              {isLoading ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        <div className="flex-1">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/3"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 dark:text-red-400 mb-4">
                    <WifiOff className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Ошибка загрузки контактов
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Проверьте подключение к AmoCRM или обновите API ключи
                  </p>
                  <Button onClick={handleRefresh}>Попробовать снова</Button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 dark:text-gray-600 mb-4">
                    <Search className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {searchTerm ? 'Контакты не найдены' : 'Нет контактов'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm 
                      ? 'Попробуйте изменить поисковый запрос' 
                      : 'Контакты из AmoCRM появятся здесь после синхронизации'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredContacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
