'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchReferenceById, ApiError } from '@/lib/api';
import { ReferenceEntry } from '@/lib/types';
import { useHistoryEntry } from "@/lib/useHistoryEntry";
import styles from './page.module.css';
import { useAuth } from '@/app/auth/auth-query';

export default function CitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#17181a] font-serif text-stone-400">
          Loading...
        </div>
      }
    >
      <CitationsView />
    </Suspense>
  );
}

function CitationsView() {
  const router = useRouter();
  const { matchedEntry } = useHistoryEntry();
  const { isAuthenticated } = useAuth();

  const [referencesData, setReferencesData] = useState<ReferenceEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  let currentDocumentId = matchedEntry?.id || null;

  useEffect(() => {
    if (!currentDocumentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchReferenceById(currentDocumentId)
      .then((data) => {
        setReferencesData(data);
        setLoadErrorMessage(null);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
        } else if (error instanceof Error) {
          setLoadErrorMessage(error.message);
        } else {
          setLoadErrorMessage('Something went wrong while loading references.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentDocumentId]);

  return (
    <div className={styles.container} style={{
      backgroundImage: "url(/background/corkboard.jpg)",
    }}>
      <h1 className="text-xl text-stone-200">Relevant Papers</h1>

      {isLoading && (
        <p className="text-stone-400">Loading relevant papers...</p>
      )}

      {!isLoading && !isAuthenticated && (
        <div>
          <br />
          <span className="text-xl text-stone-400 pr-4">You are currently logged out, nothing to display!</span>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="shrink-0 rounded-sm bg-[#5b4636] px-4 py-1.5 font-serif text-xs font-semibold text-white"
          >
            Sign In
          </button>
        </div>
      )}

      {!currentDocumentId && isAuthenticated && (
        <p className="text-stone-400">
          Please select a document to display its relevant papers.
        </p>
      )}

      {loadErrorMessage && (
        <div style={{ color: '#c1666b' }}>
          {loadErrorMessage}
        </div>
      )}

      {referencesData && !isLoading && (
        <div className="mt-4 p-6 bg-[#212225] rounded-md border border-stone-800">
          <h2 className="text-lg font-bold mb-4 text-stone-200">
            {referencesData.title}
          </h2>
          <div className="prose prose-invert max-w-none text-stone-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{

              strong({ children, ...props }) {
                return <span {...props}>{children}</span>;
              },
              b({ children, ...props }) {
                return <span {...props}>{children}</span>;
              },
              a({ node, children, href, ...props }) {
                return (
                  <a
                    href={href}
                    style={{ color: '#4281a4' }}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
            }}>
              {referencesData.markdown_content || "No references in this paper."}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}