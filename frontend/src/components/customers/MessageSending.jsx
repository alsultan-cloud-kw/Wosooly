import React, { useState } from 'react';
import axios from 'axios';

function MessageSending() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  const sendMessages = async () => {
    setLoading(true);
    setStatus('Sending messages...');

    try {
      const res = await axios.post('/api/send-messages'); // this calls your backend
      setStatus(res.data.message || 'Messages sent!');
    } catch (err) {
      setStatus('Failed to send messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Send WhatsApp Messages</h2>
      <button
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        onClick={sendMessages}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Messages'}
      </button>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}

export default MessageSending;
