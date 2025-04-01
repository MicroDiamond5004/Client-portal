import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import TicketListing from 'src/components/apps/tickets/TicketListing';
import TicketFilter from 'src/components/apps/tickets/TicketFilter';
import ChildCard from 'src/components/shared/ChildCard';
import { TicketProvider } from 'src/context/TicketContext';
import React, { use, useEffect, useState } from 'react';
import TaskManager from 'src/components/apps/kanban/TaskManager';
import { KanbanDataContextProvider } from 'src/context/kanbancontext';
import BlankCard from 'src/components/shared/BlankCard';
import { CardContent } from '@mui/material';
import { useSearchParams } from 'react-router';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';

const BCrumb = [
  {
    to: '/',
    title: 'Главная',
  },
  {
    title: 'Заказы',
  },
];



const TicketList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isList, setIsList] = useState(true);

  useEffect(() => {
    const type = searchParams.get('type')
      if (type && (type === 'kanban') && isList) {
        console.log('Обновил');
        setIsList(false);
      }
  }, [searchParams])

  const handleChangeView = (isList: boolean) => {
    if (isList === true) {
      setSearchParams({});
    } else {
      setSearchParams({type: 'kanban'});
    }
    setIsList(isList);
  }

  const KanbanList = () => {  
    return(
      <KanbanDataContextProvider>
        <PageContainer title="Заказы" description="this is Kanban App">
          <Breadcrumb title="Заказы" items={BCrumb} />
          <BlankCard>
            <CardContent>
              <TaskManager changeView={handleChangeView}/>
            </CardContent>
          </BlankCard>
        </PageContainer>
      </KanbanDataContextProvider>
    )
  }

  const TicketList = () => {
    return (
      <TicketProvider>
      <PageContainer title="Заказы" description="this is Note page">
          <Breadcrumb title="Заказы" items={BCrumb} />
          <ChildCard>
            <TicketFilter/>
            <TicketListing changeView={handleChangeView} />
          </ChildCard>
        </PageContainer>
      </TicketProvider>
    );
  }
  
  return(
    isList ? <TicketList/> : <KanbanList/>
  )  
};

export default TicketList;
