
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, User, UserRank, LoanRecord } from './types';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import LoanApplication from './components/LoanApplication';
import RankLimits from './components/RankLimits';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import AdminUserManagement from './components/AdminUserManagement';
import AdminBudget from './components/AdminBudget';
import { User as UserIcon, Home, Briefcase, Medal, LayoutGrid, Users, Wallet, AlertTriangle } from 'lucide-react';
import { compressImage } from './utils';

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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [settleLoanFromDash, setSettleLoanFromDash] = useState<LoanRecord | null>(null);
  const [viewLoanFromDash, setViewLoanFromDash] = useState<LoanRecord | null>(null);
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
        if (savedLoans) {
          setLoans(JSON.parse(savedLoans));
        }
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
      
      // Tiết kiệm không gian: Mỗi user chỉ giữ tối đa 5 giao dịch, ưu tiên các giao dịch chưa tất toán
      const userGroups: Record<string, LoanRecord[]> = {};
      loans.forEach(loan => {
        if (!userGroups[loan.userId]) userGroups[loan.userId] = [];
        userGroups[loan.userId].push(loan);
      });

      const prunedLoans: LoanRecord[] = [];
      Object.values(userGroups).forEach(userLoans => {
        const active = userLoans.filter(l => !['ĐÃ TẤT TOÁN', 'BỊ TỪ CHỐI'].includes(l.status));
        const finished = userLoans.filter(l => ['ĐÃ TẤT TOÁN', 'BỊ TỪ CHỐI'].includes(l.status));
        
        const kept = [...active.slice(0, 5)];
        if (kept.length < 5) {
          kept.push(...finished.slice(0, 5 - kept.length));
        }
        prunedLoans.push(...kept);
      });
      
      localStorage.setItem('vnv_loans', JSON.stringify(prunedLoans));
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
    
    // Đồng bộ logic ngày đến hạn với Dashboard và LoanApplication
    const nextMonth1st = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diffTime = nextMonth1st.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let finalDate;
    if (diffDays < 10) {
      finalDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    } else {
      finalDate = nextMonth1st;
    }
    const dueDate = finalDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    // Logic tạo Mã hợp đồng: NDV-UserID-Sequence (Ví dụ: NDV-1234-01)
    const userLoansCount = loans.filter(l => l.userId === user.id).length;
    const sequence = (userLoansCount + 1).toString().padStart(2, '0');
    const contractId = `NDV-${user.id}-${sequence}`;

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
    
    setLoans(prev => {
      const allLoans = [newLoan, ...prev];
      
      // Nhóm theo userId
      const userGroups: Record<string, LoanRecord[]> = {};
      allLoans.forEach(loan => {
        if (!userGroups[loan.userId]) userGroups[loan.userId] = [];
        userGroups[loan.userId].push(loan);
      });

      // Pruning: Mỗi user chỉ giữ tối đa 5 giao dịch, ưu tiên các giao dịch chưa tất toán
      const pruned: LoanRecord[] = [];
      Object.values(userGroups).forEach(userLoans => {
        const active = userLoans.filter(l => !['ĐÃ TẤT TOÁN', 'BỊ TỪ CHỐI'].includes(l.status));
        const finished = userLoans.filter(l => ['ĐÃ TẤT TOÁN', 'BỊ TỪ CHỐI'].includes(l.status));
        
        // Lấy tất cả active (tối đa 5), sau đó bù bằng finished cho đủ 5
        const kept = [...active.slice(0, 5)];
        if (kept.length < 5) {
          kept.push(...finished.slice(0, 5 - kept.length));
        }
        pruned.push(...kept);
      });

      return pruned;
    });
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

  const handleAdminLoanAction = (loanId: string, action: 'APPROVE' | 'DISBURSE' | 'SETTLE' | 'REJECT', reason?: string) => {
    const targetLoan = loans.find(l => l.id === loanId);
    if (!targetLoan) return;
    if (action === 'DISBURSE') setSystemBudget(prev => prev - targetLoan.amount);
    else if (action === 'SETTLE') setSystemBudget(prev => prev + targetLoan.amount);

    setLoans(prev => prev.map(loan => {
      if (loan.id === loanId) {
        let newStatus = loan.status;
        let rejectionReason = reason || loan.rejectionReason;

        if (action === 'REJECT') {
          // Nếu đang chờ tất toán mà bị từ chối bill thì quay về ĐANG NỢ để nộp lại
          if (loan.status === 'CHỜ TẤT TOÁN') {
            newStatus = 'ĐANG NỢ';
          } else {
            newStatus = 'BỊ TỪ CHỐI';
            // Hoàn lại hạn mức cho user nếu khoản vay bị từ chối (không phải từ chối bill tất toán)
            const loanUser = registeredUsers.find(u => u.id === loan.userId);
            if (loanUser) {
              const updatedUser = { ...loanUser, balance: Math.min(loanUser.totalLimit, loanUser.balance + loan.amount) };
              setRegisteredUsers(users => users.map(u => u.id === loan.userId ? updatedUser : u));
              if (user?.id === loan.userId) setUser(updatedUser);
            }
          }
        } else {
          switch(action) {
            case 'APPROVE': newStatus = 'ĐÃ DUYỆT'; break;
            case 'DISBURSE': newStatus = 'ĐANG NỢ'; break;
            case 'SETTLE': newStatus = 'ĐÃ TẤT TOÁN'; break;
          }
        }

        if (action === 'SETTLE') {
          const loanUser = registeredUsers.find(u => u.id === loan.userId);
          if (loanUser) {
             const updatedUser = { ...loanUser, balance: Math.min(loanUser.totalLimit, loanUser.balance + loan.amount), rankProgress: Math.min(10, loanUser.rankProgress + 1) };
             setRegisteredUsers(users => users.map(u => u.id === loan.userId ? updatedUser : u));
             if (user?.id === loan.userId) setUser(updatedUser);
          }
        }
        return { ...loan, status: newStatus as any, rejectionReason };
      }
      return loan;
    }));
  };

  const handleAdminUserAction = (userId: string, action: 'APPROVE_RANK' | 'REJECT_RANK') => {
    if (action === 'APPROVE_RANK') {
      const targetUser = registeredUsers.find(u => u.id === userId);
      if (targetUser && targetUser.pendingUpgradeRank) {
        const newRank = targetUser.pendingUpgradeRank;
        let newLimit = targetUser.totalLimit;
        
        if (newRank === 'bronze') newLimit = 3000000;
        else if (newRank === 'silver') newLimit = 4000000;
        else if (newRank === 'gold') newLimit = 5000000;
        else if (newRank === 'diamond') newLimit = 10000000;
        
        // Cộng phí nâng hạng (5%) vào thống kê - Thực hiện ngoài updater để tránh bị lặp lại
        const upgradeFee = newLimit * 0.05;
        setRankProfit(prev => prev + upgradeFee);
        
        const updatedUser = { 
          ...targetUser, 
          rank: newRank, 
          totalLimit: newLimit, 
          balance: newLimit - (targetUser.totalLimit - targetUser.balance), 
          pendingUpgradeRank: null, 
          rankUpgradeBill: undefined 
        };
        
        setRegisteredUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        if (user?.id === userId) setUser(updatedUser);
        return;
      }
    }

    // Trường hợp Từ chối hoặc không tìm thấy user
    setRegisteredUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, pendingUpgradeRank: null, rankUpgradeBill: undefined };
      }
      return u;
    }));
  };

  const handleResetRankProfit = () => {
    setRankProfit(0);
  };

  const handleDeleteUser = (userId: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== userId));
    setLoans(prev => prev.filter(l => l.userId !== userId));
  };

  const handleAutoCleanupUsers = () => {
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
      case AppView.DASHBOARD: 
        return (
          <Dashboard 
            user={user} 
            loans={loans.filter(l => l.userId === user?.id)} 
            systemBudget={systemBudget} 
            onApply={() => setCurrentView(AppView.APPLY_LOAN)} 
            onLogout={handleLogout} 
            onViewAllLoans={() => setCurrentView(AppView.APPLY_LOAN)}
            onSettleLoan={(loan) => {
              setSettleLoanFromDash(loan);
              setCurrentView(AppView.APPLY_LOAN);
            }}
            onViewContract={(loan) => {
              setViewLoanFromDash(loan);
              setCurrentView(AppView.APPLY_LOAN);
            }}
          />
        );
      case AppView.APPLY_LOAN: 
        return (
          <LoanApplication 
            user={user} 
            loans={loans.filter(l => l.userId === user?.id)} 
            systemBudget={systemBudget} 
            onApplyLoan={handleApplyLoan} 
            onSettleLoan={handleSettleLoan} 
            onBack={() => {
              setSettleLoanFromDash(null);
              setViewLoanFromDash(null);
              setCurrentView(AppView.DASHBOARD);
            }}
            initialLoanToSettle={settleLoanFromDash}
            initialLoanToView={viewLoanFromDash}
          />
        );
      case AppView.RANK_LIMITS: return <RankLimits user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} onUpgrade={handleUpgradeRank} />;
      case AppView.PROFILE: return <Profile user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} onLogout={handleLogout} />;
      case AppView.ADMIN_DASHBOARD: return <AdminDashboard user={user} loans={loans} registeredUsersCount={registeredUsers.length} systemBudget={systemBudget} rankProfit={rankProfit} onResetRankProfit={handleResetRankProfit} onLogout={handleLogout} />;
      case AppView.ADMIN_USERS: return <AdminUserManagement users={registeredUsers} loans={loans} onAction={handleAdminUserAction} onLoanAction={handleAdminLoanAction} onDeleteUser={handleDeleteUser} onAutoCleanup={handleAutoCleanupUsers} onBack={() => setCurrentView(AppView.ADMIN_DASHBOARD)} />;
      case AppView.ADMIN_BUDGET: return <AdminBudget currentBudget={systemBudget} onUpdate={(val) => setSystemBudget(val)} onBack={() => setCurrentView(AppView.ADMIN_DASHBOARD)} />;
      default: return <Dashboard user={user} loans={loans} systemBudget={systemBudget} onApply={() => setCurrentView(AppView.APPLY_LOAN)} onLogout={handleLogout} onViewAllLoans={() => setCurrentView(AppView.APPLY_LOAN)} />;
    }
  };

  const showNavbar = user && currentView !== AppView.LOGIN && currentView !== AppView.REGISTER;

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ff8c00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
                <button 
                  onClick={() => {
                    setSettleLoanFromDash(null);
                    setViewLoanFromDash(null);
                    setCurrentView(AppView.DASHBOARD);
                  }} 
                  className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.DASHBOARD ? 'text-[#ff8c00]' : 'text-gray-500'}`}
                >
                  <Home size={22} />
                  <span className="text-[7px] font-black uppercase tracking-widest">Trang chủ</span>
                </button>
                <button 
                  onClick={() => {
                    setSettleLoanFromDash(null);
                    setViewLoanFromDash(null);
                    setCurrentView(AppView.APPLY_LOAN);
                  }} 
                  className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.APPLY_LOAN ? 'text-[#ff8c00]' : 'text-gray-500'}`}
                >
                  <Briefcase size={22} />
                  <span className="text-[7px] font-black uppercase tracking-widest">Vay vốn</span>
                </button>
                <button 
                  onClick={() => {
                    setSettleLoanFromDash(null);
                    setViewLoanFromDash(null);
                    setCurrentView(AppView.RANK_LIMITS);
                  }} 
                  className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.RANK_LIMITS ? 'text-[#ff8c00]' : 'text-gray-500'}`}
                >
                  <Medal size={22} />
                  <span className="text-[7px] font-black uppercase tracking-widest">Hạn mức</span>
                </button>
                <button 
                  onClick={() => {
                    setSettleLoanFromDash(null);
                    setViewLoanFromDash(null);
                    setCurrentView(AppView.PROFILE);
                  }} 
                  className={`flex flex-col items-center gap-1 flex-1 ${currentView === AppView.PROFILE ? 'text-[#ff8c00]' : 'text-gray-500'}`}
                >
                  <UserIcon size={22} />
                  <span className="text-[7px] font-black uppercase tracking-widest">Cá nhân</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
