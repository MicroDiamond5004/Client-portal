import { Chip, Paper, Typography } from '@mui/material';
import { Box } from '@mui/system';
import React, { Fragment, useEffect, useState } from 'react';
import api from 'src/store/api';
import { FileListBlock } from '../fileList/FileListBlock';
import { formatMoney } from 'src/utils/formatMoney';
import formatToRussianDate from 'src/help-functions/format-to-date.ts';
import DOMPurify from 'dompurify';

type TransferBlockProps = {
  ticket: any;
};

export const TransferBlock: React.FC<TransferBlockProps> = ({ ticket }) => {
  const [filesTransferF, setFilesTransferF] = useState<any[]>([]);
  const [filesAppTransfer, setFilesAppTransfer] = useState<any[]>([]);
  const [filesVoucherTransfer, setFilesVoucherTransfer] = useState<any[]>([]);

  const originalTransferF = ticket.transfer_f ?? [];
  const originalAppTransfer = ticket.prilozhenie_transfer1 ?? [];
  const originalVoucherTransfer = ticket.vaucher_transfer ?? [];

  useEffect(() => {
    const fetchFiles = async (ids: any[], setter: (files: any[]) => void) => {
      if (ids.length > 0) {
        const response = await api.post('/get-files', {
          fileIds: ids,
        });

        if (response.data.success) {
          setter(response.data.files);
        } else {
          console.error('Ошибка при загрузке файлов:', response.data.error);
        }
      }
    };

    fetchFiles(originalTransferF, setFilesTransferF);
    fetchFiles(originalAppTransfer, setFilesAppTransfer);
    fetchFiles(originalVoucherTransfer, setFilesVoucherTransfer);
  }, [originalTransferF, originalAppTransfer, originalVoucherTransfer, ticket]);

  const {
    opisanie_transfera,
    otvet_klientu_po_transferu,
    informaciya_o_passazhire,
    stoimost_dlya_klienta_za_oformlenie_transfera_1,
  } = ticket;

  const isEmpty =
    !opisanie_transfera &&
    !otvet_klientu_po_transferu &&
    !informaciya_o_passazhire &&
    !stoimost_dlya_klienta_za_oformlenie_transfera_1 &&
    filesTransferF.length === 0 &&
    filesAppTransfer.length === 0 &&
    filesVoucherTransfer.length === 0;

  if (isEmpty) {
    return (
      <Paper sx={{ p: 3, my: 0, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
        <Typography>Нет данных по трансферу</Typography>
      </Paper>
    );
  }

  return (
    <Box>
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
          {ticket?.__updatedAtTransfer && <Chip
            size="small"
            color="success"
            variant="outlined"
            label={formatToRussianDate(ticket?.__updatedAtTransfer, 'd MMMM yyyy / HH:mm')}
            sx={{ mt: 0.5, mb: 2 }}
          />}
        </Box>

        {opisanie_transfera && (
          <Typography mb={1}><strong>Описание:</strong> {opisanie_transfera}</Typography>
        )}
        {informaciya_o_passazhire && (
          <Typography mb={1}><strong>Информация о пассажире:</strong> {informaciya_o_passazhire}</Typography>
        )}
        {otvet_klientu_po_transferu && (
          <Typography mb={1}><strong>Информация по трансферу:</strong>{otvet_klientu_po_transferu
            ? otvet_klientu_po_transferu.split('\n').map((line: string, i: number) => (
              <Fragment key={i}>
                {line}
                <br />
              </Fragment>
            ))
            : null}</Typography>
        )}
        {stoimost_dlya_klienta_za_oformlenie_transfera_1 && (
          <Typography mb={1}>
            <strong>Стоимость:</strong>{' '}
            {formatMoney(stoimost_dlya_klienta_za_oformlenie_transfera_1)}
          </Typography>
        )}

        {filesTransferF.length > 0 && (
          <FileListBlock
            title="Файлы трансфера"
            files={filesTransferF}
            originalFiles={originalTransferF}
          />
        )}
        {filesAppTransfer.length > 0 && (
          <FileListBlock
            title="Приложение трансфер"
            files={filesAppTransfer}
            originalFiles={originalAppTransfer}
          />
        )}
        {filesVoucherTransfer.length > 0 && (
          <FileListBlock
            title="Ваучер трансфер"
            files={filesVoucherTransfer}
            originalFiles={originalVoucherTransfer}
          />
        )}
      </Paper>
    </Box>
  );
};
