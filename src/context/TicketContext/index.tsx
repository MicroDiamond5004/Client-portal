import React, { createContext, useState, useEffect } from 'react';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';
import { selectOrder, selectTickets } from 'src/store/selectors/ticketsSelectors';

export interface TicketContextType {
    tickets: ELMATicket[];
    setTicketSearch: (searchTerm: string) => void;
    searchTickets: (searchTerm: string) => void;
    ticketSearch: string;
    filter: string;
    error: any;
    loading: boolean;
}

// Create Context
export const TicketContext = createContext<TicketContextType>({} as TicketContextType);

// Provider Component
export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const curentTicketsData = useAppSelector(selectOrder);
    const fetchedTickets = useAppSelector(selectTickets);

    const [tickets, setTickets] = useState<ELMATicket[]>(fetchedTickets ?? []);
    const [ticketSearch, setTicketSearch] = useState<string>('');
    const [filter, setFilter] = useState<string>('total_tickets');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    const dispatch = useAppDispatch();

    const ticketsData = curentTicketsData?.result ?? [];
    const isTicketsLoading = curentTicketsData?.success ?? false;
    const ticketsError = curentTicketsData?.error ?? null;

    useEffect(() => {
        dispatch(fetchUserOrders());
    }, [dispatch]);

    useEffect(() => {
        if (ticketsData.length > 0) {
            setTickets(ticketsData);
            setLoading(!isTicketsLoading);
        } else if (ticketsError) {
            setError(ticketsError);
            setLoading(false);
        } else {
            setLoading(!isTicketsLoading);
        }
    }, [ticketsData, ticketsError, isTicketsLoading]);

    const searchTickets = (searchTerm: string) => {
        setTicketSearch(searchTerm);
    };

    return (
      <TicketContext.Provider
        value={{
            tickets,
            error,
            loading,
            setTicketSearch,
            searchTickets,
            ticketSearch,
            filter,
        }}
      >
          <>

              {children}
          </>
      </TicketContext.Provider>
    );
};
