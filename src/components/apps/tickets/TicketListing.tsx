// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useEffect, useState } from 'react';

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
import { IconBackground, IconList, IconTrash } from '@tabler/icons-react';
import { TicketType } from 'src/types/apps/ticket';
import { TicketContext } from 'src/context/TicketContext';
import { Grid, styled } from '@mui/system';
import ModalTicket from './modalTicket/modal-ticket';

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

type TicketListingProps = {
  changeView: (isList: boolean) => void,
}

const TicketListing = (props: TicketListingProps) => {
  const [isShowModal, setIsShowModal] = useState(false);

  const {changeView} = props;
  const { tickets, deleteTicket, searchTickets, ticketSearch, filter }: any =
    useContext(TicketContext);

  const theme = useTheme();

  const getVisibleTickets = (tickets: TicketType[], filter: string, ticketSearch: string) => {
    switch (filter) {
      case 'total_tickets':
        return tickets.filter(
          (c) => !c.deleted && c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
        );

      case 'Pending':
        return tickets.filter(
          (c) =>
            !c.deleted &&
            c.Status === 'Pending' &&
            c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
        );

      case 'Closed':
        return tickets.filter(
          (c) =>
            !c.deleted &&
            c.Status === 'Closed' &&
            c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
        );

      case 'Open':
        return tickets.filter(
          (c) =>
            !c.deleted &&
            c.Status === 'Open' &&
            c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
        );

      default:
        throw new Error(`Unknown filter: ${filter}`);
    }
  };

  const visibleTickets = getVisibleTickets(
    tickets,
    filter,
    ticketSearch.toLowerCase()
  );


  const ticketBadge = (ticket: TicketType) => {
    return ticket.Status === 'Open'
      ? theme.palette.success.light
      : ticket.Status === 'Closed'
        ? theme.palette.error.light
        : ticket.Status === 'Pending'
          ? theme.palette.warning.light
          : ticket.Status === 'Moderate'
            ? theme.palette.primary.light
            : 'primary';
  };

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
                <Typography variant="h6">Билеты</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Клиент</Typography>
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
            {visibleTickets.map((ticket: any) => (
              <TableRow key={ticket.Id} hover onClick={() => setIsShowModal(true)}>
                <TableCell>{ticket.Id}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {ticket.ticketTitle}
                    </Typography>
                    <Typography
                      color="textSecondary"
                      noWrap
                      sx={{ maxWidth: '250px' }}
                      variant="subtitle2"
                      fontWeight={400}
                    >
                      {ticket.ticketDescription}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap="10px" alignItems="center">
                    <Avatar
                      src={ticket.thumb}
                      alt={ticket.thumb}
                      sx={{
                        borderRadius: '100%',
                        width: '35',
                      }}
                    />
                    <Typography variant="h6">{ticket.AgentName}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    sx={{
                      backgroundColor: ticketBadge(ticket),
                    }}
                    size="small"
                    label={ticket.Status}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle1">
                    {format(new Date(ticket.Date), 'E, MMM d')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete Ticket">
                    <IconButton onClick={() => deleteTicket(ticket.Id)}>
                      <IconTrash size="18" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box my={3} display="flex" justifyContent={'center'}>
        <Pagination count={10} color="primary" />
      </Box>
    </Box>
    <ModalTicket show={isShowModal} close={(isOpen) => setIsShowModal(isOpen)}/>
    </React.Fragment>);
};

export default TicketListing;
