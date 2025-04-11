import { isSameDay, parseISO, subHours } from "date-fns";
import { uniqueId } from "lodash";
import { ELMATicket } from "src/mocks/tickets/ticket.type";

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();
const d = today.getDate();

export interface EventType {
  id: string;
  allDay?: boolean;
  start?: Date[];
  end?: Date[];
  color?: string;
  vylet?: string[];
  timeLimit?: string[];
}


const getEvents = (tickets: ELMATicket[]): EventType[] => {
  const currentEvents: EventType[] = [];

  tickets?.forEach((ticket) => {
    const vyletDate = ticket.data_vyleta ? parseDate(ticket.data_vyleta as string) : null;
    const taimDate = ticket.taim_limit ? parseDate(ticket.taim_limit) : null;

    const mainDate = vyletDate || taimDate;
    if (!mainDate) return;

    // Сравниваем только по дате
    let existingEvent = currentEvents.find(event =>
      event.end && event.end.some(endDate => isSameDay(endDate, mainDate))
    );

    if (!existingEvent) {
      existingEvent = {
        id: uniqueId(),
        start: [subHours(mainDate, 24)],
        end: [mainDate],
        vylet: [],
        timeLimit: [],
      };
      currentEvents.push(existingEvent);
    } else {
      existingEvent.start?.push(subHours(mainDate, 24));
      existingEvent.end?.push(mainDate);
    }

    // Добавляем строки в оригинальные массивы
    if (ticket.data_vyleta) {
      existingEvent.vylet?.push(ticket.data_vyleta as string);
    }
    if (ticket.taim_limit) {
      existingEvent.timeLimit?.push(ticket.taim_limit);
    }
  });

  return currentEvents;
};

function parseDate(date: string | Date): Date {
  return typeof date === 'string' ? parseISO(date) : date;
}

// const Events: EventType[] = [
//   {
//     title: 'Twice event For two Days',
//     allDay: true,
//     start: new Date(y, m, 3),
//     end: new Date(y, m, 5),
//     color: 'default',
//   },
//   {
//     title: 'Learn ReactJs',
//     start: new Date(y, m, d + 3, 10, 30),
//     end: new Date(y, m, d + 3, 11, 30),
//     allDay: false,
//     color: 'green',
//   },
//   {
//     title: 'Launching MaterialArt Angular',
//     start: new Date(y, m, d + 7, 12, 0),
//     end: new Date(y, m, d + 7, 14, 0),
//     allDay: false,
//     color: 'red',
//   },
//   {
//     title: 'Lunch with Mr.Raw',
//     start: new Date(y, m, d - 2),
//     end: new Date(y, m, d - 2),
//     allDay: true,
//     color: 'azure',
//   },
//   {
//     title: 'Going For Party of Sahs',
//     start: new Date(y, m, d + 1, 19, 0),
//     end: new Date(y, m, d + 1, 22, 30),
//     allDay: false,
//     color: 'azure',
//   },
//   {
//     title: 'Learn Ionic',
//     start: new Date(y, m, 23),
//     end: new Date(y, m, 25),
//     color: 'warning',
//   },
//   {
//     title: 'Research of making own Browser',
//     start: new Date(y, m, 19),
//     end: new Date(y, m, 22),
//     color: 'default',
//   },
// ];

export default getEvents;
