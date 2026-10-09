import React, { useState } from 'react';
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const strengthScore = [hasMinLength, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (strengthScore < 3 || !hasMinLength) {
      setError('Please satisfy at least 3 password strength requirements (minimum 8 characters).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password);
      onNavigate('seats');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-[#0B1220]">
      <div className="w-full max-w-md bg-[#111C2E] border border-[#293548] rounded-2xl p-8 shadow-xl space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Create Account</h1>
          <p className="mt-1 text-xs text-[#A8B3C7]">
            Register to participate in high-concurrency reservation events.
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
            <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Sarah Jenkins"
              className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm text-[#F8FAFC] placeholder-[#A8B3C7]/40 focus:outline-none focus:border-[#2DD4BF] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="sarah@company.com"
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

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1 h-1">
                  <div className={`flex-1 rounded-full ${strengthScore >= 1 ? 'bg-[#EF4444]' : 'bg-[#293548]'}`} />
                  <div className={`flex-1 rounded-full ${strengthScore >= 2 ? 'bg-[#F59E0B]' : 'bg-[#293548]'}`} />
                  <div className={`flex-1 rounded-full ${strengthScore >= 3 ? 'bg-[#10B981]' : 'bg-[#293548]'}`} />
                  <div className={`flex-1 rounded-full ${strengthScore >= 4 ? 'bg-[#2DD4BF]' : 'bg-[#293548]'}`} />
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] text-[#A8B3C7]">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-[#10B981]' : ''}`}>
                    {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} 8+ Characters
                  </span>
                  <span className={`flex items-center gap-1 ${hasUpperCase ? 'text-[#10B981]' : ''}`}>
                    {hasUpperCase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Uppercase
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumber ? 'text-[#10B981]' : ''}`}>
                    {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Number
                  </span>
                  <span className={`flex items-center gap-1 ${hasSpecial ? 'text-[#10B981]' : ''}`}>
                    {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Special Char
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A8B3C7] mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#293548] rounded-lg text-sm text-[#F8FAFC] placeholder-[#A8B3C7]/40 focus:outline-none focus:border-[#2DD4BF] transition-colors"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <span className="text-[11px] text-[#EF4444] mt-1 block">Passwords do not match</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-lg text-xs font-semibold text-[#0B1220] bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="pt-4 border-t border-[#293548] text-center text-xs text-[#A8B3C7]">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-[#2DD4BF] hover:underline font-semibold"
          >
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
};
