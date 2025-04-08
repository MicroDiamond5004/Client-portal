import { Avatar, Dialog, DialogContent, DialogTitle, Divider, IconButton, ListItemAvatar, TextareaAutosize, TextField, Tooltip, Typography } from "@mui/material"
import { Box, Grid, styled, useTheme } from "@mui/system"
import React, { useContext, useEffect, useRef, useState } from "react"
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel"
import CustomTextField from "src/components/forms/theme-elements/CustomTextField"
import { ELMATicket } from "src/mocks/tickets/ticket.type"
import { AllStatus, getStatus } from "../TicketListing"
import { IconMessage, IconPlus } from "@tabler/icons-react"
import { useNavigate } from "react-router"
import { ChatContext, ChatProvider } from "src/context/ChatContext"
import { formatDistanceToNowStrict } from "date-fns"
import AppCard from "src/components/shared/AppCard"
import ChatContent from "../../chats/ChatContent"
import ChatMsgSent from "../../chats/ChatMsgSent"
import MiniChat from "../mini-chat/mini-chat"
import { ChatsType } from "src/types/apps/chat"
import addTicket from "src/api/ELMA-api/add-ticket"
import ModalDetails from "./modal-datails/modal-details"

type ModalTicketProps = {
    show: boolean,
    close: (isOpen: boolean) => void,
    ticket: ELMATicket,
}

const ModalTicket = (props: ModalTicketProps) => {
    const {show, close, ticket} = props;
    const textRef = useRef<HTMLTextAreaElement>(null);

    const selectedChat: ChatsType = {
      id: String(Math.random),
      name: ticket?.nomer_zakaza || '',
      status: 'UPLOAD',
      recent: true,
      excerpt: '',
      chatHistory: [],
      messages: [
        { 
          createdAt: new Date(),
          msg: 'HIIII',
          senderId: String(Math.random),
          type: 'text',
          attachment: [{}],
          id: String(Math.random),
        },
        { 
          createdAt: new Date(),
          msg: 'HELLLOOO',
          senderId: String(Math.random),
          type: 'text',
          attachment: [{}],
          id: String(Math.random),
        },
        { 
          createdAt: new Date(),
          msg: '11111111111111',
          senderId: String(Math.random),
          type: 'text',
          attachment: [{}],
          id: String(Math.random),
        },
        { 
          createdAt: new Date(),
          msg: '2222222222',
          senderId: String(Math.random),
          type: 'text',
          attachment: [{}],
          id: String(Math.random),
        } 
          ]
    }
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
            </React.Fragment>
          )
          case AllStatus.PENDING:
            return(
              <React.Fragment>
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрут и стоимость: <Typography mt={0} variant="caption">{ticket.otvet_klientu}</Typography></Typography>
            </React.Fragment>
            )
          case AllStatus.BOOKED:
            return(
              <React.Fragment>
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
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
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
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
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
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

    const handlerOnClickAdd = () => {
      // Здесь будет создаваться экземпляр заказа новоого
      if (textRef) {
        const newTicket = structuredClone(ticket);
        newTicket.zapros = textRef?.current?.value ?? '';
        newTicket.__updatedBy = null;
        newTicket.__createdAt = String(new Date());
        newTicket.__id = String(Math.random());
        newTicket.otvet_klientu = null;
        newTicket.otvet_klientu1 = null;
        newTicket.otvet_klientu3 = null;
        newTicket.taim_limit = null;
        if (newTicket.__status?.status) {
          newTicket.__status.status = 1;
        }
        //
        addTicket(newTicket);
        close(false);
      }
    }

    console.log(ticket);
      console.log(selectedChat);

    return (
        <Dialog
          open={show}
          onClose={() => close(false)}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          PaperProps={{ component: "form" }}
          className="dialog-container"
        >
          {/* <DialogTitle id="alert-dialog-title">Заказ {ticket?.nomer_zakaza}</DialogTitle> */}
          <DialogContent sx={{width: `${window.innerWidth * (ticket?.zapros ? 0.85 : window.innerWidth > 500 ? 0.4 : 0.85)}px`}}>
            <Grid container spacing={3}>
              <Grid
                size={{
                  xs: 12,
                  sm: 12
                }}>
                {/* Task title */}
                
                {/* <GetTicketFields ticket={ticket}/> */}
                {ticket?.zapros ? <ModalDetails ticket={ticket} onClose={() => close(false)}/> : <>
                  <Box padding={0}>
                    <Typography>Запрос:</Typography>
                    <TextField multiline inputRef={textRef} fullWidth sx={{'& textarea': {
                      padding: 0,
                    },}}></TextField>
                  </Box>
                  <Box mt={2}>
                    <IconButtonStyled sx={{width: '100%'}} onClick={handlerOnClickAdd}>
                        <IconPlus size="22" />
                        <Typography variant="button">СОЗДАТЬ</Typography>
                    </IconButtonStyled>
                  </Box>
                  </>}
                {/* <br/> */}
                {/* {ticket?.zapros && selectedChat.messages && <MiniChat selectedChat={selectedChat} />}
                {ticket?.zapros && <Box mt={3} display='flex' justifyContent='flex-start' minWidth='100px'>
                  <IconButtonStyled onClick={() => navigate(`/apps/chats?item=${ticket.nomer_zakaza}`)}>
                    <IconMessage size="22" />
                    <Typography variant="button" marginLeft='10px'>ПЕРЕЙТИ В ЧАТ ЗАКАЗА</Typography>

                  </IconButtonStyled>
                </Box>} */}
              </Grid>
            </Grid>
        </DialogContent>
        </Dialog>
    )
}

export default ModalTicket;
