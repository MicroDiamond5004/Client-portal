import axios from "axios";
import pLimit from "p-limit";
import {
  addCommentToMessage,
  createMessage,
  createOrder,
  findAuthFileByUserId,
  getAllUsersData,
  getMessagesByUserId,
  getOrderById,
  getOrdersByUserId,
  getUserSubscriptions,
  loadUserData,
  saveUserData,
  updateOrder,
} from "../data/mongodbStorage";
import { get, isEqual, uniqueId } from "lodash";
import { ELMATicket } from "../data/types";
import {
  createChatFromMessages,
  getSergeiToken,
  getStatus,
  mergeIsChanged,
  mergeMessagesWithIsChanged,
  readAuth,
  sortAllTickets,
  stripHtml,
} from "../utils";
import { sendToUser } from "../websocket";
import { AllStatus, TOKEN } from "../const";
import { sendPushNotifications } from "../push";
import { getAnotherUsers, getContact, getMessages, getOrders, getPassports } from "./pollingFunctions";
import { da } from "date-fns/locale";
import { updateMessageToUser, updateOrderToUser } from "./observer/observer";

function pickFields(obj: any, fields: string[]) {
  return fields.reduce(
    (acc, field) => {
      acc[field] = get(obj, field); // безопасно достаёт вложенные поля
      return acc;
    },
    {} as Record<string, any>,
  );
}

// ---------- Конфигурация параллельности (подстрой под хост/ELMA) ----------
const USER_CONCURRENCY = 100;      // сколько пользователей обрабатывать параллельно
const ORDER_CONCURRENCY = 500;     // сколько заказов одного пользователя одновременно обрабатывать
const MESSAGE_CONCURRENCY = 500;  // сколько сообщений одновременно обрабатывать внутри одного заказа

const userLimit = pLimit(USER_CONCURRENCY);
const orderLimit = pLimit(ORDER_CONCURRENCY);
const messageLimit = pLimit(MESSAGE_CONCURRENCY);

// ---------- Основная функция ----------
export default async function pollNewMessages() {
  console.log('polling запущен');

  // Получаем все пользователи
  const users = await getAllUsersData();

  await getSergeiToken();

  const auth = await readAuth();
  const token = auth?.token ?? '';
  const cookie = auth?.cookie ?? '';

  const pollId = uniqueId();

  try {
    console.time(`TOTAL_POLL-${pollId}`);

    // Обработка пользователей с лимитом параллельности
    await Promise.allSettled(
      users.map(async ({ userId, data }) => {
        // Каждый пользователь обрабатывается независимо
        try {
          // Параллельно получаем базовые данные для пользователя
          const [
            subscriptions,
            previousMessages,
            previousOrdersData,
            kontakt, // getContact может требовать clientId, в твоём коде передавался clientId = userId
          ] = await Promise.all([
            getUserSubscriptions(userId),
            getMessagesByUserId(userId),
            getOrdersByUserId(userId),
            getContact(userId),
          ]);

          if (!kontakt) return;

          const webSubscriptions = subscriptions?.map((el) => ({
            endpoint: el.endpoint,
            expirationTime: el.expirationTime || null,
            keys: {
              p256dh: el.keys?.p256dh,
              auth: el.keys?.auth,
            },
          }));

          const email =
            subscriptions?.[0]?.email ??
            (await findAuthFileByUserId(userId))?.email;

          const clientId = userId;

          const previousOrders = previousOrdersData.map((el) => el.orderData);

          // ----- Заказы с ЕЛМЫ -----
          // Получаем mergedOrders (sync)
          const mergedOrders = await getOrders(kontakt);

          let ordersFlag = false,
            messagesFlag = false;

          // Получаем паспорта
          const passports = await getPassports(userId, mergedOrders);

          // Кеш предыдущих заказов по __id для быстрых lookup'ов
          const prevOrdersById = new Map<string, any>();
          for (const po of previousOrdersData) {
            if (po?.orderData?.__id) {
              prevOrdersById.set(po.orderData.__id, po.orderData);
            }
          }

          // Подготовим предыдущие сообщения сгруппированные по targetId
          const prevMessagesByTarget = new Map<string, any[]>();
          previousMessages.forEach((m: any) => {
            const arr = prevMessagesByTarget.get(m.targetId) || [];
            arr.push(m);
            prevMessagesByTarget.set(m.targetId, arr);
          });

          // Обработка каждого заказа с лимитом ORDER_CONCURRENCY
          const orderPromises = (mergedOrders || []).map(async (order: ELMATicket) => {
            // Внутри каждого заказа — локальный try/catch чтобы не ломать общий цикл
            try {
              // Подсчёт предыдущих сообщений (со счётом комментариев)
              const prevMsgs = prevMessagesByTarget.get(order.__id ?? '') || [];
              let prevMessagesCount = 0;
              prevMsgs.forEach((message: any) => {
                prevMessagesCount += 1;
                if (message.comments) {
                  prevMessagesCount += message.comments.length;
                }
              });

              // ---------- Message checking ----------
              const messagePromise = (async () => {
                // Получаем сообщения для этого заказа (getMessages делает сетевые запросы)
              const messageData = await getMessages(userId, order, token, cookie, prevMessagesCount);

              let messagesFromOrder: any[] = [];
              let authors: Record<string, string> = {};
              let isNewMessage: boolean = false;

              if (messageData) {
                isNewMessage = messageData.isNewMessage;
                messagesFromOrder = messageData.messages ?? [];
                authors = messageData.authors ?? {};
              }

                // Если сообщений нет — просто вернуть
                if ((!messagesFromOrder?.length) || !isNewMessage) return;

                // Обрабатываем сообщения параллельно с лимитом MESSAGE_CONCURRENCY
                await Promise.allSettled(
                  messagesFromOrder.map(async (message: any) => {
                    try {
                      const existingMessage = previousMessages.find(
                        (el) => el.__id === message.__id
                      );

                      if (!existingMessage) {
                        messagesFlag = true;
                        console.log("new message: ", message.body);

                        if (
                          message.author !== clientId &&
                          !message.author.includes(
                            "00000000-0000-0000-0000-000000000000"
                          )
                        ) {
                          // fire-and-forget notifications (can be awaited but лучше не блокировать)
                          try {
                            await sendPushNotifications(
                              webSubscriptions,
                              `Новое сообщение по заказу ${order.nomer_zakaza}`,
                              `${stripHtml(message?.body)}`
                            );
                          } catch (pushErr) {
                            console.error("Ошибка отправки push:", pushErr);
                          }
                        }

                        message.body = message.body || null;

                        // Создаём сообщение в БД
                        const currentMessage = await createMessage(userId, {
                          ...message,
                          authorId: message.author,
                          targetId: message.target.id,
                          isChanged:
                            message.author !== userId &&
                            !message.author.includes(
                              "00000000-0000-0000-0000-000000000000"
                            ),
                        });

                        await updateMessageToUser({
                          userId,
                          message: currentMessage,
                          type: "message:add",
                          authors,
                        });

                        return;
                      }

                      if (existingMessage.updatedAt === message.__updatedAt) {
                        return;
                      }

                      // Compare comments
                      const newComments = message?.comments || [];
                      const oldComments = existingMessage?.comments || [];

                      function normalizeComments(arr: any[] = []) {
                        return arr
                          .map((c) => ({
                            id: c.__id,
                            body: typeof c.body === "string" ? c.body.trim() : "",
                            author: c.author || c.authorId || "",
                          }))
                          .sort((a, b) => a.body.localeCompare(b.body));
                      }

                      const newNormalized = normalizeComments(message?.comments);
                      const oldNormalized = normalizeComments(existingMessage?.comments);

                      const commentsChanged = !isEqual(newNormalized, oldNormalized);

                      if (commentsChanged) {
                        messagesFlag = true;

                        // Добавляем новые комментарии — последовательно внутри map, но можно и параллельно
                        await Promise.allSettled(
                          newComments
                            ?.slice(oldComments?.length)
                            .map(async (el: any) => {
                              try {
                                await sendPushNotifications(
                                  webSubscriptions,
                                  `Новый комментарий по заказу ${order.nomer_zakaza}`,
                                  `${stripHtml(el?.body ?? "Файл")}`
                                );

                                const currentMessage = await addCommentToMessage(
                                  userId,
                                  message.__id,
                                  { authorId: el.author, ...el }
                                );

                                await updateMessageToUser({
                                  userId,
                                  message: currentMessage,
                                  type: "comment:add",
                                  authors,
                                });
                              } catch (innerErr) {
                                console.error("Ошибка при добавлении комментария:", innerErr);
                              }
                            })
                        );
                      }
                    } catch (msgErr) {
                      console.error("Ошибка при обработке сообщения:", msgErr);
                    }
                  })
                );
              })();

              // ---------- Order checking ----------
              const orderPromise = (async () => {
                try {
                  const prevOrderFromDb = await getOrderById(order.__id ?? "");
                  const previousOrder = prevOrderFromDb?.orderData;

                  if (!previousOrder || order.__updatedAt !== previousOrder.__updatedAt) {
                    try {
                      const isNew = !previousOrder;

                      if (isNew) {
                        ordersFlag = true;
                        messagesFlag = true;
                        if (webSubscriptions?.length && order?.nomer_zakaza) {
                          // sendPushNotifications(webSubscriptions, 'Новый заказ', `Поступил новый заказ №${order.nomer_zakaza}`);
                        }

                        const currentOrder = await createOrder(userId, {
                          ...order,
                          isChanged: true,
                        });

                        await updateOrderToUser({
                          userId,
                          order: currentOrder,
                          type: "order:add",
                          passports,
                        });
                        return;
                      }

                      const updateIfChanged = (tabName: string, fields: string[]): { updatedAtKey: string; changed: boolean } => {
                        const updatedAtKey = `__updatedAt${tabName}`;
                        // @ts-ignore
                        const prevRaw = order?.[updatedAtKey];           // теперь ticket уже содержит старое значение
                        const isInitial = !prevRaw;                     // первый заход если его нет
                        const prevFields = pickFields(previousOrder, fields);
                        const currFields = pickFields(order, fields);
                        const isSame = isEqual(prevFields, currFields);
                        const changed = isInitial ? true : !isSame;

                        if (changed) {
                          ordersFlag = true;
                          const now = new Date().toISOString();
                          // проставляем в ticket (он уйдёт в saveUserData)
                          // @ts-ignore
                          order[updatedAtKey] = now;
                        }

                        return { updatedAtKey, changed };
                      };

                      // Booking
                      const fieldMap2: Record<
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

                      const bookingFields = Object.values(fieldMap2).flatMap(obj => Object.values(obj))
                        .concat(Object.values(preAnswerMap))
                        .concat('marshrutnaya_kvitanciya');
                      updateIfChanged('Booking', bookingFields);

                      // Hotels
                      const hotelFields = [1, 2, 3].flatMap(index => {
                        const suffix = index === 1 ? '' : index;
                        return [
                          `otel${suffix}?.name`,
                          `data_zaezda${suffix}`,
                          `data_vyezda${suffix}`,
                          `kolichestvo_nochei${suffix}`,
                          `tip_nomera${suffix}?.name`,
                          `tip_pitaniya${suffix}?.name`,
                          `stoimost${suffix}?.cents`,
                          `nazvanie_otelya${suffix}`,
                          `tip_nomera${suffix}_nazvanie`,
                          `tip_pitaniya${suffix}_nazvanie`,
                        ];
                      }).concat('vaucher');
                      updateIfChanged('Hotels', hotelFields);

                      // Map
                      updateIfChanged('Map', ['karta_mest_f', 'opisanie_stoimosti_mest']);

                      // Transfer
                      const transferFields = [
                        'transfer_f',
                        'prilozhenie_transfer1',
                        'vaucher_transfer',
                        'opisanie_transfera',
                        'otvet_klientu_po_transferu',
                        'informaciya_o_passazhire',
                        'stoimost_dlya_klienta_za_oformlenie_transfera_1',
                      ];
                      updateIfChanged('Transfer', transferFields);

                      // VIP
                      const vipFields = [
                        'vaucher_vipservis',
                        'nazvanie_uslugi_vipservis',
                        'opisanie_uslugi_vipservis',
                        'stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis',
                        'fio_passazhirov_vipservis',
                      ];
                      updateIfChanged('Vip', vipFields);

                      const status = getStatus(order);
                      let fieldsToCompare: string[] = [];

                      if ((getStatus(previousOrder) === AllStatus.NEW) && (status === AllStatus.PENDING)) {
                        ordersFlag = true;
                        if (webSubscriptions?.length) {
                          sendPushNotifications(webSubscriptions, 'Принят в работу', `Заказ №${order.nomer_zakaza} принят в работу`);
                        }
                        const currentOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                        await updateOrderToUser({ userId, order: currentOrder, type: 'order:update', passports });
                        console.log(getStatus(previousOrder), status, order.__id);
                        console.log('=======> update 1')
                        return;
                      }

                      // NEED TO PLACE OBSERVER PATTERN HERE!!!!!!

                      if (status === AllStatus.PENDING) {
                        fieldsToCompare = ['otvet_klientu1'];
                        const isEqualStatus = isEqual(
                          pickFields(order, fieldsToCompare),
                          pickFields(previousOrder || {}, fieldsToCompare)
                        );

                        if (!isEqualStatus) {
                          ordersFlag = true;
                          if (webSubscriptions?.length) {
                            sendPushNotifications(webSubscriptions, 'Направление предложений', `По заказу №${order.nomer_zakaza}`);
                          }
                          const currentOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({ userId, order: currentOrder, type: 'order:update', passports });
                          console.log('=======> update 2')
                          return;
                        }
                      }

                      if (
                        getStatus(previousOrder) === AllStatus.BOOKED &&
                        status === AllStatus.FORMED &&
                        order?.marshrutnaya_kvitanciya
                      ) {
                        ordersFlag = true;
                        if (webSubscriptions?.length) {
                          sendPushNotifications(webSubscriptions, 'Подтверждение оформления', `Подтверждение оформления заказа №${order.nomer_zakaza}`);
                        }
                        const currentOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                        await updateOrderToUser({ userId, order: currentOrder, type: 'order:update', passports });
                        console.log('=======> update 3')
                        return;
                      }

                      if (status === AllStatus.BOOKED && order.otvet_klientu && !previousOrder?.otvet_klientu) {
                        const fieldsToCompare = [
                          // --- Уже существующие ---
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

                          // --- Трансфер ---
                          'informaciya_o_passazhire',
                          'otvet_klientu_po_transferu',
                          'stoimost_dlya_klienta_za_oformlenie_transfera_1',
                          'prilozhenie_transfer1',
                          'vaucher_transfer',

                          // --- Вип-сервис ---
                          'nazvanie_vipuslugi',
                          'opisanie_i_stoimost_uslugi_vipservis',
                          'fio_passazhirov_vipservis',
                          'stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis',
                          'fio_passazhirov_vipservis_2',
                          'stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis_2',
                          'voucher_vipservis', // заменил "Ваучер Вип-сервис" на camel-case

                          // --- Карта мест ---
                          'opisanie_stoimosti_mest',
                          'karta_mest1',

                          // --- Отель ---
                          'otel1', 'otel2', 'oteli3',
                          'data_zaezda1', 'data_vyezda1',
                          'data_zaezda2', 'data_vyezda2',
                          'data_zaezda3', 'data_vyezda3',
                          'kolichestvo_nomerov',
                          'kolichestvo_nochei1', 'kolichestvo_nochei2', 'kolichestvo_nochei3',
                          'tip_nomera1', 'tip_nomera2', 'tip_nomera3',
                          'tip_pitaniya1', 'tip_pitaniya2', 'tip_pitaniya3',
                          'stoimost1', 'stoimost2', 'stoimost3',
                          'kommentarii_k_predlozheniyu',
                          'otmena_bez_shtrafa',
                          'otmena_so_shtrafom',
                          'nevozvratnyi',
                          'vaucher'
                        ];

                        const isEqualStatus = isEqual(
                          pickFields(order, fieldsToCompare),
                          pickFields(previousOrder || {}, fieldsToCompare)
                        );

                        if (!isEqualStatus) {
                          ordersFlag = true;
                          if (webSubscriptions?.length) {
                            sendPushNotifications(webSubscriptions, 'Бронирование создано', `По заказу №${order.nomer_zakaza}`);
                          }
                          const currentOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({ userId, order: currentOrder, type: 'order:update', passports });
                          console.log('=======> update 4')
                          return;
                        }
                      }

                      if (status === AllStatus.BOOKED) {
                        const fieldsToCompareT = [
                          // --- Уже существующие ---
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

                          // --- Трансфер ---
                          'informaciya_o_passazhire',
                          'otvet_klientu_po_transferu',
                          'stoimost_dlya_klienta_za_oformlenie_transfera_1',
                          'prilozhenie_transfer1',
                          'vaucher_transfer',

                          // --- Вип-сервис ---
                          'nazvanie_vipuslugi',
                          'opisanie_i_stoimost_uslugi_vipservis',
                          'fio_passazhirov_vipservis',
                          'stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis',
                          'fio_passazhirov_vipservis_2',
                          'stoimost_dlya_klienta_za_oformlenie_uslugi_vipservis_2',
                          'voucher_vipservis', // заменил "Ваучер Вип-сервис" на camel-case

                          // --- Карта мест ---
                          'opisanie_stoimosti_mest',
                          'karta_mest1',

                          // --- Отель ---
                          'otel1', 'otel2', 'oteli3',
                          'data_zaezda1', 'data_vyezda1',
                          'data_zaezda2', 'data_vyezda2',
                          'data_zaezda3', 'data_vyezda3',
                          'kolichestvo_nomerov',
                          'kolichestvo_nochei1', 'kolichestvo_nochei2', 'kolichestvo_nochei3',
                          'tip_nomera1', 'tip_nomera2', 'tip_nomera3',
                          'tip_pitaniya1', 'tip_pitaniya2', 'tip_pitaniya3',
                          'stoimost1', 'stoimost2', 'stoimost3',
                          'kommentarii_k_predlozheniyu',
                          'otmena_bez_shtrafa',
                          'otmena_so_shtrafom',
                          'nevozvratnyi',
                          'vaucher'
                        ];

                        const fieldsToCompareM = ['marshrutnaya_kvitanciya'];

                        const isEqualStatus1 = isEqual(
                          pickFields(order, fieldsToCompareT),
                          pickFields(previousOrder || {}, fieldsToCompareT)
                        );
                        const isEqualStatus2 = isEqual(
                          pickFields(order, fieldsToCompareM),
                          pickFields(previousOrder || {}, fieldsToCompareM)
                        );

                        if (!isEqualStatus1 || !isEqualStatus2) {
                          ordersFlag = true;
                          if (webSubscriptions?.length) {
                            sendPushNotifications(webSubscriptions, 'Актуализация бронирования', `По заказу №${order.nomer_zakaza}`);
                          }
                          const currentOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({ userId, order: currentOrder, type: 'order:update', passports });
                          console.log('=======> update 5')
                          return;
                        }
                      }

                      if (ordersFlag) {
                        const currentOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                        await updateOrderToUser({ userId, order: currentOrder, type: 'order:update', passports });
                        console.log('=======> update 6')
                        return;
                      }

                      return order;
                    } catch (err) {
                      console.error("❌ Ошибка при обработке заказа:", order?.nomer_zakaza, err);
                      return null;
                    }
                  } 
                  } catch (errOrder) {
                    console.error("Ошибка в orderPromise:", errOrder);
                  }
                })();

              // Важно: если пришли новые сообщения, обработаем и сообщения, и заказ параллельно.
              await Promise.allSettled([messagePromise, orderPromise]);

            } catch (outerErr) {
              console.error("Ошибка при обработке одного заказа:", outerErr);
            }
          });

          // Ждём всех обработок заказов
          await Promise.allSettled(orderPromises);

        } catch (err) {
          console.error(`Ошибка при обработке пользователя ${userId}`, err);
        }
      })
    );

    console.timeEnd(`TOTAL_POLL-${pollId}`);
  } catch (error) {
    console.error("❌ Ошибка при опросе:", error);
  } finally {
    setTimeout(() => pollNewMessages(), 3000);
  }
}
