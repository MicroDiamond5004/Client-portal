import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

function formatToRussianDate(date: string | Date | null, pattern: string = "d MMMM yyyy 'г.' HH:mm") {
    if (typeof date === 'string') {
        console.log(new Date(date));
    }
    const parsedDate = date ? (typeof date === 'string' ? (date.length > 10 ? new Date(date) : parseISO(date)) : date) : new Date();

    return format(parsedDate, pattern, { locale: ru });
}

export default formatToRussianDate;