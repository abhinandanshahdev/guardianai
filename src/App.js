import React, { useState, useLayoutEffect, useRef } from 'react';
import './App.css';
import chatIcon from './assets/images/logo.png';

function App() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) {
            console.log('No message to send');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: newMessage }),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let receivedMessage = '';

            setMessages(prevMessages => [...prevMessages, { text: newMessage, sent: true }]);
            setNewMessage('');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                receivedMessage += chunk;
                setMessages(prevMessages => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage && !lastMessage.sent) {
                        return prevMessages.map((msg, index) =>
                            index === prevMessages.length - 1 ? { ...msg, text: receivedMessage } : msg
                        );
                    } else {
                        return [...prevMessages, { text: receivedMessage, sent: false }];
                    }
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prevMessages => [...prevMessages, { text: "Sorry, I can't respond at the moment.", sent: false }]);
        }
    };

    useLayoutEffect(() => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }, 100);
    }, [messages.length]);

    return (
        <div className="App">
            <header className="App-header">
                <img src={chatIcon} alt="Chat Icon" className="App-logo" />
            </header>
            <div className="message-container">
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.sent ? 'sent' : 'received'}`}>
                        {message.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
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
                <button className="sendButton" onClick={handleSendMessage}>Send</button>
            </div>
        </div>
    );
}

export default App;