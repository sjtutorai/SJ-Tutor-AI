import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { 
  LogOut, 
  BookOpen, 
  Trophy, 
  Clock, 
  Play, 
  LayoutDashboard, 
  User as UserIcon,
  Settings,
  Bell
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { QuizResultModal } from './QuizResultModal';

interface DashboardProps {
  onStartTutorial: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartTutorial }) => {
  const { userData } = useAuth();
  const [showResult, setShowResult] = useState(false);
  const [mockScore, setMockScore] = useState({ score: 8, total: 10 });

  const handleLogout = () => signOut(auth);

  const triggerMockQuiz = () => {
    // Simulate a quiz result
    const randomScore = Math.floor(Math.random() * 11);
    setMockScore({ score: randomScore, total: 10 });
    setShowResult(true);
  };

  return (
    <div className="min-h-screen bg-primary-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-700">SJ Tutor AI</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active id="nav-dashboard" />
          <NavItem icon={<BookOpen size={20} />} label="My Courses" />
          <NavItem icon={<Trophy size={20} />} label="Results" id="nav-results" />
          <NavItem icon={<Clock size={20} />} label="Schedule" />
        </nav>
        <div className="p-4 border-t border-slate-100">
          <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
            <LogOut size={20} className="mr-3" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-700">Welcome, {userData?.name}</h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full"><Bell size={20} /></Button>
            <Button variant="ghost" size="icon" className="rounded-full"><Settings size={20} /></Button>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
              {userData?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-8 text-white shadow-xl shadow-primary-600/20 relative overflow-hidden">
            <div className="relative z-10 max-w-lg">
              <h3 className="text-3xl font-bold mb-4">Ready to test your knowledge?</h3>
              <p className="text-primary-100 mb-8">Take a quick quiz on your current topics and see how much you&apos;ve learned today.</p>
              <Button 
                id="btn-start-quiz"
                onClick={triggerMockQuiz}
                className="bg-white text-primary-700 hover:bg-primary-50 font-bold h-12 px-8 rounded-xl shadow-lg"
              >
                <Play size={20} className="mr-2 fill-current" /> Start Mock Quiz
              </Button>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[40%] w-48 h-48 bg-primary-400/20 rounded-full blur-2xl" />
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={<BookOpen className="text-blue-600" />} title="Courses" value="4 Active" />
            <StatCard icon={<Trophy className="text-yellow-600" />} title="Avg. Score" value="84%" />
            <StatCard icon={<Clock className="text-purple-600" />} title="Study Time" value="12.5 hrs" />
          </div>

          {/* Recent Activity */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <BookOpen size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">Mathematics Quiz - Algebra</h4>
                        <p className="text-xs text-slate-500">Completed 2 hours ago</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">9/10</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <QuizResultModal 
        isOpen={showResult}
        score={mockScore.score}
        total={mockScore.total}
        onRetry={() => setShowResult(false)}
        onDashboard={() => setShowResult(false)}
      />
    </div>
  );
};

const NavItem = ({ icon, label, active = false, id }: { icon: React.ReactNode, label: string, active?: boolean, id?: string }) => (
  <button 
    id={id}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const StatCard = ({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) => (
  <Card className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
    <CardContent className="p-6 flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);
