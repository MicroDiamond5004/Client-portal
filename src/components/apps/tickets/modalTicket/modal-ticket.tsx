import { Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material"
import { Box, Grid, styled, useTheme } from "@mui/system"
import React, { useState } from "react"
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel"
import CustomTextField from "src/components/forms/theme-elements/CustomTextField"
import { ELMATicket } from "src/mocks/tickets/ticket.type"
import { AllStatus, getStatus } from "../TicketListing"
import { IconMessage } from "@tabler/icons-react"
import { useNavigate } from "react-router"

type ModalTicketProps = {
    show: boolean,
    close: (isOpen: boolean) => void,
    ticket: ELMATicket,
}

const ModalTicket = (props: ModalTicketProps) => {
    const {show, close, ticket} = props;

    const navigate = useNavigate();

    const theme = useTheme();

    const IconButtonStyled = styled(IconButton)(() => ({
        padding: '5px 10px',
        gap: '10px',
        borderRadius: `${10}px`,
        marginBottom: '0px',
        color:
           `white !important`,
        backgroundColor: theme.palette.primary.main,
        '&:hover': {
          backgroundColor: theme.palette.primary.light,
        },
        '&.Mui-selected': {
          
          '&:hover': {
            backgroundColor: '',
            color: 'white',
          },
        },
      }));

    type GetTicketFieldType = {
      ticket: ELMATicket;
    }

    
    const GetTicketFields = (props: GetTicketFieldType) => {
      const {ticket} = props;
      const status = getStatus(ticket);

      switch(status) {
        case AllStatus.NEW:
          return(
            <React.Fragment>
              <Typography fontWeight={600}>Запрос: <Typography variant="caption"> {ticket.zapros}</Typography></Typography>
            </React.Fragment>
          )
          case AllStatus.PENDING:
            return(
              <React.Fragment>
              <Typography fontWeight={600}>Запрос: <Typography variant="caption"> {ticket.zapros}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрут и стоимость: <Typography mt={0} variant="caption">{ticket.otvet_klientu}</Typography></Typography>
            </React.Fragment>
            )
          case AllStatus.BOOKED:
            return(
              <React.Fragment>
              <Typography fontWeight={600} noWrap>Запрос:<Typography mt={0} variant="caption"> {ticket.zapros}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>ФИО КЛИЕНТОВ: <Typography mt={0} variant="caption"> NAME LASTNAME</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>НОМЕР ПАСПОРТА:<Typography mt={0} variant="caption"> XXXXXX</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрут и стоимость:<Typography mt={0} variant="caption"> {ticket.otvet_klientu}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Тайм-лимит<Typography mt={0} variant="caption"> {ticket.taim_limit}</Typography></Typography>
              <br/>
              {ticket.otvet_klientu3 && <Typography mt={0} variant="caption"> {ticket.otvet_klientu3}</Typography>}
            </React.Fragment>
            )
          case AllStatus.FORMED:
            return(
              <React.Fragment>
              <Typography fontWeight={600} noWrap>Запрос:<Typography mt={0} variant="caption"> {ticket.zapros}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>ФИО КЛИЕНТОВ: <Typography mt={0} variant="caption"> NAME LASTNAME</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>НОМЕР ПАСПОРТА:<Typography mt={0} variant="caption"> XXXXXX</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрут и стоимость:<Typography mt={0} variant="caption"> {ticket.otvet_klientu}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Итоговая стоимость:<Typography mt={0} variant="caption"> {ticket.itogovaya_stoimost.cents}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрутная квитанция:<Typography mt={0} variant="caption"> ФАЙЛ.txt</Typography></Typography>
            </React.Fragment>
            )
          case AllStatus.CLOSED:
            return(
              <React.Fragment>
              <Typography fontWeight={600} noWrap>Запрос:<Typography mt={0} variant="caption"> {ticket.zapros}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>ФИО КЛИЕНТОВ: <Typography mt={0} variant="caption"> NAME LASTNAME</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>НОМЕР ПАСПОРТА:<Typography mt={0} variant="caption"> XXXXXX</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрут и стоимость:<Typography mt={0} variant="caption"> {ticket.otvet_klientu}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Итоговая стоимость:<Typography mt={0} variant="caption"> {ticket.itogovaya_stoimost.cents}</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрутная квитанция:<Typography mt={0} variant="caption"> ФАЙЛ.txt</Typography></Typography>
            </React.Fragment>
            )
      }
    } 

    return (
        <Dialog
          open={show}
          onClose={() => close(false)}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          PaperProps={{ component: "form" }}
        >
          <DialogTitle id="alert-dialog-title">Заказ {ticket?.nomer_zakaza}</DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid
                size={{
                  xs: 8,
                  sm: 8
                }}>
                {/* Task title */}
                <GetTicketFields ticket={ticket}/>
                <br/>
                <Box display='flex' justifyContent='flex-start' minWidth='100px'>
                  <IconButtonStyled onClick={() => navigate(`/apps/chats?item=${ticket.nomer_zakaza}`)}>
                    <IconMessage size="22" />
                    <Typography variant="button" marginLeft='10px'>ПЕРЕЙТИ В ЧАТ ЗАКАЗА</Typography>
                  </IconButtonStyled>
                </Box>
              </Grid>
            </Grid>
        </DialogContent>
        </Dialog>
    )
}

export default ModalTicket;
