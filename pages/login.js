// pages/login.js — admin sign-in.
//
// Was a centred card floating in an empty dark field with a full-width magenta
// button: the single most generic login layout there is. It is now the same
// left-aligned column the student portal uses, so the two halves of the product
// read as one system, with the imigongo register on the top edge.
import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { FuturimiWordmark, FuturimiRegister, AluMark } from '../components/Futurimi';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const errorRef = useRef(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'That username and password did not match.');

      sessionStorage.setItem('adminData', JSON.stringify(data));
      router.push('/admin/tests');
    } catch (err) {
      setError(err.message || 'We could not sign you in. Check your connection and try again.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = `block w-full max-w-[380px] font-inter text-[17px] text-ftm-ink bg-ftm-night
    border-2 border-ftm-line2 focus:border-ftm-ink px-4 py-3 transition-colors`;

  return (
    <div className="min-h-screen flex flex-col bg-ftm-night">
      <FuturimiRegister tall />

      <header className="w-full max-w-shell mx-auto px-6 sm:px-10 pt-8 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <FuturimiWordmark size={26} ink="#F4F1EC" diamond="#C5132D" />
          <span className="font-inter text-[14px] text-ftm-dim">Admin</span>
        </div>
        <AluMark height={16} opacity={0.5} />
      </header>

      <main className="flex-1 w-full max-w-shell mx-auto px-6 sm:px-10 py-12 sm:py-20">
        <div className="max-w-[540px]">
          <p className="font-inter font-bold text-[11px] tracking-[.16em] uppercase text-ftm-dim">
            Writing Centre &middot; ALU Kigali
          </p>
          <h1 className="font-grotesk font-bold text-[34px] sm:text-[42px] leading-[1.05] tracking-[-.02em] text-ftm-ink mt-4 mb-4">
            Sign in to the console
          </h1>
          <p className="font-inter text-[17px] leading-relaxed text-ftm-mut mb-10 max-w-measure">
            Test authoring, sittings, marking and proctoring reports.
          </p>

          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="border-l-[6px] border-ftm-crimson bg-ftm-card px-5 py-4 mb-10"
            >
              <h2 className="font-grotesk font-bold text-[15px] text-ftm-ochre mb-1">There is a problem</h2>
              <p className="font-inter text-[15px] text-ftm-ink">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-7">
              <label htmlFor="username" className="block font-inter font-bold text-[17px] text-ftm-ink mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="mb-8">
              <label htmlFor="password" className="block font-inter font-bold text-[17px] text-ftm-ink mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`inline-flex items-center gap-3 font-inter font-bold text-[17px] text-white px-8 py-4 transition-colors
                ${isLoading ? 'bg-ftm-up text-ftm-dim cursor-not-allowed' : 'bg-ftm-crimson hover:bg-ftm-crimsondeep'}`}
            >
              {isLoading && (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              )}
              {isLoading ? 'Signing in' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
