import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import Navigation from './components/Navigation';

import CustomerView from './pages/CustomerView';
import VendorDashboard from './pages/VendorDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import LoginView from './pages/LoginView';

function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Navigation />
            <div className="flex-grow flex flex-col relative">
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginView />} />
                <Route path="/customer" element={<CustomerView />} />
                <Route path="/vendor" element={<VendorDashboard />} />
                <Route path="/delivery" element={<DeliveryDashboard />} />
              </Routes>
            </div>
          </div>
        </Router>
      </AppProvider>
    </LanguageProvider>
  );
}

export default App;
