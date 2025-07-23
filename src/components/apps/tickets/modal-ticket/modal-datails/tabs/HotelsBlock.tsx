import { Paper, Typography } from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';
import formatToRussianDate from 'src/help-functions/format-to-date';
import api from 'src/store/api';
import { FileListBlock } from '../fileList/FileListBlock';

type HotelsBlockProps = {
  ticket: any;
};

const formatMoney = (val?: { cents: number; currency: string }) =>
  val ? `${(val.cents / 100).toLocaleString('ru-RU')} ${val.currency}` : null;

// ...все импорты остаются прежними

export const HotelsBlock: React.FC<HotelsBlockProps> = ({ ticket }) => {
  const [files, setFiles] = useState<any[]>([]);
  const originalVoucherFiles = ticket.vaucher ? [ticket.vaucher] : [];

  useEffect(() => {
    const fetchFiles = async () => {
      if (originalVoucherFiles.length > 0) {
        const response = await api.post('/get-files', {
          fileIds: originalVoucherFiles.map((file) => file.__id),
        });

        if (response.data.success) {
          const fetchedFiles: any[] = response.data.files;
          if (fetchedFiles.length !== files.length) {
            setFiles(fetchedFiles);
          }
        } else {
          console.error('Ошибка на сервере:', response.data.error);
        }
      }
    };

    fetchFiles();
  }, [ticket.vaucher?.__id]);

  const hotelItems = [1, 2, 3].map((index) => {
    const suffix = index === 1 ? '' : index;
    const hotel = ticket[`otel${suffix}`]?.name;
    const checkIn = ticket[`data_zaezda${suffix}`];
    const checkOut = ticket[`data_vyezda${suffix}`];
    const nights = ticket[`kolichestvo_nochei${suffix}`];
    const roomType = ticket[`tip_nomera${suffix}`]?.name;
    const foodType = ticket[`tip_pitaniya${suffix}`]?.name;
    const price = ticket[`stoimost${suffix}`]?.cents > 0 ? formatMoney(ticket[`stoimost${suffix}`]) : null;

    const isEmpty =
      !hotel && !checkIn && !checkOut && !nights && !roomType && !foodType && !price;

    if (isEmpty) return null;

    return (
      <Paper
        key={index}
        elevation={3}
        sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: '#f9f9f9' }}
      >
        <Typography variant="h5" mb={2}>
          Отель {index}
        </Typography>
        {hotel && <Typography mb={1}><strong>Название отеля:</strong> {hotel}</Typography>}
        {ticket.kolichestvo_nomerov && index === 1 && (
          <Typography mb={1}><strong>Количество номеров:</strong> {ticket.kolichestvo_nomerov}</Typography>
        )}
        {checkIn && <Typography mb={1}><strong>Дата заезда:</strong> {formatToRussianDate(checkIn)}</Typography>}
        {checkOut && <Typography mb={1}><strong>Дата выезда:</strong> {formatToRussianDate(checkOut)}</Typography>}
        {nights && <Typography mb={1}><strong>Количество ночей:</strong> {nights}</Typography>}
        {roomType && <Typography mb={1}><strong>Тип номера:</strong> {roomType}</Typography>}
        {foodType && <Typography mb={1}><strong>Тип питания:</strong> {foodType}</Typography>}
        {price && <Typography mb={1}><strong>Стоимость:</strong> {price}</Typography>}
      </Paper>
    );
  });

  const hasMainData = hotelItems.some((item) => item !== null);
  const hasExtraData = ticket.kommentarii_k_predlozheniyu || ticket.otmena_bez_shtrafa || ticket.otmena_so_shtrafom || ticket.nevozvratnyi || files.length > 0;

  if (!hasMainData && !hasExtraData) {
    return (
        <Paper sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
            <Typography>Нет данных по размещению</Typography>
        </Paper>
    );
  }

  return (
    <Box>
      {hotelItems}
      {(hasExtraData) && (
        <Paper sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
          {ticket.kommentarii_k_predlozheniyu && <Typography mb={1}><strong>Комментарий:</strong> {ticket.kommentarii_k_predlozheniyu}</Typography>}
          {ticket.otmena_bez_shtrafa && <Typography mb={1}><strong>Отмена без штрафа до:</strong> {formatToRussianDate(ticket.otmena_bez_shtrafa)}</Typography>}
          {ticket.otmena_so_shtrafom && <Typography mb={1}><strong>Отмена со штрафом с:</strong> {formatToRussianDate(ticket.otmena_so_shtrafom)}</Typography>}
          {ticket.nevozvratnyi && <Typography mb={1}><strong>Невозвратный с:</strong> {formatToRussianDate(ticket.nevozvratnyi)}</Typography>}
          {files.length > 0 && (
            <FileListBlock
              title="Ваучер"
              files={files}
              originalFiles={originalVoucherFiles}
            />
          )}
        </Paper>
      )}
    </Box>
  );
};

