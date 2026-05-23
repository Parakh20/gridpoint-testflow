import { useParams, Link, Navigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import { getPost } from './posts';
import { formatDate } from '@/lib/format';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPost(slug) : undefined;

  // safeHtml is sanitized via DOMPurify before use in dangerouslySetInnerHTML — XSS safe.
  const safeHtml = useMemo(() => {
    if (!post) return '';
    const raw = marked.parse(post.content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-[#07070c] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link to="/blog" className="text-[#60a5fa] text-sm font-mono hover:underline">← All resources</Link>
        <div className="mt-8 font-mono text-[11px] text-white/40 uppercase tracking-widest">
          {formatDate(post.date)}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>
        {/* Content is DOMPurify-sanitized markdown HTML — safe for rendering */}
        <div
          className="mt-10 prose prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
        <div className="mt-16 rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 p-6">
          <div className="font-semibold text-white text-lg">Stop doing this in Excel.</div>
          <p className="mt-2 text-white/60 text-sm">
            TestFlow has 46 ready-to-use test templates, a mobile app for field engineers,
            and AI-generated handover reports.
          </p>
          <Link
            to="/#contact"
            className="mt-4 inline-block rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            Book a demo →
          </Link>
        </div>
      </div>
    </div>
  );
}
