import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { EventType } from './CalendarPage';
import dayjs from 'dayjs';

type Props = {
  view: 'week' | 'day';
  date: Date;
  events: EventType[];
};

const CustomMobileView: React.FC<Props> = ({ view, date, events }) => {
  let filteredEvents: EventType[] = [];

  if (view === 'day') {
    filteredEvents = events.filter((e) =>
      dayjs(e.start).isSame(dayjs(date), 'day')
    );
  } else if (view === 'week') {
    const startOfWeek = dayjs(date).startOf('week').add(1, 'day'); // Monday
    const endOfWeek = startOfWeek.add(6, 'day');
    filteredEvents = events.filter((e) =>
      dayjs(e.start).isBetween(startOfWeek, endOfWeek, null, '[]')
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {filteredEvents.length === 0 && (
        <Typography>Нет событий</Typography>
      )}

      {filteredEvents.map((event) => (
        <Card
          key={event.id}
          sx={{
            backgroundColor: event.color || '#1976d2',
            color: '#fff',
          }}
        >
          <CardContent>
            <Typography variant="h6">{event.title}</Typography>
            <Typography variant="body2">
              {dayjs(event.start).format('DD.MM.YYYY HH:mm')} -{' '}
              {dayjs(event.end).format('DD.MM.YYYY HH:mm')}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default CustomMobileView;
