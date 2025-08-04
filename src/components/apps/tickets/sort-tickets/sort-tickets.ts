import { ELMATicket } from "src/mocks/tickets/ticket.type";

function sortAllTickets(tickets: ELMATicket[]): ELMATicket[] {
    return [...tickets].sort((a, b) => {
        // Приводим isChanged к булевому значению (undefined === false)
        const aChanged = Boolean(a.isChanged);
        const bChanged = Boolean(b.isChanged);

        if (aChanged !== bChanged) {
            return aChanged ? -1 : 1;
        }

        // Затем сортировка по убыванию номера заказа
        return Number(b?.nomer_zakaza || '0') - Number(a?.nomer_zakaza || '0');
    });
}


export default sortAllTickets;