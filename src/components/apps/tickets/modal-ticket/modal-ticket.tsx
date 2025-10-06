import {
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  ListItemAvatar,
  TextareaAutosize,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Box, styled, useMediaQuery, useTheme } from "@mui/system"
import { ChangeEvent, useContext, useEffect, useRef, useState } from 'react';
import { AllStatus, getStatus } from "../TicketListing"
import { IconFile, IconSend, IconX } from '@tabler/icons-react';
import { useNavigate } from "react-router"
import { ChatsType } from "src/types/apps/chat"
import ModalDetails from "./modal-datails/modal-details"
import { sendPushFromClient } from "src/utils/pushManager"
import { useAppDispatch, useAppSelector } from "src/store/hooks"
import { fetchAddNewOrder} from "src/store/middleware/thunks"
import { fetchMessages } from 'src/store/middleware/thunks/messageThunks';
import { selectMessages } from "src/store/selectors/messagesSelectors"
import { selectContragentId } from "src/store/selectors/authSelector"
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import { ELMATicket } from 'src/data/types.ts';

type ModalTicketProps = {
    show: boolean,
    close: (isOpen: boolean) => void,
    ticket: ELMATicket | null,
}

const ModalTicket = (props: ModalTicketProps) => {
  const [images, setImages] = useState<File[]>([]);
  const kontakt = useAppSelector(selectContragentId) ?? '';

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [isUploadingImage, setUploadingImage] = useState<boolean>(false);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImages([...images, ...Array.from(event.target.files)]);
      if (event.target.files.length >= 1) {
        setUploadingImage(true);
      } else {
        setUploadingImage(false);
      }
    }
  };

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100

  const handleClearImages = () => {
    setImages([]);
  };
  
    const dispatch = useAppDispatch();

    const {show, close, ticket} = props;

    const textRef = useRef<HTMLTextAreaElement>(null);

    const currentChats: any  = useAppSelector(selectMessages);
    const [isLoading, setIsLoading] = useState(true);
    const [isDisabled, setIsDisabled] = useState(true);

    useEffect(() => {
      const fetchChats = async () => {
        if (!ticket?.__id) return;
        try {
          dispatch(fetchMessages(ticket.__id));
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

    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const IconButtonStyled = styled(IconButton)(() => ({
        padding: '5px 10px',
        gap: '10px',
        borderRadius: `${10}px`,
        marginBottom: '0px',
        color: `white !important`,
        backgroundColor: theme.palette.primary.main,
        '&:hover': {
          backgroundColor: theme.palette.primary.light,
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
            <>
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
            </>
          )
        case AllStatus.PENDING:
          return(
            <>
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрут и стоимость: <Typography mt={0} variant="caption">{ticket.otvet_klientu}</Typography></Typography>
            </>
          )
        case AllStatus.BOOKED:
        case AllStatus.FORMED:
        case AllStatus.CLOSED:
          return(
            <>
              <Typography mt={0} variant="caption">{ticket.zapros}</Typography><br />
              <br/>
              <Typography mt={0} fontWeight={600}>ФИО КЛИЕНТОВ: <Typography mt={0} variant="caption"> NAME LASTNAME</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>НОМЕР ПАСПОРТА:<Typography mt={0} variant="caption"> XXXXXX</Typography></Typography>
              <br/>
              <Typography mt={0} fontWeight={600}>Маршрут и стоимость:<Typography mt={0} variant="caption"> {ticket.otvet_klientu}</Typography></Typography>
              <br/>
              {ticket.itogovaya_stoimost && (
                <Typography mt={0} fontWeight={600}>Итоговая стоимость:<Typography mt={0} variant="caption"> {ticket.itogovaya_stoimost.cents}</Typography></Typography>
              )}
              <br/>
              {(status === AllStatus.FORMED || status === AllStatus.CLOSED) && (
                <Typography mt={0} fontWeight={600}>Маршрутная квитанция:<Typography mt={0} variant="caption"> ФАЙЛ.txt</Typography></Typography>
              )}
              <br/>
              {ticket.taim_limit && (
                <Typography mt={0} fontWeight={600}>Тайм-лимит<Typography mt={0} variant="caption"> {ticket.taim_limit}</Typography></Typography>
              )}
              {ticket.otvet_klientu3 && <Typography mt={0} variant="caption"> {ticket.otvet_klientu3}</Typography>}
            </>
          )
      }
    }

    const handlerOnClickAdd = () => {
      if (textRef) {
        // const newTicket = structuredClone(ticket);
        // newTicket.zapros = textRef?.current?.value ?? '';
        // newTicket.__updatedBy = null;
        // newTicket.__createdAt = String(new Date());
        // newTicket.__id = String(Math.random());
        // newTicket.otvet_klientu = null;
        // newTicket.otvet_klientu1 = null;
        // newTicket.otvet_klientu3 = null;
        // newTicket.taim_limit = null;
        // if (newTicket.__status?.status) {
        //   newTicket.__status.status = 1;
        // }
        // dispatch(addNEwTicket(newTicket));
        close(false);
      }
    }

    const handlerClose = (evt: any) => {
      if (evt.target.value.length > 0 && isDisabled) {
        setIsDisabled(false);
      } else if (evt.target.value.length === 0 && !isDisabled) {
        setIsDisabled(true);
      }
    }

    return (
        (!!ticket?.__createdAt) ?
        <>{/* Крестик вне модального окна */}
          <Dialog
      open={show}
      onClose={() => uploading ? null : close(false)}
      fullWidth
      PaperProps={{
        sx: {
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
          borderRadius: 2,
          width: isMobile ? '90vw' : '100%',
          maxWidth: ticket?.__id ? '100%' : isMobile ? '600px' : '60vw',
        },
      }}
    >
      {/* Крестик внутри Dialog, но поверх содержимого */}
      <IconButton
        aria-label="close"
        disabled={uploading}
        onClick={() => uploading ? null : close(false)}
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          zIndex: 1500,
          backgroundColor: 'white',
          boxShadow: 3,
          '&:hover': { backgroundColor: '#f5f5f5' },
        }}
      >
        <IconX />
      </IconButton>

  <DialogContent
    sx={{
      overflowY: 'auto',
      position: 'relative',
      px: isMobile ? 0 : 3,
      py: isMobile ? 2 : 2,
      borderRadius: 2,
      height: uploading ? '150px' : 'inherit',
    }}
  >
    <Grid container spacing={2}>
      <Grid item xs={12}>
        {(uploading) ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              zIndex: 2000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
            }}
          >
            <CircularProgress size={48} thickness={4} />
            <Typography variant="h6" mt={3} textAlign="center">
              Пожалуйста, подождите...
            </Typography>
            <Typography variant="body2" mt={1} textAlign="center" color="text.secondary">
              {isUploadingImage ? 'Загружаем файлы и сохраняем заказ' : 'Сохраняем заказ'}
            </Typography>
          </Box>) : ticket?.__id ? (
          <Box>
            <ModalDetails ticket={ticket as any} onClose={() => close(false)} />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2} p={'5px 25px'}>
            {/* Запрос */}
            <Box>
              <Typography mb={1}>
                Введите ваш запрос:
              </Typography>
              <TextField
                onChange={handlerClose}
                required
                multiline
                inputRef={textRef}
                fullWidth
                minRows={3}
                maxRows={20}
                sx={{ '& textarea': { padding: 0 } }}
              />
            </Box>

            {/* Загрузка фото */}
            <Box>
              <label
                htmlFor="image-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px',
                  width: '100%',
                  borderRadius: 10,
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <IconFile sx={{ fontSize: 18 }} />
                <Typography variant="button" sx={{ color: 'white' }}>
                  Загрузить файлы
                </Typography>
              </label>

              <input
                id="image-upload"
                hidden
                accept="image/*"
                multiple
                type="file"
                onChange={handleImageChange}
              />

              {/* Превью */}
              {images.length > 0 && (
                <>
                  <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
                    {images.map((file, idx) => (
                      <Box key={idx} sx={{ position: 'relative' }}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`preview-${idx}`}
                          width={100}
                          height={100}
                          style={{
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #ccc',
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                  <Box mt={1}>
                    <Button color="error" onClick={handleClearImages}>
                      Удалить все файлы
                    </Button>
                  </Box>
                </>
              )}
            </Box>

            {/* Кнопка отправки */}
            <Box>
              <IconButtonStyled
                disabled={isDisabled}
                sx={{
                  width: '100%',
                  '&:disabled': { background: '#c5c5c5 !important' },
                }}
                onClick={async () => {
                  setUploading(true);
                  setUploadProgress(0);

                  try {
                    await dispatch(
                      fetchAddNewOrder({
                        zapros: textRef?.current?.value?.trim() ?? '',
                        imgs: images,
                        kontakt,
                      })
                    ).unwrap(); // unwrap, если используешь RTK

                    handlerOnClickAdd();
                    sendPushFromClient('На рассмотрении', `Создан новый заказ`);
                  } catch (e) {
                    console.error('Ошибка при отправке заказа:', e);
                  } finally {
                    setUploadingImage(false)
                    setUploading(false);
                  }
                }}
              >
                <IconSend size="18" color="white" />
                <Typography variant="button" sx={{ color: 'white' }}>
                  Отправить
                </Typography>
              </IconButtonStyled>
            </Box>
          </Box>
        )}
      </Grid>
    </Grid>
  </DialogContent>
</Dialog></> : <></>
    )
}

export default ModalTicket;