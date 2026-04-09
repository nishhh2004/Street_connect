import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, UtensilsCrossed, Globe } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'hi', label: 'हिं', full: 'हिन्दी' },
  { code: 'kn', label: 'ಕ', full: 'ಕನ್ನಡ' },
];

function Navigation() {
  const { currentUser, logout } = useContext(AppContext);
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="absolute top-0 left-0 w-full z-50 p-4 md:p-6 font-heading pointer-events-none">
      <nav className={`max-w-7xl mx-auto ${location.pathname === '/login' ? 'bg-transparent' : 'glass shadow-lg'} rounded-3xl pointer-events-auto transition-all duration-300`}>
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center cursor-pointer group" onClick={() => { if(currentUser) navigate(`/${currentUser.role}`) }}>
            <div className="bg-gradient-primary p-2.5 rounded-2xl text-white shadow-lg group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <span className="ml-4 font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">{t('appName')}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <div className="flex items-center bg-white/50 backdrop-blur-md rounded-full border border-white/60 shadow-sm overflow-hidden">
              <Globe className="w-4 h-4 text-gray-400 ml-3" />
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-3 py-2 text-xs font-bold transition-all ${
                    language === lang.code
                      ? 'bg-orange-500 text-white shadow-inner'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={lang.full}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {currentUser ? (
              <>
               <span className="text-sm font-bold text-gray-700 hidden sm:block bg-white/50 border border-white/60 px-5 py-2.5 rounded-full shadow-sm backdrop-blur-md">
                 <span className="text-gray-400 font-medium mr-1.5">{t('hello')}</span>
                 {currentUser.name}
               </span>
               <button 
                  onClick={handleLogout}
                  className="flex items-center text-rose-500 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-pink-500 transition-all bg-rose-50/80 px-5 py-2.5 rounded-2xl font-bold shadow-sm border border-rose-100"
                >
                  <LogOut className="h-4 w-4 md:mr-2" />
                  <span className="text-sm hidden md:inline">{t('leavePortal')}</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </nav>
    </div>
  );
}

export default Navigation;
