// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useEffect, useState } from 'react';
import './ticket.css';

import { format } from 'date-fns';
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Typography,
  TableBody,
  IconButton,
  Chip,
  Stack,
  Avatar,
  Tooltip,
  TextField,
  Pagination,
  useTheme,
  TableContainer,
  Button,
} from '@mui/material';
import { IconArrowAutofitContent, IconArrowCapsule, IconArrowRightBar, IconArrowRightTail, IconArrowRightToArc, IconArrowsDiagonal, IconArrowsDiagonal2, IconArrowsLeft, IconArrowsRightDown, IconArrowsTransferUp, IconArrowsUp, IconArrowUp, IconBackground, IconInbox, IconList, IconMailOpened, IconPlus, IconTrash } from '@tabler/icons-react';
import { TicketContext } from 'src/context/TicketContext';
import { Grid, styled } from '@mui/system';
import ModalTicket from './modal-ticket/modal-ticket';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { ALL, setServers } from 'dns';
import getAllTicketsData from 'src/mocks/tickets/get-tickets';
import { useSearchParams } from 'react-router';
import sortAllTickets from './sort-tickets/sort-tickets';
import formatToRussianDate from 'src/help-functions/format-to-date';

const BoxStyled = styled(Box)(() => ({
  transition: '0.1s ease-in',
  cursor: 'pointer',
  color: 'inherit',
  backgroundColor: '#5D87FF',
  '&:hover': {
    transform: 'scale(1.03)',
    backgroundColor: '#1245d6',
  },
}));

export const AllStatus = {
  NEW: 'Новый заказ',
  PENDING: 'Принято в работу',
  BOOKED: 'Забронировано',
  FORMED: 'Оформлено',
  CLOSED: 'Завершено',
}

export const getStatus = (ticket: ELMATicket): string => {
  let status = 'Не определен';
  switch(ticket?.__status?.status) {
    // Новый заказ
    case 1:
      status = AllStatus.NEW;
      break;
    //  В работе
    case 2:
      status = AllStatus.PENDING;
      break;
    // Ожидание
    case 3:
      status = AllStatus.PENDING;
      break;
    // Создание бронирования
    case 4:
      status = ticket.otvet_klientu ? AllStatus.BOOKED : AllStatus.PENDING;
      break;
    // Выписка
    case 5:
      status = AllStatus.BOOKED;
      break;
    // Завершено
    case 6:
      status = AllStatus.FORMED;
      break;
    // Снято
    case 7:
      status = AllStatus.CLOSED;
      break; 
  }

  return status;
}

type TicketListingProps = {
  changeView: (isList: boolean) => void,
  // updateSearchParametrs: (tickets: ELMATicket[], currentTicket: ELMATicket | undefined, isShowModal: boolean) => void,
}

const TicketListing = (props: TicketListingProps) => {
  const [isShowModal, setIsShowModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const {changeView} = props;
  const { tickets, searchTickets, ticketSearch, filter }: any =
    useContext(TicketContext);

  const [currentTicket, setCurrentTicket] = useState<ELMATicket>();

  const updateSearchParametrs = (tickets: ELMATicket[], currentTicket: ELMATicket | undefined, isShowModal: boolean = false) => {
    if (isShowModal) {
      setSearchParams({item: (currentTicket?.nomer_zakaza || tickets[0]?.nomer_zakaza || '')});
    }
  };

  useEffect(() => {
    if (searchParams.get('item') && (currentTicket?.nomer_zakaza !== searchParams.get('item'))) {
      if (searchParams.get('item')) {
        const ticket = tickets.find((ticket: ELMATicket) => ticket?.nomer_zakaza === searchParams.get('item'));
        if (ticket) {
          if (searchParams.get('type')) {
            setSearchParams({item: searchParams.get('item') || ''})
          }
          setCurrentTicket(ticket);
          setIsShowModal(true);
          ticket.isChanged = false;
        } else if (tickets.length > 0) {
          setSearchParams({});
        }
      }
    } else if (tickets && searchParams.get('add') && searchParams.get('add') === 'new' && !isShowModal) {
      const allSortedTickets = sortAllTickets(tickets);
      setCurrentTicket({
        ...allSortedTickets[0],
        'nomer_zakaza': String(Number(allSortedTickets[0]?.nomer_zakaza) + 1),
        'zapros': null,
      }); 
      if (Number(tickets[0]?.nomer_zakaza) + 1) {
        setIsShowModal(true);
        console.log('fff');
      }
    }
  }, [currentTicket, tickets])

  const handlerCloseModal = (isOpen: boolean) => {
    // if (currentTicket && !currentTicket.zapros) {
    //   setCurrentTicket((previosTicket) => {
    //     const newTicket = tickets.find((ticket: ELMATicket) => ticket.nomer_zakaza === previosTicket?.nomer_zakaza);
    //     if (newTicket) {
    //       return newTicket;
    //     }
    // })
    setIsShowModal(isOpen);
    setSearchParams({});  
  }

  const theme = useTheme();

  const getVisibleTickets = (tickets: ELMATicket[], filter: string, ticketSearch: string) => {
    switch (filter) {
      case 'total_tickets':
        return tickets.filter(
          (c) => !c.__deletedAt && c.__name?.toLocaleLowerCase().includes(ticketSearch),
        );

      case AllStatus.NEW:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.NEW
        );

      case AllStatus.PENDING:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.PENDING
        );

      case AllStatus.BOOKED:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.BOOKED
        );

      case AllStatus.FORMED:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.FORMED
        );

      case AllStatus.CLOSED:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.CLOSED
        );

      // case 'Closed':
      //   return tickets.filter(
      //     (c) =>
      //       !c.deleted &&
      //       c.Status === 'Closed' &&
      //       c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
      //   );

      // case 'Open':
      //   return tickets.filter(
      //     (c) =>
      //       !c.deleted &&
      //       c.Status === 'Open' &&
      //       c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
      //   );

      default:
        throw new Error(`Unknown filter: ${filter}`);
    }
  };

  const visibleTickets = getVisibleTickets(
    tickets,
    filter,
    ticketSearch.toLowerCase()
  );

  // const ticketBadge = (ticket: ELMATicket) => {
  //   return ticket.__status?.status === 1
  //     ? theme.palette.success.light
  //     : ticket.__status?.status === 2
  //       ? theme.palette.error.light
  //       : ticket.__status?.status === 3
  //         ? theme.palette.warning.light
  //         : ticket.__status?.status === 4
  //           ? theme.palette.primary.light
  //           : 'primary';
  // };


  return (
    <React.Fragment>
    <Grid container mt={5}>
      <Grid size={{
          lg: 6,
          sm: 6,
          xs: 6
        }}>
          <Stack direction="row" alignItems="center">
            <Box sx={{ minWidth: '47%'}}>
              <TextField
                size="small"
                label="Поиск"
                fullWidth
                onChange={(e) => searchTickets(e.target.value)}
              />
            </Box>
          </Stack>
        </Grid>
        <Grid size={{
          lg: 6,
          sm: 6,
          xs: 6
        }}>
          <Box bgcolor="white" p={0}>
          <Stack direction="row" gap={2} alignItems="center" justifyContent='flex-end'>
            <BoxStyled mr={3}
              onClick={() => setSearchParams({...searchParams, add: 'new'})}
              width={'auto'}
              padding={'0 10px'}
              height={38}
              bgcolor="primary.main"
              display="flex"
              alignItems="center"
              justifyContent="center"
            > 
              <Typography
                color="primary.contrastText"
                display="flex"
                alignItems="center"
                justifyContent="center"
              > СОЗДАТЬ ЗАКАЗ
              </Typography>
              <Typography
                ml={1}
                color="primary.contrastText"
                display="flex"
                alignItems="center"
                justifyContent="center"
              > <IconPlus size={22}/>
              </Typography>
            </BoxStyled>
            <Box>
              <Typography variant="h4">Вид:</Typography>
            </Box> 
            <BoxStyled 
              onClick={() => changeView(false)}
              width={38}
              height={38}
              bgcolor="primary.main"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography
                color="primary.contrastText"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IconList width={22} />
              </Typography>
            </BoxStyled>
          </Stack>
        </Box>
      </Grid>
    </Grid>
    <Box mt={1}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h6">Номер заказа</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Информация</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Статус</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Дата</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6">Действие</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortAllTickets(visibleTickets).map((ticket: ELMATicket) => {
              const status = getStatus(ticket);

              let colorStatus = 'black';
              let backgroundStatus = 'grey';

              switch(status) {
                case AllStatus.NEW:
                  colorStatus = 'warning.main';
                  backgroundStatus = 'warning.light';
                  break;
                case AllStatus.PENDING:
                  colorStatus = 'success.main';
                  backgroundStatus = 'success.light';
                  break;
                case AllStatus.BOOKED:
                  colorStatus = 'darkpink';
                  backgroundStatus = 'pink';
                  break;
                case AllStatus.FORMED:
                  colorStatus = 'brown';
                  backgroundStatus = '#a52a2a1f';
                  break;
                case AllStatus.FORMED:
                  colorStatus = 'error.main';
                  backgroundStatus = 'error.light';
                  break;
              }

              const clickTicletHandler = () => {
                updateSearchParametrs(tickets, ticket, true);
                if (ticket.isChanged) {
                  ticket.isChanged = false;
                }
              }
              
              return(
              <TableRow className={ticket.isChanged ? "gradient-background" : ''} key={ticket.__id} hover onClick={clickTicletHandler}>
                <TableCell>{ticket.nomer_zakaza}</TableCell>
                <TableCell>
                  <Box>
                    {(ticket.__status?.status || 0) > 3 && <Typography variant="h6" fontWeight={600} noWrap>
                      ФИО ПАССАЖИРОВ
                    </Typography>}
                    <Typography
                      color="textSecondary"
                      sx={{ maxWidth: '400px', display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden"}}
                      variant="subtitle2"
                      fontWeight={400}
                    >
                      {ticket.otvet_klientu1 ? `✈️${ticket.otvet_klientu1?.split('✈️')[1]}` : <React.Fragment>  {ticket.zapros}</React.Fragment>}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    sx={{
                      backgroundColor: ticket.isChanged ? '#FFF' : backgroundStatus
                    }}
                    size="small"
                    label={status}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle1">
                    {formatToRussianDate(ticket.__updatedAt || ticket.__createdAt, 'eeee, dd MMMM')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Открыть">
                    <IconButton sx={{color: ticket.isChanged ? '#FFF' : 'inherit'}} onClick={() => {}}>
                      <IconArrowsDiagonal size="22" />
                      <Typography variant="button" marginLeft='10px'>Показать</Typography>
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box my={3} display="flex" justifyContent={'center'}>
        <Pagination count={10} color="primary" />
      </Box>
    </Box>
    <ModalTicket show={isShowModal} ticket={currentTicket ?? tickets[0]} close={handlerCloseModal}/>
    </React.Fragment>);
};

export default TicketListing;

