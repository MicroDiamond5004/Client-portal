import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

function formatToRussianDate(date: string | Date | null, pattern: string = "d MMMM yyyy 'г.' HH:mm") {
    if (typeof date === 'string') {
    }
    const parsedDate = date ? (typeof date === 'string' ? (date.length > 10 ? new Date(date) : parseISO(date)) : date) : new Date();

    return format(parsedDate, pattern, { locale: ru });
}

function pluralize(value: number, words: [string, string, string]): string {
    const lastDigit = value % 10;
    const lastTwoDigits = value % 100;
  
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return words[2];
    if (lastDigit === 1) return words[0];
    if (lastDigit >= 2 && lastDigit <= 4) return words[1];
    return words[2];
  }
  export function formatToRussianDateSmart(date: Date): string {
  const now = new Date();

  const seconds = differenceInSeconds(now, date);
  if (seconds < 60) {
    const word = pluralize(seconds, ['секунда', 'секунды', 'секунд']);
    return `${seconds} ${word} назад`;
  }

  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) {
    const word = pluralize(minutes, ['минута', 'минуты', 'минут']);
    return `${minutes} ${word} назад`;
  }

  const hours = differenceInHours(now, date);
  if (hours < 1) {
    const word = pluralize(minutes, ['минута', 'минуты', 'минут']);
    return `${minutes} ${word} назад`;
  }

  // Всё, что больше 1 часа → дата + время
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default formatToRussianDate;