// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Theme,
  useMediaQuery,
  Typography,
  Stack,
  Avatar,
  Grid,
  Alert,
  IconButton,
  styled,
  Dialog,
  DialogActions,
  Button,
  DialogContent, Chip, Paper,
} from '@mui/material';
import { ChatsType } from 'src/types/apps/chat';
import { uniq, flatten, random } from 'lodash';
import { IconChevronLeft, IconChevronRight, IconDownload, IconFile, IconX } from '@tabler/icons-react';
import { AllStatus, getStatus } from '../tickets/TicketListing';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { fetchMessages, fetchTickets } from 'src/store/middleware/thunks';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';
import { selectPassports, selectTickets } from 'src/store/selectors/ticketsSelectors';
import axios from 'axios';
import api from 'src/store/api';
import { IconEye } from '@tabler/icons-react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { pdfjs } from 'react-pdf';
import formatToRussianDate from 'src/help-functions/format-to-date';
import { showFilePreview } from 'src/store/slices/filePreviewSlice.ts';
import { FileListBlock } from 'src/components/apps/tickets/modal-ticket/modal-datails/fileList/FileListBlock.tsx';

// Указываем pdfjs воркер вручную:
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


interface chatType {
  isInSidebar?: boolean;
  chat?: ChatsType;
}

interface FileData {
  fileId: string;
  filename: string;
  mimeType: string;
  base64: string;
  sizeMB: number;
}

export const DialogViewer = React.memo(({ openViewer, handleCloseViewer, pdfBlobUrl, pageNumber, setPageNumber, numPages, setNumPages }: any) => {
  useEffect(() => {
    // This effect ensures that if the DialogViewer is opened with the same file, it doesn't reload
    if (pdfBlobUrl) {
      setPageNumber(1); // Reset page number when the document changes
    }
  }, [pdfBlobUrl, setPageNumber]);

  const memoizedFile = useMemo(() => ({ url: pdfBlobUrl }), [pdfBlobUrl]);

  return (
    <Dialog
      open={openViewer}
      onClose={handleCloseViewer}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.6)', // затемнённый фон
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: 10,
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          height: 'auto',
          maxHeight: 'calc(90vh - 200px)', // ограничение по высоте окна
        },
      }}
    >
      <DialogActions sx={{ justifyContent: 'flex-end' }}>
        <Button
          onClick={handleCloseViewer}
          startIcon={<IconX />}
          variant="outlined"
          sx={{
            borderRadius: '9999px',
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Закрыть
        </Button>
      </DialogActions>

      <DialogContent
        dividers
        sx={{
          overflowY: 'auto', // скроллинг если нужно
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: 4,
          py: 2,
        }}
      >
        {pdfBlobUrl ? (
          <>
            <Document
              file={memoizedFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading="Загрузка документа..."
              onLoadError={(error: any) => {
                console.error('Ошибка загрузки PDF:', error);
              }}
            >
              <Page pageNumber={pageNumber} width={600} />
            </Document>

            {/* <Typography fontWeight={500}>
              Страница {pageNumber} из {numPages}
            </Typography> */}

            { pageNumber !== 1 && <Box display="flex" alignItems="center" gap={2} mt={2}>
              <IconButton
                onClick={() => setPageNumber((prev: any) => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
                sx={{ border: '1px solid #ddd', borderRadius: '12px' }}
              >
                <IconChevronLeft />
              </IconButton>

              <Typography fontWeight={500}>
                Страница {pageNumber} из {numPages}
              </Typography>

              <IconButton
                onClick={() => setPageNumber((prev: any) => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
                sx={{ border: '1px solid #ddd', borderRadius: '12px' }}
              >
                <IconChevronRight />
              </IconButton>
            </Box>}
          </>
        ) : (
          <Typography>Загрузка...</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
});

const ChatInsideSidebar = ({ isInSidebar, chat }: chatType) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  // const totalAttachment = uniq(flatten(chat?.messages.map((item) => item.attachment))).length;
  // const totalMedia =
  //   uniq(flatten(chat?.messages.map((item) => (item?.type === 'image' ? item.msg : null)))).length -
  //   1;

  // console.log(chat);

  const drawerWidth = lgUp ? '100%' : 300;

  const dispatch = useAppDispatch();

  const AllTickets = useAppSelector(selectTickets)
  const passports = useAppSelector(selectPassports);

  const [files, setFiles] = useState<any[]>([]);

  // console.log(files);

  const [openViewer, setOpenViewer] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [zaprosFiles, setZaprosFiles] = useState<any[]>([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const ticket = AllTickets?.find((ticket) => ticket.nomer_zakaza === String(chat?.id));

  useEffect(() => {
    if (!ticket?.prilozhenie_k_zaprosu) {
      setZaprosFiles([]);
      return;
    }

    const fetchFiles = async () => {
      try {
        const response = await api.post('/get-files', {
          fileIds: ticket?.prilozhenie_k_zaprosu,
        });

        if (response.data.success) {
          setZaprosFiles(response.data.files);
        }

      } catch (error) {
        console.error('Ошибка загрузки превью файлов:', error);
      }
    }

    if ((ticket?.prilozhenie_k_zaprosu?.length ?? 0) > 0) {
      fetchFiles();
    } else {
      setZaprosFiles([]);

    }

  }, [ticket?.prilozhenie_k_zaprosu])



  const handleViewFile = async (file: any) => {
    try {
      setLoading(true);
      // console.log('Загрузка файла...');

      dispatch(
        showFilePreview({
          url: file.url ?? "",
          name: decodeURIComponent(file.filename ?? "Файл"),
          type: "",
        })
      );

    } catch (error: any) {

      console.error('Ошибка при загрузке файла:', error);
      setError(error); // Сохраняем ошибку для отображения
    } finally {
      setLoading(false);
    }
  };
  


  // const handleDownloadFile = (file: any) => {
  //   const link = document.createElement('a');
  //   link.href = file.url;
  //   link.download = decodeURIComponent(file.filename); // исправляем имя файла
  //   link.click();
  // };

  const handleCloseViewer = () => {
    setOpenViewer(false);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl); // Отзываем URL
      setPdfBlobUrl(null); // Сбрасываем ссылку
    }
  };


  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const StyledStack = styled(Stack)(() => ({
    '.showOnHover': {
      display: 'none',
    },
    '&:hover .showOnHover': {
      display: 'block',
    },
  }));

  useEffect(() => {
      dispatch(fetchUserOrders());
  }, []);


  const [vaucher, setVaucher] = useState<any[]>(null);
  const [kartaMest, setKartaMest] = useState<any[]>(null);
  const [transer,  setTranser] = useState<any[]>(null);
  const [prilozhenieTransfer, setPrilozhenieTransfer] = useState<any[]>(null);
  const [vaucherTransfer, setVaucherTransfer] = useState<any[]>(null);
  const [vipServis, setVipServis] = useState<any[]>(null);


  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const fileIds: any[] = [
          ...(ticket?.marshrutnaya_kvitanciya ?? []),
          ...(ticket?.vaucher ?? []),
          ...(ticket?.karta_mest_f ?? []),
          ...(ticket?.transfer_f ?? []),
          ...(ticket?.prilozhenie_transfer1 ?? []),
          ...(ticket?.vaucher_transfer ?? []),
          ...(ticket?.vaucher_vipservis ?? []),
        ];

        const response = await api.post('/get-files', {
          fileIds
        });

      if (response.data.success) {
        setFiles(
          response.data.files.filter((f: any) =>
            ticket?.marshrutnaya_kvitanciya?.includes(f.fileId) ?? false
          )
        );

        setKartaMest(
          response.data.files.filter((f: any) =>
            ticket?.karta_mest_f?.includes(f.fileId) ?? false
          )
        );

        setTranser(
          response.data.files.filter((f: any) =>
            ticket?.transfer_f?.includes(f.fileId) ?? false
          )
        );

        setPrilozhenieTransfer(
          response.data.files.filter((f: any) =>
            ticket?.prilozhenie_transfer1?.includes(f.fileId) ?? false
          )
        );

        setVaucherTransfer(
          response.data.files.filter((f: any) =>
            ticket?.vaucher_transfer?.includes(f.fileId) ?? false
          )
        );

        setVaucher(
          response.data.files.filter((f: any) =>
            ticket?.vaucher.includes(f.fileId) ?? false
          )
        );

        setVipServis(
          response.data.files.filter((f: any) =>
            ticket?.vaucher_vipservis?.includes(f.fileId) ?? false
          )
        );


      } else {
        console.error('Ошибка на сервере:', response.data.error);
      }

      } catch (error) {
        console.error('Ошибка загрузки файлов:', error);
      }
    };

    fetchFiles();
  }, [ticket]);



  return (<>
    {isInSidebar ? (
      <Box
        sx={{
          width: isInSidebar === true ? lgUp ? '450px' : '100%' : 0,
          flexShrink: 0,
          overflowY: 'auto',
          border: '0',
          borderLeft: '1px',
          borderStyle: 'solid',
          maxHeight: 'calc(100vh - 200px)',
          right: '0',
          background: (theme) => theme.palette.background.paper,
          boxShadow: lgUp ? null : (theme) => theme.shadows[8],
          position: 'relative',
          borderColor: (theme) => theme.palette.divider,
          borderRadius: '0px'
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
          Информация по  заказy:
        </Typography>

        <Box>
          <Chip
            sx={{
              backgroundColor: 'success.main',
              color: '#fff'
            }}
            size="small"
            label={`Создан: ${formatToRussianDate(ticket?.__createdAt)}`}
          />
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
          {ticket && <><Typography mt={2} fontWeight={600}>Статус:</Typography>
          <Typography>{getStatus(ticket)?.trim()}</Typography>
          <br />
          <Typography mt={0} fontWeight={600}>Запрос:</Typography>
            {ticket.zapros && (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{ticket.zapros}</Typography>
            )}
            {(ticket.prilozhenie_k_zaprosu?.length ?? 0) > 0 && zaprosFiles.map(file => {
              const filename = decodeURIComponent(file.filename);
              const ext = filename.split('.').pop()?.toLowerCase() || '';
              const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
              return (
                <Stack mt={1} key={file.fileId} direction="row" gap={2} alignItems="center">
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
          <br />
          </>}
          {ticket && (getStatus(ticket) === AllStatus.PENDING || getStatus(ticket) === AllStatus.BOOKED) && ticket.taim_limit_dlya_klienta && <><Typography fontWeight={600}>Тайм-лимит:</Typography>
          <Typography>До {formatToRussianDate(ticket.taim_limit_dlya_klienta)}</Typography>
          <br />
          </>}

          {(files?.length ?? 0) > 0 && (
            <FileListBlock
              title="Маршрутная квитанция"
              files={files}
              originalFiles={ticket?.marshrutnaya_kvitanciya ?? []}
            />
          )}

          {(vaucher?.length ?? 0) > 0 && (
            <FileListBlock
              title="Ваучер отель"
              files={vaucher}
              originalFiles={ticket?.vaucher ?? []}
            />)}

          {(kartaMest?.length ?? 0) > 0 && (
            <FileListBlock
              title="Карта мест"
              files={kartaMest}
              originalFiles={ticket?.karta_mest_f ?? []}
            />)}

          {(vaucherTransfer?.length ?? 0) > 0 && (
            <FileListBlock
              title="Ваучер трансфер"
              files={vaucherTransfer}
              originalFiles={ticket?.vaucher_transfer ?? []}
            />)}

          {(vipServis?.length ?? 0) > 0 && (
            <FileListBlock
              title="Ваучер Вип сервис"
              files={vipServis}
              originalFiles={ticket?.vaucher_vipservis ?? []}
            />)}

            {/*const [vaucher, setVaucher] = useState<string[]>([]);*/}
            {/*const [kartaMest, setKartaMest] = useState<string[]>([]);*/}
            {/*const [transer,  setTranser] = useState<string[]>([]);*/}
            {/*const [prilozhenieTransfer, setPrilozhenieTransfer] = useState<string[]>([]);*/}
            {/*const [vaucherTransfer, setVaucherTransfer] = useState<string[]>([]);*/}
            {/*const [vipServis, setVipServis] = useState<string[]>([]);*/}


            {/*...(ticket?.marshrutnaya_kvitanciya ?? []),*/}
            {/*...(ticket?.vaucher ?? []),*/}
            {/*...(ticket?.karta_mest_f ?? []),*/}
            {/*...(ticket?.transfer_f ?? []),*/}
            {/*...(ticket?.prilozhenie_transfer1 ?? []),*/}
            {/*...(ticket?.vaucher_transfer ?? []),*/}
            {/*...(ticket?.vaucher_vipservis ?? []),*/}

          <br />
        </Box>
      </Box>
    ) : null}
  </>);
};

export default ChatInsideSidebar;


