// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
  Box,
  Theme,
  useMediaQuery,
  Typography,
  Stack,
  Avatar,
  Grid2 as Grid,
  Alert,
  IconButton,
  styled,
} from '@mui/material';
import { ChatsType } from 'src/types/apps/chat';
import { uniq, flatten, random } from 'lodash';
import { IconDownload } from '@tabler/icons-react';
import getAllTicketsData from 'src/mocks/tickets/get-tickets';
import { AllStatus, getStatus } from '../tickets/TicketListing';

interface chatType {
  isInSidebar?: boolean;
  chat?: ChatsType;
}

const drawerWidth = 320;

const ChatInsideSidebar = ({ isInSidebar, chat }: chatType) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const totalAttachment = uniq(flatten(chat?.messages.map((item) => item.attachment))).length;
  const totalMedia =
    uniq(flatten(chat?.messages.map((item) => (item?.type === 'image' ? item.msg : null)))).length -
    1;

  const StyledStack = styled(Stack)(() => ({
    '.showOnHover': {
      display: 'none',
    },
    '&:hover .showOnHover': {
      display: 'block',
    },
  }));

  const AllTickets = getAllTicketsData().result.result;
  const ticket = AllTickets.find((ticket) => ticket.nomer_zakaza === String(chat?.id));

  const randomNames = ['Иван Иванов', 'Михаил Михайлов', 'Юрий Алмазов'];
  const passports = ['XXXXXX', 'YYYYYY', 'ZZZZZZ'];

  return (<>
    {isInSidebar ? (
      <Box
        sx={{
          width: isInSidebar === true ? drawerWidth : 0,
          flexShrink: 0,
          overflowY: 'auto',
          border: '0',
          borderLeft: '1px',
          borderStyle: 'solid',
          maxHeight: '650px',
          right: '0',
          background: (theme) => theme.palette.background.paper,
          boxShadow: lgUp ? null : (theme) => theme.shadows[8],
          position: 'relative',
          borderColor: (theme) => theme.palette.divider,
        }}
        p={3}
      >
        {/* <Typography variant="h6" mb={2}>
          Media ({totalMedia})
        </Typography>
        <Grid container spacing={2}>
          {chat?.messages.map((c, index) => {
            return (
              (<Grid
                key={chat.name + index}
                size={{
                  xs: 12,
                  lg: 4
                }}>
                {c?.type === 'image' ? (
                  <Avatar
                    src={c?.msg}
                    alt="media"
                    variant="rounded"
                    sx={{ width: '72px', height: '72px' }}
                  />
                ) : (
                  ''
                )}
              </Grid>)
            );
          })}
          <Grid
            size={{
              xs: 12,
              lg: 12
            }}>
            {totalMedia === 0 ? <Alert severity="error">No Media Found!</Alert> : null}
          </Grid>
        </Grid> */}

        <Typography variant="h5" mt={0} mb={2}>
          Информация по {ticket?.nomer_zakaza} заказy:
        </Typography>
        <Box>
          {/* {chat?.messages.map((c, index) => {
            return (
              <Stack spacing={2.5} key={chat.name + index} direction="column">
                {c?.attachment?.map((a, index) => {
                  return (
                    <StyledStack key={index} direction="row" gap={2}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: '48px',
                          height: '48px',
                          bgcolor: (theme) => theme.palette.grey[100],
                        }}
                      >
                        <Avatar
                          src={a.icon}
                          alt="av"
                          variant="rounded"
                          sx={{ width: '24px', height: '24px' }}
                        ></Avatar>
                      </Avatar>
                      <Box mr={'auto'}>
                        <Typography variant="subtitle2" fontWeight={600} mb={1}>
                          {a.file}
                        </Typography>
                        <Typography variant="body2">{a.fileSize}</Typography>
                      </Box>
                      <Box className="showOnHover">
                        <IconButton aria-label="delete">
                          <IconDownload stroke={1.5} size="20" />
                        </IconButton>
                      </Box>
                    </StyledStack>
                  );
                })}
              </Stack>
            );
          })} */}
          {ticket && <><Typography fontWeight={600}>Статус:</Typography>
          <Typography>{getStatus(ticket)}</Typography>
          <br />
          </>}
          {ticket?.fio2 && <><Typography fontWeight={600}>ФИО + ПАСПОРТА:</Typography>
          {randomNames.map((currentName, index) => <Typography key={currentName + index}>{currentName} - {passports[index]}</Typography>)
          }
          <br />
          </>}
          {ticket?.otvet_klientu3 && <><Typography fontWeight={600}>Маршрут и стоимость:</Typography>
          <Typography>{ticket.otvet_klientu3}</Typography>
          <br />
          </>}
          {!ticket?.otvet_klientu3 && ticket?.otvet_klientu1 && <><Typography fontWeight={600}>Маршрут и стоимость:</Typography>
          <Typography>{ticket.otvet_klientu1}</Typography>
          <br />
          </>}
          {ticket && getStatus(ticket) === AllStatus.BOOKED && ticket.taim_limit && <><Typography fontWeight={600}>Тайм-лимит:</Typography>
          <Typography>{ticket.taim_limit}</Typography>
          <br />
          </>}
          {ticket && getStatus(ticket) === AllStatus.FORMED && <><Typography fontWeight={600}>Маршрутная квитанция:</Typography>
          <Stack spacing={2.5} direction="column" mt={1}>
            <StyledStack key={Math.random()} direction="row" gap={2} >
            <Avatar
              variant="rounded"
              sx={{
                width: '48px',
                height: '48px',
                bgcolor: (theme) => theme.palette.grey[100],
              }}
            >
                <Avatar
                  src="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23clip0_631_1669)'%3e%3cpath%20d='M23.993%200H0.00703125C0.003148%200%200%200.003148%200%200.00703125V23.993C0%2023.9969%200.003148%2024%200.00703125%2024H23.993C23.9969%2024%2024%2023.9969%2024%2023.993V0.00703125C24%200.003148%2023.9969%200%2023.993%200Z'%20fill='%23ED2224'/%3e%3cpath%20d='M13.875%205.625L19.2188%2018.375V5.625H13.875ZM4.78125%205.625V18.375L10.125%205.625H4.78125ZM9.70312%2015.7969H12.1406L13.2188%2018.375H15.375L11.9531%2010.2656L9.70312%2015.7969Z'%20fill='white'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_631_1669'%3e%3crect%20width='24'%20height='24'%20rx='3'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e"
                  alt="av"
                  variant="rounded"
                  sx={{ width: '24px', height: '24px' }}
                ></Avatar>
              </Avatar>
              <Box mr={'auto'}>
                <Typography width={100}>
                  {'Маршрутная-квитанция-2.pdf'}
                </Typography>
                <Typography >{Math.floor(Math.random() * 1000) % 30}мб</Typography>
              </Box>
              <Box className="showOnHover">
                <IconButton aria-label="delete">
                  <IconDownload stroke={1.5} size="20" />
                </IconButton>
              </Box>
            </StyledStack>
          </Stack>
          <br />
          </>}
          {ticket?.zapros && <><Typography fontWeight={600}>Запрос:</Typography>
          <Typography>{ticket.zapros}</Typography>
          <br />
          </>}
        </Box>
      </Box>
    ) : null}
  </>);
};

export default ChatInsideSidebar;


