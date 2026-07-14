import { useState } from 'react';
import { useRouter } from 'next/router';
import { FuturimiWordmark, AluMark } from '../components/Futurimi';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store admin data in sessionStorage
      sessionStorage.setItem('adminData', JSON.stringify(data));
      router.push('/admin/tests');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ftm-night py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <AluMark height={14} opacity={0.5} className="mb-4" />
          <FuturimiWordmark size={32} ink="#F3F0EA" diamond="#E0273F" />
          <p className="font-inter text-sm text-ftm-dim mt-3">Admin console</p>
        </div>

        <div className="bg-ftm-card border border-white/[.08] rounded-[10px] p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block font-inter font-semibold text-xs text-ftm-slate mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full font-inter text-sm text-ftm-ink placeholder-ftm-dim bg-ftm-night border border-white/[.16] rounded-md px-3.5 py-3 focus:outline-none focus:border-ftm-red focus:ring-1 focus:ring-ftm-red transition-colors"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block font-inter font-semibold text-xs text-ftm-slate mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full font-inter text-sm text-ftm-ink placeholder-ftm-dim bg-ftm-night border border-white/[.16] rounded-md px-3.5 py-3 focus:outline-none focus:border-ftm-red focus:ring-1 focus:ring-ftm-red transition-colors"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-ftm-red/10 border border-ftm-red/30 p-3.5">
                <p className="text-sm font-medium text-ftm-red">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center font-inter font-semibold text-sm text-white bg-ftm-red hover:bg-[#C51F35] rounded-md px-5 py-3 shadow-redglow transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
