import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set document title and meta tags
document.title = "B2B Sales Assistant - AmoCRM Integration";
document.querySelector('meta[name="description"]')?.setAttribute('content', 
  'Интеллектуальный помощник для B2B продаж с интеграцией AmoCRM, автоматическим сбором данных и AI-рекомендациями для повышения эффективности встреч'
);

// Add Open Graph tags
const ogTags = [
  { property: 'og:title', content: 'B2B Sales Assistant - AmoCRM Integration' },
  { property: 'og:description', content: 'Увеличьте продажи с помощью ИИ-анализа клиентов и персонализированных рекомендаций' },
  { property: 'og:type', content: 'website' },
  { property: 'og:image', content: '/og-image.jpg' },
];

ogTags.forEach(tag => {
  const meta = document.createElement('meta');
  meta.setAttribute('property', tag.property);
  meta.setAttribute('content', tag.content);
  document.head.appendChild(meta);
});

createRoot(document.getElementById("root")!).render(<App />);
