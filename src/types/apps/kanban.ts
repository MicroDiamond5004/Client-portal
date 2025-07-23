// export interface TodoTask {
//   id: number | any;
//   task: string;
//   taskImage: string | null | any;
//   taskText: string;
//   date: string;
//   taskProperty: string;
//   category?: string | any;
// }

import { ELMATicket } from "src/mocks/tickets/ticket.type";

export interface TodoCategory {
  id: string | any;
  name: string;
  child: ELMATicket[];
}
