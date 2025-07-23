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
      sx: { backgroundColor: 'primary.light', color: 'primary.main' },
    },
    {
      label: 'Новый заказ',
      value: openC,
      filter: AllStatus.NEW,
      sx: { backgroundColor: 'warning.light', color: 'warning.main' },
    },
    {
      label: 'В работе',
      value: pendingC,
      filter: AllStatus.PENDING,
      sx: { backgroundColor: 'success.light', color: 'success.main' },
    },
    {
      label: 'Бронь',
      value: bookedC,
      filter: AllStatus.BOOKED,
      sx: { backgroundColor: 'pink', color: 'darkpink' },
    },
    {
      label: 'Оформлено',
      value: formedC,
      filter: AllStatus.FORMED,
      sx: { backgroundColor: '#a52a2a1f', color: 'brown' },
    },
    {
      label: 'Завершено',
      value: closeC,
      filter: AllStatus.CLOSED,
      sx: { backgroundColor: 'error.light', color: 'error.main' },
    },
  ];

  return (
    <MuiGrid container spacing={isMobile ? 2 : 3} justifyContent="center" textAlign="center">
      {cardItems.map((item, index) => (
        <MuiGrid item key={index} xs={6} sm={4} md={2}>
          <BoxStyled border={filter === item.filter ? '2px solid #5d87ff' : ''} onClick={() => {
            setFilter(item.filter)
            // setSearchParams({...searchParams, filter: item.filter})
          }} sx={item.sx}>
            <Typography variant="h3">{item.value}</Typography>
            <Typography variant="h6">{item.label}</Typography>
          </BoxStyled>
        </MuiGrid>
      ))}
    </MuiGrid>
  );
};

export default TicketFilter;
