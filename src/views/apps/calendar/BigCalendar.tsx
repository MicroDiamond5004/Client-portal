// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react';
import {
  CardContent,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Fab,
  TextField,
  Typography,
} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dayjs from 'dayjs';
import './Calendar.css';
import PageContainer from 'src/components/container/PageContainer';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { IconCheck } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import getEvents, { EventType } from './EventData';
import getAllTicketsData from 'src/mocks/tickets/get-tickets';
import { isSameDay } from 'date-fns';

moment.locale('en-GB');
const localizer = momentLocalizer(moment);

type EvType = {
  title: string;
  allDay?: boolean;
  start?: Date;
  end?: Date;
  color?: string;
};

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Calendar',
  },
];


const BigCalendar = () => {
  const allticketsData = getAllTicketsData();
  const tickets = allticketsData.result.result;
  const [Events, setEvents] = useState(getEvents(tickets));
  const [calevents, setCalEvents] = React.useState<any>(Events);
  const [currentEvent, setCurrentEvent] = useState<EventType | null>(null);

  useEffect(() => {
    setEvents(getEvents(tickets));
  }, [tickets])

  const [open, setOpen] = React.useState<boolean>(false);
  const [title, setTitle] = React.useState<string>("");
  const [slot, setSlot] = React.useState<EvType>();
  const [start, setStart] = React.useState<any | null>(dayjs());
  const [end, setEnd] = React.useState<any | null>(dayjs());
  const [color, setColor] = React.useState<string>("default");
  const [update, setUpdate] = React.useState<EvType | undefined | any>();
  // Example function to set and format the date

  const ColorVariation = [
    {
      id: 1,
      eColor: "#1a97f5",
      value: "default",
    },
    {
      id: 2,
      eColor: "#39b69a",
      value: "green",
    },
    {
      id: 3,
      eColor: "#fc4b6c",
      value: "red",
    },
    {
      id: 4,
      eColor: "#615dff",
      value: "azure",
    },
    {
      id: 5,
      eColor: "#fdd43f",
      value: "warning",
    },
  ];
  
  // const addNewEventAlert = (slotInfo: EvType) => {
  //   setOpen(true);
  //   setSlot(slotInfo);
  //   setStart(dayjs(slotInfo.start));
  //   setEnd(dayjs(slotInfo.end));
  // };


  const editEvent = (event: any) => {
    console.log(event.start, calevents);
    
    const newEditEvent = calevents.find(
      (elem: EventType) => elem.start?.find((date) => isSameDay(date, event.start))
    );

    console.log(newEditEvent, calevents);

    if (newEditEvent) {
      setCurrentEvent(newEditEvent);
    //   setStart(dayjs(newEditEvent.start[0]));
    // setEnd(dayjs(newEditEvent.end[0]));
    // setUpdate(event);
    }

    setOpen(true);  
  };

  // const updateEvent = (e: any) => {
  //   e.preventDefault();
  //   setCalEvents(
  //     calevents.map((elem: EvType) => {
  //       if (elem.title === update.title) {
  //         return { ...elem, title, start: start?.toISOString(), end: end?.toISOString(), color };
  //       }
  //       return elem;
  //     })
  //   );
  //   setOpen(false);
  //   setTitle("");
  //   setStart(dayjs());
  //   setEnd(dayjs());
  //   setUpdate(null);
  // };
  const inputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTitle(e.target.value);
  const selectinputChangeHandler = (id: string) => setColor(id);

  // When submitting or updating the event
  // const submitHandler = (e: React.ChangeEvent<any>) => {
  //   e.preventDefault();
  //   const newEvents = [...calevents];
  //   newEvents.push({
  //     title,
  //     start: start ? start.toISOString() : "",
  //     end: end ? end.toISOString() : "",
  //     color,
  //   });
  //   setCalEvents(newEvents);
  //   setOpen(false);
  //   setTitle("");
  //   setStart(dayjs());
  //   setEnd(dayjs());
  // };

  // const deleteHandler = (event: EvType) => {
  //   const updatecalEvents = calevents.filter(
  //     (ind: EvType) => ind.title !== event.title
  //   );
  //   setCalEvents(updatecalEvents);
  // };

  const handleClose = () => {
    // eslint-disable-line newline-before-return
    setOpen(false);
  };

  const eventColors = (event: EvType) => {
    if (event.color) {
      return { className: `event-${event.color}` };
    }

    return { className: `event-default` };
  };

  // const handleStartChange = (newValue: any) => {
  //   if (newValue instanceof Date) {
  //     // Convert the native Date object to a dayjs object
  //     setStart(dayjs(newValue));
  //   } else {
  //     setStart(newValue);
  //   }
  // };

  // const handleEndChange = (newValue: any) => {
  //   if (newValue instanceof Date) {
  //     // Convert the native Date object to a dayjs object
  //     setEnd(dayjs(newValue));
  //   } else {
  //     setEnd(newValue);
  //   }
  // };

  return (
    <PageContainer title="Calendar" description="this is Calendar">
      {/* {isBreadcrumb ? <Breadcrumb title="Calendar" items={BCrumb} /> : null} */}
      <BlankCard>
        {/* ------------------------------------------- */}
        {/* Calendar */}
        {/* ------------------------------------------- */}
        <CardContent>
          <Calendar
            selectable
            events={calevents}
            defaultView="month"
            scrollToTime={new Date(1970, 1, 1, 6)}
            defaultDate={new Date()}
            localizer={localizer}
            style={{ height: "calc(100vh - 350px" }}
            onSelectEvent={(event: any) => editEvent(event)}
            onSelectSlot={(slotInfo: any) => editEvent(slotInfo)}
            eventPropGetter={(event: any) => eventColors(event)}
          />
        </CardContent>
      </BlankCard>

      {/* ------------------------------------------- */}
      {/* Add Calendar Event Dialog */}
      {/* ------------------------------------------- */}
      <Dialog open={open && (currentEvent ? true : false)} onClose={handleClose} fullWidth maxWidth="xs">
        <form>
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
              (currentEvent.timeLimit || currentEvent.vylet)?.slice(0, 1)?.map((_el, index) => {

                return (
                <>
                  {currentEvent.timeLimit && currentEvent.timeLimit[index] && <DatePicker
                  value={dayjs(currentEvent.timeLimit[index])}
                  slotProps={{
                    textField: {
                      label: "Тайм лимит",
                      fullWidth: true,
                      sx: { mb: 3 },
                    },
                  }}
                />}
                { currentEvent.vylet && currentEvent.vylet[index] &&
                  <DatePicker
                  value={dayjs(currentEvent.vylet[index])}
                  slotProps={{
                    textField: {
                      label: "Дата вылета",
                      fullWidth: true,
                      sx: { mb: 3 },
                      error: start && end && start > end,
                      helperText: start && end && start > end ? "End date must be later than start date" : "",
                    },
                  }}
                />
                }
              </>);
              })}


            </LocalizationProvider>

            {/* ------------------------------------------- */}
            {/* Calendar Event Color*/}
            {/* ------------------------------------------- */}
            {/* <Typography variant="h6" fontWeight={600} my={2}>
              Select Event Color
            </Typography> */}
            {/* ------------------------------------------- */}
            {/* colors for event */}
            {/* ------------------------------------------- */}
            {/* {ColorVariation.map((mcolor) => {
              return (
                <Fab
                  color="primary"
                  style={{ backgroundColor: mcolor.eColor }}
                  sx={{
                    marginRight: "3px",
                    transition: "0.1s ease-in",
                    scale: mcolor.value === color ? "0.9" : "0.7",
                  }}
                  size="small"
                  key={mcolor.id}
                  onClick={() => selectinputChangeHandler(mcolor.value)}
                >
                  {mcolor.value === color ? <IconCheck width={16} /> : ""}
                </Fab>
              );
            })} */}
          </DialogContent>
          {/* ------------------------------------------- */}
          {/* Action for dialog */}
          {/* ------------------------------------------- */}
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose}>Cancel</Button>

            {update ? (
              <Button
                type="submit"
                color="error"
                variant="contained"
                onClick={() => {}}
              >
                Билет
              </Button>
            ) : (
              ""
            )}
            <Button type="submit" onClick={() => handleClose()} variant="contained">
              Закрыть
            </Button>
          </DialogActions>
          {/* ------------------------------------------- */}
          {/* End Calendar */}
          {/* ------------------------------------------- */}
        </form>
      </Dialog>
    </PageContainer>
  );
};

export default BigCalendar;
