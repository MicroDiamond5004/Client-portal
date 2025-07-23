import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { SLiceNames } from '../names/names';
import { fetchUserOrders } from '../middleware/thunks/ordersThunks';
import { logoutAll } from '../middleware/thunks';
import { indexOf, isEqual } from 'lodash';
import { selectSearchTerm } from 'src/store/selectors/ticketsSelectors.ts';
import { TodoCategory } from 'src/types/apps/kanban.ts';
import { AllStatus, getStatus } from 'src/components/apps/tickets/TicketListing.tsx';

interface TicketState {
  tickets: ELMATicket[];
  searchTerm?: string;
  ticketsFilter?: string;
  startDate: string | null;  // добавляем дату начала (ISO)
  endDate: string | null;    // добавляем дату конца (ISO)
  prevTickets: ELMATicket[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  fullOrder: any;
  passporta: Record<string, [string | undefined, string | undefined]>;
  loading?: boolean;
  todoCategories?: TodoCategory[];
}

const initialState: TicketState = {
  tickets: [],
  prevTickets: [],
  status: 'loading',
  fullOrder: { result: { result: [], total: 0 }, success: false, error: '' },
  passporta: {},
  ticketsFilter: 'total_tickets',
  startDate: null,
  endDate: null,
};

const ticketsSlice = createSlice({
  name: SLiceNames.TICKETS,
  initialState,
  reducers: {
    updateTicketsFilter: (state, action: PayloadAction<string>) => {
      if (action.payload !== state.ticketsFilter) {
        state.ticketsFilter = action.payload;
      }
    },
    updateSearchTerms: (state, action: PayloadAction<string>) => {
      if (action.payload !== state.searchTerm) {
        state.searchTerm = action.payload;
      }
    },
    addNEwTicket(state, action) {

    },
    updateTicket(state, action: PayloadAction<ELMATicket>) {
      const ticketId = state.tickets?.findIndex((ticket) => ticket.__id === action.payload.__id);
      if (ticketId !== -1) {
        const updatedTickets = [
          ...state.tickets.slice(0, ticketId),
          action.payload,
          ...state.tickets.slice(ticketId + 1)
        ];

        state.prevTickets = [...state.tickets]; // сохраняем старые тикеты перед обновлением
        state.tickets = updatedTickets;         // применяем обновлённые
      }
    },
    updateDateFilter: (state, action: PayloadAction<{ startDate: string | null; endDate: string | null }>) => {
      state.startDate = action.payload.startDate;
      state.endDate = action.payload.endDate;
    },
    updateAllTickets(state, action: PayloadAction<any>) {
      console.log('ОБНОВИЛ');
      state.prevTickets = [...state.tickets]; // сохранить копию до изменений
      state.tickets = action.payload;
      state.fullOrder = {
        result: {
          result: action.payload,
          total: action.payload?.length,
        },
        success: true,
        error: ''
      };

      const todosData = action.payload;

      const categoriesTickets: any = {
        [AllStatus.NEW]: [],
        [AllStatus.PENDING]: [],
        [AllStatus.BOOKED]: [],
        [AllStatus.FORMED]: [],
        [AllStatus.CLOSED]: [],
      };

      todosData.forEach((ticket: ELMATicket) => {
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

      state.todoCategories = categories;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutAll.fulfilled, (state) => {
        state.tickets = [];
        state.prevTickets = [];
        state.passporta = {};
        state.fullOrder = {result: {result: [], total: 0}, success: false, error: ''}
      })
      .addCase(fetchUserOrders.pending, (state) => {
        // state.status = 'loading';
      })
      .addCase(fetchUserOrders.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
        if (!isEqual(state.passporta, action.payload.pasports)) {
          state.passporta = action.payload.passports;
        }

        if (!isEqual(action.payload.fetchedOrders.result.result, state.tickets)) {
          state.prevTickets = state.tickets;
          state.fullOrder = action.payload.fetchedOrders;
          state.tickets = action.payload.fetchedOrders.result.result

          const todosData = action.payload.fetchedOrders.result.result;

          const categoriesTickets: any = {
            [AllStatus.NEW]: [],
            [AllStatus.PENDING]: [],
            [AllStatus.BOOKED]: [],
            [AllStatus.FORMED]: [],
            [AllStatus.CLOSED]: [],
          };

          todosData.forEach((ticket: any) => {
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

          state.todoCategories = categories;
        }
      })
      .addCase(fetchUserOrders.rejected, (state) => {
        state.status = 'succeeded';
      })
  },
});

export const {addNEwTicket, updateDateFilter, updateTicket, updateTicketsFilter, updateSearchTerms, updateAllTickets} = ticketsSlice.actions;
export default ticketsSlice.reducer;

