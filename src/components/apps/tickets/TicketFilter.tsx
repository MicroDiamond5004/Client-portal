import { Box, Grid2 as Grid, Typography, styled } from '@mui/material';
import { useContext } from "react";
import { TicketContext } from "src/context/TicketContext";

const BoxStyled = styled(Box)(() => ({
  padding: '30px 22px',
  transition: '0.1s ease-in',
  cursor: 'pointer',
  height: '127px',
  color: 'inherit',
  '&:hover': {
    transform: 'scale(1.03)',
  },
}));

const TicketFilter = () => {

  const { tickets, setFilter }: any = useContext(TicketContext);
  const openC = tickets.filter((t: { Status: string; }) => t.Status === 'Новый заказ').length;
  const pendingC = tickets.filter((t: { Status: string; }) => t.Status === 'Принято в работу').length;
  const formedC = tickets.filter((t: { Status: string; }) => t.Status === 'Забронировано').length;
  const bookedC = tickets.filter((t: { Status: string; }) => t.Status === 'Оформлено').length;
  const closeC = tickets.filter((t: { Status: string; }) => t.Status === 'Завершено').length;
  

  return (
    (
      <Grid container spacing={3} textAlign="center">
      <Grid
        size={{
          lg: 2,
          sm: 6,
          xs: 12
        }}>
        <BoxStyled alignContent='center'
          onClick={() => setFilter('total_tickets')}
          sx={{ backgroundColor: 'primary.light', color: 'primary.main' }}
        >
          <Typography variant="h3">{tickets.length}</Typography>
          <Typography variant="h6">Все</Typography>
        </BoxStyled>
      </Grid>
      <Grid
        size={{
          lg: 2,
          sm: 6,
          xs: 12
        }}>
        <BoxStyled alignContent='center'
          onClick={() => setFilter('Pending')}
          sx={{ backgroundColor: 'warning.light', color: 'warning.main' }}
        >
          <Typography variant="h3">{pendingC}</Typography>
          <Typography variant="h6">Новый заказ</Typography>
        </BoxStyled>
      </Grid>
      <Grid
        size={{
          lg: 2,
          sm: 6,
          xs: 12
        }}>
        <BoxStyled alignContent='center'
          onClick={() => setFilter('Open')}
          sx={{ backgroundColor: 'success.light', color: 'success.main' }}
        >
          <Typography variant="h3">{openC}</Typography>
          <Typography variant="h6">Принято в работу</Typography>
        </BoxStyled>
      </Grid>
      <Grid
        size={{
          lg: 2,
          sm: 6,
          xs: 12
        }}>
        <BoxStyled alignContent='center'
          onClick={() => setFilter('Closed')}
          sx={{ backgroundColor: 'pink', color: 'darkpink' }}
        >
          <Typography variant="h3">{closeC}</Typography>
          <Typography variant="h6">Забронировано</Typography>
        </BoxStyled>
      </Grid>
      <Grid
        size={{
          lg: 2,
          sm: 6,
          xs: 12
        }}>
        <BoxStyled alignContent='center'
          onClick={() => setFilter('Closed')}
          sx={{ backgroundColor: '#a52a2a1f', color: 'brown' }}
        >
          <Typography variant="h3">{closeC}</Typography>
          <Typography variant="h6">Оформлено</Typography>
        </BoxStyled>
      </Grid>
      <Grid
        size={{
          lg: 2,
          sm: 6,
          xs: 12
        }}>
        <BoxStyled alignContent='center'
          onClick={() => setFilter('Closed')}
          sx={{ backgroundColor: 'error.light', color: 'error.main' }}
        >
          <Typography variant="h3">{closeC}</Typography>
          <Typography variant="h6">Завершено</Typography>
        </BoxStyled>
      </Grid>
    </Grid>)
  );
};

export default TicketFilter;
