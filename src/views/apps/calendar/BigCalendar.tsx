// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react';
import {
  CardContent,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid, DialogTitle,
} from '@mui/material';
import {
  Calendar,
  dateFnsLocalizer,
  Views,
} from 'react-big-calendar';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dayjs from 'dayjs';
import './Calendar.css';
import PageContainer from 'src/components/container/PageContainer';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { IconX } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import getEvents, { EventType } from './EventData';
import {
  format,
  getDay,
  isSameDay,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks, isWithinInterval, startOfDay,
} from 'date-fns';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectOrder, selectPassports,
  selectTickets,
} from 'src/store/selectors/ticketsSelectors';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router';
import 'dayjs/locale/ru';
import CustomToolbar from './customToolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { CustomEvent } from 'src/views/apps/calendar/customEvent.tsx';

dayjs.locale('ru');

const locales = {
  ru: ru,
};


const localizer = dateFnsLocalizer({
  format,
  parse: (str, formatString, backupDate) => {
    return dayjs(str, formatString).toDate();
  },
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const BCrumb = [
  {
    to: '/',
    title: 'Главная',
  },
  {
    title: 'Календарь',
  },
];

const BigCalendar = () => {
  const tickets = useAppSelector(selectTickets);
  const passports = useAppSelector(selectPassports);

  const today = startOfDay(new Date());

  const [Events, setEvents] = useState<EventType[]>([]);
  const [currentEvent, setCurrentEvent] = useState<EventType | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [open, setOpen] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<any>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [showMoreOpen, setShowMoreOpen] = useState(false);
  const [showMoreEvents, setShowMoreEvents] = useState<any[]>([]);
  const [showMoreDate, setShowMoreDate] = useState<Date | null>(null);


  // состояние для недели
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    dispatch(fetchUserOrders());
    setEvents(getEvents(tickets, passports));
  }, []);

  useEffect(() => {
    console.log('🎯 Events обновлены:', Events.length);
  }, [Events]);

  useEffect(() => {
    if (tickets) {
      const updatedEvents = getEvents(tickets, passports)?.map((event) => ({
        ...event,
        color: 'green',
      }));
      setEvents(updatedEvents);
    }
  }, [tickets]);

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (currentView === Views.MONTH) {
      let newDate = new Date(currentDate);

      if (action === 'NEXT') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (action === 'PREV') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate = new Date();
      }
      setCurrentDate(newDate);
    } else {
      let newStart;
      if (action === 'NEXT') {
        newStart = addWeeks(currentWeekStart, 1);
      } else if (action === 'PREV') {
        newStart = subWeeks(currentWeekStart, 1);
      } else {
        newStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      }

      setCurrentWeekStart(newStart);

      const newEnd = addDays(newStart, 6);

      // если selectedDay не входит в новую неделю
      if (!isWithinInterval(selectedDay, { start: newStart, end: newEnd })) {
        // если today входит в новую неделю, выбрать today
        const today = new Date();
        if (isWithinInterval(today, { start: newStart, end: newEnd })) {
          setSelectedDay(today);
        } else {
          setSelectedDay(newStart); // или null, если хочешь полностью сбросить выбор
        }
      }
    }
  };



  const editEvent = (event: EventType) => {
    setCurrentEvent(event);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const renderWeekView = () => {
    const daysOfWeek = [...Array(7)].map((_, i) =>
      addDays(currentWeekStart, i)
    );

    const dayEvents = Events.filter(ev =>
      isSameDay(ev.start ?? new Date(), selectedDay)
    );

    return (
      <>
        {/* Линейка дней недели */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
          mb: 3,
          overflowX: 'auto'
        }}>
          {daysOfWeek.map(day => {
            const isActive = isSameDay(day, selectedDay);
            const isEventDay = Events.some(ev =>
              isSameDay(ev.start, day)
            );
            const isToday = isSameDay(day, today);
            return (
              <Button
                key={day.toISOString()}
                variant={isActive ? 'contained' : 'outlined'}
                sx={{ minWidth: '30px', width: '10vw', color: (isActive || isEventDay) ? '#fff' : '',  border: isToday ? '2px solid #1ad835' : '2px solid transparent', backgroundColor: isActive ? '#5d87ff' : isEventDay ? '#fa896b' : 'none' }}
                onClick={() => setSelectedDay(day)}
              >
                {format(day, 'EE', { locale: ru }).slice(0, 2).toUpperCase()}<br/> {format(day, 'dd')}

              </Button>
            );
          })}
        </Box>

        {dayEvents.length > 0 ? (
          <Box component="table" sx={{
            width: '100%',
            borderCollapse: 'collapse',
            mt: 2
          }}>
            <Box component="thead">
              <Box component="tr">
                <Box
                  component="th"
                  sx={{
                    textAlign: 'left',
                    borderBottom: '1px solid #ddd',
                    py: 1,
                    px: 2,
                    color: 'gray',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Время
                </Box>
                <Box
                  component="th"
                  sx={{
                    textAlign: 'left',
                    borderBottom: '1px solid #ddd',
                    py: 1,
                    px: 2,
                    color: 'gray',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Событие
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              {dayEvents.map(ev => (
                <Box
                  component="tr"
                  key={ev.id}
                  sx={{
                    borderBottom: '1px solid #eee',
                    '&:hover': {
                      backgroundColor: '#f9f9f9',
                      cursor: 'pointer',
                    },
                  }}
                  onClick={() => editEvent(ev)}
                >
                  <Box
                    component="td"
                    sx={{
                      py: 1,
                      px: 2,
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'top',
                      fontWeight: 600,
                    }}
                  >
                    {ev.start ? dayjs(ev.start).format('HH:mm') : ''}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      py: 1,
                      px: 2,
                      fontSize: '12px',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {ev.title}
                    </Typography>
                    <Typography variant="body2" >
                      {`Номер заказа №${ev.nomerZakaza}`}
                    </Typography>
                    {ev.fios && (
                      <Typography variant="body2" color="text.secondary">
                        {(ev.fios?.length ?? 0) > 1 ? `${ev.fios?.[0]}+${(ev.fios?.length ?? 1) - 1}` : ev.fios}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2">
            Нет событий
          </Typography>
        )}

      </>
    );
  };

  return (
    <PageContainer title="Календарь" description="Календарь">
      {!isMobile && <Breadcrumb title="Календарь" />}
      <BlankCard>
        <CardContent>
          {/* Вкладки Месяц / Неделя */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button
              variant={currentView === Views.MONTH ? 'contained' : 'outlined'}
              onClick={() => setCurrentView(Views.MONTH)}
            >
              Месяц
            </Button>
            <Button
              variant={currentView === 'WEEK_LIST' ? 'contained' : 'outlined'}
              onClick={() => setCurrentView('WEEK_LIST')}
            >
              Неделя
            </Button>
          </Box>

          {/* Навигация */}
          <CustomToolbar
            label={
              currentView === Views.MONTH
                ? format(currentDate, 'LLLL yyyy', { locale: ru })
                : `${format(currentWeekStart, 'dd MMM', { locale: ru })} - ${format(addDays(currentWeekStart, 6), 'dd MMM', { locale: ru })}`
            }
            onNavigate={handleNavigate}
          />

          {currentView === Views.MONTH ? (
            <div className="calendar-wrapper">
              <Calendar
                date={currentDate}
                onNavigate={setCurrentDate}
                events={Events}
                views={['month']}
                defaultView={Views.MONTH}
                localizer={localizer}
                components={{
                  toolbar: () => null, // отключаем встроенный тулбар
                  event: CustomEvent
                }}
                messages={{
                  month: 'Месяц',
                  week: 'Неделя',
                  day: 'День',
                  today: 'Сегодня',
                  previous: 'Назад',
                  next: 'Вперед',
                  noEventsInRange: 'Нет событий',
                  showMore: (total: number) => `+${total} даты`, // 👈 вот это!
                }}
                formats={{
                  monthHeaderFormat: () =>
                    '', // убираем лишний заголовок
                  weekdayFormat: (date) =>
                    date.toLocaleDateString('ru-RU', { weekday: 'short' }),
                  dayFormat: (date) =>
                    date.toLocaleDateString('ru-RU', { day: '2-digit' }),
                }}
                eventPropGetter={(event) => ({
                  className: 'custom-event',
                  style: {
                    backgroundColor: '#1976d2',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                  },
                })}
                className="responsive-calendar"
                style={{
                  height: "calc(100vh - 350px)",
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                }}
                onSelectEvent={(event: any) => editEvent(event)}
                onShowMore={(events, date) => {
                  // Здесь events — массив событий в этот день
                  // date — сама дата, на которую нажали

                  setShowMoreEvents(events); // сохраняем события
                  setShowMoreDate(date);     // сохраняем дату
                  setShowMoreOpen(true);     // открываем модалку
                }}
              />
            </div>
          ) : (
            renderWeekView()
          )}
        </CardContent>
      </BlankCard>

      <Dialog
        open={showMoreOpen}
        onClose={() => setShowMoreOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            overflow: 'visible', // Это важно
          },
        }}
      >
        {/*<DialogTitle>События на {showMoreDate ? format(showMoreDate, 'dd.MM.yyyy') : ''}</DialogTitle>*/}
        <IconButton
          aria-label="close"
          onClick={() => setShowMoreOpen(false)}
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            zIndex: 1500,
            backgroundColor: 'white',
            boxShadow: 3,
            '&:hover': { backgroundColor: '#f5f5f5' }
          }}
        >
          <IconX />
        </IconButton>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          {showMoreEvents.length === 0 && (
            <Typography>Нет событий</Typography>
          )}
          {showMoreEvents.map((event, index) => {
            const currentTicket = tickets.find((ticket: ELMATicket) => ticket.__id === event.id);
            const fios = event.fios || [];

            const timeLimits = event.timeLimit ?? [];
            const vylety = event.vylet ?? [];

            const dataArray = (timeLimits.length > 0 ? timeLimits : vylety) ?? [];

            return (
              <Box key={index} sx={{ mb: 4 }}>
                {dataArray.map((_el: any, i: number) => (
                  <Box key={`${event.id}-${i}`} sx={{ mb: 3 }}>
                    {/* Фамилии */}
                    {(timeLimits[i] || vylety[i]) && fios.length > 0 && (
                      <Box mb={2}>
                        <Typography variant="h6">Пассажиры:</Typography>
                        {fios.map((fio: string, j: number) => (
                          <Typography key={j}>{fio}</Typography>
                        ))}
                      </Box>
                    )}

                    {/* Дата вылета */}
                    {vylety[i] && (
                      <DatePicker
                        value={dayjs(vylety[i])}
                        format="DD/MM/YYYY  HH:mm"
                        slotProps={{
                          textField: {
                            label: "Дата вылета",
                            fullWidth: true,
                            sx: {
                              mb: 2,
                              '& input': { fontWeight: 600 },
                            },
                          },
                        }}
                        readOnly
                      />
                    )}

                    {/* Тайм-лимит */}
                    {timeLimits[i] && (
                      <DatePicker
                        value={dayjs(timeLimits[i])}
                        format="DD/MM/YYYY  HH:mm"
                        slotProps={{
                          textField: {
                            label: event.title ?? "Тайм лимит",
                            fullWidth: true,
                            sx: {
                              mb: 2,
                              '& input': { fontWeight: 600 },
                            },
                          },
                        }}
                        readOnly
                      />
                    )}

                    {/* Кнопка перехода */}
                    {currentTicket && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          navigate(`/apps/orders?item=${currentTicket.nomer_zakaza}`);
                          setShowMoreOpen(false); // закрыть модалку после перехода
                        }}
                      >
                        Перейти в заказ {currentTicket.nomer_zakaza}
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            );
          })}</LocalizationProvider>
        </DialogContent>
      </Dialog>



      {/* Диалог события */}
      <Dialog open={open && (currentEvent ? true : false)} onClose={handleClose} fullWidth maxWidth="xs" PaperProps={{
        sx: {
          overflow: 'visible', // Это важно
        },
      }}>
        <form>
          {/* Крестик, визуально за пределами окна */}
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              zIndex: 1500,
              backgroundColor: 'white',
              boxShadow: 3,
              '&:hover': { backgroundColor: '#f5f5f5' }
            }}
          >
            <IconX />
          </IconButton>
          <DialogContent>
            {/* ------------------------------------------- */}
            {/* Add Edit title */}
            {/* ------------------------------------------- */}
            <Typography variant="h4" sx={{ mb: 2 }}>
              События
            </Typography>

            {/* <TextField
              id="Event Title"
              placeholder="Enter Event Title"
              variant="outlined"
              fullWidth
              label="Event Title"
              value={title}
              sx={{ mb: 3 }}
            /> */}
            {/* ------------------------------------------- */}
            {/* Selection of Start and end date */}
            {/* ------------------------------------------- */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>

              {currentEvent && (currentEvent.timeLimit || currentEvent.vylet) &&
                ((currentEvent.timeLimit?.length ?? 0) > 0 ? currentEvent.timeLimit : currentEvent.vylet)?.map((_el, index) => {

                  const currentTicket = tickets.find((ticket: ELMATicket) => ticket.__id === currentEvent.id);
                  const fios = currentEvent.fios || [];

                  const fioNames = fios;

                  // console.log(currentEvent);

                  return (
                    <Box key={String(currentEvent.timeLimit ?? currentEvent.vylet)}>

                      {/* Фамилии */}
                      {((currentEvent.timeLimit && currentEvent.timeLimit[index]) || (currentEvent.vylet && currentEvent.vylet[index])) && (fios?.length ?? 0) > 0 &&
                        <Box mb={3}>
                          <Typography variant="h5">Пассажиры:</Typography>
                          {fioNames?.map((fio, index) => (
                            <Typography key={index}>{fio}</Typography>
                          ))}
                        </Box>}

                      {/* Дата вылета */}
                      {currentEvent.vylet && currentEvent.vylet[index] && (
                        <DatePicker
                          value={dayjs(currentEvent.vylet[index])}
                          format="DD/MM/YYYY  HH:mm"
                          slotProps={{
                            textField: {
                              label: "Дата вылета",
                              fullWidth: true,
                              sx: { mb: 3,
                                '& input': {
                                  fontWeight: 600,
                                },
                              },
                            },
                          }}
                          sx={{fontWeight: 600}}
                          readOnly
                        />
                      )}

                      {/* Тайм-лимит */}
                      {currentEvent.timeLimit && currentEvent.timeLimit[index] && (
                        <DatePicker
                          value={dayjs(currentEvent.timeLimit[index])}
                          format="DD/MM/YYYY  HH:mm"
                          slotProps={{
                            textField: {
                              label: currentEvent.title ?? "Тайм лимит",
                              fullWidth: true,
                              sx: { mb: 3,
                                '& input': {
                                  fontWeight: 600,
                                },
                              },
                            },
                          }}
                          readOnly
                        />
                      )}

                      {/* Кнопка перехода */}
                      {currentTicket && (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => navigate(`/apps/orders?item=${currentTicket.nomer_zakaza}`)}
                        >
                          Перейти в заказ {currentTicket.nomer_zakaza}
                        </Button>
                      )}
                    </Box>
                  );
                })}

            </LocalizationProvider>
          </DialogContent>
        </form>
      </Dialog>
    </PageContainer>
  );
};

export default BigCalendar;
