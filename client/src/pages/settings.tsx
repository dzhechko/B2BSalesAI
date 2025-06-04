import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Key, Palette, FileText, Check, X } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertApiKeysSchema, insertUserSettingsSchema } from "@shared/schema";

const apiKeysFormSchema = insertApiKeysSchema;
const settingsFormSchema = insertUserSettingsSchema;

type ApiKeysForm = z.infer<typeof apiKeysFormSchema>;
type SettingsForm = z.infer<typeof settingsFormSchema>;

type ApiKeysStatus = {
  hasAmoCrmToken: boolean;
  hasOpenAiKey: boolean;
  hasBraveSearchKey: boolean;
  hasPerplexityKey: boolean;
  amoCrmSubdomain: string;
};

type UserSettingsData = {
  theme: string;
  playbook: string;
  preferences: Record<string, any>;
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("keys");
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const { data: apiKeysStatus } = useQuery<ApiKeysStatus>({
    queryKey: ["/api/keys"],
  });

  const { data: userSettings } = useQuery<UserSettingsData>({
    queryKey: ["/api/settings"],
  });

  const apiKeysForm = useForm<ApiKeysForm>({
    resolver: zodResolver(apiKeysFormSchema),
    defaultValues: {
      amoCrmApiKey: "",
      amoCrmSubdomain: "",
      openaiApiKey: "",
      braveSearchApiKey: "",
      perplexityApiKey: "",
    },
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      theme: theme,
      playbook: "",
      preferences: {},
    },
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (apiKeysStatus) {
      // Only set subdomain if it exists, otherwise leave empty
      if (apiKeysStatus.amoCrmSubdomain) {
        apiKeysForm.setValue("amoCrmSubdomain", apiKeysStatus.amoCrmSubdomain);
      }
    }
  }, [apiKeysStatus, apiKeysForm]);

  useEffect(() => {
    if (userSettings) {
      settingsForm.setValue("theme", userSettings.theme || theme);
      settingsForm.setValue("playbook", userSettings.playbook || "");
      settingsForm.setValue("preferences", userSettings.preferences || {});
    }
  }, [userSettings, settingsForm, theme]);

  const updateApiKeysMutation = useMutation({
    mutationFn: async (data: ApiKeysForm) => {
      const response = await apiRequest("POST", "/api/keys", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "Успешно",
        description: "API ключи обновлены",
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

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Успешно",
        description: "Настройки сохранены",
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

  const onUpdateApiKeys = (data: ApiKeysForm) => {
    updateApiKeysMutation.mutate(data);
  };

  const onUpdateSettings = (data: SettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? "dark" : "light";
    setTheme(newTheme);
    settingsForm.setValue("theme", newTheme);
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Настройки</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Управление API ключами и настройками приложения
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="keys" className="flex items-center space-x-2">
                  <Key className="w-4 h-4" />
                  <span>API Ключи</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center space-x-2">
                  <Palette className="w-4 h-4" />
                  <span>Внешний вид</span>
                </TabsTrigger>
                <TabsTrigger value="playbook" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Справочник</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="keys" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>API Ключи</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Настройте подключение к внешним сервисам. Все ключи хранятся в зашифрованном виде.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={apiKeysForm.handleSubmit(onUpdateApiKeys)} className="space-y-6" autoComplete="off">
                      {/* AmoCRM */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">AmoCRM</Label>
                          {apiKeysStatus?.hasAmoCrmToken ? (
                            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Настроено</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                              <X className="w-4 h-4" />
                              <span className="text-sm">Не настроено</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="amocrm-subdomain">Поддомен</Label>
                            <Input
                              id="amocrm-subdomain"
                              placeholder="mycompany (из mycompany.amocrm.ru)"
                              autoComplete="off"
                              {...apiKeysForm.register("amoCrmSubdomain")}
                            />
                          </div>
                          <div>
                            <Label htmlFor="amocrm-key">Access Token</Label>
                            <Input
                              id="amocrm-key"
                              type="password"
                              placeholder="Введите Access Token AmoCRM"
                              autoComplete="new-password"
                              {...apiKeysForm.register("amoCrmApiKey")}
                            />
                          </div>
                        </div>
                      </div>

                      {/* OpenAI */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="openai-key" className="text-base font-medium">OpenAI</Label>
                          {apiKeysStatus?.hasOpenAiKey ? (
                            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Настроено</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                              <X className="w-4 h-4" />
                              <span className="text-sm">Не настроено</span>
                            </div>
                          )}
                        </div>
                        <Input
                          id="openai-key"
                          type="password"
                          placeholder="Введите API ключ OpenAI"
                          autoComplete="new-password"
                          {...apiKeysForm.register("openaiApiKey")}
                        />
                      </div>

                      {/* Brave Search */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="brave-key" className="text-base font-medium">
                            Brave Search <span className="text-sm text-gray-500">(опционально)</span>
                          </Label>
                          {apiKeysStatus?.hasBraveSearchKey ? (
                            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Настроено</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                              <X className="w-4 h-4" />
                              <span className="text-sm">Не настроено</span>
                            </div>
                          )}
                        </div>
                        <Input
                          id="brave-key"
                          type="password"
                          placeholder="Введите API ключ Brave Search"
                          autoComplete="new-password"
                          {...apiKeysForm.register("braveSearchApiKey")}
                        />
                      </div>

                      {/* Perplexity */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="perplexity-key" className="text-base font-medium">
                            Perplexity <span className="text-sm text-gray-500">(опционально)</span>
                          </Label>
                          {apiKeysStatus?.hasPerplexityKey ? (
                            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                              <Check className="w-4 h-4" />
                              <span className="text-sm">Настроено</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                              <X className="w-4 h-4" />
                              <span className="text-sm">Не настроено</span>
                            </div>
                          )}
                        </div>
                        <Input
                          id="perplexity-key"
                          type="password"
                          placeholder="Введите API ключ Perplexity"
                          autoComplete="new-password"
                          {...apiKeysForm.register("perplexityApiKey")}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={updateApiKeysMutation.isPending}
                        className="w-full"
                      >
                        {updateApiKeysMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Сохранить API ключи
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appearance" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Внешний вид</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Настройте тему и другие параметры интерфейса
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={settingsForm.handleSubmit(onUpdateSettings)} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Темная тема</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Включить темный режим интерфейса
                          </p>
                        </div>
                        <Switch
                          checked={theme === "dark"}
                          onCheckedChange={handleThemeChange}
                        />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">Системы поиска</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Выберите поисковые системы для сбора данных. API ключи требуются только для выбранных систем.
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <Label className="font-medium">Brave Search</Label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Основной веб-поиск и индексация
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={settingsForm.watch("searchSystems")?.includes?.("brave") ?? true}
                              onCheckedChange={(checked) => {
                                const current = settingsForm.getValues("searchSystems") || ["brave", "perplexity"];
                                if (checked) {
                                  settingsForm.setValue("searchSystems", [...current.filter(s => s !== "brave"), "brave"]);
                                } else {
                                  settingsForm.setValue("searchSystems", current.filter(s => s !== "brave"));
                                }
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <Label className="font-medium">Perplexity Deep Search</Label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  AI-поиск с анализом и синтезом информации
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={settingsForm.watch("searchSystems")?.includes?.("perplexity") ?? true}
                              onCheckedChange={(checked) => {
                                const current = settingsForm.getValues("searchSystems") || ["brave", "perplexity"];
                                if (checked) {
                                  settingsForm.setValue("searchSystems", [...current.filter(s => s !== "perplexity"), "perplexity"]);
                                } else {
                                  settingsForm.setValue("searchSystems", current.filter(s => s !== "perplexity"));
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={updateSettingsMutation.isPending}
                        className="w-full"
                      >
                        {updateSettingsMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Сохранить настройки
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="playbook" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Справочник продуктов</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Настройте справочник продуктов для генерации персонализированных рекомендаций
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={settingsForm.handleSubmit(onUpdateSettings)} className="space-y-6">
                      <div>
                        <Label htmlFor="playbook">Справочник продуктов</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Опишите ваши продукты, целевую аудиторию и уникальные преимущества
                        </p>
                        <Textarea
                          id="playbook"
                          rows={15}
                          placeholder="Введите описание ваших продуктов и услуг..."
                          {...settingsForm.register("playbook")}
                          className="font-mono text-sm"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={updateSettingsMutation.isPending}
                        className="w-full"
                      >
                        {updateSettingsMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Сохранить справочник
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
