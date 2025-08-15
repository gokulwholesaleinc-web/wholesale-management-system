import React, { useState } from 'react';

export function TestLogin() {
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'admin123' });
  const [result, setResult] = useState(null);

  const handleTestLogin = async () => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        sessionStorage.setItem('authToken', data.token);
        window.location.reload();
      }
    } catch (error) {
      setResult({ error: error.message });
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Test Login (Debug)</h3>
      <input
        value={credentials.username}
        onChange={(e) => setCredentials({...credentials, username: e.target.value})}
        placeholder="Username"
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
        placeholder="Password"
      />
      <button onClick={handleTestLogin}>Test Login</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}