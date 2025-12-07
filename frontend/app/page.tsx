'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setDownloadUrl(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/convert', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed');
      }

      setDownloadUrl(data.downloadUrl);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-zinc-900 to-black text-white font-sans selection:bg-blue-500 selection:text-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">P</div>
          <span className="text-xl font-bold tracking-tight">PDF<span className="text-blue-500">Converter</span></span>
        </div>
        <div>
          <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Contact
          </button>
        </div>
      </nav>

      <main className="flex min-h-screen flex-col items-center justify-center p-6 pt-24 relative overflow-hidden">

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl w-full flex flex-col items-center text-center z-10">

          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-400">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Fast & Secure Conversion
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Microservice <br />
            <span className="text-white">PDF Converter</span>
          </h1>

          <p className="max-w-2xl text-lg text-gray-400 mb-12">
            Transform your documents into professional PDFs with our high-speed backend service.
            Simple, efficient, and reliable.
          </p>

          {/* Card */}
          <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl ring-1 ring-white/10">
            <div className="bg-black/40 rounded-2xl p-6 md:p-8">

              {/* Dropzone */}
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".docx,.doc,.txt"
                  className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                />

                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${file ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 hover:border-gray-500 hover:bg-white/5'}`}>

                  {!file ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4 text-gray-400 group-hover:scale-110 transition-transform duration-300 group-hover:text-blue-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-300">
                        <span className="text-blue-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">DOCX, DOC or TXT</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 text-blue-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-white truncate max-w-full px-4">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                      <p className="text-xs text-blue-400 mt-2 hover:underline z-30 relative" onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFile(null);
                        setDownloadUrl(null);
                        setError(null);
                      }}>Change file</p>
                    </>
                  )}
                </div>
              </div>

              {/* Upload Status / Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6">
                {!downloadUrl ? (
                  <button
                    onClick={handleConvert}
                    disabled={!file || isUploading}
                    className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 transform active:scale-[0.98] ${!file
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : isUploading
                          ? 'bg-gray-700 text-white cursor-wait'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
                      }`}
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        Convert to PDF
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <a
                      href={downloadUrl}
                      download
                      className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 transform active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download PDF
                    </a>

                    <button
                      onClick={() => { setDownloadUrl(null); setFile(null); }}
                      className="text-xs text-gray-500 hover:text-white transition-colors py-2"
                    >
                      Convert another document
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
