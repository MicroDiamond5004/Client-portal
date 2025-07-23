import { Paper, Typography } from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';
import api from 'src/store/api';
import { FileListBlock } from '../fileList/FileListBlock';
import { useAppSelector } from 'src/store/hooks'; // если используешь Redux
import { formatMoney } from 'src/utils/formatMoney';
import { selectPassports } from 'src/store/selectors/ticketsSelectors';

type VipServiceBlockProps = {
  ticket: any;
};

export const VipServiceBlock: React.FC<VipServiceBlockProps> = ({ ticket }) => {
  const [voucherFiles, setVoucherFiles] = useState<any[]>([]);

  console.log(voucherFiles);

  const originalVoucherFiles = ticket.vaucher_vipservis ?? [];

  const passports = useAppSelector(selectPassports); // если доступно

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

    fetchFiles(originalVoucherFiles, setVoucherFiles);
  }, [originalVoucherFiles, ticket]);

  const {
    nazvanie_uslugi_vipservis,
    opisanie_uslugi_vipservis,
    stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis,
    fio_passazhirov_vipservis,
  } = ticket;

  const fioList = (fio_passazhirov_vipservis ?? [])
    .map((id: string) => passports?.[id])
    .filter(Boolean);

  const isEmpty =
    !nazvanie_uslugi_vipservis &&
    !opisanie_uslugi_vipservis &&
    !stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis &&
    fioList.length === 0 &&
    voucherFiles.length === 0;

  if (isEmpty) {
    return (
      <Paper sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
        <Typography>Нет данных по VIP-услугам</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
        <Typography variant="h5" mb={2}>VIP-услуги</Typography>

        {nazvanie_uslugi_vipservis && (
          <Typography mb={1}><strong>Название:</strong> {nazvanie_uslugi_vipservis}</Typography>
        )}
        {opisanie_uslugi_vipservis && (
          <Typography mb={1}><strong>Описание:</strong> {opisanie_uslugi_vipservis}</Typography>
        )}
        {stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis && (
          <Typography mb={1}>
            <strong>Стоимость:</strong>{' '}
            {formatMoney(stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis)}
          </Typography>
        )}
        {fioList.length > 0 && (
          <Box mb={2}>
            <Typography><strong>ФИО пассажиров:</strong></Typography>
              {fioList.map((fio: string, idx: number) => (
                <Typography key={idx}>{fio}</Typography>
              ))}
          </Box>
        )}
        {voucherFiles.length > 0 && (
          <FileListBlock
            title="Ваучеры VIP-услуг"
            files={voucherFiles}
            originalFiles={originalVoucherFiles}
          />
        )}
      </Paper>
    </Box>
  );
};
