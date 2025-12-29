import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function NextPage() {
  return (
    <React.Fragment>
      <Head>
        <title>Next - MyMate</title>
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="bg-white p-8 rounded-2xl shadow-xl ring-1 ring-slate-900/5 text-center max-w-md w-full">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">Next Page</h1>
            <p className="text-slate-600 mb-8">
                This is a secondary page to demonstrate routing.
            </p>
            <Link href="/home" className="inline-block bg-white text-slate-900 border border-slate-300 font-semibold py-2 px-6 rounded-lg hover:bg-slate-50 transition-colors">
              &larr; Back to Home
            </Link>
        </div>
      </div>
    </React.Fragment>
  );
}