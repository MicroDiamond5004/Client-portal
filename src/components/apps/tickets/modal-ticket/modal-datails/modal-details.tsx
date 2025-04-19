import PageContainer from 'src/components/container/PageContainer';
import { InvoiceProvider } from 'src/context/InvoiceContext/index';
import InvoiceDetail from 'src/components/apps/invoice/Invoice-detail/index';
import BlankCard from 'src/components/shared/BlankCard';
import { CardContent } from '@mui/material';
import {
  Typography,
  Button,
  Paper,
  Box,
  Stack,
  Chip,
  Divider,
  Grid2 as Grid,
} from '@mui/material';
import { Link } from 'react-router';
import Logo from 'src/layouts/full/shared/logo/Logo';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { AllStatus, getStatus } from '../../TicketListing';
import formatToRussianDate from 'src/help-functions/format-to-date';
import MiniChat from '../../mini-chat/mini-chat';
import React, { useEffect, useState } from 'react';
import { ChatsType } from 'src/types/apps/chat';
import { getElmaMessages } from 'src/api/ELMA-api/messages';
import { messages } from 'src/layouts/full/vertical/header/data';

type ModalTicketProps = {
    ticket: ELMATicket;
    onClose: () => void;
}

const ModalDetails = (props: ModalTicketProps) => {
    const { ticket, onClose } = props;
  
    const [currentChats, setCurrentChats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true); // если нужно знать статус
  
    useEffect(() => {
      const fetchChats = async () => {
        if (!ticket?.__id) return;
        try {
          const response = await getElmaMessages(ticket.__id);
          setCurrentChats(response.messages);
        } catch (err) {
          console.error('Ошибка при загрузке чатов', err);
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchChats();
    }, [ticket?.__id]);
  
    const selectedChat: ChatsType = {
      id: ticket?.__id ?? '',
      taskId: ticket?.__id || '',
      name: ticket?.nomer_zakaza || '',
      status: 'UPLOAD',
      recent: true,
      excerpt: '',
      chatHistory: [],
      messages: currentChats,
    };

    console.log(selectedChat);

    const status = getStatus(ticket);

    let colorStatus = 'black';
    let backgroundStatus = 'grey';

    switch(status) {
        case AllStatus.NEW:
            backgroundStatus = 'warning.light';
            break;
        case AllStatus.PENDING:
            backgroundStatus = 'success.light';
            break;
        case AllStatus.BOOKED:
            backgroundStatus = 'pink';
            break;
        case AllStatus.FORMED:
            backgroundStatus = '#a52a2a1f';
            break;
        case AllStatus.FORMED:
            backgroundStatus = 'error.light';
            break;
        default:
            colorStatus = 'primary'
        }


    type GetTicketFieldType = {
        ticket: ELMATicket;
    }

    const GetTicketFields = (props: GetTicketFieldType) => {
        const {ticket} = props;
        const status = getStatus(ticket);

        switch(status) {
            case AllStatus.NEW:
                return(
                    null
                )
            case AllStatus.PENDING:
            return(
                <React.Fragment>
                    <Typography mt={0} fontWeight={600}>Маршрут и стоимость: <Typography mt={0} variant="caption">{ticket.otvet_klientu}</Typography></Typography>
                </React.Fragment>
            )
            case AllStatus.BOOKED:
            return(
                <React.Fragment>
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
        <InvoiceProvider>
        <PageContainer title="Invoice Detail" description="this is Invoice Detail">
            <BlankCard>
            <CardContent>
            <>
                <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems="center"
                justifyContent="space-between"
                mb={2}
                >
                <Box
                    sx={{
                    textAlign: {
                        xs: 'center',
                        sm: 'left',
                    },
                    }}
                >
                    <Typography variant="h5"># {ticket.nomer_zakaza}</Typography>
                    <Box mt={1}>
                    <Chip size="small" color="secondary" variant="outlined" label={formatToRussianDate(ticket.__createdAt, 'd MMMM yyyy / hh:mm')}></Chip>
                    </Box>
                </Box>
                <Box >
                    <Logo />
                </Box>
                <Box textAlign="right">
                    <Chip size="small" sx={{color: colorStatus, backgroundColor: backgroundStatus}} label={status} />
                </Box>
                </Stack>
                <Divider></Divider>
                <Grid container spacing={3} mt={2} mb={4}>
                    <Grid
                    size={{
                    xs: 12,
                    sm: 9
                    }} display={window.innerWidth > 500 ? 'flex' : 'block'} justifyContent={'space-between'}>
                        <Grid
                            size={{
                            xs: 12,
                            sm: GetTicketFields({ticket}) ? 6 : 12
                            }}>
                            <Paper variant="outlined">
                            <Box p={3} display="flex" flexDirection="column" gap="4px">
                                {/* <Typography variant="h6" mb={2}> */}
                                {/* From : */}
                                {/* </Typography> */}
                                <Typography variant="body1">{ticket.zapros}</Typography>
                            </Box>
                            </Paper>
                        </Grid>
                        
                        {GetTicketFields({ticket}) && <Grid 
                            size={{
                            xs: 12,
                            sm: 6
                            }} mt={window.innerWidth > 500 ? 0 : 1}>
                            <Paper variant="outlined">
                            <Box p={3} display="flex" flexDirection="column" gap="4px">
                                {/* <Typography variant="h6" mb={2}>
                                To :
                                </Typography> */}
                                <GetTicketFields ticket={ticket}/>
                                {/* <Typography variant="body1">{ticket.fio2}</Typography> */}
                            </Box>
                            </Paper>
                        </Grid>}
                    </Grid>
                    <Grid
                    size={{
                    xs: 12,
                    sm: 3
                    }}>
                        {ticket?.zapros && selectedChat.messages && <MiniChat selectedChat={selectedChat} />}
                    </Grid>
                </Grid>
                <Box display="flex" alignItems="center" gap={1} mt={3} justifyContent="end">
                <Button
                    variant="contained"
                    color="secondary"
                    component={Link}
                    to={`/apps/chats?item=${ticket.nomer_zakaza}`}
                >
                    Перейти в чат
                </Button>
                <Button variant="contained" color="primary" onClick={() => onClose()} >
                    Вернуться к заказам
                </Button>
                </Box>
            </>
            </CardContent>
            </BlankCard>
        </PageContainer>
        </InvoiceProvider>
    );
};
export default ModalDetails;
