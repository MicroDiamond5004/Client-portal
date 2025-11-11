import { isAfter, isSameDay, parseISO, subHours } from 'date-fns';
import dayjs from "dayjs";
import { uniqueId } from "lodash";
import { ELMATicket } from "src/mocks/tickets/ticket.type";
import { AllStatus, getStatus } from 'src/components/apps/tickets/TicketListing.tsx';
import { useAppSelector } from 'src/store/hooks.ts';
import { selectPassports } from 'src/store/selectors/ticketsSelectors.ts';

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();
const d = today.getDate();

export interface EventType {
  title: string;
  id: string;
  start?: Date;
  end?: Date;
  vylet?: string[];
  timeLimit?: string[];
  fios?: string[];
  nomerZakaza?: string;
  color?: string;
}


const getEvents = (tickets: ELMATicket[], passports:  Record<string, [string | undefined, string | undefined]>): EventType[] => {
  const currentEvents: EventType[] = [];
  const seen = new Set<string>(); // нормализованные ISO-даты без времени

  const FiosFields = [
    'fio2',
    'dopolnitelnye_fio',
    'fio_passazhira_ov_bron_3',
    'fio_passazhira_ov_bron_4',
    'fio_passazhira_ov_bron_5',
    'fio_passazhira_ov_bron_6',
  ]

  tickets?.forEach((ticket: Record<any, any>) => {
    const {
      data_vyleta,
      taim_limit_dlya_klienta,
      taim_limit_dlya_klienta_bron_2,
      taim_limit_dlya_klienta_bron_3,
      taim_limit_dlya_klienta_bron_4,
      taim_limit_dlya_klienta_bron_5,
      taim_limit_dlya_klienta_bron_6,
    } = ticket;

    const timeLimits = [
      { label: 'Тайм лимит (Бронь №1)', value: taim_limit_dlya_klienta },
      { label: 'Тайм лимит (Бронь №2)', value: taim_limit_dlya_klienta_bron_2 },
      { label: 'Тайм лимит (Бронь №3)', value: taim_limit_dlya_klienta_bron_3 },
      { label: 'Тайм лимит (Бронь №4)', value: taim_limit_dlya_klienta_bron_4 },
      { label: 'Тайм лимит (Бронь №5)', value: taim_limit_dlya_klienta_bron_5 },
      { label: 'Тайм лимит (Бронь №6)', value: taim_limit_dlya_klienta_bron_6 },
    ];

    if (getStatus(ticket as any) !== AllStatus.BOOKED) return;

    const allDates = [
      ...(data_vyleta ? [{ type: 'Вылет', value: data_vyleta }] : []),
      ...timeLimits.filter(t => t.value).map(t => {

        return ({ type: t.label, value: t.value! })
      }),
    ];

    allDates.forEach(({ type, value }, index) => {
      const parsed = parseDate(value ?? new Date());
      const key = `${ticket.__id}_${type}_${dayjs(parsed).startOf('day').toISOString()}`;

      if (isAfter(new Date(), parsed) && !isSameDay(new Date(), parsed)) return;
      if (seen.has(key)) return;

      seen.add(key);


      currentEvents.push({
        title: type,
        id: uniqueId(),
        start: parsed,
        end: parsed,
        fios: ticket[FiosFields[index]].map((fio: string) => {
          return passports[fio]?.[0]?.split('/').join(' ');
        }) ?? [],
        vylet: type === 'Вылет' ? [value] : [],
        timeLimit: type?.includes('Тайм лимит') ? [value] : [],
        nomerZakaza: ticket.nomer_zakaza,
      });
    });
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
