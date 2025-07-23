import { RootState } from "..";

export const selectTickets = (state: RootState) => state.tickets.tickets;

export const selectPrevTickets = (state: RootState) => state.tickets.prevTickets;
export const selectTicketsStatus = (state: RootState) => state.tickets.status;
export const selectOrder = (state: RootState) => state.tickets.fullOrder;
export const selectPassports = (state: RootState) => state.tickets.passporta;
export const selectSearchTerm = (state: RootState) => state.tickets.searchTerm;
export const selectTicketsFilter = (state: RootState) => state.tickets.ticketsFilter;
export const selectTodoCategories = (state: RootState) => state.tickets.todoCategories;
export const selectDateFilter = (state: RootState) => ({
  startDate: state.tickets.startDate,
  endDate: state.tickets.endDate,
});
export const selectTicketStatus = (state: RootState) => state.tickets.status;
