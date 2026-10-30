import React from 'react';

export default function FacultyReportsLoading() {
  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <div className="h-16 border-b border-[#303831] bg-[#101211]/90 px-4 flex items-center justify-between">
        <div className="h-6 w-44 bg-[#202622] rounded-lg animate-pulse" />
        <div className="h-8 w-28 bg-[#202622] rounded-xl animate-pulse" />
      </div>

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <div className="hidden md:block w-64 shrink-0 space-y-3">
          <div className="h-4 w-24 bg-[#202622] rounded" />
          <div className="h-10 bg-[#171B18] border border-[#303831] rounded-xl animate-pulse" />
          <div className="h-10 bg-[#171B18] border border-[#303831] rounded-xl animate-pulse" />
        </div>

        <main className="flex-1 min-w-0 space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-[#171B18] rounded-xl" />
              <div className="h-4 w-96 bg-[#202622] rounded" />
            </div>
            <div className="h-10 w-32 bg-[#171B18] rounded-xl" />
          </div>

          <div className="h-14 bg-[#171B18] border border-[#303831] rounded-xl" />
          <div className="h-96 rounded-xl bg-[#171B18] border border-[#303831]" />
        </main>
      </div>
    </div>
  );
}
