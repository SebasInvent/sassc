"use client";

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

export function AuthDebug() {
  const { user, token, loading } = useAuth();
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalStorageData({
        token: localStorage.getItem('authToken'),
        user: localStorage.getItem('authUser'),
      });
    }
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md text-xs font-mono z-50">
      <h3 className="font-bold mb-2 text-yellow-400">🔍 Auth Debug</h3>
      
      <div className="space-y-2">
        <div>
          <span className="text-gray-400">Loading:</span> 
          <span className={loading ? 'text-red-400' : 'text-green-400'}>
            {loading ? ' TRUE ❌' : ' FALSE ✅'}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">User:</span> 
          <span className={user ? 'text-green-400' : 'text-red-400'}>
            {user ? ' EXISTS ✅' : ' NULL ❌'}
          </span>
        </div>
        
        {user && (
          <div className="pl-4 text-green-300">
            <div>Name: {user.name}</div>
            <div>Role: {user.role}</div>
            <div>License: {user.license}</div>
          </div>
        )}
        
        <div>
          <span className="text-gray-400">Token:</span> 
          <span className={token ? 'text-green-400' : 'text-red-400'}>
            {token ? ' EXISTS ✅' : ' NULL ❌'}
          </span>
        </div>
        
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="text-gray-400">LocalStorage:</div>
          {localStorageData && (
            <div className="pl-4">
              <div>
                Token: {localStorageData.token ? 
                  <span className="text-green-400">✅</span> : 
                  <span className="text-red-400">❌</span>
                }
              </div>
              <div>
                User: {localStorageData.user ? 
                  <span className="text-green-400">✅</span> : 
                  <span className="text-red-400">❌</span>
                }
              </div>
              {localStorageData.user && (
                <div className="text-xs text-gray-400 mt-1 break-all">
                  {localStorageData.user.substring(0, 100)}...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={() => {
          localStorage.clear();
          window.location.href = '/login';
        }}
        className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
      >
        🔄 Clear & Logout
      </button>
    </div>
  );
}
