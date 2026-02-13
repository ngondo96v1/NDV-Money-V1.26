
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, User, UserRank, LoanRecord } from './types.ts';
import Login from './components/Login.tsx';
import Register from './components/Register.tsx';
import Dashboard from './components/Dashboard.tsx';
import LoanApplication from './components/LoanApplication.tsx';
import RankLimits from './components/RankLimits.tsx';
import Profile from './components/Profile.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import AdminUserManagement from './components/AdminUserManagement.tsx';
import AdminBudget from './components/AdminBudget.tsx';
import { User as UserIcon, Home, Briefcase, Medal, LayoutGrid, Users, Wallet, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: any): ErrorBoundaryState { 
    return { hasError: true }; 
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={48} className="text-[#ff8c00] mb-4" />
          <h2 className="text-xl font-black uppercase mb-2 text-white">Hệ thống đang bảo trì</h2>
          <p className="text-xs text-gray-500 mb-6 uppercase">Đã xảy ra lỗi khởi tạo. Vui lòng tải lại trang.</p>
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-[#ff8c00] text-black font-black rounded-full text-[10px] uppercase tracking-widest">Tải lại trang</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const compressImage = (base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [systemBudget, setSystemBudget] = useState<number>(30000000); 
  const [rankProfit, setRankProfit] = useState<number>(0); 
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initData = () => {
      try {
        const savedUser = localStorage.getItem('vnv_user');
        const savedLoans = localStorage.getItem('vnv_loans');
        const savedAllUsers = localStorage.getItem('vnv_registered_users');
        const savedBudget = localStorage.getItem('vnv_budget');
        const savedRankProfit = localStorage.getItem('vnv_rank_profit');
        
        if (savedAllUsers) setRegisteredUsers(JSON.parse(savedAllUsers));
        if (savedLoans) setLoans(JSON.parse(savedLoans));
        if (savedBudget) setSystemBudget(Number(savedBudget));
        if (savedRankProfit) setRankProfit(Number(savedRankProfit));
        
        if (savedUser && savedUser !== 'null' && savedUser !== '') {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser && parsedUser.id) {
            setUser(parsedUser);
            setCurrentView(parsedUser.isAdmin ? AppView.ADMIN_DASHBOARD : AppView.DASHBOARD);
          }
        }
      } catch (e) {
        console.warn("Dữ liệu LocalStorage trống.");
      } finally {
        setIsInitialized(true);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const persist = () => {
      localStorage.setItem('vnv_user', user ? JSON.stringify(user) : '');
      localStorage.setItem('vnv_loans', JSON.stringify(loans));
      localStorage.setItem('vnv_registered_users', JSON.stringify(registeredUsers));
      localStorage.setItem('vnv_budget', systemBudget.toString());
      localStorage.setItem('vnv_rank_profit', rankProfit.toString());
    };
    const timer = setTimeout(persist, 1000);
    return () => clearTimeout(timer);
  }, [user, loans, registeredUsers, systemBudget, rankProfit, isInitialized]);

  const handleLogin = (phone: string, password?: string) => {
    setLoginError(null);
    const isAdmin = (phone === '0877203996' && password === '119011');
    if (isAdmin) {
      const adminUser: User = {
        id: 'AD01', phone: '0877203996', fullName: 'QUẢN TRỊ VIÊN', idNumber: 'SYSTEM_ADMIN',
        balance: 500000000, totalLimit: 500000000, rank: 'diamond', rankProgress: 10,
        isLoggedIn: true, isAdmin: true
      };
      setUser(adminUser);
      setCurrentView(AppView.ADMIN_DASHBOARD);
      return;
    }
    const existingUser = registeredUsers.find(u => u.phone === phone);
    if (existingUser) {
      const loggedInUser = { ...existingUser, isLoggedIn: true };
      setUser(loggedInUser);
      setCurrentView(AppView.DASHBOARD);
    } else {
      setLoginError("Thông tin đăng nhập không chính xác.");
    }
  };

  const handleRegister = async (userData: Partial<User>) => {
    const newUser: User = {
      id: Math.floor(1000 + Math.random() * 9000).toString(), 
      phone: userData.phone || '', fullName: userData.fullName || '',
      idNumber: userData.idNumber || '', address: userData.address || '',
      balance: 2000000, totalLimit: 2000000, rank: 'standard', rankProgress: 0,
      isLoggedIn: true, isAdmin: false,
      joinDate: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      idFront: userData.idFront, idBack: userData.idBack, refZalo: userData.refZalo, relationship: userData.relationship
    };
    setRegisteredUsers(prev => [...prev, newUser]);
    setUser(newUser);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(AppView.LOGIN);
  };

  const handleApplyLoan = (amount: number, signature?: string) => {
    if (!user) return;
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('vi-VN');
    
    // Logic tạo Mã hợp đồng mới: NDV-ID
    const userLoansCount = loans.filter(l => l.userId === user.id).length;
    const contractId = userLoansCount === 0 ? `NDV-${user.id}` : `NDV-${user.id}-${userLoansCount + 1}`;

    const newLoan: LoanRecord = {
      id: contractId,
      userId: user.id, 
      userName: user.fullName, 
      amount: amount,
      date: dueDate, 
      createdAt: now.toLocaleTimeString('vi-VN') + ' ' + now.toLocaleDateString('vi-VN'), 
      status: 'CHỜ DUYỆT', 
      signature: signature
    };
    
    setLoans(prev => [newLoan, ...prev]);
    const updatedUser = { ...user, balance: user.balance - amount };
    setUser(updatedUser);
    setRegisteredUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
  };

  const handleUpgradeRank = (targetRank: UserRank, bill: string) => {
    if (!user) return;
    const updatedUser = { ...user, pendingUpgradeRank: targetRank, rankUpgradeBill: bill };
    setUser(updatedUser);
    setRegisteredUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
  };

  const handleSettleLoan = (loanId: string, bill: string) => {
    setLoans(prev => prev.map(loan => {
      if (loan.id === loanId) return { ...loan, status: 'CHỜ TẤT TOÁN', billImage: bill };
      return loan;
    }));
  };

  const handleAdminLoanAction = (loanId: string, action: 'APPROVE' | 'DISBURSE' | 'SETTLE' | 'REJECT') => {
    const targetLoan = loans.find(l => l.id === loanId);
    if (!targetLoan) return;
    if (action === 'DISBURSE') setSystemBudget(prev => prev - (targetLoan.amount * 0.85));
    else if (action === 'SETTLE') setSystemBudget(prev => prev + (targetLoan.amount * 0.85));

    setLoans(prev => prev.map(loan => {
      if (loan.id === loanId) {
        let newStatus = loan.status;
        switch(action) {
          case 'APPROVE': newStatus = 'ĐÃ DUYỆT'; break;
          case 'DISBURSE': newStatus = 'ĐANG NỢ'; break;
          case 'SETTLE': newStatus = 'ĐÃ TẤT TOÁN'; break;
          case 'REJECT': newStatus = 'BỊ TỪ CHỐI'; break;
        }
        if (action === 'SETTLE') {
          const loanUser = registeredUsers.find(u => u.id === loan.userId);
          if (loanUser) {
             const updatedUser = { ...loanUser, balance: Math.min(loanUser.totalLimit, loanUser.balance + loan.amount), rankProgress: Math.min(10, loanUser.rankProgress + 1) };
             setRegisteredUsers(users => users.map(u => u.id === loan.userId ? updatedUser : u));
             if (user?.id === loan.userId) setUser(updatedUser);
          }
        }
        return { ...loan, status: newStatus as any };
      }
      return loan;
    }));
  };

  const handleAdminUserAction = (userId: string, action: 'APPROVE_RANK' | 'REJECT_RANK') => {
    setRegisteredUsers(prev => prev.map(u => {
      if (u.id === userId) {
        if (action === 'APPROVE_RANK') {
          const newRank = u.pendingUpgradeRank || u.rank;
          let newLimit = u.totalLimit;
          if (newRank === 'bronze') newLimit = 3000000;
          else if (newRank === 'silver') newLimit = 4000000;
          else if (newRank === 'gold') newLimit = 5000000;
          else if (newRank === 'diamond') newLimit = 10000000;
          setRankProfit(prev => prev + (newLimit * 0.05));
          const updated = { ...u, rank: newRank, totalLimit: newLimit, balance: newLimit - (u.totalLimit - u.balance), pendingUpgradeRank: null, rankUpgradeBill: undefined };
          if (user?.id === userId) setUser(updated);
          return updated;
        }
        return { ...u, pendingUpgradeRank: null, rankUpgradeBill: undefined };
      }
      return u;
    }));
  };

  const handleDeleteUser = (userId: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== userId));
    setLoans(prev => prev.filter(l => l.userId !== userId));
  };

  const handleAutoCleanupUsers = () => {
    const today = new Date();
    const usersToDelete = registeredUsers.filter(u => {
      if (u.isAdmin) return false;
      const userLoans = loans.filter(l => l.userId === u.id);
      if (userLoans.length === 0) return false;
      const settled = userLoans.filter(l => l.status === 'ĐÃ TẤT TOÁN');
      if (settled.length === 0) return false;
      return true; 
    });
    setRegisteredUsers(prev => prev.filter(u => !usersToDelete.some(td => td.id === u.id)));
    return usersToDelete.length;
  };

  const adminNotificationCount = useMemo(() => 
    loans.filter(l => l.status === 'CHỜ DUYỆT' || l.status === 'CHỜ TẤT TOÁN').length +
    registeredUsers.filter(u => u.pendingUpgradeRank).length
  , [loans, registeredUsers]);

  const renderView = () => {
    switch (currentView) {
      case AppView.LOGIN: return <Login onLogin={handleLogin} onNavigateRegister={() => setCurrentView(AppView.REGISTER)} error={loginError} />;
      case AppView.REGISTER: return <Register onBack={() => setCurrentView(AppView.LOGIN)} onRegister={handleRegister} />;
      case AppView.DASHBOARD: return <Dashboard user={user} loans={loans} systemBudget={systemBudget} onApply={() => setCurrentView(AppView.APPLY_LOAN)} onLogout={handleLogout} onViewAllLoans={() => setCurrentView(AppView.APPLY_LOAN)} />;
      case AppView.APPLY_LOAN: return <LoanApplication user={user} loans={loans} systemBudget={systemBudget} onApplyLoan={handleApplyLoan} onSettleLoan={handleSettleLoan} onBack={() => setCurrentView(AppView.DASHBOARD)} />;
      case AppView.RANK_LIMITS: return <RankLimits user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} onUpgrade={handleUpgradeRank} />;
      case AppView.PROFILE: return <Profile user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} onLogout={handleLogout} />;
      case AppView.ADMIN_DASHBOARD: return <AdminDashboard user={user} loans={loans} registeredUsersCount={registeredUsers.length} systemBudget={systemBudget} rankProfit={rankProfit} onLogout={handleLogout} />;
      case AppView.ADMIN_USERS: return <AdminUserManagement users={registeredUsers} loans={loans} onAction={handleAdminUserAction} onLoanAction={handleAdminLoanAction} onDeleteUser={handleDeleteUser} onAutoCleanup={handleAutoCleanupUsers} onBack={() => setCurrentView(AppView.ADMIN_DASHBOARD)} />;
      case AppView.ADMIN_BUDGET: return <AdminBudget currentBudget={systemBudget} onUpdate={(val) => setSystemBudget(val)} onBack={() => setCurrentView(AppView.ADMIN_DASHBOARD)} />;
      default: return <Dashboard user={user} loans={loans} systemBudget={systemBudget} onApply={() => setCurrentView(AppView.APPLY_LOAN)} onLogout={handleLogout} onViewAllLoans={() => setCurrentView(AppView.APPLY_LOAN)} />;
    }
  };

  const showNavbar = user && currentView !== AppView.LOGIN && currentView !== AppView.REGISTER;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white flex flex-col max-w-md mx-auto relative overflow-hidden">
        <div className="flex-1 overflow-y-auto scroll-smooth">{renderView()}</div>
        {showNavbar && (
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#111111]/95 backdrop-blur-xl border-t border-white/10 px-4 py-4 flex justify-between items-center z-[50] safe-area-bottom">
            {user?.isAdmin ? (
              <>
                <button onClick={() => setCurrentView(AppView.ADMIN_DASHBOARD)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.ADMIN_DASHBOARD ? 'text-[#ff8c00]' : 'text-gray-500'}`}><LayoutGrid size={22} /><span className="text-[7px] font-black uppercase tracking-widest">Tổng quan</span></button>
                <button onClick={() => setCurrentView(AppView.ADMIN_USERS)} className={`flex flex-col items-center gap-1 flex-1 relative ${currentView === AppView.ADMIN_USERS ? 'text-[#ff8c00]' : 'text-gray-500'}`}>
                  <div className="relative"><Users size={22} />{adminNotificationCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border-2 border-[#111111] animate-bounce"><span className="text-[7px] font-black text-white">{adminNotificationCount}</span></div>}</div>
                  <span className="text-[7px] font-black uppercase tracking-widest">Người dùng</span>
                </button>
                <button onClick={() => setCurrentView(AppView.ADMIN_BUDGET)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.ADMIN_BUDGET ? 'text-[#ff8c00]' : 'text-gray-500'}`}><Wallet size={22} /><span className="text-[7px] font-black uppercase tracking-widest">Ngân sách</span></button>
              </>
            ) : (
              <>
                <button onClick={() => setCurrentView(AppView.DASHBOARD)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.DASHBOARD ? 'text-[#ff8c00]' : 'text-gray-500'}`}><Home size={22} /><span className="text-[7px] font-black uppercase tracking-widest">Trang chủ</span></button>
                <button onClick={() => setCurrentView(AppView.APPLY_LOAN)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.APPLY_LOAN ? 'text-[#ff8c00]' : 'text-gray-500'}`}><Briefcase size={22} /><span className="text-[7px] font-black uppercase tracking-widest">Vay vốn</span></button>
                <button onClick={() => setCurrentView(AppView.RANK_LIMITS)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.RANK_LIMITS ? 'text-[#ff8c00]' : 'text-gray-500'}`}><Medal size={22} /><span className="text-[7px] font-black uppercase tracking-widest">Hạn mức</span></button>
                <button onClick={() => setCurrentView(AppView.PROFILE)} className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.PROFILE ? 'text-[#ff8c00]' : 'text-gray-500'}`}><UserIcon size={22} /><span className="text-[7px] font-black uppercase tracking-widest">Cá nhân</span></button>
              </>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
