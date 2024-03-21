import React, { useState, useLayoutEffect, useRef } from 'react';
import './App.css';
import chatIcon from './assets/images/logo.png';
import { msalInstance } from './msalConfig';

function App() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [attachedFile, setAttachedFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const messagesEndRef = useRef(null);

  const handleFileChange = (e) => {
      setAttachedFile(e.target.files[0]);
  };

  const uploadFile = async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload/Important%20Documents', {
          method: 'POST',
          headers: {
              // 'Content-Type': 'multipart/form-data' will be set automatically
              'Authorization': `Bearer ${accessToken}`,
          },
          body: formData
      });

      return response.json();
  };


  useLayoutEffect(() => {
    setTimeout(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, 100); // Adjust the delay as needed
}, [messages.length]);

  
    const login = async () => {
        try {
            const loginResponse = await msalInstance.loginPopup({
                scopes: ["Files.Read", "Files.ReadWrite"]
            });
            if (loginResponse) {
                setAccessToken(loginResponse.accessToken);
                console.log("Access Token:", loginResponse.accessToken); // Debugging
            }
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const handleSendMessage = async () => {

      if (!newMessage.trim() && !attachedFile) {
          console.log('No message or file to send');
          return;
      }

      if (attachedFile) {
        try {
            const uploadResponse = await uploadFile(attachedFile);
            console.log('Upload response:', uploadResponse);

            // Extract folder path from the response
            const folderPath = uploadResponse[1];

            // Add a success message to the chat including the folder path
            const successMessage = `File "${attachedFile.name}" uploaded successfully to folder "${folderPath}".`;
            setMessages(prevMessages => [...prevMessages, { text: successMessage, sent: true }]);
            // Reset the file input
            setFileInputKey(prevKey => prevKey + 1);
            setAttachedFile(null);

        } catch (error) {
            console.error('Upload failed:', error);

            // Add an error message to the chat
            const errorMessage = `Failed to upload file "${attachedFile.name}".`;
            setMessages(prevMessages => [...prevMessages, { text: errorMessage, sent: true }]);
        }
    }

        if (newMessage.trim()) {
            setMessages(prevMessages => [...prevMessages, { text: newMessage, sent: true }]);
            setNewMessage('');

            const lambdaResponse = await sendMessageToLambda(newMessage);
            setMessages(prevMessages => [...prevMessages, { text: lambdaResponse, sent: false }]);
        }
        // Reset the file input
      setAttachedFile(null);
    };

    const sendMessageToLambda = async (message) => {
      try {
          const url = `http://localhost:8000/search/${encodeURIComponent(message)}`;
          const response = await fetch(url, {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
              },
          });
  
          const data = await response.json();
          console.log('API response:', data)

          const curatedResponse = createCuratedResp(data);
          console.log(curatedResponse);
          return data;


      } catch (error) {
          console.error('Error sending message to chat endpoint:', error);
          return "Sorry, I can't respond at the moment.";
      }
  };

  const parseMessageContent = (messageContent) => {
    // A regular expression to match URLs
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
 
    if (typeof messageContent === 'string') {
      // Find all URLs using the pattern and convert them into anchor tags with the text "Download"
      const newContent = messageContent.replace(urlPattern, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">Download</a>`;
      });
  
      // Since React does not render strings with HTML tags directly for security reasons,
      // we need to parse the HTML string into JSX. We can use the 'dangerouslySetInnerHTML' attribute for this.
      return <div dangerouslySetInnerHTML={{ __html: newContent }} />;
    }
  
    // If the message is not a string (i.e., it's an object with a 'text' property), return the 'text' property
    return messageContent.text;
  };
  
  
  function createCuratedResp(apiResponse) {
    if (!apiResponse.value || !Array.isArray(apiResponse.value)) {
        return "Error: "+ apiResponse.detail;
    }

    // Create curated response from the api response from LLM - TODO
    return apiResponse.value
}
return (
  <div className="App">
      <header className="App-header">
          <img src={chatIcon} alt="Chat Icon" className="App-logo" />
      </header>
      <button onClick={login}>Login to OneDrive</button>
      <div className="message-container">
      {messages.map((message, index) => {
        // Parse the message content to handle URLs
        const messageElement = parseMessageContent(message.text || message);

        return (
          <div key={index} className={`message ${message.sent ? 'sent' : 'received'}`}>
            {messageElement}
          </div>
        );
      })}
      <div ref={messagesEndRef} /> {/* Empty div for scrolling reference */}
  </div>

      <div className="inputContainer">
          <input
              className="textInput"
              type="text"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <input
              type="file"
              key={fileInputKey}
              onChange={handleFileChange}
          />
          <button className="sendButton" onClick={handleSendMessage}>Send</button>
      </div>
  </div>
);
}



export default App;
