type LoginPayload = {
    auth_login: string;
    password: string;
    remember: boolean;
  };
  
  export const loginAndFetchMessages = async () => {
    const loginUrl = "https://portal.dev.lead.aero/guard/login";
    const messagesUrl = "https://portal.dev.lead.aero/api/feed/targets/work_orders/OrdersNew/01961f9a-cb43-73eb-92c0-6eed1c235dd2/messages";
  
    const credentials: LoginPayload = {
      auth_login: "dev_9@lead.aero",
      password: "*cJ85gXS7Sfd",
      remember: false,
    };
  
    try {
      // 1. Получаем токен
      const loginResponse = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
  
      if (!loginResponse.ok) {
        throw new Error("Ошибка авторизации");
      }
  
      const loginData = await loginResponse.json();
      const token = loginData.token;
  
      // 2. Используем токен для запроса сообщений
      const messagesResponse = await fetch(messagesUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (messagesResponse.status === 401) {
        throw new Error("Неверный токен, доступ запрещён");
      }
  
      if (!messagesResponse.ok) {
        throw new Error(`Ошибка при получении сообщений: ${messagesResponse.status}`);
      }
  
      const messages = await messagesResponse.json();
      console.log("Сообщения:", messages);
      return messages;
  
    } catch (error) {
      console.error("Ошибка:", error);
      throw error;
    }
  };
  