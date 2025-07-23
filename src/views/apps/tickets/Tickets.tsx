import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import TicketListing from 'src/components/apps/tickets/TicketListing';
import TicketFilter from 'src/components/apps/tickets/TicketFilter';
import ChildCard from 'src/components/shared/ChildCard';
import { TicketProvider } from 'src/context/TicketContext';
import React, { useEffect, useState } from 'react';
import TaskManager from 'src/components/apps/kanban/TaskManager';
import { KanbanDataContextProvider } from 'src/context/kanbancontext';
import BlankCard from 'src/components/shared/BlankCard';
import { CardContent } from '@mui/material';
import { useSearchParams } from 'react-router';
import { ELMATicket } from 'src/mocks/tickets/ticket.type';
import { ChatProvider } from 'src/context/ChatContext';
import { Theme, useMediaQuery } from '@mui/system';

const BCrumb = [
  {
    title: 'Главная',
  },
];


const TicketList = () => {
  console.log('Все сломалось.')
  const [searchParams, setSearchParams] = useSearchParams();
  const [isList, setIsList] = useState(true)
  const isMobile = !useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));


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
        <PageContainer title="Заказы" description="Заказы">
          {!isMobile && <Breadcrumb title="Заказы" />}
          <BlankCard>
            <CardContent>
              <TaskManager changeView={handleChangeView}/>
            </CardContent>
          </BlankCard>
        </PageContainer>
    )
  }

  const TicketList = () =>
  {
    return (
      <PageContainer title="Заказы" description="Заказы">
        {!isMobile &&<Breadcrumb title="Заказы" />}
          <ChildCard>
            <TicketFilter/>
            <TicketListing changeView={handleChangeView} />
          </ChildCard>
        </PageContainer>
    );
  }
  
  return(
    isList ? <TicketList/> : <KanbanList/>
  )  
};

export default TicketList;
