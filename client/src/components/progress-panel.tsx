import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronUp, ChevronDown, Settings, Check, Loader2 } from "lucide-react";

interface ProgressPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  currentStage?: 'company' | 'contact' | 'analysis' | null;
}

export default function ProgressPanel({ isVisible, onToggle, currentStage }: ProgressPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStageStatus = (stageKey: string) => {
    if (!currentStage) return "pending";
    
    const stageOrder = ["company", "contact", "analysis"];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageKey);
    
    if (stageIndex < currentIndex) return "completed";
    if (stageIndex === currentIndex) return "running";
    return "pending";
  };

  const progressSteps = [
    {
      key: "company",
      title: "Поиск информации о компании",
      query: "запрос вида \"<Компания> отрасль выручка сотрудники основные продукты 2025\"",
      status: getStageStatus("company"),
      progress: getStageStatus("company") === "running" ? 60 : (getStageStatus("company") === "completed" ? 100 : 0),
      result: getStageStatus("company") === "completed" ? "✓ Найдены: отрасль, выручка, количество сотрудников, основные продукты" : null
    },
    {
      key: "contact",
      title: "Поиск контактной информации",
      query: "запрос вида \"<ФИО> должность в <Компания> 3 последние публикации в соц сетях\"",
      status: getStageStatus("contact"),
      progress: getStageStatus("contact") === "running" ? 60 : (getStageStatus("contact") === "completed" ? 100 : 0),
      result: getStageStatus("contact") === "completed" ? "✓ Найдена должность и социальные публикации" : null
    },
    {
      key: "analysis",
      title: "Анализ данных с помощью ИИ",
      query: "извлечение должности и публикаций из результатов поиска",
      status: getStageStatus("analysis"),
      progress: getStageStatus("analysis") === "running" ? 60 : (getStageStatus("analysis") === "completed" ? 100 : 0),
      result: getStageStatus("analysis") === "completed" ? "✓ Данные проанализированы и структурированы" : null
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4 text-white" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-white animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "running":
        return "bg-blue-500";
      default:
        return "bg-gray-300";
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-3 text-blue-500" />
            Сбор данных в процессе
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className={`w-8 h-8 ${getStatusColor(step.status)} rounded-full flex items-center justify-center mt-1`}>
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {step.query}
                  </p>
                  {step.status === "running" && (
                    <div className="mt-2">
                      <Progress value={step.progress} className="h-2" />
                    </div>
                  )}
                  {step.result && (
                    <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                      {step.result}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
