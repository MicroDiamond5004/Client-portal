import { Paper, Typography } from '@mui/material';
import React, { Fragment } from 'react';
import formatToRussianDate from 'src/help-functions/format-to-date';
import { useMediaQuery, useTheme } from '@mui/system';
import { AllStatus, getStatus } from 'src/components/apps/tickets/TicketListing.tsx';

type BookingInfoBlockProps = {
  bookingNumber: number;
  ticket: any;
  passports?: Record<string, [string | undefined, string | undefined]>;
};

const fieldMap: Record<
  number,
  {
    fio: string;
    passport: string;
    answer: string;
    timeLimit: string;
  }
> = {
  1: {
    fio: 'fio2',
    passport: 'nomer_a_pasporta_ov_dlya_proverki',
    answer: 'otvet_klientu',
    timeLimit: 'taim_limit_dlya_klienta',
  },
  2: {
    fio: 'dopolnitelnye_fio',
    passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_2',
    answer: 'otvet_klientu_o_bronirovanii_2',
    timeLimit: 'taim_limit_dlya_klienta_bron_2',
  },
  3: {
    fio: 'fio_passazhira_ov_bron_3',
    passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_3',
    answer: 'otvet_klientu_o_bronirovanii_3',
    timeLimit: 'taim_limit_dlya_klienta_bron_3',
  },
  4: {
    fio: 'fio_passazhira_ov_bron_4',
    passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_4',
    answer: 'otvet_klientu_o_bronirovanii_4',
    timeLimit: 'taim_limit_dlya_klienta_bron_4',
  },
  5: {
    fio: 'fio_passazhira_ov_bron_5',
    passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_5',
    answer: 'otvet_klientu_o_bronirovanii_5',
    timeLimit: 'taim_limit_dlya_klienta_bron_5',
  },
  6: {
    fio: 'fio_passazhira_ov_bron_6',
    passport: 'nomer_a_pasporta_ov_dlya_proverki_bron_6',
    answer: 'otvet_klientu_o_bronirovanii_6',
    timeLimit: 'taim_limit_dlya_klienta_bron_6',
  },
};

// Приоритетные поля для ответа до оформления
const preAnswerMap: Record<number, string> = {
  1: 'otvet_klientu3',
  2: 'otvet_klientu_pered_oformleniem_bron_2',
  3: 'otvet_klientu_pered_oformleniem_bron_3',
  4: 'otvet_klientu_pered_oformleniem_bron_4',
  5: 'otvet_klientu_pered_oformleniem_bron_5',
  6: 'otvet_klientu_pered_oformleniem_bron_6',
};

export const BookingInfoBlock: React.FC<BookingInfoBlockProps> = ({
                                                                    bookingNumber,
                                                                    ticket,
                                                                    passports,
                                                                  }) => {

  const fields = fieldMap[bookingNumber];
  if (!fields) return null;

  const fioList = ticket[fields.fio];
  const passportData = ticket[fields.passport];
  const timeLimit = ticket[fields.timeLimit];

  // Выбор routeInfo с приоритетом "ответ перед оформлением"
  const preAnswerField = preAnswerMap[bookingNumber];
  const routeInfo =
    ticket?.[preAnswerField]?.trim?.().length > 0
      ? ticket[preAnswerField]
      : ticket[fields.answer];

  const fullNames =
    Array.isArray(fioList) && passports
      ? fioList
        .map((id: string) => passports?.[id]?.[0])
        .filter(Boolean)
        .join(', ')
      : '';

  const isValid =
    routeInfo &&
    ((fioList?.length ?? 0) > 0 ||
      (passportData?.length ?? 0) > 0 ||
      timeLimit);

  if (!isValid) return null;

  return (
    <Paper
      elevation={3}
      sx={{ p: 3, my: 2, borderRadius: 2, backgroundColor: '#f9f9f9' }}
    >

      {fullNames && (
        <Typography mb={1}>
          <strong>Пассажир(ы):</strong> {fullNames}
        </Typography>
      )}

      {passportData && (
        <>
          <Typography fontWeight={600}>Номер паспорта для проверки:</Typography>
          {Array.isArray(passportData) ? (
            passportData.map((id: any) => (
              <Typography
                key={id}
                mb={1}
                mt={1}
                sx={{
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                }}
              >
                {passports?.[id]?.[0]} - {passports?.[id]?.[1]}
              </Typography>
            ))
          ) : (
            <Typography
              sx={{
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
              }}
            >
              {passportData
                // Разделяем по завершению блока данных (после номера) и добавляем \n
                .replace(/(Тип: Внутренний\s*-\s*\d+)/g, '$1')
                .trim()}
            </Typography>
          )}
        </>
      )}

      {routeInfo && (
        <Typography mb={1}>
          <strong>Маршрут и стоимость:</strong>
          {routeInfo
            ? <> <br />{routeInfo.split('\n').map((line: string, i: number) => (
              <Fragment key={i}>
                {line}
                <br />
              </Fragment>
            ))}</>
            : null}
        </Typography>
      )}

      {[AllStatus.NEW, AllStatus.PENDING].includes(getStatus(ticket)) && (
        <Typography mb={1}>
          <strong>Тайм-лимит:</strong> До {formatToRussianDate(timeLimit)}
        </Typography>
      )}
    </Paper>
  );
};
