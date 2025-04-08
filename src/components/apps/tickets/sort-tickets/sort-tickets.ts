import { ELMATicket } from "src/mocks/tickets/ticket.type";

function sortAllTickets(tickets: ELMATicket[]) : ELMATicket[] {
    return tickets.sort((a, b) => Number((b?.nomer_zakaza || '1')) - Number((a?.nomer_zakaza || '0')));
}

export default sortAllTickets;