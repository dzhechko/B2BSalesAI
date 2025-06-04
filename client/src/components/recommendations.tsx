import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Copy, BarChart, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  title: string;
  description: string;
  rationale: string;
  benefits: string;
}

interface RecommendationsProps {
  recommendations: {
    recommendations?: Recommendation[];
  };
  onRegenerate: (model: string) => void;
  isGenerating: boolean;
}

export default function Recommendations({ recommendations, onRegenerate, isGenerating }: RecommendationsProps) {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (!recommendations.recommendations) return;

    const text = recommendations.recommendations
      .map((rec, index) => 
        `${index + 1}. ${rec.title}\n\n${rec.description}\n\nПочему подходит: ${rec.rationale}\n\nВыгоды: ${rec.benefits}\n\n`
      )
      .join('---\n\n');

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано",
        description: "Рекомендации скопированы в буфер обмена",
      });
    });
  };

  const getRecommendationColor = (index: number) => {
    const colors = [
      "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
      "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20", 
      "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20"
    ];
    return colors[index] || colors[0];
  };

  const getNumberColor = (index: number) => {
    const colors = ["bg-green-500", "bg-blue-500", "bg-purple-500"];
    return colors[index] || colors[0];
  };

  if (!recommendations.recommendations || recommendations.recommendations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-3 text-yellow-500" />
            AI Рекомендации
          </CardTitle>
          <div className="flex items-center space-x-3">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
                <SelectItem value="o1-mini">o1-mini</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate(selectedModel)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4 mr-2" />
              )}
              Перегенерировать
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
            >
              <Copy className="w-4 h-4 mr-2" />
              Копировать
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recommendations.recommendations.map((rec, index) => (
            <div key={index} className={`border rounded-xl p-6 ${getRecommendationColor(index)}`}>
              <div className="flex items-start space-x-4">
                <div className={`w-8 h-8 ${getNumberColor(index)} rounded-full flex items-center justify-center text-white font-bold`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    {rec.title}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {rec.description}
                  </p>
                  {rec.rationale && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Почему подходит клиенту:
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        {rec.rationale}
                      </p>
                    </div>
                  )}
                  {rec.benefits && (
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center">
                        <BarChart className="w-4 h-4 mr-1" />
                        {rec.benefits}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
            <Lightbulb className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            Рекомендации основаны на анализе деятельности компании, должности контакта и его недавних публикаций в социальных сетях.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
