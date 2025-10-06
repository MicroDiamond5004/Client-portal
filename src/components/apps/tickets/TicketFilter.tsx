import { Box, Grid as MuiGrid, Typography, styled, useMediaQuery } from '@mui/material';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { selectSearchTerm, selectTickets, selectTicketsFilter } from 'src/store/selectors/ticketsSelectors';
import { useAppDispatch, useAppSelector } from 'src/store/hooks.ts';
import { ELMATicket } from 'src/data/types.ts';
import { AllStatus, getStatus } from 'src/components/apps/tickets/TicketListing.tsx';
import { updateSearchTerms, updateTicketsFilter } from 'src/store/slices/ticketsSlice.ts';

const BoxStyled = styled(Box)(() => ({
  padding: '30px 22px',
  transition: '0.1s ease-in',
  cursor: 'pointer',
  height: '127px',
  color: 'inherit',
  borderRadius: '10px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  '&:hover': {
    transform: 'scale(1.03)',
  },
}));

const TicketFilter = () => {
  const tickets = useAppSelector(selectTickets);

  const filter = useAppSelector(selectTicketsFilter) ?? '';
  const dispatch = useAppDispatch();

  const setFilter = (value: string) => dispatch(updateTicketsFilter(value));


  const [searchParams, setSearchParams] = useSearchParams();

  const openC = tickets.filter((t: ELMATicket) => t && getStatus(t) === AllStatus.NEW)?.length;
  const pendingC = tickets.filter((t: ELMATicket) => t && getStatus(t) === AllStatus.PENDING)?.length;
  const bookedC = tickets.filter((t: ELMATicket) => t && getStatus(t) === AllStatus.BOOKED)?.length;
  const formedC = tickets.filter((t: ELMATicket) => t && getStatus(t) === AllStatus.FORMED)?.length;
  const closeC = tickets.filter((t: ELMATicket) => t && getStatus(t) === AllStatus.CLOSED)?.length;

  const isMobile = useMediaQuery('(max-width:600px)');

  const cardItems = [
    {
      label: 'Все',
      value: tickets.length,
      filter: 'total_tickets',
      sx: { backgroundColor: '#C9D1ED', color: '#fff' },
    },
    {
      label: 'Новый заказ',
      value: openC,
      filter: AllStatus.NEW,
      sx: { backgroundColor: '#A7B4E2', color: '#fff' },
    },
    {
      label: 'В работе',
      value: pendingC,
      filter: AllStatus.PENDING,
      sx: { backgroundColor: '#8596D6', color: '#fff' },
    },
    {
      label: 'Бронь',
      value: bookedC,
      filter: AllStatus.BOOKED,
      sx: { backgroundColor: '#6279CB', color: '#fff' },
    },
    {
      label: 'Оформлено',
      value: formedC,
      filter: AllStatus.FORMED,
      sx: { backgroundColor: '#405BBF', color: '#fff' },
    },
    {
      label: 'Завершено',
      value: closeC,
      filter: AllStatus.CLOSED,
      sx: { backgroundColor: '#344B9D', color: '#fff' },
    },
  ];

  return (
    <MuiGrid container spacing={isMobile ? 2 : 3} justifyContent="center" textAlign="center">
      {cardItems.map((item, index) => (
        <MuiGrid item key={index} xs={4} sm={4} md={2}>
          <BoxStyled border={filter === item.filter ? '2px solid #5d87ff' : ''} onClick={() => {
            setFilter(item.filter)
            // setSearchParams({...searchParams, filter: item.filter})
          }} sx={{...item.sx, height: isMobile ? '80px' : '127px' }}>
            <Typography variant="h3" sx={{lineHeight: isMobile ? '1.25rem' :'undefined', fontSize: isMobile ? '1rem' : 'undefined'}}>{item.value}</Typography>
            <Typography variant="h6" sx={{lineHeight: isMobile ? '1rem' :'undefined', fontSize: isMobile ? '0.75rem' : 'undefined', width: isMobile ? '85px' : 'undefined'}}>{item.label}</Typography>
          </BoxStyled>
        </MuiGrid>
      ))}
    </MuiGrid>
  );
};

export default TicketFilter;
