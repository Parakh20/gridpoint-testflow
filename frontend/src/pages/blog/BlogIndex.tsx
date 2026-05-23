import { Link } from 'react-router-dom';
import { posts } from './posts';
import { formatDate } from '@/lib/format';

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#07070c] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[#60a5fa] text-sm font-mono hover:underline">← optimustesting.com</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Resources</h1>
        <p className="mt-3 text-white/55 text-lg">Commissioning guides, test procedures, and industry insights.</p>
        <div className="mt-10 space-y-4">
          {posts.map(post => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block rounded-2xl border border-white/10 hover:border-white/25 bg-white/[.02] hover:bg-white/[.04] p-6 transition"
            >
              <div className="font-mono text-[11px] text-white/40 uppercase tracking-widest mb-2">
                {formatDate(post.date)}
              </div>
              <h2 className="text-xl font-semibold text-white leading-snug">{post.title}</h2>
              <p className="mt-2 text-white/55 text-sm leading-relaxed">{post.description}</p>
              <div className="mt-4 text-[#60a5fa] text-sm font-mono">Read →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
