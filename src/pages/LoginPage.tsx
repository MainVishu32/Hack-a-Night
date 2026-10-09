import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const signedInUser = await login(email, password);
      onNavigate(signedInUser.role === 'admin' ? 'admin' : 'events');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-[#0B1220]">
      <div className="w-full max-w-md bg-[#111C2E] border border-[#293548] rounded-2xl p-8 shadow-xl space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Sign In</h1>
          <p className="mt-1 text-xs text-[#A8B3C7]">
            Sign in to save your tickets and keep your plans together.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm text-[#F8FAFC] placeholder-[#A8B3C7]/40 focus:outline-none focus:border-[#2DD4BF] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#A8B3C7]">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-[#A8B3C7] hover:text-[#2DD4BF] flex items-center gap-1 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm text-[#F8FAFC] placeholder-[#A8B3C7]/40 focus:outline-none focus:border-[#2DD4BF] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Signing you in…' : 'Sign in'}
          </button>
        </form>

        <div className="p-4 bg-[#0B1220] border border-[#293548] rounded-xl space-y-2.5">
          <div className="text-[11px] font-mono text-[#A8B3C7] uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3 h-3 text-[#2DD4BF]" />
            Demo sign-ins
          </div>
          <p className="text-[11px] text-[#A8B3C7]">Use a sample account to explore this demo.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('alex@example.com', 'DemoUser2026!')}
              className="p-2 text-left rounded-lg bg-[#111C2E] border border-[#293548] hover:border-[#2DD4BF] transition-colors"
            >
              <div className="text-xs font-medium text-[#F8FAFC]">Alex Mercer</div>
              <div className="text-[11px] text-[#A8B3C7]">Sample attendee</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@pulsereserve.io', 'PulseAdmin2026!')}
              className="p-2 text-left rounded-lg bg-[#111C2E] border border-[#293548] hover:border-[#60A5FA] transition-colors"
            >
              <div className="text-xs font-medium text-[#F8FAFC] flex items-center gap-1">
                <span>Operations demo</span>
                <Shield className="w-3 h-3 text-[#60A5FA]" />
              </div>
              <div className="text-[11px] text-[#A8B3C7]">Admin account</div>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#293548] text-center text-xs text-[#A8B3C7]">
          Don't have an account yet?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-[#2DD4BF] hover:underline font-semibold"
          >
            Create Account
          </button>
        </div>

      </div>
    </div>
  );
};
