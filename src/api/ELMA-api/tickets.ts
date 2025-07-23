// import { ELMATicket } from "src/mocks/tickets/ticket.type";
// import axios from 'axios';

// function addTicket(ticket: ELMATicket): void {
//     // Здесь будет по api передаваться билет и так далле, но пока тестовый вариант
//     if (ticket) {
//         // async function addCurrentTicket(params:type) {
            
//         // }
//         // .unshift(ticket);
//     }
//     // //
// }

// export const getUserOrders = async (userId: string | null = null): Promise<any> => {
//     try {
//       const response = await axios.get<ELMATicket[]>(`http://${window.location.hostname}:3001/api/user/${userId ?? '543e820c-e836-45f0-b177-057a584463b7'}/orders`);
//       console.log(response.data);
//       return response.data;
//     } catch (error) {
//       console.error('Ошибка при загрузке заказов пользователя:', error);
//       return [];
//     }
//   };

// export default addTicket;