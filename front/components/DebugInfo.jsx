import React from 'react';

const DebugInfo = () => {
  return (
    <div style={{ 
      background: '#f8fafc', 
      padding: '8px 12px',
      margin: '8px 0',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <p>Current path: {window.location.pathname}</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};

export default DebugInfo;
