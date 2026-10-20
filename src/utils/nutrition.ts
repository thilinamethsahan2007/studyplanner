import { DayLog, DayMeals, FoodItem, MealType, NutritionTargets } from '../types';

export const DEFAULT_TARGETS: NutritionTargets = {
  dailyCalories: 2200,
  proteinGrams: 155,
  carbsGrams: 235,
  fatGrams: 70,
  fiberGrams: 30,
};

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): { main: string; relative: string } {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const todayStr = getTodayDateString();

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    const main = dateObj.toLocaleDateString('en-US', options);

    let relative = '';
    if (dateStr === todayStr) {
      relative = 'Today';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(y, m - 1, d);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === -1) relative = 'Yesterday';
      else if (diffDays === 1) relative = 'Tomorrow';
      else if (diffDays < 0) relative = `${Math.abs(diffDays)} days ago`;
      else relative = `in ${diffDays} days`;
    }

    return { main, relative };
  } catch {
    return { main: dateStr, relative: '' };
  }
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + deltaDays);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeSuggestedMeal(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 21) return 'dinner';
  return 'snacks';
}

export function sumNutrients(items: FoodItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      protein: acc.protein + (Number(item.protein) || 0),
      carbs: acc.carbs + (Number(item.carbs) || 0),
      fat: acc.fat + (Number(item.fat) || 0),
      fiber: acc.fiber + (Number(item.fiber) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export function sumDayNutrients(meals: DayMeals) {
  const allItems = [
    ...(meals.breakfast || []),
    ...(meals.lunch || []),
    ...(meals.dinner || []),
    ...(meals.snacks || []),
  ];
  return sumNutrients(allItems);
}

export function getInitialSeedData(dateStr: string): DayLog {
  return {
    date: dateStr,
    meals: {
      breakfast: [
        {
          id: 'seed-item-1',
          name: 'Rolled Oats with Berries & Honey',
          portionDescription: '1 cup cooked oats with 1/2 cup fresh blueberries and 1 tbsp honey',
          calories: 285,
          protein: 8.5,
          carbs: 58.0,
          fat: 3.5,
          fiber: 6.2,
          confidenceNotes: 'Standard whole grain oats with antioxidant-rich berries',
          loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: 'seed-item-2',
          name: 'Scrambled Eggs with Avocado',
          portionDescription: '2 large eggs cooked with 1/4 avocado on the side',
          calories: 220,
          protein: 14.0,
          carbs: 3.5,
          fat: 16.5,
          fiber: 3.2,
          confidenceNotes: 'High biological value protein and monounsaturated healthy fats',
          loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 3.8).toISOString(),
        },
      ],
      lunch: [
        {
          id: 'seed-item-3',
          name: 'Grilled Herb Chicken Breast',
          portionDescription: '170g grilled skinless chicken breast',
          calories: 280,
          protein: 52.0,
          carbs: 0.0,
          fat: 6.2,
          fiber: 0.0,
          confidenceNotes: 'Lean USDA poultry estimate with light seasoning',
          loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
        },
        {
          id: 'seed-item-4',
          name: 'Steamed Jasmine Rice & Broccoli',
          portionDescription: '1 cup cooked rice with 1 cup steamed garlic broccoli',
          calories: 250,
          protein: 6.0,
          carbs: 52.0,
          fat: 1.2,
          fiber: 4.5,
          confidenceNotes: 'Complex carbohydrates and cruciferous micronutrients',
          loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.4).toISOString(),
        },
      ],
      dinner: [],
      snacks: [],
    },
  };
}
