import { ELMAresponse } from "src/mocks/tickets/get-tickets";
import { ELMATicket } from "src/mocks/tickets/ticket.type";

function addTicket(ticket: ELMATicket): void {
    // Здесь будет по api передаваться билет и так далле, но пока тестовый вариант
    if (ticket) {
        ELMAresponse.result.result.unshift(ticket);
    }
    //
}

export default addTicket;