import { createContext, useState, useEffect } from 'react';
import getAllTicketsData from 'src/mocks/tickets/get-tickets';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';


export interface TicketContextType {
    tickets: ELMATicket[];
    setTicketSearch: (searchTerm: string) => void;
    searchTickets: (searchTerm: string) => void;
    ticketSearch: string;
    filter: string;
    error: null;
    loading: boolean;
    setFilter: (filter: string) => void;
}

// Create Context
export const TicketContext = createContext<TicketContextType>({} as TicketContextType);

// Provider Component
export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tickets, setTickets] = useState<ELMATicket[]>([]);
    const [ticketSearch, setTicketSearch] = useState<string>('');
    const [filter, setFilter] = useState<string>('total_tickets');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    // Fetch tickets from the API when the component mounts using useEffect
    const { result: ticketsData, success: isTicketsLoading, error: ticketsError } = getAllTicketsData();
    useEffect(() => {
        if (ticketsData) {
            setTickets(ticketsData.result);
            setLoading(!isTicketsLoading);
        } else if (ticketsError) {
            setError(ticketsError);
            setLoading(false);
        } else {
            setLoading(!isTicketsLoading);
        }
    }, [ticketsData, ticketsError, isTicketsLoading]);

    

    // Delete a ticket with the specified ID from the server and update the tickets state
    // const deleteTicket = async (id: number) => {
    //     try {
    //         await mutate(deleteFetcher('/api/data/ticket/delete', { id }))
    //         setTickets((prevTickets) => {
    //             // Filter out the ticket with the given ID from the tickets list
    //             const updatedTickets = prevTickets.filter((ticket) => ticket.Id !== id);
    //             return updatedTickets;
    //         });
    //     } catch (err) {
    //         console.error('Error deleting ticket:', err);
    //     }
    // };

    // Update the ticket search term state based on the provided search term value.
    const searchTickets = (searchTerm: string) => {
        setTicketSearch(searchTerm);
    };

    return (
        <TicketContext.Provider
            value={{ tickets, error, loading, setTicketSearch, searchTickets, ticketSearch, filter, setFilter }}
        >
            {children}
        </TicketContext.Provider>
    );
};


