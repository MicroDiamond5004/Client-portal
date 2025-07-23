import { Box } from "@mui/system";
import ChatContent from "../../chats/ChatContent";
import { Avatar, Divider, ListItemAvatar, Typography } from "@mui/material";
import ChatMsgSent from "../../chats/ChatMsgSent";
import { IconMenu2 } from "@tabler/icons-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ChatMessage, ChatsType } from "src/types/apps/chat";
import SimpleBar from "simplebar-react";
import { useContext, useEffect, useRef, useState } from "react";
import { stripHtmlAndDecode } from "../../chats/ChatListing";
import { flatMap, isEqual } from 'lodash';
import api from 'src/store/api.ts';
import { fetchMessages } from 'src/store/middleware/thunks/messageThunks.ts';
import { useAppDispatch, useAppSelector } from 'src/store/hooks.ts';
import { selectClientId } from 'src/store/selectors/authSelector.ts';
import { selectChatData } from 'src/store/selectors/messagesSelectors.ts';
import { updateSelectedChat } from 'src/store/slices/messageSlice.ts';

function MiniChat({selectedChat}: any) {
    const mainBoxRef = useRef<HTMLElement>(null);
    const inBoxRef = useRef<HTMLElement>(null);

    const dispatch = useAppDispatch();

    const chatData = useAppSelector(selectChatData)
    const setSelectedChat = (value: any) => dispatch(updateSelectedChat(value));
    const [replyToMsg, setReplyToMsg] = useState<ChatMessage | null>(null);

    const clientId = useAppSelector(selectClientId)

    // const {selectedChat: currentChat, setSelectedChat} = useContext(ChatContext);

    // console.log(chatData);

  useEffect(() => {

    let isChanged = false;

    const preparedChat = chatData.find((el) => el.name === selectedChat.name);


      setSelectedChat({
        name: selectedChat.name,
        id: selectedChat.name,
        taskId: selectedChat.taskId,
        isChanged,
        messages: preparedChat.messages,
        files: preparedChat.files,
      } as any);

  }, []);


    return (
    <Box flexGrow={1} border={'1px solid #e5eaef'}>
    <SimpleBar sx={{overflowX: 'hidden'}}>
      <Box sx={{display: 'flex', flexWrap: 'wrap', overflowX: 'hidden' }}>
        {selectedChat ? (
          <Box width={'100%'} sx={{overflow: 'hidden'}}>
            {/* ------------------------------------------- */}
            {/* Chat Content */}
            {/* ------------------------------------------- */}

            <Box sx={{display: 'flex', width: 'auto', overflow: 'hidden'}} ref={mainBoxRef}>
              {/* ------------------------------------------- */}
              {/* Chat msges */}
              {/* ------------------------------------------- */}

              <Box>
                <Box
                  sx={{
                    overflowX: 'hidden', // скрываем горизонтальную прокрутку
                    height: "auto",
                    maxHeight: `60vh`,
                    width: mainBoxRef && inBoxRef && ((mainBoxRef.current?.clientWidth || 0) - (inBoxRef.current?.clientWidth || 0)) > 300 ?
                      `${((mainBoxRef.current?.clientWidth || 0) - (inBoxRef.current?.clientWidth || 0))}px` : '300px',
                  }}
                >
                <ChatContent onReply={(message: ChatMessage) => setReplyToMsg(message)} replyToMsg={replyToMsg} cancelReply={() => setReplyToMsg(null)} needSidebar={false} />
                </Box>
              </Box>

              {/* ------------------------------------------- */}
              {/* Chat right sidebar Content */}
              {/* ------------------------------------------- */}
            </Box>
          </Box>
        ) : (<></>)}
      </Box>
    </SimpleBar>
      <Divider />
      <ChatMsgSent
        currentChat={selectedChat}
        updateChat={(chat) => setSelectedChat(chat)}
        replyToMsg={replyToMsg} 
        cancelReply={() => setReplyToMsg(null)}
      />
    </Box>
    )
}

export default MiniChat;