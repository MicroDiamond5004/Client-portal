import axios from "axios";
import {
    addCommentToMessage,
    createMessage,
    createOrder,
  findAuthFileByUserId,
  getAllUsersData,
  getMessagesByUserId,
  getOrdersByUserId,
  getUserSubscriptions,
  loadUserData,
  saveUserData,
  updateOrder,
} from "../data/mongodbStorage";
import { get, isEqual } from "lodash";
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
import { IAuthor, IFilePreview, IPassport } from "../models";

 function pickFields(obj: any, fields: string[]) {
    return fields.reduce(
    (acc, field) => {
        acc[field] = get(obj, field); // безопасно достаёт вложенные поля
        return acc;
    },
    {} as Record<string, any>,
    );
}

export default async function pollNewMessages() {
  const users = await getAllUsersData();

  console.log('polling запущен');

  await getSergeiToken();

  console.log('get token');

  const auth = await readAuth();
  const token = auth?.token ?? '';
  const cookie = auth?.cookie ?? '';

  try {
    await Promise.all(
      users.map(async ({ userId, data }) => {
        try {
          const subscriptions = await getUserSubscriptions(userId);
          const webSubscriptions = subscriptions?.map((el) => ({
            endpoint: el.endpoint,
            expirationTime: el.expirationTime || null,
            keys: {
              p256dh: el.keys?.p256dh,
              auth: el.keys?.auth,
            },
          }));

          const email = subscriptions[0]?.email ?? (await findAuthFileByUserId(userId))?.email;
          const clientId = userId;

          const previousMessages = await getMessagesByUserId(userId);
          const previousOrdersData = await getOrdersByUserId(userId);
          const previousOrders = previousOrdersData.map((el) => el.orderData);

          // sendToUser(email, 'ffffffffff');

          // ----- Получаем контктные данные -----
          try {
            const kontakt = await getContact(clientId);

            if (!kontakt) return;

            // ----- Получаем заказы с ЕЛМЫ -----
            const mergedOrders = await getOrders(kontakt);

            // const previousPassports = getPassports(userId, mergedOrders);

            mergedOrders?.map(async (order: ELMATicket) => {
              let ordersFlag = false, messagesFlag = false;

              // Variables for ec
              let passports: IPassport[] = [];
              let authors: Record<string, string> = {};
              let messageFiles: IFilePreview[] = [];
              let orderFiles: IFilePreview[] = [];

              // Message polling
              const messageData = await getMessages(userId, order, token, cookie);

              let messagesFromOrder: any[] = [];

              if (messageData) {
                messagesFromOrder = messageData.messages;
                authors = messageData.authors ?? {};
              }

              await Promise.all(messagesFromOrder?.map(async (message: any) => {
                const existingMessage = previousMessages.find((el) => el.__id === message.__id);

                // Новое сообщение
                if (!existingMessage) {
                  messagesFlag = true;

                  if (
                    message.author !== clientId &&
                    !message.author.includes('00000000-0000-0000-0000-000000000000')
                  ) {
                    sendPushNotifications(
                      webSubscriptions,
                      `Новое сообщение по заказу ${order.nomer_zakaza}`,
                      `${stripHtml(message?.body)}`
                    );
                  }

                  if (!message.body) {
                    message.body = null;
                  }

                  // order.nomer_zakaza = 302
                  // order.nomer_zakaza = 404


                  const createdMessage = await createMessage(userId, { ...message, authorId: message.author, targetId: message.target.id, isChanged: message.author !== userId && !message.author.includes('00000000-0000-0000-0000-000000000000') });
                  await updateMessageToUser({userId, message: createdMessage, authors, type: 'message:add'});
                }

                // Сравнение комментариев
                const newComments = message?.comments || [];
                const oldComments = existingMessage?.comments || [];

                const strippedNew = newComments?.map((c: any) => ({
                  body: c.body,
                  author: c.author
                }));
                const strippedOld = oldComments?.map((c: any) => ({
                  body: c.body,
                  author: c.author
                }));

                const commentsChanged = !isEqual(strippedNew, strippedOld);

                if (commentsChanged) {
                  messagesFlag = true;

                  const last = newComments.at(-1);
                  if (
                    last?.author !== clientId &&
                    !last?.author.includes('00000000-0000-0000-0000-000000000000')
                  ) {
                    sendPushNotifications(
                      webSubscriptions,
                      `Новый комментарий по заказу ${order.nomer_zakaza}`,
                      `${stripHtml(last?.body ?? 'Файл')}`
                    );
                  }

                  await Promise.all(newComments?.slice(oldComments?.length).map(async (el: any) => {
                    const createdMessage = await addCommentToMessage(userId, message.__id, {authorId: el.author, ...el});
                    await updateMessageToUser({userId, message: createdMessage, authors, type: 'message:add'});
                  }))
                }

                // Сообщение не изменилось
                return existingMessage;
              }));
              // ------ Message polling end ------

                
              // Checking order
              const previousOrder = previousOrders.find((el) => el.__id === order.__id || el?.nomer_zakaza === order?.nomer_zakaza);
              if (!previousOrder || (order.__updatedAt !== previousOrder.__updatedAt)) {
                  try {
                      const isCurrentChanged = previousOrder?.isChanged ?? false;
                      const isNew = !previousOrder;

                      if (isNew) {
                          ordersFlag = true;
                          messagesFlag = true;
                          if (webSubscriptions?.length && order?.nomer_zakaza) {
                              // sendPushNotifications(webSubscriptions, 'Новый заказ', `Поступил новый заказ №${ticket.nomer_zakaza}`);
                          }
                          const createdOrder = await createOrder(userId, { ...order, isChanged: true });
                          await updateOrderToUser({userId, order: createdOrder, passports, type: 'order:add'});
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
                              // console.log(updatedAtKey, isSame, '-----------------------');
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
                          const createdOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({userId, order: createdOrder, passports, type: 'order:add'});
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
                              // HERE!!!!!!
                              const createdOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                              await updateOrderToUser({userId, order: createdOrder, passports, type: 'order:add'});
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
                          // HERE!!!!!!
                          const createdOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({userId, order: createdOrder, passports, type: 'order:add'});
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
                          const createdOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({userId, order: createdOrder, passports, type: 'order:add'});
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
                          const createdOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({userId, order: createdOrder, passports, type: 'order:add'});
                          return;
                      }
                      }

                      if (ordersFlag) {
                          const createdOrder = await updateOrder(userId, order.__id ?? '', { ...order, isChanged: true });
                          await updateOrderToUser({userId, order: createdOrder, passports, type: 'order:add'});
                          return;
                      }

                      return order; // <-- теперь точно увидите логи
                  } catch (err) {
                      console.error('❌ Ошибка при обработке заказа:', order?.nomer_zakaza, err);
                      return null; // или ticket с флагом ошибки
                  }
              }
              // ------ Checking order end ------
            })

          } catch (error) {
            console.error("❌ Error polling:", error);
          }
        } catch (err) {
          console.error(`Ошибка при обработке пользователя ${userId}`, err);
        }
      }),
    );
  } catch (error) {
    console.error("❌ Ошибка при опросе:", error);
  } finally {
    setTimeout(pollNewMessages, 3000);
  }
}
