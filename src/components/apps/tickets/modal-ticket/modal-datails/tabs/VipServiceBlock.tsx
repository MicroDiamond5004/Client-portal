import { Chip, Paper, Typography } from '@mui/material';
import { Box } from '@mui/system';
import React, { Fragment, useEffect, useState } from 'react';
import api from 'src/store/api';
import { FileListBlock } from '../fileList/FileListBlock';
import { useAppSelector } from 'src/store/hooks'; // если используешь Redux
import { formatMoney } from 'src/utils/formatMoney';
import { selectPassports } from 'src/store/selectors/ticketsSelectors';
import formatToRussianDate from 'src/help-functions/format-to-date.ts';

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
    nazvanie_uslugi,
    opisanie_uslugi_vipservis,
    stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis,
    fio_passazhirov_vipservis,
    stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis_2,
    fio_passazhirov_vipservis_2
  } = ticket;

  console.log(fio_passazhirov_vipservis )

  const fioList = (fio_passazhirov_vipservis ?? [])
    .map((id: string) => passports?.[id])
    .filter(Boolean);

  const fioList2 = (fio_passazhirov_vipservis_2 ?? [])
    .map((id: string) => passports?.[id])
    .filter(Boolean);

  const isEmpty =
    !nazvanie_uslugi &&
    !opisanie_uslugi_vipservis &&
    !stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis &&
    fioList.length === 0 &&
    voucherFiles.length === 0;

  if (isEmpty) {
    return (
      <Paper sx={{ p: 3, my: 0, borderRadius: 2, backgroundColor: '#f9f9f9' }}>
        <Typography>Нет данных по VIP-услугам</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: {sx: 0, md: 3}, my: 0, borderRadius: 2, backgroundColor: '#fff' }}>
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
          {ticket?.__updatedAtVip && <Chip
            size="small"
            color="success"
            variant="outlined"
            label={formatToRussianDate(ticket?.__updatedAtVip, 'd MMMM yyyy / HH:mm')}
            sx={{ mt: 0.5, mb: 2 }}
          />}
        </Box>

        <Paper
          sx={{ p: 3, m: 1, borderRadius: 2, backgroundColor: '#fff', border: '1px solid #c5c5c570', boxShadow: '3px 3px 7px 0px #c5c5c5'}}>

          {/* 1 */}
          {nazvanie_uslugi && (
            <Typography mb={2}><strong>Название услуги:</strong> {nazvanie_uslugi}</Typography>
          )}

          {opisanie_uslugi_vipservis && (
            <Typography mb={2}><strong>Описание услуги:</strong> {opisanie_uslugi_vipservis ? opisanie_uslugi_vipservis.split('\n').map((line: string, i: number) => (
                <Fragment key={i}>
                  {line}
                  <br />
                </Fragment>
              ))
              : null}</Typography>
          )}

          {fioList.length > 0 && (
            <Box mb={2}>
              <Typography><strong>ФИО пассажира(ов)(№1):</strong></Typography>
              {fioList.map((fio: string, idx: number) => (
                <Typography key={idx}>{fio}</Typography>
              ))}
            </Box>
          )}

          {stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis && (
            <Typography mb={2}>
              <strong>Стоимость услуги (№ 1):</strong>{' '}
              {formatMoney(stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis)}
            </Typography>
          )}

          {fioList2.length > 0 && (
            <Box mb={2}>
              <Typography><strong>ФИО пассажира(ов)(№2):</strong></Typography>
              {fioList2.map((fio: string, idx: number) => (
                <Typography key={idx}>{fio}</Typography>
              ))}
            </Box>
          )}

          {stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis_2 && (
            <Typography mb={2}>
              <strong>Стоимость услуги (№ 2):</strong>{' '}
              {formatMoney(stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis_2
              )}
            </Typography>
          )}
        </Paper>

        <Box m={1}>
        {voucherFiles.length > 0 && (
          <FileListBlock
            title="Ваучер VIP-услуг"
            files={voucherFiles}
            originalFiles={originalVoucherFiles}
          />
        )}
        </Box>
      </Paper>
    </Box>
  );
};
