// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useState } from 'react';
import Menuitems from './MenuItems';
import { useLocation, useSearchParams } from 'react-router';
import { Box, List, useMediaQuery } from '@mui/material';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';

import { CustomizerContext } from 'src/context/CustomizerContext';
import { uniqueId } from 'lodash';
import { IconPlus } from '@tabler/icons-react';
import ModalTicket from 'src/components/apps/tickets/modal-ticket/modal-ticket';
import { useAppSelector } from 'src/store/hooks';
import { selectUnreadedChats } from 'src/store/selectors/messagesSelectors';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const { isSidebarHover, isCollapse, isMobileSidebar, setIsMobileSidebar } = useContext(CustomizerContext);
  const [open, setIsOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const unreadedChats = useAppSelector(selectUnreadedChats);

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? isCollapse == "mini-sidebar" && !isSidebarHover : '';

  const href = searchParams.get('type') ? '/apps/orders?type=kanban&add=new' : '/apps/orders?add=new';

  const addItem =  {
    id: uniqueId(),
    title: 'Добавить новый заказ',
    icon: IconPlus,
    href,
  };
  
  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {Menuitems.map((item) => {
          // {/********SubHeader**********/}
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;

            // {/********If Sub Menu**********/}
            /* eslint no-else-return: "off" */
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}

              />
            );

            // {/********If Sub No Menu**********/}
          } else {
            return (
              <NavItem item={item} key={item.id} pathDirect={pathDirect} hideMenu={hideMenu}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)} unreadCount={item.id === '2' ? unreadedChats : 0} />
            );
          }
        })}
          <NavItem item={addItem} key={addItem.id} pathDirect={'/er'} hideMenu={hideMenu}
            onClick={() => setIsMobileSidebar(!isMobileSidebar)} />
      </List>
    </Box>
  );
};
export default SidebarItems;
