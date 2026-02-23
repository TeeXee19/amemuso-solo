import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getConfigs, getRegistrations, registerSoloist, updateMaxSlots } from './lib/db';
import {
  User, Check, AlertCircle, Loader2, Music, Users,
  ChevronRight, LayoutDashboard, Search, Filter,
  Download, Settings, Info, TrendingUp, PieChart,
  ArrowRight, LogOut, Grid, Calendar, Clock, RotateCcw,
  ChevronDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

// --- Components ---

function SetupGuide() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0d17] text-white p-6 font-sans">
      <div className="max-w-md w-full glass p-8 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
          <Settings className="text-white" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Database Connection Required</h2>
        <p className="text-slate-400 mb-8 leading-relaxed text-sm">
          Please connect your Supabase project. The schema is available in <code className="text-indigo-400 bg-white/5 px-1.5 py-0.5 rounded">supabase_schema.sql</code>.
        </p>
      </div>
    </div>
  );
}

// --- Shared Layout ---

function Layout({ children, title, subtitle }: any) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#0b0d17] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Top Navbar */}
      <header className="px-8 py-4 flex justify-between items-center bg-[#131521]/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <button className="text-slate-500 hover:text-white mr-2 flex items-center justify-center"><ChevronRight className="rotate-180" size={16} /></button>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:scale-105 transition-transform">
              <Music className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">AMEMUSO COMPULSORY Solo</h1>
          </Link>
        </div>

        <nav className="flex items-center gap-2">
          <div className="flex bg-[#0b0d17] p-1 rounded-xl border border-white/5 mr-4">
            <button
              onClick={() => navigate('/')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                location.pathname === '/' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
              )}
            >
              Registration <ChevronDown size={14} className="opacity-40" />
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
  const [selectedSlot, setSelectedSlot] = useState<number | null>(43); // Selected for demo default as image shows
  const [fullName, setFullName] = useState('');
  const [voicePart, setVoicePart] = useState('Tenor');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const [configs, regs] = await Promise.all([getConfigs(), getRegistrations()]);
      if (configs.max_slots) setMaxSlots(parseInt(configs.max_slots));
      setRegistrations(regs);
    } catch (err) {
      setError('Connection Error');
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
    setError(null);
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
      setError('Failed to sync with server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

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
          <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-8 relative overflow-hidden">

            {/* Header / Search Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full">
              <div>
                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Pick Your Performance Slot</h2>
                <p className="text-slate-400 text-sm">Select an available slots from the grid below.</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  placeholder="Search slot number..."
                  className="w-full bg-[#0b0d17] border border-white/5 rounded-2xl pr-12 pl-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Filters row with Time & Progress */}
            <div className="flex flex-wrap items-center justify-between gap-6 z-10 relative">
              <div className="flex items-center gap-6">
                {/* Voice part filters */}
                <div className="flex bg-[#0b0d17] p-1 rounded-2xl border border-white/5">
                  {['All', ...VOICE_PARTS].map(p => (
                    <button
                      key={p}
                      onClick={() => setActiveVoiceTab(p)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
                        activeVoiceTab === p ? "bg-indigo-600 text-white/90 shadow-lg glow-indigo" : "text-slate-500 hover:text-white"
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
                <span className="text-xs font-black text-white">{currentPercentage}%</span>
                <div className="flex gap-[2px] items-end h-3">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className={cn("w-[2px] rounded-sm", i < filledBars ? "bg-indigo-600 h-[12px]" : "bg-white/10 h-[8px]")} />
                  ))}
                </div>
              </div>
            </div>

            {/* Info Row: Avail stats + Right search */}
            <div className="flex items-center justify-between bg-[#0b0d17] border border-white/5 rounded-2xl p-4 z-10 relative">
              <div className="text-[11px] font-bold text-slate-400 tracking-wide">
                Available: <span className="text-white">{stats.available}</span> &nbsp;&nbsp;•&nbsp;&nbsp; Reserved: <span className="text-white">{stats.reserved}</span> &nbsp;&nbsp;•&nbsp;&nbsp; Total: <span className="text-white">{stats.total}</span>
              </div>
              <div className="relative w-full md:w-64 max-w-[200px]">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input
                  placeholder="Search slot number..."
                  className="w-full bg-[#131521] border border-white/5 rounded-xl pr-10 pl-4 py-2 text-xs focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Slot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-8 gap-4 z-10 relative">
              {Array.from({ length: maxSlots }, (_, i) => {
                const displayId = i + 1;
                let isTaken = false;
                if (isDemo && [12, 23, 40].includes(displayId)) isTaken = true;
                if (!isDemo && registrations.some(r => r.slot_id === displayId)) isTaken = true;

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
                          ? "bg-[#11131f]/50 border-[#11131f] text-slate-700"
                          : "bg-[#11131f] border-transparent hover:border-white/10"
                    )}
                  >
                    <span className="text-[17px] font-black tracking-tight text-white group-disabled:text-slate-500 leading-none mt-1 mb-4">S-{displayId}</span>

                    <div className="flex items-center gap-1.5 mt-auto">
                      <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center", isTaken ? "bg-amber-600/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500")}>
                        {isTaken ? <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> : <Check size={10} className="opacity-90" strokeWidth={3} />}
                      </div>
                      <span className={cn("text-[10px] font-black uppercase tracking-wider", isTaken ? "text-amber-500/80" : "text-slate-400")}>{isTaken ? 'Reserved' : 'Available'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Details / Form */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-10">
          <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
            {/* Top right purple glow matching the image */}
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none" />

            <h3 className="text-lg font-black text-white px-2 mb-6">Selected Slot</h3>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex flex-col items-center text-center gap-4"
                >
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center glow-emerald">
                    <Check size={40} className="text-slate-950" />
                  </div>
                  <h4 className="text-xl font-black text-white uppercase italic">Reserved!</h4>
                  <p className="text-xs text-slate-400">Your performance slot is confirmed.</p>
                </motion.div>
              ) : selectedSlot ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col flex-1"
                >
                  <div className="p-6 bg-[#131521] border border-white/5 rounded-[1.5rem] relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.5)] mb-8">
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-14 h-14 bg-indigo-600/20 rounded-[1.1rem] flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                        <Grid size={24} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-[28px] font-black text-white leading-none tracking-tight">S-{selectedSlot}</h4>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 ml-1 relative z-10">
                      <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-emerald-500 shadow-lg shadow-emerald-500/30">
                        <Check size={12} className="text-black" strokeWidth={3} />
                      </div>
                      <span className="text-[15px] font-medium text-slate-400 tracking-wide ml-1">Available</span>
                    </div>
                  </div>

                  <form onSubmit={handleRegister} className="flex flex-col flex-1">
                    <div className="space-y-4 mb-8">
                      <h5 className="text-[14px] font-bold text-white mb-4">Performer Details</h5>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Full Name</label>
                          <input
                            required
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="e.g. Samuel Adewale"
                            className="w-full bg-[#131521] border border-white/5 rounded-xl px-5 py-3.5 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Voice Part</label>
                          <div className="flex bg-[#131521] p-1.5 rounded-xl border border-white/5">
                            {VOICE_PARTS.map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setVoicePart(p)}
                                className={cn(
                                  "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
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
                        disabled={submitting}
                        className="w-full bg-gradient-to-b from-[#638F75] to-[#426150] text-[#E0EFE6] font-bold py-4 rounded-xl transition-all shadow-[0_8px_30px_rgba(66,97,80,0.4)] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 text-[16px] border border-[#6F9E82]/50 hover:brightness-110"
                      >
                        {submitting ? <Loader2 size={24} className="animate-spin" /> : null}
                        {submitting ? 'Processing...' : 'Reserve Now'}
                      </button>

                      {error && (
                        <div className="p-5 bg-[#3B2824] border border-[#4A322C] rounded-[1rem] flex flex-col gap-3 shadow-inner">
                          <div className="flex items-center gap-3 text-[#E6A96C] font-bold text-sm">
                            <AlertCircle size={18} /> Connection Issue
                          </div>
                          <p className="text-[13px] text-slate-300 leading-relaxed font-medium">We couldn't sync with the server.</p>
                          <div className="flex justify-center mt-2">
                            <button type="button" onClick={fetchData} className="px-6 py-2 bg-[#422C28] border border-white/5 rounded-xl text-xs font-semibold text-[#D8B6AF] transition-all hover:bg-white/5 active:scale-95">Retry</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </motion.div>
              ) : (
                <div className="p-12 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-6 mt-[20%]">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-700">
                    <Grid size={32} />
                  </div>
                  <p className="text-sm text-slate-500 italic leading-relaxed">Select any available slot from the grid <br />to view details and register.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  const filtered = registrations.filter(r =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.voice_part.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.slot_id - b.slot_id);

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
        <div className="lg:col-span-12 glass p-8 rounded-[2.5rem] border-white/5 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex bg-[#0b0d17] p-1 rounded-2xl border border-white/5">
              <button onClick={() => setActiveTab('list')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all", activeTab === 'list' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500")}>Member List</button>
              <button onClick={() => setActiveTab('settings')} className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all", activeTab === 'settings' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500")}>App Settings</button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {activeTab === 'list' && (
                <button
                  onClick={handleDownloadCSV}
                  className="flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-2xl text-sm font-bold transition-all whitespace-nowrap"
                >
                  <Download size={16} /> Export CSV
                </button>
              )}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  placeholder="Search name or voice part..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b0d17] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {activeTab === 'list' ? (
            <div className="overflow-x-auto rounded-3xl border border-white/5">
              <table className="w-full text-left">
                <thead className="bg-[#0b0d17] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-8 py-5">Slot</th>
                    <th className="px-8 py-5">Full Name</th>
                    <th className="px-8 py-5">Voice Part</th>
                    <th className="px-8 py-5 text-right">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-5">
                        <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black text-indigo-400 text-xs">
                          S-{r.slot_id}
                        </div>
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-200">{r.full_name}</td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          r.voice_part === 'Soprano' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                          r.voice_part === 'Alto' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                          r.voice_part === 'Tenor' && "bg-sky-500/10 text-sky-400 border border-sky-500/20",
                          r.voice_part === 'Bass' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        )}>
                          {r.voice_part}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right text-xs font-bold text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-w-md space-y-10 py-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Settings size={18} className="text-indigo-400" />
                  <h4 className="font-black text-white uppercase tracking-widest text-xs">Capacity Management</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed px-1">Adjust the total number of registration slots available for this event.</p>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={maxSlots}
                    onChange={e => setMaxSlots(parseInt(e.target.value))}
                    className="flex-1 bg-[#0b0d17] border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all font-bold"
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
        <Route path="/" element={<PublicView />} />
        <Route path="/admin" element={<AdminView />} />
      </Routes>
    </BrowserRouter>
  );
}
