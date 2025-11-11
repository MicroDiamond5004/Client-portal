// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './ticket.css';

import { format } from 'date-fns';
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Typography,
  TableBody,
  Chip,
  Stack,
  TextField,
  useTheme,
  TableContainer,
  Button,
  Popover,
  Grid, InputAdornment,
  Pagination,
} from '@mui/material';
import { IconList, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { TicketContext } from 'src/context/TicketContext';
import { styled, useMediaQuery } from '@mui/system';
import ModalTicket from './modal-ticket/modal-ticket';
import { useSearchParams } from 'react-router';
import sortAllTickets from './sort-tickets/sort-tickets';
import formatToRussianDate from 'src/help-functions/format-to-date';
import {
  selectLimit,
  selectOrder,
  selectPageNumber,
  selectPassports,
  selectSearchTerm,
  selectTickets,
  selectTicketsFilter, selectTicketStatus,
} from 'src/store/selectors/ticketsSelectors';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';
import api from 'src/store/api';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import 'dayjs/locale/ru';
import { DateRange } from 'react-date-range';
import { ru } from 'date-fns/locale';

import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { isEqual, omitBy, uniqueId } from 'lodash';
import { ELMATicket } from 'src/data/types.ts';
import { updatePageNumber, updateSearchTerms, updateTicketsFilter } from 'src/store/slices/ticketsSlice.ts';
import { store } from 'src/store';
import { BoxProps } from '@mui/material/Box';

dayjs.extend(isBetween);
dayjs.locale('ru');

const customRu = {
  ...ru,
  localize: {
    ...ru.localize,
    day: (n: number) => {
      const shortDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      return shortDays[n];
    },
  },
};

export const AllStatus = {
  NEW: 'Новый заказ',
  PENDING: 'В работе',
  BOOKED: 'Бронь',
  FORMED: 'Оформлено',
  CLOSED: 'Завершено',
}

const pickFields = (obj: Record<string, any>, fields: string[]) =>
  fields.reduce((res, key) => {
    res[key] = obj[key];
    return res;
  }, {} as Record<string, any>);

export const getStatus = (ticket: ELMATicket): string => {
  let status = 'Не определен';
  switch(ticket?.__status?.status) {
    // Новый заказ
    case 1:
      status = AllStatus.NEW;
      break;
    //  В работе
    case 2:
      status = ticket?.tip_zakaz ?  AllStatus.PENDING : AllStatus.NEW;
      break;
    // Ожидание
    case 3:
      status = AllStatus.PENDING;
      break;
    // Создание бронирования
    case 4:
      status = ticket?.otvet_klientu ? AllStatus.BOOKED : AllStatus.PENDING;
      break;
    // Выписка
    case 5:
      status = AllStatus.BOOKED;
      break;
    // Завершено
    case 6:
      status = AllStatus.FORMED;
      break;
    // Снято
    case 7:
      status = AllStatus.CLOSED;
      break;
    default:
      status = status;
  }

  return status;
}

export const getStatus2 = (
  tickets: ELMATicket[],
  ticket: ELMATicket
): string | null => {

  const existingTicket = tickets?.find(
    (el) => el.__id === ticket?.__id || el.nomer_zakaza === ticket?.nomer_zakaza
  );

  const isNew = !existingTicket;

  if (isNew) return AllStatus.NEW;

  const status = getStatus(ticket);
  const existingStatus = getStatus(existingTicket);

  if (existingStatus === AllStatus.NEW && status === AllStatus.PENDING) {
    return AllStatus.PENDING;
  }

  if (status === AllStatus.PENDING) {
    const fieldsToCompare = ['otvet_klientu1'];
    const isEqualStatus = isEqual(
      pickFields(ticket, fieldsToCompare),
      pickFields(existingTicket || {}, fieldsToCompare)
    );
    if (!isEqualStatus) return AllStatus.PENDING;
  }

  if (
    existingStatus === AllStatus.BOOKED &&
    status === AllStatus.FORMED &&
    ticket?.marshrutnaya_kvitanciya
  ) {
    return AllStatus.FORMED;
  }

  if (status === AllStatus.BOOKED && ticket?.otvet_klientu) {
    const fieldsToCompareMain = [
      'fio2', 'dopolnitelnye_fio', 'fio_passazhira_ov_bron_3', 'fio_passazhira_ov_bron_4',
      'fio_passazhira_ov_bron_5', 'fio_passazhira_ov_bron_6',
      'nomer_a_pasporta_ov_dlya_proverki', 'nomer_a_pasporta_ov_dlya_proverki_bron_2',
      'nomer_a_pasporta_ov_dlya_proverki_bron_3', 'nomer_a_pasporta_ov_dlya_proverki_bron_4',
      'nomer_a_pasporta_ov_dlya_proverki_bron_5', 'nomer_a_pasporta_ov_dlya_proverki_bron_6',
      'otvet_klientu', 'otvet_klientu_o_bronirovanii_2', 'otvet_klientu_o_bronirovanii_3',
      'otvet_klientu_o_bronirovanii_4', 'otvet_klientu_o_bronirovanii_5', 'otvet_klientu_o_bronirovanii_6',
      'taim_limit_dlya_klienta', 'taim_limit_dlya_klienta_bron_2', 'taim_limit_dlya_klienta_bron_3',
      'taim_limit_dlya_klienta_bron_4', 'taim_limit_dlya_klienta_bron_5', 'taim_limit_dlya_klienta_bron_6',
      'otvet_klientu3', 'otvet_klientu_pered_oformleniem_bron_2', 'otvet_klientu_pered_oformleniem_3',
      'otvet_klientu_pered_oformleniem_4', 'otvet_klientu_pered_oformleniem_5', 'otvet_klientu_pered_oformleniem_6',
    ];

    const isMainEqual = isEqual(
      pickFields(ticket, fieldsToCompareMain),
      pickFields(existingTicket || {}, fieldsToCompareMain)
    );

    if (!isMainEqual) return AllStatus.BOOKED;

    const routeFields = ['marshrutnaya_kvitanciya'];
    const timeLimitFields = [
      'taim_limit_dlya_klienta', 'taim_limit_dlya_klienta_bron_2', 'taim_limit_dlya_klienta_bron_3',
      'taim_limit_dlya_klienta_bron_4', 'taim_limit_dlya_klienta_bron_5', 'taim_limit_dlya_klienta_bron_6',
    ];

    const routeChanged = !isEqual(
      pickFields(ticket, routeFields),
      pickFields(existingTicket || {}, routeFields)
    );

    const timeChanged = !isEqual(
      pickFields(ticket, timeLimitFields),
      pickFields(existingTicket || {}, timeLimitFields)
    );

    if (routeChanged || timeChanged) return AllStatus.BOOKED;
  }

  return null;
};

type TicketListingProps = {
  changeView: (isList: boolean) => void,
  // updateSearchParametrs: (tickets: ELMATicket[], currentTicket: ELMATicket | undefined, isShowModal: boolean) => void,
}

const TicketListing = (props: TicketListingProps) => {
  const [isShowModal, setIsShowModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [isDateManuallySelected, setIsDateManuallySelected] = useState(false);

  const {changeView} = props;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const newDate = new Date();

  const [selectionRange, setSelectionRange] = useState({
    startDate: newDate,
    endDate: newDate,
    key: 'selection',
  });

  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);

  // const currentPage = useAppSelector(selectPageNumber);
  // const limit = useAppSelector(selectLimit);

  // const { tickets, searchTickets, ticketSearch, filter, setFilter }: any =
  //   useContext(TicketContext);

  const tickets = useAppSelector(selectTickets) ?? [];

  const fullOrder = useAppSelector(selectOrder);

  const ticketSearch = useAppSelector(selectSearchTerm) ?? '';
  const filter = useAppSelector(selectTicketsFilter) ?? '';

  const status = useAppSelector(selectTicketStatus) ?? null;

  const dispatch = useAppDispatch();

  const setFilter = (value: string) => dispatch(updateTicketsFilter(value));
  const searchTickets = (value: string) => dispatch(updateSearchTerms(value));

  // const setCurrentPage = (value: number) => dispatch(updatePageNumber(value));

  const [currentTicket, setCurrentTicket] = useState<ELMATicket>();

  const passports = useAppSelector(selectPassports) ?? {};

  // const [filterType, setFilterType] = useState<'my' | 'all'>('my');

  // const [ordersRange, setOrdersRange] = useState([1, limit]);

  // const ordersCount: number = fullOrder?.result?.total ?? 0;
  // const numberOfPages = Math.round(ordersCount / limit); 

  const getVisibleTickets = (tickets: ELMATicket[], filter: string, ticketSearch: string) => {
    switch (filter) {
      case 'total_tickets':
        return tickets.filter((ticket: any) => {
          if (ticket?.__deletedAt) return false;

          const search = ticketSearch.toLowerCase().replace(/\s+/g, '');

          const matchesSearch =
            (ticket?.__name?.toLowerCase().includes(search)) ||

            (ticket?.fio2?.some((fio: string) => {
              const fioValue = passports?.[fio]?.[0];
              return fioValue?.toLowerCase()?.includes(search);
            })) ||

            [
              ticket?.otvet_klientu,
              ticket?.otvet_klientu1,
              ticket?.otvet_klientu3,
              ticket?.zapros,

              ticket?.otvet_klientu,
              ticket?.otvet_klientu_o_bronirovanii_2,
              ticket?.otvet_klientu_o_bronirovanii_4,
              ticket?.otvet_klientu_o_bronirovanii_5,
              ticket?.otvet_klientu_o_bronirovanii_6,

              // добавленные новые
              ticket?.otvet_klientu3, // уже был, но в объекте 1: тоже указан
              ticket?.otvet_klientu_pered_oformleniem_bron_2,
              ticket?.otvet_klientu_pered_oformleniem_bron_3,
              ticket?.otvet_klientu_pered_oformleniem_bron_4,
              ticket?.otvet_klientu_pered_oformleniem_bron_5,
              ticket?.otvet_klientu_pered_oformleniem_bron_6,
            ]
              .filter((text) => {
                return text?.trim();
              }) // ✅ убираем пустые и пробельные строки
              .some((text) =>
                {
                  
                  // if (text.toLowerCase().replace(/\s+/g, '').includes(search)) {
                  //   console.log(true);
                  // }
                  return text.toLowerCase().replace(/\s+/g, '').includes(search)
                }
              );

          const ticketDates = [
            ticket?.__createdAt,
            // ticket?.__updatedAt,
            // ticket?.taim_limit_dlya_klienta,
            // ticket?.data_vyleta,
            // ticket?.data_ofrmleniya,
            // ticket?.data_vyezda1,
            // ticket?.data_vyezda2,
            // ticket?.data_vyezda3,
            // ticket?.data_zaezda1,
            // ticket?.data_zaezda2,
            // ticket?.data_zaezda3,
          ].map((el: any) => dayjs(el));

          // console.log(ticketDates.some((el) => el && el.isSame(startDate, 'day')), ticketDates.find((el) => el && el.isBetween(startDate, endDate, 'day', '[]')));

          const matchesDate =
            (!startDate && !endDate) ||
            (startDate && !endDate && ticketDates.some((el) => el.isValid() && el.isSame(startDate, 'day'))) ||
            (startDate && endDate && ticketDates.some((el) => el.isValid() && el.isBetween(startDate, endDate, 'day', '[]')));

          return matchesSearch && matchesDate;
        });



      case AllStatus.NEW:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.NEW
        );

      case AllStatus.PENDING:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.PENDING
        );

      case AllStatus.BOOKED:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.BOOKED
        );

      case AllStatus.FORMED:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.FORMED
        );

      case AllStatus.CLOSED:
        return tickets.filter(
          (c) =>
            !c.__deletedAt && getStatus(c) === AllStatus.CLOSED
        );

      // case 'Closed':
      //   return tickets.filter(
      //     (c) =>
      //       !c.deleted &&
      //       c.Status === 'Closed' &&
      //       c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
      //   );

      // case 'Open':
      //   return tickets.filter(
      //     (c) =>
      //       !c.deleted &&
      //       c.Status === 'Open' &&
      //       c.ticketTitle.toLocaleLowerCase().includes(ticketSearch),
      //   );

      default:
        throw new Error(`Unknown filter: ${filter}`);
    }
  };

  const [visibleTickets, setVisibleTickets] = useState<any[]>(getVisibleTickets(
    tickets as any[],
    filter,
    ticketSearch.toLowerCase()
  ));

  useEffect(() => {
    setVisibleTickets(getVisibleTickets(tickets as any[], filter, ticketSearch.toLowerCase()));
  }, [tickets, ticketSearch, endDate, filter])

  console.log('Merged tickets length', visibleTickets.length);

  const isMultiplyUsers = true;


  // const handlePagination = (event: React.ChangeEvent<unknown>, page: number) => {
  //   setCurrentPage(page);
  //   setOrdersRange([(page - 1) * 20 + 1, page === numberOfPages ? ordersCount : page * 20]);
  //   dispatch(fetchUserOrders())
  // }

  interface BoxStyledProps extends BoxProps {
    disabled?: boolean;
  }

  const BoxStyled = styled(Box)<BoxStyledProps>(({ disabled }) => ({
    transition: '0.1s ease-in',
    cursor: disabled ? 'default' : 'pointer',
    color: 'inherit',
    backgroundColor: disabled ? '#c5c5c5' : '#26428B',
    pointerEvents: disabled ? 'none' : 'auto',
    '&:hover': {
      transform: disabled ? 'none' : 'scale(1.03)',
      backgroundColor: disabled ? '#c5c5c5' : '#1245d6',
    },
  }));


  const updateSearchParametrs = (
    tickets: ELMATicket[],
    currentTicket: ELMATicket | undefined,
    isShowModal: boolean = false,
    startDate?: dayjs.Dayjs | null,
    endDate?: dayjs.Dayjs | null
  ) => {
    const params: Record<string, string> = {};

    if (isShowModal && currentTicket?.nomer_zakaza) {
      params.item = currentTicket.nomer_zakaza;
    }

    if (startDate) {
      params.startDate = startDate.format('YYYY-MM-DD');
    }
    if (endDate) {
      params.endDate = endDate.format('YYYY-MM-DD');
    }

    setSearchParams(params);
  };


  useEffect(() => {
   if (startDate && (startDate !== endDate)) {
      setSelectionRange({
        startDate: startDate ? startDate.toDate() : new Date(),
        endDate: endDate ? endDate.toDate() : new Date(),
        key: 'selection',
      });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');

    if (urlStartDate) {
      const parsed = dayjs(urlStartDate);
      if (parsed.isValid()) setStartDate(parsed);
    }
    if (urlEndDate) {
      const parsed = dayjs(urlEndDate);
      if (parsed.isValid()) setEndDate(parsed);
    }
  }, []);


  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (ranges: any) => {
    setSelectionRange(ranges.selection);
  };

  const formatted = useMemo(() => {
    if (!startDate || !endDate) return '';

    const format = 'D MMMM YYYY';
    const formattedStart = startDate.format(format);
    const formattedEnd = endDate.format(format);

    return formattedStart === formattedEnd
      ? formattedStart
      : `${formattedStart} – ${formattedEnd}`;
  }, [startDate, endDate]);

  // при нажатии кнопки "Применить"
  const applyDates = () => {
    setStartDate(dayjs(selectionRange.startDate));
    setEndDate(dayjs(selectionRange.endDate));
    setIsDateManuallySelected(true);
    handleClose(); // закрыть popover
    dispatch(updateTicketsFilter('total_tickets'));
  };


  const resetDates = () => {
    setSelectionRange({startDate: new Date(), endDate: new Date(), key: 'selection'})
    setStartDate(null);
    setEndDate(null);
    setIsDateManuallySelected(false);
    handleClose();
  };


  useEffect(() => {
    if (
      ticketSearch.trim() !== '' &&
      (filter !== 'total_tickets' || !isDateManuallySelected)
    ) {
      setFilter('total_tickets');
    }
  }, [ticketSearch, isDateManuallySelected]);


  useEffect(() => {
    if (searchParams.get('item') && (currentTicket?.nomer_zakaza !== searchParams.get('item'))) {
      if (searchParams.get('item')) {
        const ticket = tickets.find((ticket: any) => ticket?.nomer_zakaza === searchParams.get('item'));
        if (ticket) {
          if (searchParams.get('type')) {
            setSearchParams({item: searchParams.get('item') || ''})
          }
          setCurrentTicket(ticket as any);
          setIsShowModal(true);
          const updateChange = async () => {
            await api.post('/updateChange', {
            type: 'order',
            id: ticket?.__id,
            })
            dispatch(fetchUserOrders());
          }

          updateChange();
        } else if (tickets.length > 0) {
          setSearchParams({});
        }
      }
    } else if (status !== 'loading' && searchParams.get('add') && searchParams.get('add') === 'new' && !isShowModal) {
      // // // console.log(tickets, tickets[0]);
      const allSortedTickets = sortAllTickets(tickets)?.filter((ticket) => ticket?.nomer_zakaza);
      // // console.log('test', tickets[0], Number(allSortedTickets[0]?.nomer_zakaza) + 1);
      // // // console.log(allSortedTickets);
      if (allSortedTickets) {
        // // console.log(allSortedTickets[0]);
        const mockTicket: any = {
          nomer_zakaza: "696",
          zapros: "test",
          ssylka_na_kartochku: "https://clck.ru/3LvkR2",

          // Статус
          __status: {
            order: 0,
            status: 1, // возможно, это enum — например, "Новый"
          },

          // Метаданные
          __id: "0196ae4c-dd88-754a-9818-137b420bc569",
          __name: "#696 - ИП КОНСТАНТИН",
          __register_name: "696",
          __createdAt: "2025-05-08T05:09:55Z",
          __createdBy: "3ca1ff35-b244-4180-ac56-382b25f65e80",
          __updatedAt: "2025-05-08T05:09:57Z",
          __updatedBy: "543e820c-e836-45f0-b177-057a584463b7",
          __index: 683,
          __version: 1746680997,
          __debug: false,
          __deletedAt: null,
          __subscribers: [
            "3ca1ff35-b244-4180-ac56-382b25f65e80"
          ],

          // Контакт и вложения
          kontakt: [
            "0194fa07-f526-7c98-873d-5f0d7547168a"
          ],
          prilozhenie_k_zaprosu: [
            "0196ae4c-dd9c-7283-9377-5386faca631c"
          ],

          // Прочее (пока не заполнено)
          adjustment: null,
          aviabilety: [],
          bd_zakaza_1: [],
          deistvie_menedzhera: [],
          dopolnitelnye_fio: [],
          fio: [],
          fio2: [],
          fio_passazhira_ov_so_skidkoi: [],
          fio_passazhirov_vipservis: [],
          fond: null,
          forma_oplaty: null,
          kod_uslugi: null,
          kod_uslugi1: null,
          kto_rekomedoval: [],
          nachisleniya_skidka_bonus: [],
          nalog_6_ot_summy_bonusov: null,
          nalog_6_ot_summy_menedzhera: null,
          otel1: [],
          otel2: [],
          otel3: [],
          pasport: [],
          platalshik: [],
          postavshik: [],
          postavshik2: [],
          postavshik3: [],
          postavshik_transfer: [],
          postavshik_vipservis: [],
          procent_menedzhera: null,
          sistema_bronirovaniya: null,
          spravochnik: [],
          stoimost: null,
          stoimost2: null,
          stoimost3: null,
          summa_bonusa: null,
          tarif1: null,
          tarif2: null,
          tarif3: null,
          tip_nomera1: [],
          tip_nomera2: [],
          tip_nomera3: [],
          tip_pitaniya1: [],
          tip_pitani2: [],
          tip_pitaniya3: [],
          tip_zakaz: null
        }

        setCurrentTicket({
          ...mockTicket,
          '__id': null,
          'nomer_zakaza': String(Number(allSortedTickets[0]?.nomer_zakaza) + 1),
          'zapros': null,
        });
          setIsShowModal(true);
          // // // console.log('fff');
      }
    }
  }, [searchParams, status])

  const handlerCloseModal = (isOpen: boolean) => {
    setCurrentTicket(undefined);
    setIsShowModal(false);

    // Получаем текущие параметры из URL
    const params = Object.fromEntries(searchParams.entries());

    // Удаляем только параметр item
    delete params.item;
    delete params.add;

    // Обновляем URL, оставляя фильтры (даты) нетронутыми
    setSearchParams(params);
  };


  // Внутри компонента
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const boxRef = useRef<HTMLDivElement>(null);
  const [padding, setPadding] = useState(0);
  const [prevWidth, setPrevWidth] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useLayoutEffect(() => {
    const scrollDiv = document.createElement("div");
    scrollDiv.style.width = "100px";
    scrollDiv.style.height = "100px";
    scrollDiv.style.overflow = "scroll";
    scrollDiv.style.position = "absolute";
    scrollDiv.style.top = "-9999px";
    document.body.appendChild(scrollDiv);

    const innerDiv = document.createElement("div");
    innerDiv.style.width = "100%";
    scrollDiv.appendChild(innerDiv);

    setScrollbarWidth(scrollDiv.offsetWidth - innerDiv.offsetWidth);

    document.body.removeChild(scrollDiv);
  }, []);

  useLayoutEffect(() => {
    const element = boxRef.current;
    if (!element) return;

    const currentWidth = element.scrollWidth;
    if (prevWidth && currentWidth !== prevWidth) {
      setPadding(currentWidth > prevWidth ? scrollbarWidth : 0);
    }
    setPrevWidth(currentWidth);
  }, [filter, scrollbarWidth]); // prevWidth не добавляем, чтобы не зациклить


  return (
    <>
    <Grid container mt={5}>
  {/* Левая часть: Поиск и кнопка */}
  <Grid lg={5} sm={5} xs={12}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems="flex-start"
    >
      <Box sx={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 3 }}>
        <Box sx={{ minWidth: { xs: '100%', sm: '50%' }, flexGrow: 1 }}>
          <TextField
            size="small"
            label="Поиск"
            type="text"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {ticketSearch ? (
                    <IconX
                      size={16}
                      style={{ cursor: 'pointer' }}
                      onClick={() => searchTickets('')}
                    />
                  ) : (
                    <IconSearch size={16} />
                  )}
                </InputAdornment>
              ),
              sx: {
                height: 40,
                '& input': {
                  height: '40px',
                  boxSizing: 'border-box',
                  padding: '0 14px',
                },
              },
            }}
            fullWidth
            onChange={(e) => searchTickets(e.target.value)}
            value={ticketSearch}
          />
        </Box>

        <Box sx={{ minWidth: { xs: '100%', sm: '50%' }, flexGrow: 1 }}>
          <TextField
            label="Выберите дату(ы)"
            value={formatted}
            size="small"
            onClick={handleClick}
            fullWidth
            type="text"
            inputProps={{ readOnly: true }}
            InputProps={{
              sx: {
                height: 40,
                '& input': {
                  height: '40px',
                  boxSizing: 'border-box',
                  padding: '0 14px',
                },
              },
            }}
          />
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 2 }}>
              <DateRange
                ranges={[selectionRange]}
                onChange={handleSelect}
                moveRangeOnFirstSelection={false}
                locale={customRu as any}
                showDateDisplay={false}
                showPreview={false}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button sx={{ mr: 2 }} color="warning" onClick={resetDates}>
                  Сбросить
                </Button>
                <Button variant="contained" onClick={applyDates}>
                  Применить
                </Button>
              </Box>
            </Box>
          </Popover>
        </Box>
      </Box>

    </Stack>
  </Grid>

  {/* Правая часть: Вид */}
  <Grid lg={7} sm={7} xs={12}>
    <Box bgcolor="white" p={0}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="flex-end"
        sx={{ mt: { xs: 3.5, sm: 0 }, mb: { xs: 2, sm: 0 } }}
      >
        {!isMobile && <BoxStyled
          disabled={status === 'loading'}
          onClick={() => status !== 'loading' && setSearchParams({ ...searchParams, add: 'new' })}
          sx={{
            width: { xs: '100%', sm: '35%' },
            px: 2,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '9999999999999',

            // marginLeft: '3rem !important',

          }}
        >
          <Typography
            color="primary.contrastText"
            display="flex"
            alignItems="center"
            justifyContent="center"
            width={'115px'}
          >
            СОЗДАТЬ ЗАКАЗ
          </Typography>
          <Typography
            ml={1}
            color="primary.contrastText"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <IconPlus size={22} />
          </Typography>
        </BoxStyled>}
        {isMobile && (
          <BoxStyled
            disabled={status === 'loading'}
            onClick={() => status !== 'loading' && setSearchParams({ ...searchParams, add: 'new' })}
            sx={{
              width: { xs: '70%', sm: '35%' },
              px: 1,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: '9999999999999',
              flexDirection: 'row', // важно!
              whiteSpace: 'nowrap', // чтобы не переносилось
            }}
          >
            <Typography
              color="primary.contrastText"
              sx={{
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              СОЗДАТЬ ЗАКАЗ
            </Typography>
            <Typography
              ml={1}
              color="primary.contrastText"
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <IconPlus size={22} />
            </Typography>
          </BoxStyled>
        )}
        <Typography variant="h4">Вид:</Typography>
        <BoxStyled
          onClick={() => changeView(false)}
          width={38}
          height={38}
          bgcolor="primary.main"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography
            color="primary.contrastText"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <IconList width={22} />
          </Typography>
        </BoxStyled>
      </Stack>
    </Box>
  </Grid>


  <Grid item xs={12} mt={2}>
        <TableContainer ref={boxRef} sx={{
          maxHeight: '60vh', // или любая нужная тебе высота
          paddingRight: `${padding}px`
        }}>
          <Table>
            {visibleTickets.length > 0 && (
              <TableHead
              sx={{
                position: 'sticky',
                top: 0,
                backgroundColor: 'primary.main',
                zIndex: 1,
              }}
            >
              <TableRow>
                <TableCell width="5%" sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      width: !isMobile ? '55px' : '50px',
                      textAlign: 'center',
                      margin: '0 auto',
                      color: isMultiplyUsers ? '#fff' : 'inherit',
                    }}
                  >
                    {isMobile ? 'Заказ' : 'Номер заказа'}
                  </Typography>
                </TableCell>

                {!isMobile && (
                  <TableCell width="15%">
                    <Typography
                      variant="h6"
                      sx={{
                        width: '60px',
                        color: isMultiplyUsers ? '#fff' : 'inherit',
                      }}
                    >
                      Дата создания
                    </Typography>
                  </TableCell>
                )}

                <TableCell width="68%" sx={{ pl: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: isMultiplyUsers ? '#fff' : 'inherit',
                    }}
                  >
                    Информация
                  </Typography>
                </TableCell>

                {!isMobile && (
                  <TableCell width="12%">
                    <Typography
                      variant="h6"
                      sx={{
                        position: 'relative',
                        right: 0,
                        textAlign: 'center',
                        color: isMultiplyUsers ? '#fff' : 'inherit',
                      }}
                    >
                      Статус
                    </Typography>
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

            )}

            <TableBody>
              {visibleTickets.length > 0 ? (
                sortAllTickets(visibleTickets).map((ticket: any) => {
                  const status = getStatus(ticket);

                  let colorStatus = 'black';
                  let backgroundStatus = 'grey';

                  switch (status) {
                    case AllStatus.NEW:
                      backgroundStatus = '#A7B4E2';
                      colorStatus = '#fff';
                      break;
                    case AllStatus.PENDING:
                      backgroundStatus = '#8596D6';
                      colorStatus = '#fff';
                      break;
                    case AllStatus.BOOKED:
                      backgroundStatus = '#6279CB';
                      colorStatus = '#fff';
                      break;
                    case AllStatus.FORMED:
                      backgroundStatus = '#405BBF';
                      colorStatus = '#fff';
                      break;
                    default:
                      backgroundStatus = '#344B9D';
                      colorStatus = '#fff';
                      break;
                  }

                  const clickTicketHandler = () => {
                    updateSearchParametrs(tickets as any[], ticket, true, startDate, endDate)
                    if (ticket?.isChanged) {
                      const updateChange = async () => {
                        await api.post('/updateChange', {
                          type: 'order',
                          id: ticket?.__id,
                        });
                        dispatch(fetchUserOrders());
                      };
                      updateChange();
                    }
                  };


                  const info = ticket?.otvet_klientu1
                    ? `${ticket?.otvet_klientu1}`
                    : ticket?.zapros;

                  if (!ticket?.nomer_zakaza) {
                    return <></>;
                  }

                  return (
                    <TableRow
                      className={ticket?.isChanged ? 'gradient-background' : ''}
                      key={ticket?.__id ?? uniqueId()}
                      hover
                      onClick={clickTicketHandler}
                    >
                      <TableCell
                        sx={{
                          // На xs экранах фиксированная ширина, на sm+ — auto
                          width: { xs: 110 },
                          minWidth: { xs: 110, sm: '55px' },

                          padding: { xs: '1.5rem 0px'},

                          // На мобилке разрешаем перенос текста, на десктопе — нет
                          whiteSpace: { xs: 'normal', sm: 'nowrap' },

                          // Автоматический разрыв длинных слов/строк
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          textAlign: 'center',
                          py: 1,
                        }}>{ticket?.nomer_zakaza}{isMobile && <><br/>
                        {formatToRussianDate(ticket?.__createdAt, 'dd MMMM')}<br/><Box p={1}><Chip
                          sx={{
                            backgroundColor: ticket?.isChanged ? '#FFF' : backgroundStatus,
                            color: '#fff'
                          }}
                          size="small"
                          label={status}
                        /></Box></>}</TableCell>
                      {!isMobile && <TableCell>
                        <Typography variant="subtitle1" sx={{width: '70px', textAlign: 'center'}}>
                          {formatToRussianDate(ticket?.__createdAt, 'dd MMMM')}
                        </Typography>
                      </TableCell>}
                      <TableCell>
                        <Box>
                          {(ticket?.__status?.status || 0) > 3 && ticket?.otvet_klientu && (
                            <>
                              {ticket?.fio2?.map((currentId: string) => (
                                <Typography
                                  key={uniqueId()}
                                  variant="h6"
                                  fontWeight={600}
                                  sx={{
                                    width: isMobile ? '100%' : '50%',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    overflowWrap: 'break-word',
                                  }}
                                >
                                  {passports[currentId]?.[0]} - {passports[currentId]?.[1]}
                                </Typography>
                              ))}
                            </>
                          )}
                          <Typography
                            color="textSecondary"
                            sx={{
                              maxWidth: '400px',
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                            }}
                            variant="subtitle2"
                            fontWeight={400}
                          >
                            {(info?.length ?? 0) > 53 ? `${info?.slice(0, 53)}...` : info}
                          </Typography>
                        </Box>
                      </TableCell>
                      {!isMobile &&
                        <TableCell>
                          <Box sx={{position: 'relative', right: '0px', maxWidth: '100px'}} textAlign={'center'}>
                            <Chip
                              sx={{
                                backgroundColor: ticket?.isChanged ? '#FFF' : backgroundStatus,
                                color: ticket?.isChanged ? 'inherit' : '#FFF',
                              }}
                              size="small"
                              label={status}
                            />
                          </Box>
                      </TableCell>}
                      {/* <TableCell align="right">
                  <Tooltip title="Открыть">
                    <IconButton
                      sx={{ color: ticket?.isChanged ? '#FFF' : 'inherit' }}
                      onClick={() => {}}
                    >
                      <IconArrowsDiagonal size="22" />
                      <Typography variant="button" marginLeft="10px">
                        Показать
                      </Typography>
                    </IconButton>
                  </Tooltip>
                </TableCell> */}
                    </TableRow>
                  );
                })
              ) : status === 'loading' ?  (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box py={5}>
                      <Typography variant="h6" gutterBottom color="textSecondary">
                        Загрузка...
                      </Typography>
                      <Typography variant="body1" color="textSecondary">
                        Подождите пожалуйста, ваши заказы загружаются!
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filter !== 'total_tickets' ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box py={5}>
                      <Typography variant="h6" gutterBottom color="textSecondary">
                        По фильтру "{filter}" не найдено заказов
                      </Typography>
                      <Typography variant="body1" color="textSecondary">
                        Пожалуйста, смените фильтр!
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box py={5}>
                      <Typography variant="h6" gutterBottom color="textSecondary">
                        Заказов пока нет!
                      </Typography>
                      <Typography variant="body1" color="textSecondary">
                        Вы можете создать новый заказ, используя кнопку в правом верхнем углу.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
  </Grid>

    <ModalTicket show={isShowModal} ticket={isShowModal ? currentTicket as any ?? tickets?.[0] ?? null : null} close={handlerCloseModal}/>
    </>);
};

export default TicketListing;
