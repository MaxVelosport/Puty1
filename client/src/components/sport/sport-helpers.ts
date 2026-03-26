export function getSportLabel(key: string): string {
  const labels: Record<string, string> = {
    gym: "Зал", running: "Бег", swimming: "Плавание", cycling: "Велоспорт",
    yoga: "Йога", boxing: "Бокс", crossfit: "Кроссфит", calisthenics: "Калистеника",
    stretching: "Растяжка", martial_arts: "Единоборства", dancing: "Танцы", other: "Другое",
  };
  return labels[key] || key;
}

export function getTypeLabel(key: string): string {
  const labels: Record<string, string> = {
    strength: "Силовая", cardio: "Кардио", hiit: "HIIT", functional: "Функциональная",
    flexibility: "Растяжка", endurance: "Выносливость", power: "Мощность",
    hypertrophy: "Гипертрофия", other: "Другое",
  };
  return labels[key] || key;
}

export function getSportIcon(key: string): string {
  const icons: Record<string, string> = {
    gym: "🏋️", running: "🏃", swimming: "🏊", cycling: "🚴",
    yoga: "🧘", boxing: "🥊", crossfit: "💪", calisthenics: "🤸",
    stretching: "🤸‍♀️", martial_arts: "🥋", dancing: "💃", other: "⚡",
  };
  return icons[key] || "⚡";
}
