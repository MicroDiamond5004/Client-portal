import axios from "axios";
import { TOKEN } from "../const";
import { ELMATicket } from "../data/types";
import { createAuthor, createFile, createPassport, getAuthor, getPassportsById } from "../data/mongodbStorage";
import { IMessage, IPassport } from "../models";
import { getSergeiToken, readAuth } from "../utils";

export async function getContact(clientId: string) {
     const responseUser = await axios.post(
        "https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list",
        {
        active: true,
        fields: {
            "*": true,
        },
        filter: {
            tf: {
            __user: `${clientId}`,
            },
        },
        },
        {
        headers: {
            Authorization: `${TOKEN}`,
        },
        },
    );

    const data = responseUser.data.result.result[0];

    const company = data.company;

    const getContact = await axios.post(
        "https://portal.dev.lead.aero/pub/v1/app/_clients/_contacts/list",
        {
        active: true,
        fields: {
            "*": true,
        },
        filter: {
            tf: {
            // вернуть после соответствия
            // "fio": `${fullname}`,
            _companies: [`${company[0]}`],
            },
        },
        },
        {
        headers: {
            Authorization: `${TOKEN}`,
            "Content-Type": "application/json",
        },
        },
    );

    const contactData = getContact.data?.result;

    return contactData.total > 1
        ? contactData.result?.map((el: any) => el.__id)
        : [contactData.result[0]?.__id];
}

export async function getOrders(kontakt: string): Promise<any[]> {
    const elmaResponse = await axios.post(
        "https://portal.dev.lead.aero/pub/v1/app/work_orders/OrdersNew/list",
        {
        active: true,
        fields: {
            "*": true,
        },
        filter: {
            tf: {
            kontakt: kontakt
            ? (Array.isArray(kontakt) ? kontakt : [kontakt])
            : undefined, // не добавляем вообще, если контакт не передан
            },
        },
        size: 10000,
        },
        {
        params: {
            limit: 10000,
            offset: 0,
        },
        headers: {
            Authorization: TOKEN,
            "Content-Type": "application/json",
        },
        },
    );

    return elmaResponse.data?.result?.result || [];
}

export async function getMessages(userId: string, order: ELMATicket, token: string, cookie: string): Promise<{messages: any[], authors: Record<string, string> | undefined} | undefined> {
    const orderId = order.__id;

    try {
    // 📥 Получаем непрочитанные сообщения
    const responseUnread = await axios.get(
        `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages?offset=0&limit=1000000&condition=unread`,
        {
        headers: {
            'Authorization': token,
            'Cookie': cookie,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://portal.dev.lead.aero',
            'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${orderId})`,
        },
        withCredentials: true
        }
    );

    const unreadMessages = responseUnread.data?.result || [];

    // ✅ Помечаем непрочитанные как прочитанные
    for (const message of unreadMessages) {
        const messageId = message.__id;
        await axios.put(
        `https://portal.dev.lead.aero/api/feed/messages/${messageId}/markread`,
        JSON.stringify({
            readCount: 1,
            count: message.comments?.length + 1
        }),
        {
            headers: {
            'Authorization': token,
            'Cookie': cookie,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://portal.dev.lead.aero',
            'Referer': `https://portal.dev.lead.aero/work_orders/OrdersNew(p:item/work_orders/OrdersNew/${orderId})`,
            },
            withCredentials: true
        }
        );
    }

    // 📥 Получаем все сообщения
    const responseAll = await axios.get(
        `https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/${orderId}/messages`,
        {
        params: { limit: 100000, offset: 0 },
        headers: {
            'Authorization': token,
            'Cookie': cookie,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://portal.dev.lead.aero',
            'Referer': 'https://portal.dev.lead.aero/',
        },
        withCredentials: true
        }
    );

    const elmaData = responseAll.data;

    const authorIds = new Set<string>;

    const messages = Array.isArray(elmaData) ? elmaData : elmaData?.result || [];

    messages?.forEach((message: any) => {
        if (message.author) {
            authorIds.add(message.author)
        }
        message.comments?.forEach((comment: any) => {
            if (comment.author) {
                authorIds.add(comment.author);
            }
        })
    });

    const authors = await getAuthors(userId, Array.from(authorIds));

    return {messages, authors};

    } catch (error) {
    console.error(`Ошибка при обработке сообщений по заказу ${orderId}:`, error);
    }
}

export async function getPassports(userId: string, mergedOrders: any[]): Promise<(IPassport | null)[]> {
    const previousPassports = await getPassportsById(userId);
    const passportIds = previousPassports.map((el: any) => el.passportId ?? '');

    const AllPassports = new Set<string>(passportIds);

    // Adding passports from orders
    mergedOrders?.forEach((order: any) => {
        order.fio_gostya?.forEach((fio: string) => AllPassports.add(fio));
        order.fio2?.forEach((fio: string) => AllPassports.add(fio));
        order.dopolnitelnye_fio?.forEach((fio: string) => AllPassports.add(fio));
        order.fio_passazhira_ov_bron_3?.forEach((fio: string) => AllPassports.add(fio));
        order.fio_passazhira_ov_bron_4?.forEach((fio: string) => AllPassports.add(fio));
        order.fio_passazhira_ov_bron_5?.forEach((fio: string) => AllPassports.add(fio));
        order.fio_passazhira_ov_bron_6?.forEach((fio: string) => AllPassports.add(fio));
        order.fio_passazhirov_vipservis?.forEach((fio: string) => AllPassports.add(fio));
        order.fio_passazhirov_vipservis_2?.forEach((fio: string) => AllPassports.add(fio));
    });

    const passports: Record<string, [string | undefined, string | undefined]> = {};

    const fetchedPassports = await Promise.all(
        Array.from(AllPassports).map(async (passport) => {
            try {
            const response = await axios.post(
                `https://portal.dev.lead.aero/pub/v1/app/n3333/pasporta/${passport}/get`,
                {},
                {
                headers: {
                    Authorization: TOKEN
                }
                }
            );

            const data = response.data;

            passports[passport] = [
                data.item.familiya_imya_po_pasportu,
                data.item.dannye_pasporta
            ];

            if (!data?.item?.dannye_pasporta) {
                return null;
            }

            return await createPassport(userId, {passportId: data.item.__id, passportData: data.item.dannye_pasporta ?? '', name: data.item.familiya_imya_po_pasportu });
            } catch (error) {
              return null;
            // // console.error(`Ошибка при получении паспорта ${passport}:`, error);
            }
        })
    );

    return fetchedPassports;
}

export async function getFiles(files: any[]) {
  try {
    return await Promise.all(files.map(async (file) => {
        const fileId = file.__id;
      let filename: string | undefined = '';

      const response = await axios.get(`https://portal.dev.lead.aero/pub/v1/disk/file/${fileId}/get-link`, {
        headers: {
          'Authorization': TOKEN,
        },
      });

      const { success, Link } = response.data;
      if (!success || !Link) {
        throw new Error(`Не удалось получить ссылку для файла ${fileId}`);
      }

      // Пытаемся достать имя файла из ссылки
      filename = fileId;

      try {
        const decodedLink = decodeURIComponent(Link);
        const match = decodedLink.match(/filename\*\=UTF-8''(.+?)\;/);
        filename = match?.[1];
        // // // // // console.log(match?.[1]);

      } catch (e) {
        // console.warn(`Не удалось распарсить имя файла для ${fileId}`);
      }

      return {
        fileId,
        filename,
        url: Link,
      };

    }));
  } catch (error) {
    // // console.error('❌ Ошибка при получении ссылок на файлы:', error);

  }
}

export async function getAuthors(clientId: string, users: string[]) {
  await getSergeiToken();
  const auth = await readAuth();

  const SergeiToken = auth?.token;
  const cookie = auth?.cookie;

   const responseUser = await axios.post(
        'https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list',
        {
            "active": true,
            "fields": {
            "*": true
            },
            "filter": {
            "tf": {
                "__user": `${clientId}`
            }
            }
        },
        {
            headers: {
            Authorization: `${TOKEN}`
            }
        }
        );

    const data = responseUser.data.result.result[0];
    const company = data.company;

  const fetchOtherAgents = await axios.post(`https://portal.dev.lead.aero/pub/v1/app/_clients/_companies/${company?.[0]}/get`,
    {},
    {
      headers: {
        'Authorization': TOKEN,
      }
    });

  const fetchedUsers = [];

  const updatedManagers: Record<string, string> = {};

  const updatedUsers = users.concat(fetchOtherAgents.data.item._contacts);

  try {
    for (let userId of updatedUsers) {

        const previousAuthor = await getAuthor(userId);

        // PLEASE COMMENT THAT FOR UPDATE AUTHORS
        if (previousAuthor) {
            updatedManagers[userId] = previousAuthor.name;
            continue;
        }
        //

      let contactName: string | null = null;


      try {
        const contactResponse = await axios.post(`https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list`,
          {
            "active": true,
            "fields": {
              "*": true
            },
            "filter": {
              "tf": {
                "__user": userId
              }
            }
          },
          {
            headers: {
              'Authorization': TOKEN,
            }
          });

        const contactData = contactResponse.data;

        contactName = contactData.result.result?.[0].__name;
      } catch (e) {

      }


      try {
        const contactResponse = await axios.post(`https://portal.dev.lead.aero/pub/v1/app/_clients/_contacts/${userId}/get`,
          {},
          {
            headers: {
              'Authorization': TOKEN,
            }
          });

        const contactData = contactResponse.data;

        contactName = contactData.item.__name;
      } catch (e) {

      }

      const response = await axios.post(`https://portal.dev.lead.aero/api/auth/users`, {
        asc: true,
        orderBy: "__name",
        limit: 1000,
        offset: 0,
        filter: JSON.stringify({
          and: [
            {
              in: [
                { field: "__status" },
                { list: [2, 0, 1, 3, 4] }
              ]
            },
            {
              and: [
                {
                  and: [
                    {
                      tf: {
                        "__status": [2, 0]
                      }
                    }
                  ]
                },
                {
                  eq: [
                    { field: "__deletedAt" },
                    { null: "" }
                  ]
                }
              ]
            }
          ]
        })
      }
        , {
          headers: {
            'Authorization': SergeiToken,
            'Cookie': typeof cookie === "string" ? cookie : "",
          },
        });

      const data = response.data;

      const foundUser = data.result.find((u: any) => u.__id === userId);

      if (foundUser) {
        fetchedUsers.push(foundUser.__name);
        updatedManagers[userId] = foundUser.__name;
        createAuthor({authorId: userId, name: foundUser.__name});
      } else {
        fetchedUsers.push(contactName ?? 'Система');
        updatedManagers[userId] = contactName ?? 'Система';
        if (contactName) {
            createAuthor({authorId: userId, name: contactName});
        }
      }
    }

    return updatedManagers;
  } catch (err: any) {
    console.error(err.response, "Ошибка при получении данных" );
  }
}

export async function getAnotherUsers(savedClientId: string): Promise<string[]> {
  const responseUser = await axios.post(
    'https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list',
    {
      "active": true,
      "fields": {
        "*": true
      },
      "filter": {
        "tf": {
          "__user": `${savedClientId}`
        }
      }
    },
    {
      headers: {
        Authorization: `${TOKEN}`
      }
    }
  );

  const data = responseUser.data.result.result[0];

  const company = data.company;

  const sameCompanyUsers = await axios.post(
    'https://portal.dev.lead.aero/pub/v1/app/_system_catalogs/_user_profiles/list',
    {
      "active": true,
      "fields": {
        "*": true
      },
      "filter": {
        "tf": {
          "company": [
            `${company}`
          ]
        }
      },
      "from": 0
    },
    {
      headers: {
        Authorization: `${TOKEN}`
      }
    }
  );

  const compnyData = sameCompanyUsers.data;

  return compnyData?.result?.result?.map((el: any) => el.__user);
}