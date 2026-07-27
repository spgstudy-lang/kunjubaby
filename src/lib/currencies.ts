export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee (INR)", flag: "🇮🇳" },
  { code: "USD", symbol: "$", name: "US Dollar (USD)", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro (EUR)", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound (GBP)", flag: "🇬🇧" },
  { code: "AED", symbol: "AED", name: "UAE Dirham (AED)", flag: "🇦🇪" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal (SAR)", flag: "🇸🇦" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar (CAD)", flag: "🇨🇦" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar (AUD)", flag: "🇦🇺" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen (JPY)", flag: "🇯🇵" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar (SGD)", flag: "🇸🇬" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit (MYR)", flag: "🇲🇾" },
];

export function getCurrencyByCode(code: string): CurrencyOption {
  const found = CURRENCIES.find((c) => c.code === code);
  return found || CURRENCIES[0]; // Default to INR or USD
}

export function formatMoney(amount: number, symbol: string = "₹"): string {
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
