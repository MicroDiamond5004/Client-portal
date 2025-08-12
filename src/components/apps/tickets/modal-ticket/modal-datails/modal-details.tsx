import PageContainer from 'src/components/container/PageContainer';
import { InvoiceProvider } from 'src/context/InvoiceContext/index';
import InvoiceDetail from 'src/components/apps/invoice/Invoice-detail/index';
import BlankCard from 'src/components/shared/BlankCard';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  CardContent, Container,
  IconButton,
  Tab,
  Tabs,
  Toolbar,
} from '@mui/material';
import {
  Typography,
  Button,
  Paper,
  Box,
  Stack,
  Chip,
  Divider,
  AppBar,
  Grid,
} from '@mui/material';
import { Link } from 'react-router';
import Logo from 'src/layouts/full/shared/logo/Logo';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { AllStatus, getStatus } from '../../TicketListing';
import formatToRussianDate from 'src/help-functions/format-to-date';
import MiniChat from '../../mini-chat/mini-chat';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ChatsType } from 'src/types/apps/chat';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectMessages } from 'src/store/selectors/messagesSelectors';
import { selectPassports } from 'src/store/selectors/ticketsSelectors';
import { IconDownload, IconEye, IconFile } from '@tabler/icons-react';
import { DialogViewer } from 'src/components/apps/chats/ChatInsideSidebar';
import api from 'src/store/api';
import { useMediaQuery, useTheme, width } from '@mui/system';
import { showFilePreview } from 'src/store/slices/filePreviewSlice';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { HotelsBlock } from './tabs/HotelsBlock';
import { TransferBlock } from './tabs/TransferBlock';
import { VipServiceBlock } from './tabs/VipServiceBlock';
import { MapBlock } from './tabs/MapBlock';
import { BookingInfoBlock } from './tabs/BookingInfoBlock';
import { fetchMessages } from 'src/store/middleware/thunks/messageThunks';
import { FileListBlock } from 'src/components/apps/tickets/modal-ticket/modal-datails/fileList/FileListBlock.tsx';


type ModalTicketProps = {
    ticket: ELMATicket;
    onClose: () => void;
}



const ModalDetails = (props: ModalTicketProps) => {
  const { ticket, onClose } = props;

  console.log(ticket.__updatedAtBooking, '-----------------');

  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null); // точка, уезжающая вверх

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => setIsSticky(!e.isIntersecting),
      { threshold: 1 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  const dispatch = useAppDispatch();

  const currentChats: any = useAppSelector(selectMessages);
  const passports = useAppSelector(selectPassports)

  const [isLoading, setIsLoading] = useState(true); // если нужно знать статус
  const [tabIndex, setTabIndex] = useState(0);

  const [zaprosFiles, setZaprosFiles] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!ticket.prilozhenie_k_zaprosu) return;
    const fetchFiles = async () => {
      try {
        const response = await api.post('/get-files', {
          fileIds: ticket.prilozhenie_k_zaprosu,
        });

        if (response.data.success) {
          setZaprosFiles(response.data.files);
        }
      } catch (error) {
        console.error('Ошибка загрузки превью файлов:', error);
      }
    }

    if ((ticket.prilozhenie_k_zaprosu?.length ?? 0) > 0) {
      fetchFiles();
    }

  }, [ticket.prilozhenie_k_zaprosu])

  const handleDownloadFile = (file: any) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = decodeURIComponent(file.filename); // исправляем имя файла
    link.click();
  };

  // useEffect(() => {
  //   if (!ticket?.marshrutnaya_kvitanciya) return;
  //   const fetchFiles = async () => {
  //     try {
  //       const response = await api.post('/get-files', {
  //         fileIds: ticket?.marshrutnaya_kvitanciya,
  //       });
  //
  //       if (response.data.success) {
  //         setFiles(response.data.files);
  //       } else {
  //         console.error('Ошибка на сервере:', response.data.error);
  //       }
  //
  //     } catch (error) {
  //       console.error('Ошибка загрузки файлов:', error);
  //     }
  //   };
  //
  //   fetchFiles();
  // }, [ticket]);


  useEffect(() => {
    if (!ticket?.__id) return;
    dispatch(fetchMessages(ticket.__id));
    setIsLoading(false);
  }, []);

  // console.log(currentChats);

  const selectedChat: ChatsType = {
    id: ticket?.__id ?? '',
    taskId: ticket?.__id || '',
    name: ticket?.nomer_zakaza || '',
    status: 'UPLOAD',
    recent: true,
    excerpt: '',
    chatHistory: [],
    messages: ticket?.nomer_zakaza ? currentChats?.[ticket.nomer_zakaza] : [],
  };

  const status = getStatus(ticket);

  let colorStatus = 'black';
  let backgroundStatus = 'grey';

  switch (status) {
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


  const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
    setTabIndex(newIndex);
  };



  const fieldMap: Record<
    number,
    {
      fio: string;
      passport: string;
      answer: string;
      timeLimit: string;
      oform: string;
    }
  > = {
    1: {
      fio: 'fio2',
      passport: 'nomer_a_pasporta_ov_dlya_proverki',
      answer: 'otvet_klientu',
      timeLimit: 'taim_limit_dlya_klienta',
      oform: 'otvet_klientu3'
    },
    2: {
      fio: 'dopolnitelnye_fio',
      passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_2',
      answer: 'otvet_klientu_o_bronirovanii_2',
      timeLimit: 'taim_limit_dlya_klienta_bron_2',
      oform: 'otvet_klientu_pered_oformleniem_bron_2'
    },
    3: {
      fio: 'fio_passazhira_ov_bron_3',
      passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_3',
      answer: 'otvet_klientu_o_bronirovanii_3',
      timeLimit: 'taim_limit_dlya_klienta_bron_3',
      oform: 'otvet_klientu_pered_oformleniem_bron_3'
    },
    4: {
      fio: 'fio_passazhira_ov_bron_4',
      passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_4',
      answer: 'otvet_klientu_o_bronirovanii_4',
      timeLimit: 'taim_limit_dlya_klienta_bron_4',
      oform: 'otvet_klientu_pered_oformleniem_bron_4'
    },
    5: {
      fio: 'fio_passazhira_ov_bron_5',
      passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_5',
      answer: 'otvet_klientu_o_bronirovanii_5',
      timeLimit: 'taim_limit_dlya_klienta_bron_5',
      oform: 'otvet_klientu_pered_oformleniem_bron_5'
    },
    6: {
      fio: 'fio_passazhira_ov_bron_6',
      passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_6',
      answer: 'otvet_klientu_o_bronirovanii_6',
      timeLimit: 'taim_limit_dlya_klienta_bron_6',
      oform: 'otvet_klientu_pered_oformleniem_bron_6'
    },
  };

  function isBookingValid(bookingNumber: number, ticket: any): boolean {
    const fields = fieldMap[bookingNumber];
    if (!fields) return false;

    const fioList = ticket[fields.fio];
    const passportData = ticket[fields.passport];
    const routeInfo = ticket[fields.oform] ?? ticket[fields.answer];
    const timeLimit = ticket[fields.timeLimit];



    return !!(
      routeInfo && (
        (fioList?.length ?? 0) > 0 ||
        (passportData?.length ?? 0) > 0 ||
        timeLimit));
  }


  const aviabilety =  [false, false, false, false, false, false].map((_data, index) => {
    const bookingNumber = index + 1;

    if (!isBookingValid(bookingNumber, ticket)) return null;

    return (
      <Accordion key={index} defaultExpanded={index === 0}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">Бронь №{bookingNumber}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{padding: isMobile ?  '0' : 'auto'}}>
          <BookingInfoBlock
            bookingNumber={bookingNumber}
            ticket={ticket}
            passports={passports}
          />
        </AccordionDetails>
      </Accordion>
    );
  });

  const formatMoney = (val?: { cents: number; currency: string }) =>
    val ? `${(val.cents / 100).toLocaleString('ru-RU')} ${val.currency}` : null;

  const AllTabs = ["Отели", "Трансфер", "ВИП сервис", "Карта мест"].map((data, index) => {
    let flagTab = false
    switch (index) {
      case 0:
        [1, 2, 3].map((index) => {
          const c = index === 1 ? '' : null;
          const isThird = index === 3 ? '_' : null;
          const suffix = index;
          const hotel = ticket[`otel${suffix}`];
          const checkIn = ticket[`data_zaezda${suffix}`];
          const checkOut = ticket[`data_vyezda${suffix}`];
          const nights = ticket[`kolichestvo_nochei${isThird ?? ''}${suffix}`];
          const roomType = ticket[`tip_nomera${suffix}`];
          const foodType = ticket[`${index === 2 ? 'tip_pitani' : 'tip_pitaniya'}${suffix}`];
          const price = ticket[`stoimost${c ?? suffix}`]?.cents > 0 ? formatMoney(ticket[`stoimost${suffix}`]) : null;

          console.log(`kolichestvo_nochei${isThird ?? ''}${c ?? suffix}`, index, ticket[`stoimost${c ?? suffix}`])

          const isEmpty =
            !hotel && !checkIn && !checkOut && !nights && !roomType && !foodType && !price;

          if (!flagTab) {
            flagTab = !isEmpty;
          }
        });
        break;
      case 1:
        const {
          opisanie_transfera,
          otvet_klientu_po_transferu,
          informaciya_o_passazhire,
          stoimost_dlya_klienta_za_oformlenie_transfera_1,
        } = ticket as any;

        const originalTransfer = ((ticket as any).transfer_f?.length ?? 0) > 0;
        const originalAppTransfer = ((ticket as any).prilozhenie_transfer1?.length ?? 0) > 0;
        const originalVoucherTransfer = ((ticket as any).vaucher_transfer?.length ?? 0) > 0;

        const isEmpty2 =
          !opisanie_transfera &&
          !otvet_klientu_po_transferu &&
          !informaciya_o_passazhire &&
          !stoimost_dlya_klienta_za_oformlenie_transfera_1 &&
          !originalTransfer &&
          !originalVoucherTransfer &&
          !originalAppTransfer;

        flagTab = !isEmpty2;
        break;
      case 2:
        const {
          nazvanie_uslugi_vipservis,
          opisanie_uslugi_vipservis,
          stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis
        } = ticket as any;

        const vaucher_vipservis = ((ticket as any).vaucher_vipservis?.length ?? 0) > 0;
        const fio_passazhirov_vipservis = ((ticket as any).fio_passazhirov_vipservis?.length ?? 0) > 0;

        const isEmpty3 =
          !nazvanie_uslugi_vipservis &&
          !opisanie_uslugi_vipservis &&
          !fio_passazhirov_vipservis &&
          !stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis &&
          !vaucher_vipservis;

        flagTab = !isEmpty3;
        break;
      case 3:
        const hasData = (ticket as any).opisanie_stoimosti_mest || ((ticket as any).karta_mest_f?.length ?? 0) > 0;
        flagTab = hasData;
        break;
    }

    if (!flagTab) {
      return false;
    }

    return (<Tab label={data}/>)
  })

  const visibleTabs = AllTabs.filter(Boolean);


  const renderTabContent = () => {
    if (tabIndex === 0) {
      return (
        <>
          {aviabilety.some(Boolean) ? (<>
              <Paper sx={{ p: {md: 3, sm: 1}, my: 0, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: {
                      xs: 'column', // для мобильных (xs и меньше)
                      sm: 'row',    // от sm и выше — в строку
                    },
                    justifyContent: 'space-between',
                    gap: 0,
                  }}
                >
                  {/* Тут ваши дочерние элементы */}
                  {ticket?.__updatedAtBooking && <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={formatToRussianDate(ticket?.__updatedAtBooking, 'd MMMM yyyy / HH:mm')}
                    sx={{ mt: 0.5, mb: 2 }}
                  />}
                </Box>
              {aviabilety.map((el) => el)}
              </Paper>
            </>
          ) : (
            <Paper sx={{ p: 3, my: 0, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: {
                    xs: 'column', // для мобильных (xs и меньше)
                    sm: 'row',    // от sm и выше — в строку
                  },
                  justifyContent: 'space-between',
                  gap: 0,
                }}
              >
                {/* Тут ваши дочерние элементы */}
                {ticket?.__updatedAtBooking && <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={formatToRussianDate(ticket.__updatedAtBooking, 'd MMMM yyyy / HH:mm')}
                  sx={{ mt: 0.5, mb: 2 }}
                />}
              </Box>
              {ticket.otvet_klientu1 ? (
                <Typography mb={1}>
                  <strong>Маршрут и стоимость:</strong>
                  {ticket.otvet_klientu1 ?
                    ticket.otvet_klientu1.split('\n').map((line: string, i: number) => (
                    <Fragment key={i}>
                  {line}
                  <br />
                </Fragment>
              ))
                : null}
                </Typography>
              ) : (
                <Typography>Нет данных по авиабилетам</Typography>
              )}
            </Paper>
          )}
          {mfiles.length > 0 && (
            <FileListBlock
              title="Маршрутные квитанции"
              files={mfiles}
              originalFiles={originalFiles}
            />
          )}
        </>
      );
    }

    // tabIndex > 0 → динамические вкладки
    const dynamicTab = visibleTabs[tabIndex - 1]?.props?.label;

    switch (dynamicTab) {
      case 'Отели':
        return <HotelsBlock ticket={ticket} />;
      case 'Трансфер':
        return <TransferBlock ticket={ticket} />;
      case 'ВИП сервис':
        return <VipServiceBlock ticket={ticket} />;
      case 'Карта мест':
        return <MapBlock ticket={ticket} />;
      default:
        return null;
    }
  };


  const [mfiles, setMFiles] = useState<any[]>([]);
  const originalFiles = ticket.marshrutnaya_kvitanciya || [];

  useEffect(() => {
    if (!ticket?.marshrutnaya_kvitanciya) return;
    const fetchFiles = async () => {
      const fileIds = ticket?.marshrutnaya_kvitanciya;
      if ((fileIds?.length ?? 0)> 0) {
        try {
          const response = await api.post('/get-files', { fileIds });
          if (response.data.success) {
            setMFiles(response.data.files);
          } else {
            console.error('Ошибка загрузки файлов:', response.data.error);
          }
        } catch (e) {
          console.error('Ошибка запроса файлов:', e);
        }
      } else {
        setMFiles([]);
      }
    };

    fetchFiles();
  }, [ticket?.marshrutnaya_kvitanciya]);


  return (
    <InvoiceProvider>
      <Box>
        {/* Sentinel for header */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {isSticky && !isMobile && (
          <Box
            sx={{
              position: 'fixed',
              top: '32px',
              left: '78%',
              transform: 'translateX(-80%)',
              width: '100%',
              maxWidth: isMobile ? '100%' : '94vw', // адаптируй под свой layout
              height: '100px', // или точная высота AppBar
              backgroundColor: theme.palette.background.paper,
              zIndex: (theme) => theme.zIndex.appBar - 1,
              borderRadius: isMobile ? 0 : '10px',
              transition: 'border-radius 0.3s',
            }}
          />
        )}
        {/* Sticky Header */}
        <AppBar
          ref={headerRef}
          position={isMobile ? 'static' : 'sticky'}
          color="inherit"
          elevation={0} // управляем тенью вручную
          sx={{
            top: 0,
            px: 2,
            py: 2, // одинаково на всех устройствах
            borderRadius: '0px', // без скруглений
            boxShadow: 'none', // вручную через background + border, если нужно
            backgroundColor: theme.palette.background.paper,
            zIndex: (theme) => theme.zIndex.appBar,
            transition: 'none', // отключаем дергания
          }}
        >
          <Toolbar
            sx={{
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: isMobile ? 'center' : 'space-between',
              gap: isMobile ? 0.5 : 0,
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            {isMobile ? (<>
              <Box>
                <Logo />
              </Box>
              <Box mt={0}>
                <Typography variant="h6" fontSize={isMobile ? '1.1rem' : '1.25rem'}>
                  Заказ №{ticket.nomer_zakaza}
                </Typography>
                <Chip
                  size="small"
                  color="secondary"
                  variant="outlined"
                  label={formatToRussianDate(ticket.__createdAt, 'd MMMM yyyy / HH:mm')}
                  sx={{ mt: 1 }} />
              </Box></>) : (<>
            <Box>
              <Typography variant="h6" fontSize={isMobile ? '1.1rem' : '1.25rem'}>
                Заказ №{ticket.nomer_zakaza}
              </Typography>
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label={formatToRussianDate(ticket.__createdAt, 'd MMMM yyyy / HH:mm')}
                sx={{ mt: 1.5 }}
              />
            </Box>

            <Box mt={isMobile ? 1 : 0}>
              <Logo />
            </Box>
            </>)}

            <Chip
              size="small"
              sx={{
                color: colorStatus,
                backgroundColor: backgroundStatus,
                mt: isMobile ? 2 : 0,
              }}
              label={status}
            />
          </Toolbar>
        </AppBar>

        {!isMobile ? (
          <Container maxWidth="100%" sx={{ maxHeight: '80vh', overflow: 'auto' }}>
            <Grid container spacing={2} sx={{ maxHeight: '100%' }}>
              {/* Left Column */}
              <Grid item xs={12} sm={3} sx={{ maxHeight: '80vh' }}>
                <Box
                  sx={{
                    height: '66vh',
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                  }}
                >
                  <Paper variant="outlined">
                    <Box p={3} display="flex" flexDirection="column" gap={1}>
                      {ticket.zapros && (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                          {ticket.zapros}
                        </Typography>
                      )}
                      {zaprosFiles.map((file) => {
                        const filename = decodeURIComponent(file.filename);
                        const ext = filename.split('.').pop()?.toLowerCase() || '';
                        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
                        return (
                          <Stack key={file.fileId} direction="row" gap={2} alignItems="center">
                            {isImage ? (
                              <Box
                                component="img"
                                src={file.url}
                                alt={filename}
                                sx={{
                                  width: 100,
                                  height: 100,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  border: '1px solid #ccc',
                                  cursor: 'pointer',
                                }}
                                onClick={() =>
                                  dispatch(
                                    showFilePreview({
                                      url: file.url ?? '',
                                      name: file.filename ?? '',
                                      type: '',
                                    })
                                  )
                                }
                              />
                            ) : (
                              <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'grey.100' }}>
                                <IconFile />
                              </Avatar>
                            )}
                            <Box flexGrow={1} overflow="hidden">
                              <Typography noWrap>{filename}</Typography>
                            </Box>
                            <IconButton onClick={() => handleDownloadFile(file)}>
                              <IconDownload />
                            </IconButton>
                          </Stack>
                        );
                      })}
                    </Box>
                  </Paper>
                </Box>
              </Grid>

              {/* Middle Column */}
              <Grid item xs={12} sm={5} sx={{ maxHeight: '80vh' }}>
                <Box
                  sx={{
                    maxHeight: '66vh',
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                  }}
                >
                  <Paper variant="outlined" sx={{ maxHeight: '95%', display: 'flex', flexDirection: 'column' }}>
                    {/* Sticky Tabs */}
                    <Box
                      sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        bgcolor: 'background.paper',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      <Tabs
                        value={tabIndex}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                      >
                        <Tab label="Авиабилеты" />
                        {visibleTabs}
                      </Tabs>
                    </Box>
                    {/* Scrollable Tab Content */}
                    <Box mt={0} flexGrow={1} overflow="auto">
                      {renderTabContent()}
                    </Box>
                  </Paper>
                </Box>
              </Grid>

               {/*Right Column: Sticky Chat*/}
              <Grid item xs={12} sm={4} sx={{ maxHeight: '80vh' }}>
                <Box
                  sx={{
                    position: 'sticky',
                    p: 2,
                    // remove overflow
                    // overflowY: 'auto',
                  }}
                >
                  {/* MiniChat */}
                  {ticket.__id && selectedChat.messages && (
                    <MiniChat selectedChat={selectedChat} />
                  )}
              
                  {/* Кнопки под чатом */}
                  <Box
                    display="flex"
                    flexDirection="row"
                    justifyContent="space-around"
                    textAlign="center"
                    gap={1}
                    mt={2}
                  >
                    <Button
                      sx={{ width: '200px' }}
                      variant="contained"
                      color="secondary"
                      component={Link}
                      to={`/apps/chats?item=${ticket.nomer_zakaza}`}
                    >
                      Перейти в чат
                    </Button>
                    <Button
                      sx={{ width: '200px' }}
                      variant="contained"
                      color="primary"
                      onClick={onClose}
                    >
                      Перейти к заказам
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Container>
        ) : (
          <Container maxWidth="100%" sx={{ height: '100%' }}>
          <Grid container spacing={0} sx={{ height: '100%' }}>
            {/* Left Column */}
            <Grid item xs={12} sm={8} sx={{ height: '100%' }}>
              <Grid container spacing={0}>
                <Grid item xs={12} sm={ticket.zapros || zaprosFiles.length ? 4 : 12}>
                  <Paper variant="outlined">
                    <Box p={2} display="flex" flexDirection="column" gap={1}>
                      {ticket.zapros && (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                          {ticket.zapros}
                        </Typography>
                      )}
                      {zaprosFiles.map(file => {
                        const filename = decodeURIComponent(file.filename);
                        const ext = filename.split('.').pop()?.toLowerCase() || '';
                        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
                        return (
                          <Stack key={file.fileId} direction="row" gap={2} alignItems="center">
                            {isImage ? (
                              <Box
                                component="img"
                                src={file.url}
                                alt={filename}
                                sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 1, border: '1px solid #ccc', cursor: 'pointer' }}
                                onClick={() => {dispatch(showFilePreview({ url: file.url ?? '', name: file.filename ?? '', type: '' }))}}
                              />
                            ) : (
                              <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'grey.100' }}>
                                <IconFile />
                              </Avatar>
                            )}
                            <Box flexGrow={1} overflow="hidden">
                              <Typography noWrap>{filename}</Typography>
                            </Box>
                            <IconButton onClick={() => {handleDownloadFile(file)}}>
                              <IconDownload />
                            </IconButton>
                          </Stack>
                        );
                      })}
                    </Box>
                  </Paper>
                </Grid>

                {/* Tabs */}
                <Grid item xs={12} sm={8} sx={{ mt: { xs: 1, sm: 0 }, maxHeight: '100vh', overflow: 'auto' }}>
                  <Paper variant="outlined" sx={{ p: 0 }}>
                    <Box>
                      <Tabs
                        value={tabIndex}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                      >
                        <Tab label="Авиабилеты" />
                        {visibleTabs}
                      </Tabs>

                      <Box mt={2}>
                        {renderTabContent()}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

            {/* Right Column: Sticky Chat */}
            <Grid item xs={12} sm={4}>
              {ticket.__id && selectedChat.messages && (
                <Box sx={{ zIndex: 1000 }}>
                  {!isMobile && <MiniChat selectedChat={selectedChat} />}
                  <Box display="flex" flexDirection="row" justifyContent={'space-around'} textAlign="center" gap={1} mt={2}>
                    <Button sx={{width: '200px'}} variant="contained" color="secondary" state={{ item: ticket.nomer_zakaza }} component={Link} to={`/apps/chats?item=${ticket.nomer_zakaza}`}>Перейти в чат</Button>
                    <Button sx={{width: '200px'}} variant="contained" color="primary" onClick={onClose}>Перейти к заказам</Button>
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </Container>)}
      </Box>
    </InvoiceProvider>
  )
}

  export default ModalDetails;
