export const formatMoney = (val?: { cents: number; currency: string }) =>
  val ? `${(val.cents / 100).toLocaleString('ru-RU')} ${val.currency}` : null;