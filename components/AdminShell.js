// components/AdminShell.js — shared chrome for admin pages: Futurimi top bar
// (ALU mark + wordmark + "Admin") with the small three.js campus canvas.
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FuturimiWordmark, FuturimiHero, AluMark } from './Futurimi';

export default function AdminShell({ children }) {
  const router = useRouter();

  const handleSignOut = () => {
    sessionStorage.removeItem('adminData');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-ftm-night">
      <header className="bg-ftm-bar border-b border-white/[.08] px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin/tests" className="flex items-center gap-2.5">
          <AluMark height={14} opacity={0.5} />
          <FuturimiWordmark size={15} ink="#F3F0EA" diamond="#E0273F" />
          <span className="font-inter text-[13px] text-ftm-dim">Admin</span>
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSignOut}
            className="font-inter font-medium text-xs text-ftm-dim hover:text-ftm-slate transition-colors"
          >
            Sign out
          </button>
          <div className="w-[120px] h-12 rounded-md overflow-hidden hidden sm:block">
            <FuturimiHero
              variant="building"
              secondaryHex="#8CA0AC"
              accentHex="#E0273F"
              count={60}
              cameraZ={9.6}
              glyphs={['U', 'R', 'I']}
            />
          </div>
        </div>
      </header>
      <main className="p-7">{children}</main>
    </div>
  );
}
