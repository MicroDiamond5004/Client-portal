import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { TodoCategory } from '../../types/apps/kanban';
import useSWR from 'swr';
import { AllStatus, getStatus } from 'src/components/apps/tickets/TicketListing';
import { ELMATicket, TicketsData } from 'src/mocks/tickets/ticket.type';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectOrder } from 'src/store/selectors/ticketsSelectors';
import { fetchUserOrders } from 'src/store/middleware/thunks/ordersThunks';



interface KanbanDataContextProps {
    children: ReactNode;
}

interface KanbanContextType {
    todoCategories: TodoCategory[];
    setError: (errorMessage: any) => void;
    loading: boolean;
    error: null;
    setTodoCategories: (id: TodoCategory[]) => void;
    // moveTask: (
    //     taskId: number,
    //     sourceCategoryId: string,
    //     destinationCategoryId: string,
    //     sourceIndex: number,
    //     destinationIndex: number
    // ) => void;
}

export const KanbanDataContext = createContext<KanbanContextType>({} as KanbanContextType);

export const KanbanDataContextProvider: React.FC<KanbanDataContextProps> = ({ children }) => {
    const curentTicketsData = useAppSelector(selectOrder);
    const [todoCategories, setTodoCategories] = useState<TodoCategory[]>([]);
    const [error, setError] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true)

    const dispatch = useAppDispatch();

    // Fetch todo data from the API
    const { result: todosData, success: isTodosLoading, error: todoError } = curentTicketsData;

    useEffect(() => {
        const fetchOrders = async () => {
            dispatch(fetchUserOrders());
            setLoading(false);
        };

        fetchOrders();
        }, []);

    useEffect(() => {
        if (todosData) {
            const categoriesTickets: any = {
                [AllStatus.NEW]: [],
                [AllStatus.PENDING]: [],
                [AllStatus.BOOKED]: [],
                [AllStatus.FORMED]: [],
                [AllStatus.CLOSED]: [],
            };

            todosData.result.forEach((ticket: ELMATicket) => {
                if (ticket.__status?.status) {
                    categoriesTickets[getStatus(ticket)].push(ticket);
                }
            });

            const categories: any = [];

            Object.entries(categoriesTickets).forEach(([key, value], index) => {
                categories.push(
                    {
                        id: index + 1,
                        name: key,
                        child: value
                    }
                )
            })

            setTodoCategories(categories);
            setLoading(false);
        } else if (todoError) {
            setError(todoError);
            setLoading(false);
        } else {
            setLoading(isTodosLoading);
        }
    }, [todosData, todoError, isTodosLoading]);


    return (
        <KanbanDataContext.Provider value={{ todoCategories, loading, error, setTodoCategories, setError }}>
            {children}
        </KanbanDataContext.Provider>
    );
};