export const getElmaMessages = async (id: string) => {
    try {
      const response = await fetch(`http://${window.location.host}:3001/api/proxy/543e820c-e836-45f0-b177-057a584463b7/${id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
  
      const data = await response.json();
      console.log(data);
      return data;

    } catch (error) {
      console.error('Error:', error);
      return null;
    }
};

export const sendElmaMessage = async (id: string, text: string, orderNumber: string, files: null = null) => {
    try {
      const response = await fetch(`http://${window.location.host}:3001/api/proxy/send/${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: '543e820c-e836-45f0-b177-057a584463b7',
            orderNumber,
            body: `<p>${text}</p>`,
            mentionIds: [],
            files: []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
  
      const data = await response.json();
      console.log(data);
      return data;

    } catch (error) {
      console.error('Error:', error);
      return null;
    }
};
