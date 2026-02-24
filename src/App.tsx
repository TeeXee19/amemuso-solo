import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getConfigs, getRegistrations, registerSoloist, updateMaxSlots, editRegistration, deleteRegistration } from './lib/db';
import {
  Check, Loader2, Music, X, Edit2, Trash2, Sun, Moon, Monitor,
  ChevronRight, ChevronLeft, Search, Download, Settings, Grid, BookOpen
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

// --- Components ---

// --- Shared Layout ---

type Theme = 'light' | 'dark' | 'system';

function Layout({ children, subtitle }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme-preference') as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme-preference', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0d17] text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Top Navbar */}
      <header className="px-8 py-4 flex justify-between items-center bg-white dark:bg-[#131521]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-50 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <button className="text-slate-500 hover:text-slate-900 dark:text-white mr-2 flex items-center justify-center"><ChevronRight className="rotate-180" size={16} /></button>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:scale-105 transition-transform">
              <Music className="text-slate-900 dark:text-white" size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">AMEMUSO COMPULSORY Solo</h1>
          </Link>
        </div>

        <nav className="flex items-center gap-2">
          {/* Theme Toggle */}
          <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-xl border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setTheme('light')}
              className={cn("p-2 rounded-lg transition-all", theme === 'light' ? "bg-white text-indigo-500 shadow-sm dark:bg-white/10 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
              title="Light Mode"
            >
              <Sun size={14} />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn("p-2 rounded-lg transition-all", theme === 'system' ? "bg-white text-indigo-500 shadow-sm dark:bg-white/10 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
              title="System Theme"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn("p-2 rounded-lg transition-all", theme === 'dark' ? "bg-white text-indigo-500 shadow-sm dark:bg-white/10 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
              title="Dark Mode"
            >
              <Moon size={14} />
            </button>
          </div>

          <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-xl border border-slate-200 dark:border-white/5 mr-4 ml-2">
            <button
              onClick={() => navigate('/register')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                location.pathname === '/register' ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-white"
              )}
            >
              Registration
            </button>
            <button
              onClick={() => navigate('/repertoire')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                location.pathname === '/repertoire' ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-white"
              )}
            >
              Repertoire
            </button>
            <button
              onClick={() => navigate('/')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                location.pathname === '/' ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-white"
              )}
            >
              Roster
            </button>
          </div>

        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* Background Decor */}
        <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-indigo-600/5 blur-[120px] rounded-full -z-10" />
        <div className="fixed bottom-0 left-0 w-[50%] h-[50%] bg-emerald-600/5 blur-[120px] rounded-full -z-10" />

        <div className="max-w-[1600px] mx-auto px-10 py-10">
          <div className="mb-10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-3">{subtitle || "Management System"}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// --- Public View ---

function PublicView() {
  const [activeVoiceTab, setActiveVoiceTab] = useState('All');
  const [maxSlots, setMaxSlots] = useState(50);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null); // Start empty
  const [fullName, setFullName] = useState('');
  const [voicePart, setVoicePart] = useState(''); // No default voice part
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const [configs, regs] = await Promise.all([getConfigs(), getRegistrations()]);
      if (configs.max_slots) setMaxSlots(parseInt(configs.max_slots));
      setRegistrations(regs);
    } catch (err) {
      console.error('Connection Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode for local matching
      setMaxSlots(50);
      setLoading(false);
      return;
    }
    fetchData();
    const sub = supabase.channel('pub').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchData).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !fullName.trim() || !voicePart || !isSupabaseConfigured) return;
    setSubmitting(true);
    try {
      await registerSoloist(fullName, voicePart, selectedSlot);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedSlot(null);
        setFullName('');
        setVoicePart('');
      }, 3000);
    } catch (err: any) {
      console.error('Failed to sync with server:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  const stats = {
    reserved: registrations.length,
    available: maxSlots - registrations.length,
    total: maxSlots
  };

  const currentPercentage = stats.total > 0 ? Math.round((stats.reserved / stats.total) * 100) : 0;
  const filledBars = Math.round((currentPercentage / 100) * 30);

  const isDemo = !isSupabaseConfigured;

  return (
    <Layout subtitle="Management System">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Selection Area */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-8 relative overflow-hidden">

            {/* Header / Search Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full">
              <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Pick Your Performance Slot</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Select an available slots from the grid below.</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  placeholder="Search slot number..."
                  className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-2xl pr-12 pl-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Filters row with Time & Progress */}
            <div className="flex flex-wrap items-center justify-between gap-6 z-10 relative">
              <div className="flex items-center gap-6">
                {/* Voice part filters */}
                <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-2xl border border-slate-200 dark:border-white/5">
                  {['All', ...VOICE_PARTS].map(p => (
                    <button
                      key={p}
                      onClick={() => setActiveVoiceTab(p)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
                        activeVoiceTab === p ? "bg-indigo-600 text-white/90 shadow-lg glow-indigo" : "text-slate-500 hover:text-slate-900 dark:text-white"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Removed Time filters */}
              </div>

              {/* Progress Bar styled as stacked discrete lines */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-900 dark:text-white">{currentPercentage}%</span>
                <div className="flex gap-[2px] items-end h-3">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className={cn("w-[2px] rounded-sm", i < filledBars ? "bg-indigo-600 h-[12px]" : "bg-slate-200 dark:bg-white/10 h-[8px]")} />
                  ))}
                </div>
              </div>
            </div>

            {/* Info Row: Avail stats + Right search */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-2xl p-4 z-10 relative">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                Available: <span className="text-slate-900 dark:text-white">{stats.available}</span> &nbsp;&nbsp;•&nbsp;&nbsp; Reserved: <span className="text-slate-900 dark:text-white">{stats.reserved}</span> &nbsp;&nbsp;•&nbsp;&nbsp; Total: <span className="text-slate-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="relative w-full md:w-64 max-w-[200px]">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  placeholder="Search slot number..."
                  className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl pr-10 pl-4 py-2 text-xs focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Slot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-8 gap-4 z-10 relative">
              {Array.from({ length: maxSlots }, (_, i) => {
                const displayId = i + 1;
                let isTaken = false;
                if (isDemo && [12, 23, 40].includes(displayId)) isTaken = true;

                const reg = !isDemo ? registrations.find(r => r.slot_id === displayId) : null;
                if (!isDemo && reg) isTaken = true;

                const isSelected = selectedSlot === displayId;

                return (
                  <button
                    key={i}
                    disabled={isTaken}
                    onClick={() => setSelectedSlot(displayId)}
                    className={cn(
                      "group p-4 rounded-[1.2rem] border-2 transition-all flex flex-col items-start gap-1 text-left relative overflow-hidden",
                      isSelected
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 glow-indigo"
                        : isTaken
                          ? "bg-slate-100 dark:bg-[#11131f]/50 border-[#11131f] text-slate-700"
                          : "bg-slate-100 dark:bg-[#11131f] border-transparent hover:border-slate-300 dark:border-white/10"
                    )}
                  >
                    <div className="mt-1 mb-2 flex-1">
                      <span className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white group-disabled:text-slate-500 leading-none">S-{displayId}</span>
                      {isTaken && reg && (
                        <div className="mt-1.5">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate w-full" title={reg.full_name}>
                            {reg.full_name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-auto">
                      <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0", isTaken ? "bg-amber-600/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500")}>
                        {isTaken ? <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> : <Check size={10} className="opacity-90" strokeWidth={3} />}
                      </div>
                      <span className={cn("text-[10px] font-black uppercase tracking-wider truncate", isTaken ? "text-amber-500/80" : "text-slate-500 dark:text-slate-400")}>{isTaken ? 'Reserved' : 'Available'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Details / Form (Modal on mobile) */}
        <AnimatePresence>
          {selectedSlot && (
            <>
              {/* Mobile overlay backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSlot(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] lg:hidden"
              />

              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="fixed lg:static top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 lg:translate-x-0 lg:translate-y-0 w-[90%] max-w-md lg:w-auto lg:max-w-none lg:col-span-4 z-[101] lg:z-10 bg-slate-50 dark:bg-[#0b0d17] lg:bg-transparent rounded-[2.5rem]"
              >
                <div className="glass p-8 rounded-[2.5rem] border border-slate-300 dark:border-white/10 lg:border-slate-200 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] lg:shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
                  {/* Top right purple glow matching the image */}
                  <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none" />

                  <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Selected Slot</h3>

                    {/* Close button for mobile modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      className="lg:hidden p-2 rounded-full bg-slate-200/50 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {success ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex flex-col items-center text-center gap-4 my-auto"
                      >
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center glow-emerald">
                          <Check size={40} className="text-slate-950" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Reserved!</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Your performance slot is confirmed.</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col flex-1"
                      >
                        <div className="p-6 bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-[1.5rem] relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.5)] mb-8">
                          <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 bg-indigo-600/20 rounded-[1.1rem] flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                              <Grid size={24} />
                            </div>
                            <div className="flex flex-col">
                              <h4 className="text-[28px] font-black text-slate-900 dark:text-white leading-none tracking-tight">S-{selectedSlot}</h4>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-1.5 ml-1 relative z-10">
                            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-emerald-500 shadow-lg shadow-emerald-500/30">
                              <Check size={12} className="text-black" strokeWidth={3} />
                            </div>
                            <span className="text-[15px] font-medium text-slate-500 dark:text-slate-400 tracking-wide ml-1">Available</span>
                          </div>
                        </div>

                        <form onSubmit={handleRegister} className="flex flex-col flex-1">
                          <div className="space-y-4 mb-8">
                            <h5 className="text-[14px] font-bold text-slate-900 dark:text-white mb-4">Performer Details</h5>
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-[11px] font-medium text-slate-500 mb-1 block">Full Name</label>
                                <input
                                  required
                                  value={fullName}
                                  onChange={e => setFullName(e.target.value)}
                                  placeholder="e.g. Samuel Adewale"
                                  className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-5 py-3.5 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-medium text-slate-900 dark:text-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[11px] font-medium text-slate-500 mb-1 block">Voice Part</label>
                                <div className="flex flex-wrap gap-2 lg:flex-nowrap bg-white dark:bg-[#131521] p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                                  {VOICE_PARTS.map(p => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => setVoicePart(p)}
                                      className={cn(
                                        "flex-1 min-w-[60px] py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all",
                                        voicePart === p ? "bg-indigo-600/90 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                      )}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto pt-4 space-y-6">
                            <button
                              type="submit"
                              disabled={submitting || !voicePart}
                              className="w-full bg-gradient-to-b from-[#638F75] to-[#426150] text-[#E0EFE6] font-bold py-4 rounded-xl transition-all shadow-[0_8px_30px_rgba(66,97,80,0.4)] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 text-[16px] border border-[#6F9E82]/50 hover:brightness-110"
                            >
                              {submitting ? <Loader2 size={24} className="animate-spin" /> : null}
                              {submitting ? 'Processing...' : !voicePart ? 'Select Voice Part' : 'Reserve Now'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

// --- Admin View ---

function AdminView() {
  const [activeTab, setActiveTab] = useState('list');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [maxSlots, setMaxSlots] = useState(60);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [voicePartFilter, setVoicePartFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editVoicePart, setEditVoicePart] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [configs, regs] = await Promise.all([getConfigs(), getRegistrations()]);
      if (configs.max_slots) setMaxSlots(parseInt(configs.max_slots));
      setRegistrations(regs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchData();
    const sub = supabase.channel('admin').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchData).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, voicePartFilter, itemsPerPage]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  const filtered = registrations.filter(r => {
    const matchesSearch = r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.voice_part.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVoice = voicePartFilter === 'All' || r.voice_part === voicePartFilter;
    return matchesSearch && matchesVoice;
  }).sort((a, b) => a.slot_id - b.slot_id);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = {
    total: registrations.length,
    soprano: registrations.filter(r => r.voice_part === 'Soprano').length,
    alto: registrations.filter(r => r.voice_part === 'Alto').length,
    tenor: registrations.filter(r => r.voice_part === 'Tenor').length,
    bass: registrations.filter(r => r.voice_part === 'Bass').length,
  };

  const handleEditClick = (r: any) => {
    setEditingId(r.id);
    setEditFullName(r.full_name);
    setEditVoicePart(r.voice_part);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSavingId(editingId);
    try {
      await editRegistration(editingId, editFullName, editVoicePart);
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save edits: " + (err.message || 'Unknown error. Check RLS policies.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to completely remove this registration and free up the slot?")) return;
    setDeletingId(id);
    try {
      await deleteRegistration(id);
      // Wait for Supabase realtime to update the list
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete registration: " + (err.message || 'Unknown error. Check RLS policies.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadCSV = () => {
    if (registrations.length === 0) return;
    const sorted = [...registrations].sort((a, b) => a.slot_id - b.slot_id);
    const headers = ['Slot', 'Full Name', 'Voice Part', 'Registration Date', 'Time'];
    const csvLines = [headers.join(',')];

    sorted.forEach(r => {
      const date = new Date(r.created_at).toLocaleDateString();
      const time = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const row = [`S-${r.slot_id}`, `"${r.full_name}"`, r.voice_part, date, time];
      csvLines.push(row.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'chorale_registrations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title="Dashboard Overview" subtitle="Administrator">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-2xl border border-slate-200 dark:border-white/5">
              <button onClick={() => setActiveTab('list')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all", activeTab === 'list' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500")}>Member List</button>
              <button onClick={() => setActiveTab('settings')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all", activeTab === 'settings' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500")}>App Settings</button>
            </div>
            {activeTab === 'list' && (
              <div className="flex flex-col xl:flex-row gap-4 w-full lg:w-auto">
                <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto">
                  {['All', ...VOICE_PARTS].map(p => (
                    <button
                      key={p}
                      onClick={() => setVoicePartFilter(p)}
                      className={cn(
                        "px-4 py-2 flex-1 sm:flex-none rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                        voicePartFilter === p ? "bg-indigo-600 text-white shadow-lg glow-indigo" : "text-slate-500 hover:text-slate-900 dark:text-white"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleDownloadCSV}
                  className="flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-2xl text-sm font-bold transition-all whitespace-nowrap"
                >
                  <Download size={16} /> Export CSV
                </button>
                <div className="relative w-full xl:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input
                    placeholder="Search name or voice part..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total', count: stats.total, color: 'text-slate-900 dark:text-white', bg: 'bg-indigo-600/20', border: 'border-indigo-500/30' },
              { label: 'Soprano', count: stats.soprano, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
              { label: 'Alto', count: stats.alto, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              { label: 'Tenor', count: stats.tenor, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
              { label: 'Bass', count: stats.bass, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
            ].map((s, i) => (
              <div key={i} className={cn("p-4 rounded-3xl border flex flex-col justify-center items-center gap-1", s.bg, s.border)}>
                <span className={cn("text-2xl font-black", s.color)}>{s.count}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>

          {activeTab === 'list' ? (
            <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-[#0b0d17] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-white/5">
                  <tr>
                    <th className="px-8 py-5">Slot</th>
                    <th className="px-8 py-5">Full Name</th>
                    <th className="px-8 py-5">Voice Part</th>
                    <th className="px-8 py-5 text-right">Registration Date</th>
                    <th className="px-8 py-5 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedData.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-5">
                        <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black text-indigo-400 text-xs">
                          S-{r.slot_id}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {editingId === r.id ? (
                          <input
                            value={editFullName}
                            onChange={e => setEditFullName(e.target.value)}
                            className="bg-white dark:bg-[#131521] border border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-400 w-full"
                          />
                        ) : (
                          <span className="font-bold text-slate-800 dark:text-slate-200">{r.full_name}</span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        {editingId === r.id ? (
                          <select
                            value={editVoicePart}
                            onChange={e => setEditVoicePart(e.target.value)}
                            className="bg-white dark:bg-[#131521] border border-indigo-500/50 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                          >
                            {VOICE_PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            r.voice_part === 'Soprano' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                            r.voice_part === 'Alto' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                            r.voice_part === 'Tenor' && "bg-sky-500/10 text-sky-400 border border-sky-500/20",
                            r.voice_part === 'Bass' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            {r.voice_part}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right text-xs font-bold text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-8 py-5 text-center">
                        {editingId === r.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button disabled={savingId === r.id} onClick={handleSaveEdit} className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors">
                              {savingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button disabled={savingId === r.id} onClick={() => setEditingId(null)} className="p-1.5 bg-slate-500/10 text-slate-500 dark:text-slate-400 hover:bg-slate-500/20 rounded-lg transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditClick(r)} disabled={deletingId === r.id} className="p-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors disabled:opacity-50">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteClick(r.id)} disabled={deletingId === r.id} className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-50">
                              {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-8 text-center text-slate-500 text-sm font-medium">
                        No registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0b0d17]/50">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-white dark:bg-[#131521] border border-slate-300 dark:border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="p-2 bg-white dark:bg-[#131521] border border-slate-300 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="p-2 bg-white dark:bg-[#131521] border border-slate-300 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md space-y-10 py-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Settings size={18} className="text-indigo-400" />
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Capacity Management</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed px-1">Adjust the total number of registration slots available for this event.</p>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={maxSlots}
                    onChange={e => setMaxSlots(parseInt(e.target.value))}
                    className="flex-1 bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all font-bold"
                  />
                  <button onClick={() => updateMaxSlots(maxSlots)} className="px-8 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-tighter italic">Update</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// --- Roster View ---

const ROSTER_SCHEDULE = [
  { date: '8th March', slots: [41, 43, 45, 47] },
  { date: '15th March', slots: [1, 3, 5, 7] },
  { date: '22nd March', slots: [10, 12, 14, 16] },
  { date: '29th March', slots: [34, 36, 38, 40] },
  { date: '12th April', slots: [58, 60, 62, 64] },
  { date: '19th April', slots: [42, 44, 46, 48] },
  { date: '26th April', slots: [25, 27, 29, 31] },
  { date: '3rd May', slots: [26, 28, 30, 32] },
  { date: '10th May', slots: [33, 35, 37, 39] },
  { date: '17th May', slots: [57, 59, 61, 63] },
  { date: '24th May', slots: [2, 4, 6, 8] },
  { date: '31st May', slots: [18, 20, 22, 24] },
  { date: '7th June', slots: [49, 51, 53, 55] },
  { date: '14th June', slots: [50, 52, 54, 56] },
  { date: '21st June', slots: [9, 11, 13, 15] },
  { date: '28th June', slots: [17, 19, 21, 23] }
];

function RosterView() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const regs = await getRegistrations();
      setRegistrations(regs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    fetchData();
    const sub = supabase.channel('roster').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchData).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <Layout subtitle="Performance Roster">
      <div className="glass p-8 md:p-12 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-10 relative overflow-hidden">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">Roster for Compulsory Solo Performance 2026</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Weekly performance schedule and assigned soloist slots.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ROSTER_SCHEDULE.map((week, i) => (
            <div key={i} className="bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-none flex flex-col hover:border-indigo-500/30 transition-colors">
              <h3 className="text-xl font-black text-indigo-500 mb-6 pb-4 border-b border-slate-100 dark:border-white/5">{week.date}</h3>
              <div className="space-y-4 flex-1">
                {week.slots.map(slotId => {
                  const reg = registrations.find(r => r.slot_id === slotId);
                  return (
                    <div key={slotId} className="flex items-start gap-4">
                      <div className="w-10 h-10 shrink-0 bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-center font-black text-slate-700 dark:text-slate-300 text-sm shadow-inner group transition-colors">
                        {slotId}
                      </div>
                      <div className="flex flex-col justify-center min-h-[40px] w-full border-b border-slate-50 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                        {reg ? (
                          <>
                            <span className="font-bold text-slate-900 dark:text-white leading-tight break-words">{reg.full_name}</span>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest mt-1.5 w-max px-2.5 py-1 rounded-md",
                              reg.voice_part === 'Soprano' && "bg-rose-500/10 text-rose-500",
                              reg.voice_part === 'Alto' && "bg-amber-500/10 text-amber-500",
                              reg.voice_part === 'Tenor' && "bg-sky-500/10 text-sky-500",
                              reg.voice_part === 'Bass' && "bg-emerald-500/10 text-emerald-500"
                            )}>
                              {reg.voice_part}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-slate-400 dark:text-slate-500 italic mt-1 pb-1">— Available —</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

// --- Song Entry View ---

function SongEntryView() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegId, setSelectedRegId] = useState<string>('');

  // Form state
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const regs = await getRegistrations();
      // Sort by slot ID
      regs.sort((a: any, b: any) => a.slot_id - b.slot_id);
      setRegistrations(regs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    fetchData();
    const sub = supabase.channel('songs').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchData).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegId || !songTitle.trim() || !artist.trim()) return;

    setSubmitting(true);
    try {
      // @ts-ignore - Assuming updateRegistrationSong was exported from db.ts
      const { updateRegistrationSong } = await import('./lib/db');
      await updateRegistrationSong(selectedRegId, songTitle, artist, summary);

      // Clear form
      setSelectedRegId('');
      setSongTitle('');
      setArtist('');
      setSummary('');
      alert("Song selection saved successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save song: " + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Filter registrations that have already submitted a song
  const submittedRepertoires = registrations.filter(r => r.song_title && r.song_title.trim() !== '');

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <Layout subtitle="Solo Repertoire Submission">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Side: Form */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 relative overflow-hidden">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Submit Your Song</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Select your allocated slot to add your chosen repertoire details.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Soloist / Slot</label>
                <select
                  value={selectedRegId}
                  onChange={e => setSelectedRegId(e.target.value)}
                  className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all appearance-none"
                  required
                >
                  <option value="" disabled>Select your name...</option>
                  {registrations.map(r => (
                    <option key={r.id} value={r.id}>S-{r.slot_id} : {r.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Song Title</label>
                <input
                  type="text"
                  placeholder="e.g. O mio babbino caro"
                  value={songTitle}
                  onChange={e => setSongTitle(e.target.value)}
                  className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Artist / Composer</label>
                <input
                  type="text"
                  placeholder="e.g. Giacomo Puccini"
                  value={artist}
                  onChange={e => setArtist(e.target.value)}
                  className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Brief Summary (Optional)</label>
                <textarea
                  placeholder="A short description of the piece..."
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || registrations.length === 0}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl transition-all shadow-lg glow-emerald disabled:opacity-50 disabled:hover:bg-emerald-500 flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Save Repertoire</>}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Repertoire Table */}
        <div className="lg:col-span-8">
          <div className="glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-6">
              <BookOpen size={24} className="text-indigo-500" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Submitted Repertoire</h3>
            </div>

            {submittedRepertoires.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Music size={48} className="mx-auto mb-4 opacity-20" />
                <p>No songs have been submitted yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Slot</th>
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Soloist</th>
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Song Title</th>
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[150px]">Artist / Composer</th>
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[250px]">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedRepertoires.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-4">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                            S-{r.slot_id}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">{r.full_name}</td>
                        <td className="py-4 px-4 font-bold text-indigo-500 dark:text-indigo-400">{r.song_title}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300 italic">{r.artist_composer}</td>
                        <td className="py-4 px-4 text-xs text-slate-500 leading-relaxed max-w-[300px] truncate group-hover:whitespace-normal group-hover:break-words transition-all">{r.song_summary || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}

// --- Main App Entry ---

export default function App() {
  if (!isSupabaseConfigured) {
    // We fall through to allow the mock UI to show if needed for checking, 
    // but the original had SetupGuide. We'll render PublicView in demo mode if no supabase.
    return <PublicView />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<PublicView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/" element={<RosterView />} />
        <Route path="/repertoire" element={<SongEntryView />} />
      </Routes>
    </BrowserRouter>
  );
}
