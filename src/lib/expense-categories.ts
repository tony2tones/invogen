export const EXPENSE_CATEGORIES = [
  'Fuel & Travel',
  'Rent & Utilities',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Office Supplies',
  'Salaries & Wages',
  'Insurance',
  'Professional Fees',
  'Bank & Card Charges',
  'Stock & Materials',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const CATEGORY_COLORS: Record<string, string> = {
  'Fuel & Travel': 'bg-amber-500',
  'Rent & Utilities': 'bg-blue-500',
  'Software & Subscriptions': 'bg-violet-500',
  'Marketing & Advertising': 'bg-pink-500',
  'Office Supplies': 'bg-teal-500',
  'Salaries & Wages': 'bg-indigo-500',
  Insurance: 'bg-cyan-500',
  'Professional Fees': 'bg-orange-500',
  'Bank & Card Charges': 'bg-red-500',
  'Stock & Materials': 'bg-lime-500',
  Other: 'bg-gray-400',
};

export function categoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? 'bg-gray-400';
}
