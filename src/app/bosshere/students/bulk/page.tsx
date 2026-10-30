'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  HelpCircle,
  GraduationCap,
  Copy,
  ChevronRight,
  FileCheck,
  RotateCcw,
  History,
  Check,
} from 'lucide-react';
import type { StudentImportPreviewResult, StudentImportExecutionResult } from '@/lib/student-import';

export default function BulkStudentRegistrationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [previewData, setPreviewData] = useState<StudentImportPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<StudentImportExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'existing' | 'duplicates' | 'invalid'>('all');
  const [showGuide, setShowGuide] = useState(true);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [historyBatches, setHistoryBatches] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/students/bulk-history');
      const data = await res.json();
      if (data.batches) {
        setHistoryBatches(data.batches);
      }
    } catch (err) {
      console.error('Failed to load batch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.name.endsWith('.csv') && !droppedFile.type.includes('csv')) {
        setErrorMessage('Please upload a valid .csv file.');
        return;
      }
      setFile(droppedFile);
      setErrorMessage(null);
      readAndPreviewFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setErrorMessage(null);
      readAndPreviewFile(selectedFile);
    }
  };

  const readAndPreviewFile = async (fileToRead: File) => {
    setPreviewLoading(true);
    setErrorMessage(null);
    setPreviewData(null);
    setImportResult(null);

    try {
      const text = await fileToRead.text();
      setCsvText(text);
      await runPreview(text);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read file.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTextInputPreview = async () => {
    if (!csvText.trim()) {
      setErrorMessage('Please enter CSV data to preview.');
      return;
    }
    setPreviewLoading(true);
    setErrorMessage(null);
    setPreviewData(null);
    setImportResult(null);

    try {
      await runPreview(csvText);
    } catch (err: any) {
      setErrorMessage(err.message || 'Preview failed.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const runPreview = async (rawCsv: string) => {
    const res = await fetch('/api/admin/students/bulk-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText: rawCsv }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Preview failed.');
    }

    setPreviewData(data.preview);
    if (data.preview.validNewCount > 0) {
      setActiveTab('new');
    } else if (data.preview.invalidCount > 0) {
      setActiveTab('invalid');
    } else {
      setActiveTab('all');
    }
  };

  const handleConfirmImport = async () => {
    if (!csvText.trim()) {
      setErrorMessage('No CSV data available to import.');
      return;
    }

    setImportLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/students/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          filename: file?.name || 'pasted-roster.csv',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bulk registration failed.');
      }

      setImportResult(data.result);
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Import failed.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCsvText('');
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyTemplateSnippet = () => {
    const templateSnippet = `Roll Number,Student Name,Institutional Email,Department,Academic Year\nROLL1001,Student Name,student@institution.edu,Computer Science and Engineering,2024-2028 (2nd Year)`;
    navigator.clipboard.writeText(templateSnippet);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Breadcrumb & Header */}
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#A0A89F] mb-2">
              <Link href="/bosshere" className="hover:text-[#F1F3ED] transition-colors">
                Control Center
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/bosshere/students" className="hover:text-[#F1F3ED] transition-colors">
                Students
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#C6F36B] font-semibold">Bulk Registration</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-[#C6F36B]" />
                  Bulk Student Registration
                </h1>
                <p className="text-xs sm:text-sm text-[#A0A89F] mt-1 max-w-2xl">
                  Import institutional student rosters directly from Google Forms / Google Sheets CSV exports.
                  Enforces zero-trust verified Google OAuth login authorization.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href="/api/admin/students/bulk-template"
                  download="ams_student_registration_template.csv"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-xs font-semibold text-[#F1F3ED] hover:text-[#F1F3ED] transition-all shadow-sm"
                >
                  <Download className="w-4 h-4 text-[#C6F36B]" />
                  Download CSV Template
                </a>
              </div>
            </div>
          </div>

          {/* Feedback/Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/20 text-[#FF7777] text-sm flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
              <ShieldAlert className="w-5 h-5 text-[#FF7777] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-[#FF7777]">Validation or Ingestion Issue</p>
                <p className="mt-0.5 text-xs text-[#FF7777]/90">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[#FF7777] hover:text-[#FF7777]/80 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Google Forms / Google Sheets Step-by-Step Guide */}
          <div className="rounded-xl border border-[#303831] bg-[#171B18]/50 overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#303831]/80 bg-[#171B18]/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C6F36B]/10 border border-[#C6F36B]/20 flex items-center justify-center text-[#C6F36B]">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F1F3ED]">
                    Google Form & Google Sheets Pipeline Instructions
                  </h3>
                  <p className="text-xs text-[#A0A89F]">
                    How to collect student data and export ready-to-import CSV files
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-[#A0A89F] hover:text-[#C6F36B] font-medium transition-colors"
              >
                {showGuide ? 'Collapse Guide' : 'Expand Guide'}
              </button>
            </div>

            {showGuide && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#101211]/60 border border-[#303831]/80 space-y-2">
                  <div className="flex items-center gap-2 text-[#C6F36B] font-bold">
                    <span className="w-5 h-5 rounded-full bg-[#C6F36B]/20 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Create Google Form
                  </div>
                  <p className="text-[#A0A89F] leading-relaxed">
                    Set up questions for:
                  </p>
                  <ul className="list-disc list-inside text-[#F1F3ED] space-y-1 font-mono text-[11px]">
                    <li>Roll Number (e.g. 24CS1001)</li>
                    <li>Student Full Name</li>
                    <li>Karunya / Google Email</li>
                    <li>Department & Academic Year</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#101211]/60 border border-[#303831]/80 space-y-2">
                  <div className="flex items-center gap-2 text-[#C6F36B] font-bold">
                    <span className="w-5 h-5 rounded-full bg-[#C6F36B]/20 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Export Linked Sheet
                  </div>
                  <p className="text-[#A0A89F] leading-relaxed">
                    In your Google Form responses tab:
                  </p>
                  <ol className="list-decimal list-inside text-[#F1F3ED] space-y-1 text-[11px]">
                    <li>Click <strong className="text-[#F1F3ED]">Link to Sheets</strong></li>
                    <li>Inside Google Sheets, navigate to:</li>
                    <li className="font-semibold text-[#C6F36B]">File → Download → Comma Separated Values (.csv)</li>
                    <li>Save the exported CSV to your computer.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-[#101211]/60 border border-[#303831]/80 space-y-2">
                  <div className="flex items-center gap-2 text-[#C6F36B] font-bold">
                    <span className="w-5 h-5 rounded-full bg-[#C6F36B]/20 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Zero-Trust Authorization
                  </div>
                  <p className="text-[#A0A89F] leading-relaxed">
                    Upload the CSV below. The system checks database uniqueness, detects duplicate rows, and registers active student profiles.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={copyTemplateSnippet}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-[#F1F3ED] text-[11px] font-semibold transition-all"
                    >
                      {copiedTemplate ? <Check className="w-3.5 h-3.5 text-[#72D6A0]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedTemplate ? 'Copied Sample CSV' : 'Copy Sample Header'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Import Results Screen (if completed) */}
          {importResult && (
            <div className="rounded-xl border border-[#72D6A0]/30 bg-[#72D6A0]/5 p-6 shadow-xl space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#72D6A0]/20 border border-[#72D6A0]/30 flex items-center justify-center text-[#72D6A0]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#F1F3ED]">Bulk Registration Completed Successfully!</h2>
                  <p className="text-xs text-[#A0A89F]">
                    Students are registered in PostgreSQL and can now access their student dashboard using Google OAuth.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#101211]/70 border border-[#303831]/80">
                  <p className="text-[11px] font-semibold text-[#A0A89F] uppercase tracking-wider">Total Rows</p>
                  <p className="text-2xl font-black text-[#F1F3ED] mt-1">{importResult.totalProcessed}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#72D6A0]/10 border border-[#72D6A0]/20">
                  <p className="text-[11px] font-semibold text-[#72D6A0] uppercase tracking-wider">Registered</p>
                  <p className="text-2xl font-black text-[#72D6A0] mt-1">{importResult.createdCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F0BC65]/10 border border-[#F0BC65]/20">
                  <p className="text-[11px] font-semibold text-[#F0BC65] uppercase tracking-wider">Skipped / Dups</p>
                  <p className="text-2xl font-black text-[#F0BC65] mt-1">{importResult.skippedCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#101211]/70 border border-[#303831]/80">
                  <p className="text-[11px] font-semibold text-[#A0A89F] uppercase tracking-wider">Rejected</p>
                  <p className="text-2xl font-black text-[#A0A89F] mt-1">{importResult.rejectedCount}</p>
                </div>
              </div>

              {importResult.batchId && (
                <p className="text-xs font-mono text-[#A0A89F]">
                  Audit Batch ID: <span className="text-[#C6F36B] select-all">{importResult.batchId}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/bosshere/students"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] text-xs font-bold transition-all shadow-md shadow-[#C6F36B]/20"
                >
                  <GraduationCap className="w-4 h-4" />
                  View Updated Student Directory
                </Link>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-xs font-semibold text-[#F1F3ED] transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-[#C6F36B]" />
                  Import Another CSV
                </button>
              </div>
            </div>
          )}

          {/* Upload / Input Section */}
          {!importResult && (
            <div className="rounded-xl border border-[#303831] bg-[#171B18]/40 p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#C6F36B]/20 text-[#C6F36B] font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-base font-bold text-[#F1F3ED]">Select or Paste CSV Roster</h2>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setUseTextInput(false)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      !useTextInput
                        ? 'bg-[#C6F36B]/10 text-[#C6F36B] border border-[#C6F36B]/20'
                        : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                    }`}
                  >
                    File Upload
                  </button>
                  <button
                    onClick={() => setUseTextInput(true)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      useTextInput
                        ? 'bg-[#C6F36B]/10 text-[#C6F36B] border border-[#C6F36B]/20'
                        : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              {!useTextInput ? (
                /* Drag & Drop File Zone */
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      isDragging
                        ? 'border-[#C6F36B] bg-[#C6F36B]/5'
                        : file
                        ? 'border-[#C6F36B]/50 bg-[#101211]/80'
                        : 'border-[#303831]/80 hover:border-[#303831] bg-[#101211]/40 hover:bg-[#101211]/70'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#171B18] border border-[#303831] flex items-center justify-center text-[#C6F36B] shadow-md">
                      {file ? <FileCheck className="w-7 h-7 text-[#C6F36B]" /> : <Upload className="w-7 h-7" />}
                    </div>

                    <div>
                      {file ? (
                        <>
                          <p className="text-sm font-bold text-[#F1F3ED]">{file.name}</p>
                          <p className="text-xs text-[#A0A89F] mt-1">
                            {(file.size / 1024).toFixed(1)} KB • Click or drag another file to replace
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#F1F3ED]">
                            Drag & drop your Google Sheets CSV file here
                          </p>
                          <p className="text-xs text-[#A0A89F] mt-1">
                            or click to browse local files (max 5 MB, up to 2,000 rows)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Direct CSV Text Area */
                <div className="space-y-3">
                  <textarea
                    rows={8}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Roll Number,Student Name,Institutional Email,Department,Academic Year&#10;ROLL1001,Student Name,student@institution.edu,Computer Science and Engineering,2024-2028 (2nd Year)"
                    className="w-full bg-[#101211] border border-[#303831] rounded-xl p-3.5 font-mono text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]/50 focus:ring-1 focus:ring-[#C6F36B]/50 transition-all placeholder:text-[#A0A89F]"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleTextInputPreview}
                      disabled={previewLoading || !csvText.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-[#101211] text-xs font-bold transition-all shadow-md"
                    >
                      {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Parse & Preview Records
                    </button>
                  </div>
                </div>
              )}

              {file && (
                <div className="flex items-center justify-between pt-2 border-t border-[#303831]/80 text-xs">
                  <div className="flex items-center gap-2 text-[#A0A89F]">
                    <FileText className="w-4 h-4 text-[#C6F36B]" />
                    <span>Loaded: <strong className="text-[#F1F3ED]">{file.name}</strong></span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-[#A0A89F] hover:text-[#FF7777] transition-colors font-medium"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {previewLoading && (
            <div className="rounded-xl border border-[#303831] bg-[#171B18]/40 p-12 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#C6F36B] animate-spin" />
              <p className="text-sm font-bold text-[#F1F3ED]">Analyzing and Cross-Referencing CSV Roster...</p>
              <p className="text-xs text-[#A0A89F]">Checking email formats, roll number uniqueness, and database collision records</p>
            </div>
          )}

          {/* Step 2: Interactive Preview & Analysis */}
          {previewData && !importResult && (
            <div className="rounded-xl border border-[#303831] bg-[#171B18]/40 p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#C6F36B]/20 text-[#C6F36B] font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-base font-bold text-[#F1F3ED]">Review Parsed Student Records</h2>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#A0A89F]">Ready to Register:</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#72D6A0]/10 border border-[#72D6A0]/20 text-[#72D6A0] font-bold">
                    {previewData.validNewCount} New Students
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-[#101211]/70 border border-[#303831]">
                  <p className="text-[11px] font-semibold text-[#A0A89F] uppercase tracking-wider">Total Rows</p>
                  <p className="text-2xl font-black text-[#F1F3ED] mt-1">{previewData.totalRows}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#72D6A0]/10 border border-[#72D6A0]/20">
                  <p className="text-[11px] font-semibold text-[#72D6A0] uppercase tracking-wider">New Accounts</p>
                  <p className="text-2xl font-black text-[#72D6A0] mt-1">{previewData.validNewCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F0BC65]/10 border border-[#F0BC65]/20">
                  <p className="text-[11px] font-semibold text-[#F0BC65] uppercase tracking-wider">DB Conflicts</p>
                  <p className="text-2xl font-black text-[#F0BC65] mt-1">{previewData.existingCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#202622] border border-[#303831]">
                  <p className="text-[11px] font-semibold text-[#A0A89F] uppercase tracking-wider">CSV Dups</p>
                  <p className="text-2xl font-black text-[#A0A89F] mt-1">{previewData.duplicateCount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/20">
                  <p className="text-[11px] font-semibold text-[#FF7777] uppercase tracking-wider">Invalid Rows</p>
                  <p className="text-2xl font-black text-[#FF7777] mt-1">{previewData.invalidCount}</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-[#303831] text-xs font-semibold gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'new'
                      ? 'border-[#72D6A0] text-[#72D6A0]'
                      : 'border-transparent text-[#A0A89F] hover:text-[#F1F3ED]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  New Students ({previewData.validNewCount})
                </button>

                <button
                  onClick={() => setActiveTab('existing')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'existing'
                      ? 'border-[#F0BC65] text-[#F0BC65]'
                      : 'border-transparent text-[#A0A89F] hover:text-[#F1F3ED]'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  DB Conflicts ({previewData.existingCount})
                </button>

                <button
                  onClick={() => setActiveTab('duplicates')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'duplicates'
                      ? 'border-[#A0A89F] text-[#F1F3ED]'
                      : 'border-transparent text-[#A0A89F] hover:text-[#F1F3ED]'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  In-CSV Duplicates ({previewData.duplicateCount})
                </button>

                <button
                  onClick={() => setActiveTab('invalid')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'invalid'
                      ? 'border-[#FF7777] text-[#FF7777]'
                      : 'border-transparent text-[#A0A89F] hover:text-[#F1F3ED]'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Invalid Rows ({previewData.invalidCount})
                </button>

                <button
                  onClick={() => setActiveTab('all')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'all'
                      ? 'border-[#C6F36B] text-[#C6F36B]'
                      : 'border-transparent text-[#A0A89F] hover:text-[#F1F3ED]'
                  }`}
                >
                  All ({previewData.totalRows})
                </button>
              </div>

              {/* Tab 1: New Students Table */}
              {activeTab === 'new' && (
                <div className="overflow-x-auto rounded-xl border border-[#303831]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171B18]/80 text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                      <tr>
                        <th className="p-3">Row</th>
                        <th className="p-3">Roll Number</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Institutional Email</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303831]/60 font-mono">
                      {previewData.newStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#A0A89F] font-sans">
                            No new student records detected in this batch.
                          </td>
                        </tr>
                      ) : (
                        previewData.newStudents.map((s) => (
                          <tr key={s.rowNumber} className="hover:bg-[#171B18]/40">
                            <td className="p-3 text-[#A0A89F]">#{s.rowNumber}</td>
                            <td className="p-3 font-bold text-[#F1F3ED]">{s.rollNumber}</td>
                            <td className="p-3 font-sans text-[#F1F3ED]">{s.name}</td>
                            <td className="p-3 text-[#C6F36B]">{s.email}</td>
                            <td className="p-3 font-sans text-[#A0A89F]">{s.department}</td>
                            <td className="p-3 font-sans">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#72D6A0]/10 text-[#72D6A0] text-[10px] font-semibold border border-[#72D6A0]/20">
                                Ready to Register
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Existing Database Conflicts */}
              {activeTab === 'existing' && (
                <div className="overflow-x-auto rounded-xl border border-[#303831]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171B18]/80 text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                      <tr>
                        <th className="p-3">Row</th>
                        <th className="p-3">Roll Number</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Conflict Reason</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303831]/60">
                      {previewData.existingConflicts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#A0A89F] font-sans">
                            No existing database conflicts detected.
                          </td>
                        </tr>
                      ) : (
                        previewData.existingConflicts.map((c) => (
                          <tr key={c.rowNumber} className="hover:bg-[#171B18]/40">
                            <td className="p-3 font-mono text-[#A0A89F]">#{c.rowNumber}</td>
                            <td className="p-3 font-mono font-bold text-[#F0BC65]">{c.rollNumber}</td>
                            <td className="p-3 font-mono text-[#F1F3ED]">{c.email}</td>
                            <td className="p-3 text-[#F1F3ED]">{c.name}</td>
                            <td className="p-3 text-[#F0BC65]/90">{c.detail}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0BC65]/10 text-[#F0BC65] text-[10px] font-semibold border border-[#F0BC65]/20">
                                Will be safely skipped
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Duplicate Rows in CSV */}
              {activeTab === 'duplicates' && (
                <div className="overflow-x-auto rounded-xl border border-[#303831]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171B18]/80 text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                      <tr>
                        <th className="p-3">Row</th>
                        <th className="p-3">Roll Number</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Duplicate Field</th>
                        <th className="p-3">Original Occurrence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303831]/60 font-mono">
                      {previewData.duplicatesInCsv.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#A0A89F] font-sans">
                            No internal CSV duplicates found.
                          </td>
                        </tr>
                      ) : (
                        previewData.duplicatesInCsv.map((d) => (
                          <tr key={d.rowNumber} className="hover:bg-[#171B18]/40">
                            <td className="p-3 text-[#A0A89F]">#{d.rowNumber}</td>
                            <td className="p-3 font-bold text-[#F1F3ED]">{d.rollNumber}</td>
                            <td className="p-3 text-[#F1F3ED]">{d.email}</td>
                            <td className="p-3 text-[#A0A89F]">{d.duplicateField}</td>
                            <td className="p-3 text-[#A0A89F] font-sans">
                              Matches Row #{d.originalRowNumber} inside this CSV
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Invalid Rows */}
              {activeTab === 'invalid' && (
                <div className="overflow-x-auto rounded-xl border border-[#303831]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171B18]/80 text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                      <tr>
                        <th className="p-3">Row</th>
                        <th className="p-3">Field</th>
                        <th className="p-3">Provided Value</th>
                        <th className="p-3">Validation Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303831]/60 font-sans">
                      {previewData.invalidRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[#A0A89F]">
                            All rows passed syntax and format validation.
                          </td>
                        </tr>
                      ) : (
                        previewData.invalidRows.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-[#171B18]/40">
                            <td className="p-3 font-mono text-[#FF7777] font-bold">#{inv.rowNumber}</td>
                            <td className="p-3 font-semibold text-[#F1F3ED]">{inv.field}</td>
                            <td className="p-3 font-mono text-[#F1F3ED]">{inv.value || 'EMPTY'}</td>
                            <td className="p-3 text-[#FF7777] font-medium">{inv.message}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 5: All Rows Overview */}
              {activeTab === 'all' && (
                <div className="overflow-x-auto rounded-xl border border-[#303831]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171B18]/80 text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                      <tr>
                        <th className="p-3">Row</th>
                        <th className="p-3">Roll Number</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Institutional Email</th>
                        <th className="p-3">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303831]/60 font-mono">
                      {previewData.newStudents.map((s) => (
                        <tr key={s.rowNumber} className="hover:bg-[#171B18]/40">
                          <td className="p-3 text-[#A0A89F]">#{s.rowNumber}</td>
                          <td className="p-3 font-bold text-[#F1F3ED]">{s.rollNumber}</td>
                          <td className="p-3 font-sans text-[#F1F3ED]">{s.name}</td>
                          <td className="p-3 text-[#C6F36B]">{s.email}</td>
                          <td className="p-3 font-sans">
                            <span className="text-[#72D6A0] font-semibold">New Registration</span>
                          </td>
                        </tr>
                      ))}
                      {previewData.existingConflicts.map((c) => (
                        <tr key={c.rowNumber} className="hover:bg-[#171B18]/40">
                          <td className="p-3 text-[#A0A89F]">#{c.rowNumber}</td>
                          <td className="p-3 font-bold text-[#F0BC65]">{c.rollNumber}</td>
                          <td className="p-3 font-sans text-[#F1F3ED]">{c.name}</td>
                          <td className="p-3 text-[#F1F3ED]">{c.email}</td>
                          <td className="p-3 font-sans">
                            <span className="text-[#F0BC65] font-semibold">DB Conflict (Skipped)</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Step 3: Confirmation Bar */}
              <div className="pt-4 border-t border-[#303831] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#A0A89F] max-w-xl">
                  <p className="font-semibold text-[#F1F3ED]">
                    Database Transaction Guarantee:
                  </p>
                  <p className="mt-0.5">
                    Clicking &ldquo;Confirm & Register Students&rdquo; will create{' '}
                    <strong className="text-[#72D6A0]">{previewData.validNewCount} new student records</strong> in PostgreSQL. Existing records and duplicate entries will be skipped without error.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={handleReset}
                    disabled={importLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-xs font-semibold text-[#F1F3ED] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importLoading || previewData.validNewCount === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-40 text-[#101211] text-xs font-bold transition-all shadow-lg shadow-[#C6F36B]/20"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Student Records...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        Confirm & Register {previewData.validNewCount} Students
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Import Batch Audit History Section */}
          <div className="rounded-xl border border-[#303831] bg-[#171B18]/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#C6F36B]" />
                <h3 className="text-base font-bold text-[#F1F3ED]">Recent Registration Import Batches</h3>
              </div>
              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="text-xs text-[#A0A89F] hover:text-[#C6F36B] flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#303831]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171B18]/80 text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                  <tr>
                    <th className="p-3">Date (IST)</th>
                    <th className="p-3">Filename / Source</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Processed</th>
                    <th className="p-3">Registered</th>
                    <th className="p-3">Skipped</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303831]/60 font-mono">
                  {historyBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-[#A0A89F] font-sans">
                        No bulk student import batches recorded yet.
                      </td>
                    </tr>
                  ) : (
                    historyBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-[#171B18]/40">
                        <td className="p-3 text-[#F1F3ED]">
                          {new Date(b.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="p-3 font-sans text-[#F1F3ED]">{b.filename || 'Google Sheets CSV'}</td>
                        <td className="p-3 text-[#A0A89F]">{b.admin?.email || 'Admin'}</td>
                        <td className="p-3 text-[#F1F3ED] font-bold">{b.totalRows}</td>
                        <td className="p-3 text-[#72D6A0] font-bold">{b.createdCount}</td>
                        <td className="p-3 text-[#F0BC65]">{b.skippedCount}</td>
                        <td className="p-3 font-sans">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              b.status === 'SUCCESS'
                                ? 'bg-[#72D6A0]/10 text-[#72D6A0] border border-[#72D6A0]/20'
                                : b.status === 'PARTIAL'
                                ? 'bg-[#F0BC65]/10 text-[#F0BC65] border border-[#F0BC65]/20'
                                : 'bg-[#FF7777]/10 text-[#FF7777] border border-[#FF7777]/20'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
