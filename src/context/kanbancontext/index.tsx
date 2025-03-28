import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { TodoCategory } from '../../types/apps/kanban';
import { deleteFetcher, getFetcher, postFetcher } from 'src/api/globalFetcher';
import useSWR from 'swr';
import getAllTicketsData, { AllTickets } from 'src/mocks/tickets/get-tickets';
import { AllStatus, getStatus } from 'src/components/apps/tickets/TicketListing';




interface KanbanDataContextProps {
    children: ReactNode;
}

interface KanbanContextType {
    todoCategories: TodoCategory[];
    // addCategory: (categoryName: string) => Promise<void>;
    // deleteCategory: (categoryId: string) => Promise<void>;
    // clearAllTasks: (categoryId: string) => Promise<void>;
    // deleteTodo: (taskId: number) => Promise<void>;
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
    const [todoCategories, setTodoCategories] = useState<TodoCategory[]>([]);
    const [error, setError] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true)

    // Fetch todo data from the API
    const { result: todosData, success: isTodosLoading, error: todoError } = getAllTicketsData();
    useEffect(() => {
        if (todosData) {
            const categoriesTickets: any = {
                [AllStatus.NEW]: [],
                [AllStatus.PENDING]: [],
                [AllStatus.BOOKED]: [],
                [AllStatus.FORMED]: [],
                [AllStatus.CLOSED]: [],
            };

            todosData.result.forEach((ticket) => {
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



    // const moveTask = (_: any, sourceCategoryId: any, destinationCategoryId: any, sourceIndex: number, destinationIndex: number) => {

    //     setTodoCategories((prevCategories) => {
    //         // Find the source and destination categories
    //         const sourceCategoryIndex = prevCategories.findIndex(cat => cat.id.toString() === sourceCategoryId);
    //         const destinationCategoryIndex = prevCategories.findIndex(cat => cat.id.toString() === destinationCategoryId);

    //         if (sourceCategoryIndex === -1 || destinationCategoryIndex === -1) {
    //             return prevCategories; // Return previous state if categories are not found
    //         }
    //         // Clone the source and destination categories
    //         const updatedCategories = [...prevCategories];
    //         const sourceCategory = { ...updatedCategories[sourceCategoryIndex] };
    //         const destinationCategory = { ...updatedCategories[destinationCategoryIndex] };

    //         // Remove the task from the source category
    //         const taskToMove = sourceCategory.child.splice(sourceIndex, 1)[0];

    //         // Insert the task into the destination category at the specified index
    //         destinationCategory.child.splice(destinationIndex, 0, taskToMove);

    //         // Update the categories in the state
    //         updatedCategories[sourceCategoryIndex] = sourceCategory;
    //         updatedCategories[destinationCategoryIndex] = destinationCategory;

    //         return updatedCategories;
    //     });
    // };

    // const handleError = (errorMessage: string) => {
    //     setError(errorMessage);
    // };

    // const deleteCategory = async (categoryId: string) => {
    //     try {
    //         await mutate(deleteFetcher('/api/kanban/delete-category', { data: { categoryId } }), false)
    //     } catch (error: any) {
    //         handleError(error);
    //     }
    // };

    // const clearAllTasks = async (categoryId: string) => {
    //     try {
    //         await mutate(deleteFetcher('/api/TodoData/clearTasks', { data: { categoryId } }), false)
    //     } catch (error: any) {
    //         handleError(error);
    //     }
    // };

    // const addCategory = async (categoryName: string) => {
    //     try {
    //         const response = await mutate(postFetcher('/api/kanban/add-category', { categoryName }), false);
    //         setTodoCategories([...todoCategories, response.data]);
    //     } catch (error: any) {
    //         handleError(error);
    //     }
    // };

    // const deleteTodo = async (taskId: number) => {
    //     try {
    //         await mutate(deleteFetcher('/api/TodoData/deleteTask', { data: { taskId } }), false)
    //     } catch (error: any) {
    //         handleError(error);
    //     }
    // };

    return (
        <KanbanDataContext.Provider value={{ todoCategories, loading, error, setTodoCategories, setError }}>
            {children}
        </KanbanDataContext.Provider>
    );
};