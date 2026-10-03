export function withLowercaseDayPeriod(value: string) {
  return value.replace(/\b(?:am|pm)\b/giu, (period) => period.toLocaleLowerCase())
}

