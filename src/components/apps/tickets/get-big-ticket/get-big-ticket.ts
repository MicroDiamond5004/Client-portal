import { ELMATicket } from "src/mocks/tickets/ticket.type";
import { TodoCategory } from "src/types/apps/kanban";
import sortAllTickets from "../sort-tickets/sort-tickets";

function getBiggestTicketNumber(tickets: ELMATicket[] | TodoCategory[]): string {
    let biggestTicketNumber = '0';
    // Если это массив категорий
    if ('name' in (tickets[0] as any)) {
        const todoCategories = tickets as TodoCategory[];

        todoCategories.forEach((category) => {
            const sortedTickets = sortAllTickets(category.child);
            if (sortedTickets.length > 0) {
                const currentNumber = sortedTickets[0].nomer_zakaza || '0';
                if (+currentNumber > +biggestTicketNumber) {
                    biggestTicketNumber = currentNumber;
                }
            }
        });

        return biggestTicketNumber;
    }

    // Иначе — это массив тикетов
    const sorted = sortAllTickets(tickets as ELMATicket[]);
    return sorted.length > 0 ? sorted[0].nomer_zakaza || biggestTicketNumber : biggestTicketNumber;
}


export default getBiggestTicketNumber;