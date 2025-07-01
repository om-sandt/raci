import React, { useState, useEffect } from 'react';
import raciService from '../src/services/raci.service';
import apiService from '../src/services/api';

const DebugInfo = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);

  const runDebugTests = async () => {
    setLoading(true);
    const info = {};

    try {
      // Test 1: Check current user info
      try {
        const userResponse = await apiService.get('/auth/me');
        info.currentUser = userResponse.data;
        info.userFetchSuccess = true;
      } catch (error) {
        info.userFetchError = error.message;
        info.userFetchSuccess = false;
        
        // Try alternative endpoint
        try {
          const altUserResponse = await apiService.get('/users/me');
          info.currentUserAlt = altUserResponse.data;
          info.userAltFetchSuccess = true;
        } catch (altError) {
          info.userAltFetchError = altError.message;
          info.userAltFetchSuccess = false;
        }
      }

      // Test 2: Check localStorage for approval data
      const approvalKeys = Object.keys(localStorage).filter(key => key.startsWith('raci_approval_'));
      info.localStorageApprovals = {};
      approvalKeys.forEach(key => {
        try {
          info.localStorageApprovals[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          info.localStorageApprovals[key] = `Parse error: ${e.message}`;
        }
      });

      // Test 3: Try to get pending approvals
      try {
        const pendingApprovals = await raciService.getPendingRACIApprovals();
        info.pendingApprovals = pendingApprovals;
        info.pendingApprovalsSuccess = true;
      } catch (error) {
        info.pendingApprovalsError = error.message;
        info.pendingApprovalsSuccess = false;
      }

      // Test 4: Check events endpoint
      try {
        const eventsResponse = await apiService.get('/events');
        info.eventsCount = eventsResponse.data?.length || 0;
        info.eventsWithApproval = eventsResponse.data?.filter(event => 
          event.approvalStatus === 'PENDING_APPROVAL'
        ) || [];
        info.eventsFetchSuccess = true;
      } catch (error) {
        info.eventsFetchError = error.message;
        info.eventsFetchSuccess = false;
      }

      // Test 5: Check RACI matrices endpoint
      try {
        const raciResponse = await apiService.get('/raci-matrices');
        info.raciMatricesCount = raciResponse.data?.length || 0;
        info.raciMatricesWithApproval = raciResponse.data?.filter(matrix => 
          matrix.status === 'PENDING_APPROVAL'
        ) || [];
        info.raciMatricesFetchSuccess = true;
      } catch (error) {
        info.raciMatricesFetchError = error.message;
        info.raciMatricesFetchSuccess = false;
      }

    } catch (error) {
      info.generalError = error.message;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  useEffect(() => {
    runDebugTests();
  }, []);

  const renderJson = (obj) => (
    <pre style={{ 
      background: '#f5f5f5', 
      padding: '10px', 
      borderRadius: '4px', 
      fontSize: '12px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      {JSON.stringify(obj, null, 2)}
    </pre>
  );

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      background: 'white', 
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '15px',
      maxWidth: '400px',
      maxHeight: '500px',
      overflow: 'auto',
      zIndex: 1000,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
        🐛 RACI Approval Debug Info
      </h4>
      
      <button 
        onClick={runDebugTests}
        disabled={loading}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '10px'
        }}
      >
        {loading ? 'Running Tests...' : 'Refresh Debug Info'}
      </button>

      <div style={{ fontSize: '12px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Current User:</strong> {debugInfo.userFetchSuccess ? '✅' : '❌'}
          {debugInfo.currentUser && renderJson(debugInfo.currentUser)}
          {debugInfo.userFetchError && <p style={{ color: 'red' }}>Error: {debugInfo.userFetchError}</p>}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Local Storage Approvals:</strong>
          {renderJson(debugInfo.localStorageApprovals)}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Pending Approvals API:</strong> {debugInfo.pendingApprovalsSuccess ? '✅' : '❌'}
          {debugInfo.pendingApprovals && renderJson(debugInfo.pendingApprovals)}
          {debugInfo.pendingApprovalsError && <p style={{ color: 'red' }}>Error: {debugInfo.pendingApprovalsError}</p>}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Events with Approval:</strong> {debugInfo.eventsFetchSuccess ? '✅' : '❌'}
          <p>Total Events: {debugInfo.eventsCount}</p>
          <p>Events Pending Approval: {debugInfo.eventsWithApproval?.length || 0}</p>
          {debugInfo.eventsWithApproval?.length > 0 && renderJson(debugInfo.eventsWithApproval)}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>RACI Matrices with Approval:</strong> {debugInfo.raciMatricesFetchSuccess ? '✅' : '❌'}
          <p>Total RACI Matrices: {debugInfo.raciMatricesCount}</p>
          <p>Matrices Pending Approval: {debugInfo.raciMatricesWithApproval?.length || 0}</p>
          {debugInfo.raciMatricesWithApproval?.length > 0 && renderJson(debugInfo.raciMatricesWithApproval)}
        </div>
      </div>
    </div>
  );
};

export default DebugInfo;
