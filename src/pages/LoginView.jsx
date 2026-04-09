import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../context/LanguageContext';
import { Mail, Lock, User, Phone, ArrowRight, Sparkles, AlertCircle, CheckCircle, X, KeyRound } from 'lucide-react';

function LoginView() {
  const { login, signup, forgotPassword, currentUser } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'customer') navigate('/customer');
      if (currentUser.role === 'vendor') navigate('/vendor');
      if (currentUser.role === 'delivery') navigate('/delivery');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill all fields to continue.');
        setLoading(false);
        return;
      }

      if (!isLogin) {
        // Signup validation
        if (!name || !phone) {
          setError('Name and phone number are required to register.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          setError('Password must be at least 4 characters.');
          setLoading(false);
          return;
        }

        // Domain check
        if (!email.includes('@user') && !email.includes('@admin') && !email.includes('@rider')) {
          setError('Email must contain @user, @admin, or @rider domain.');
          setLoading(false);
          return;
        }

        await signup({ name, phone, email, password });
      } else {
        // Login
        if (!email.includes('@user') && !email.includes('@admin') && !email.includes('@rider')) {
          setError('Email must contain @user, @admin, or @rider domain.');
          setLoading(false);
          return;
        }
        await login({ email, password });
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      if (!forgotEmail) {
        setForgotError('Please enter your email.');
        setForgotLoading(false);
        return;
      }
      const msg = await forgotPassword(forgotEmail);
      setForgotMessage(msg);
    } catch (err) {
      setForgotError(err.message);
    }
    setForgotLoading(false);
  };

  return (
    <div className="absolute inset-0 bg-mesh flex items-center justify-center p-4 overflow-hidden z-0">
      <div className="max-w-6xl w-full z-10 flex flex-col md:flex-row items-center gap-12 lg:gap-24 relative mt-10 md:mt-0">
        
        {/* Left Side: Branding */}
        <div className="md:w-1/2 text-center md:text-left relative z-10 animate-in slide-in-from-left-8 fade-in duration-700">
          <div className="inline-flex items-center justify-center md:justify-start px-4 py-2 bg-white/40 backdrop-blur-md rounded-full mb-6 shadow-sm border border-white/50 transition-transform hover:scale-105">
             <Sparkles className="w-5 h-5 text-orange-500 mr-2" />
             <span className="font-bold text-gray-800 tracking-wider text-xs md:text-sm">StreetConnect 4.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[1.1] drop-shadow-sm font-heading">
            Connect to <br/>
            <span className="text-gradient">Local Flavors</span>
          </h1>
          <p className="mt-6 text-lg text-gray-700 max-w-md mx-auto md:mx-0 font-medium leading-relaxed font-sans">
            Join the community. Experience local street food, manage your restaurant, or deliver smiles.
          </p>
          
          <div className="mt-8 p-4 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm max-w-sm text-sm font-medium text-gray-600">
            <p className="font-bold text-gray-900 mb-2">Role-Based Access Domains:</p>
            <ul className="space-y-1">
              <li><span className="text-orange-500 font-bold">@user</span> - Customer (e.g. john@user)</li>
              <li><span className="text-rose-500 font-bold">@admin</span> - Vendor/Restaurant (e.g. hotel@admin)</li>
              <li><span className="text-pink-500 font-bold">@rider</span> - Delivery Partner (e.g. speedy@rider)</li>
            </ul>
          </div>
        </div>
        
        {/* Right Side: Auth Form */}
        <div className="md:w-1/2 w-full max-w-md animate-in slide-in-from-right-8 fade-in duration-700 relative z-10">
          <div className="glass-card rounded-[2rem] p-8 md:p-10 relative overflow-hidden">
            <h2 className="text-3xl font-black text-gray-900 font-heading tracking-tight mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-500 mb-8 font-medium">
              {isLogin ? 'Sign in to access your portal.' : 'Join the fastest growing local food network.'}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50/80 border border-red-200 text-red-600 font-medium rounded-xl flex items-center text-sm">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {!isLogin && (
                <>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-white/50 border border-white focus:border-orange-300 focus:ring-2 focus:ring-orange-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel" 
                      placeholder="Phone Number" 
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full bg-white/50 border border-white focus:border-orange-300 focus:ring-2 focus:ring-orange-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium outline-none transition-all shadow-sm"
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Email (@user, @admin, @rider)" 
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/50 border border-white focus:border-orange-300 focus:ring-2 focus:ring-orange-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium outline-none transition-all shadow-sm"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/50 border border-white focus:border-orange-300 focus:ring-2 focus:ring-orange-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium outline-none transition-all shadow-sm"
                />
              </div>

              {!isLogin && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    placeholder="Confirm Password" 
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/50 border border-white focus:border-orange-300 focus:ring-2 focus:ring-orange-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium outline-none transition-all shadow-sm"
                  />
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors">
                    Forgot Password?
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4 bg-gradient-primary py-4 rounded-xl font-bold flex justify-center items-center group transition-all disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'} 
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-gray-200/50 pt-6">
              <p className="text-gray-500 font-medium text-sm">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                  className="text-orange-600 font-bold hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-400/20 rounded-full blur-[100px] pointer-events-none transform translate-x-1/4 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-pink-400/20 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/4 translate-y-1/4" />

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-6 flex justify-between items-center text-white">
              <div className="flex items-center space-x-3">
                <KeyRound className="w-6 h-6" />
                <h2 className="text-xl font-black font-heading">Reset Password</h2>
              </div>
              <button onClick={() => setShowForgotPassword(false)} className="p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              {forgotMessage ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-gray-700 font-medium">{forgotMessage}</p>
                  <button onClick={() => { setShowForgotPassword(false); setForgotMessage(''); setForgotEmail(''); }} className="mt-6 px-6 py-2 bg-gray-100 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium">Enter your registered email and we'll send you a password reset link.</p>
                  
                  {forgotError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 font-medium rounded-xl text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {forgotError}
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Enter your email" 
                      value={forgotEmail} 
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-800 font-medium outline-none transition-all"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={forgotLoading}
                    className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginView;
