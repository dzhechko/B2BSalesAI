import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Download, Upload, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const playbookSchema = z.object({
  playbook: z.string().min(1, "Справочник не может быть пустым"),
});

type PlaybookForm = z.infer<typeof playbookSchema>;

type UserSettingsData = {
  theme: string;
  playbook: string;
  preferences: Record<string, any>;
};

export default function Playbook() {
  const [activeTab, setActiveTab] = useState("edit");
  const { toast } = useToast();

  const { data: userSettings, isLoading } = useQuery<UserSettingsData>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<PlaybookForm>({
    resolver: zodResolver(playbookSchema),
    defaultValues: {
      playbook: userSettings?.playbook || "",
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (userSettings?.playbook) {
      form.setValue("playbook", userSettings.playbook);
    }
  }, [userSettings, form]);

  const updatePlaybookMutation = useMutation({
    mutationFn: async (data: PlaybookForm) => {
      const response = await apiRequest("POST", "/api/settings", {
        playbook: data.playbook,
        theme: userSettings?.theme || "light",
        preferences: userSettings?.preferences || {},
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Успешно",
        description: "Справочник продуктов сохранен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PlaybookForm) => {
    updatePlaybookMutation.mutate(data);
  };

  const handleExport = () => {
    const playbookData = form.getValues("playbook");
    if (!playbookData) {
      toast({
        title: "Ошибка",
        description: "Нет данных для экспорта",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([playbookData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playbook.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Успешно",
      description: "Справочник продуктов экспортирован",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      form.setValue("playbook", content);
      toast({
        title: "Успешно",
        description: "Справочник продуктов импортирован",
      });
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Справочник продуктов
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Управление информацией о продуктах и услугах для AI рекомендаций
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Редактирование</span>
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Управление</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Редактирование справочника</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Опишите ваши продукты и услуги для более точных AI рекомендаций
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                      <Label htmlFor="playbook">Справочник продуктов</Label>
                      <Textarea
                        id="playbook"
                        placeholder="Опишите ваши продукты, услуги, ценности компании, преимущества и ключевые сообщения для клиентов..."
                        className="min-h-[400px] mt-2"
                        {...form.register("playbook")}
                      />
                      {form.formState.errors.playbook && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {form.formState.errors.playbook.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updatePlaybookMutation.isPending}
                        className="flex items-center space-x-2"
                      >
                        {updatePlaybookMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>Сохранить</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Управление файлами</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Импорт и экспорт справочника продуктов
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="import">Импорт справочника</Label>
                      <div className="mt-2">
                        <Input
                          id="import"
                          type="file"
                          accept=".txt,.md"
                          onChange={handleImport}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Поддерживаются файлы .txt и .md
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <Label>Экспорт справочника</Label>
                      <div className="mt-2">
                        <Button
                          onClick={handleExport}
                          variant="outline"
                          className="flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Скачать справочник</span>
                        </Button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Сохранить справочник как текстовый файл
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}