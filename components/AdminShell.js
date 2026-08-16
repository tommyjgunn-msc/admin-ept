// components/AdminShell.js — shared chrome for the admin pages.
//
// The nav used to end with a 120×48 WebGL canvas rendering a rotating low-poly
// campus with orbiting particles, permanently, on every admin page. It carried
// no information, held a live GL context for the length of a marking session,
// and sat where a person's eye goes when they are scanning a table. It is gone,
// along with the `three` dependency it existed for.
//
// The bar now does what a bar should: says where you are, in a fixed place,
// with the imigongo register marking the top edge of every page.
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FuturimiWordmark, FuturimiRegister, AluMark } from './Futurimi';

const NAV = [
  {
    href: '/admin/tests',
    label: 'Tests',
    match: (p) => p.startsWith('/admin/tests') || p.startsWith('/admin/edit-test') || p.startsWith('/admin/create-test'),
  },
  { href: '/admin/test-dates', label: 'Test dates', match: (p) => p === '/admin/test-dates' },
  { href: '/admin/results', label: 'Results', match: (p) => p === '/admin/results' },
  { href: '/admin/grading', label: 'Marking', match: (p) => p === '/admin/grading' },
  { href: '/admin/proctoring', label: 'Proctoring', match: (p) => p === '/admin/proctoring' },
];

export default function AdminShell({ children }) {
  const router = useRouter();

  const handleSignOut = () => {
    sessionStorage.removeItem('adminData');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-ftm-night">
      <header className="bg-ftm-bar border-b border-ftm-line2 sticky top-0 z-40">
        <FuturimiRegister />
        <div className="max-w-shell mx-auto px-6 sm:px-10">
          <div className="flex items-center gap-8 h-bar">
            <Link href="/admin/tests" className="flex items-center gap-3 flex-none">
              <AluMark height={14} opacity={0.5} />
              <FuturimiWordmark size={15} ink="#F4F1EC" diamond="#C5132D" />
              <span className="font-inter text-[13px] text-ftm-dim">Admin</span>
            </Link>

            <nav aria-label="Admin sections" className="flex items-center gap-1 mr-auto overflow-x-auto">
              {NAV.map((item) => {
                const active = item.match(router.pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`font-inter text-[13px] px-3 py-2 whitespace-nowrap transition-colors border-b-2
                      ${active
                        ? 'text-ftm-ink font-semibold border-ftm-crimson'
                        : 'text-ftm-mut hover:text-ftm-ink border-transparent'}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleSignOut}
              className="font-inter font-semibold text-[13px] text-ftm-mut hover:text-ftm-ink transition-colors flex-none"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-shell mx-auto px-6 sm:px-10 py-10">{children}</main>
    </div>
  );
}
