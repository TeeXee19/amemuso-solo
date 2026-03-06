import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  getConfigs, getRegistrations, registerSoloist, updateMaxSlots, updateConfig, editRegistration, deleteRegistration, getRepertoires, addRepertoire, approveRepertoire, rejectRepertoire, deleteRepertoire, deleteAllRepertoires, updatePerformanceStatus, resetPerformanceStatus,
  getPerformanceWeeks,
  getWaitlist, joinWaitlist, deleteWaitlistEntry, getAdminUser,
  getMembers, addMember, updateMember, deleteMember, promoteMemberToFull, importRegistrationsToMembers, uploadMemberPhoto,
  getMemberPositions, addMemberPosition, deleteMemberPosition, getMemberHistory
} from './lib/db';
import {
  ChevronRight, ChevronLeft, Search, Download, Settings, Grid, BookOpen, Link as LinkIcon, ExternalLink, Menu, Activity,
  Users, Trash2, Loader2, X, Check, Music, Sun, Monitor, Moon, Edit2, Plus, Camera,
  Calendar, Briefcase, History, ShieldAlert, Archive, Youtube, Instagram, Facebook, Twitter, Video, Globe
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

// --- Components ---

function ErrorFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17] p-8 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto">
          <Activity size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Something went wrong</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">The application encountered an unexpected error. This usually happens if the database is still being configured or a table is missing.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 uppercase italic tracking-wider"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading, icon: Icon = Trash2, confirmText = 'Confirm', color = 'bg-rose-500', hideCancel = false }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm overflow-hidden bg-white dark:bg-[#131521] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10"
      >
        <div className="p-6">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-opacity-10", color.replace('bg-', 'text-'))}>
            <Icon size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">{message}</p>
          <div className="flex gap-3">
            {!hideCancel && (
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                onConfirm();
                if (!loading) onClose();
              }}
              disabled={loading}
              className={cn("flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2", color, color === 'bg-rose-500' ? 'hover:bg-rose-400' : 'hover:opacity-90')}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MemberEntryModal({ isOpen, onClose, onSave, member, registrations, loading, positions = [], setConfirmModal }: any) {
  const [form, setForm] = useState({
    position_id: '',
    registration_id: '',
    is_soloist: false,
    is_on_probation: false,
    probation_until: '',
    youtube: '',
    instagram: '',
    facebook: '',
    twitter: '',
    tiktok: ''
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        full_name: member.full_name || '',
        voice_part: member.voice_part || 'Soprano',
        bio: member.bio || '',
        photo_url: member.photo_url || '',
        phone: member.phone || '',
        email: member.email || '',
        joined_at: member.joined_at || new Date().toISOString().split('T')[0],
        position_id: member.position_id || '',
        registration_id: member.registration_id || '',
        is_soloist: member.is_soloist || false,
        is_on_probation: member.is_on_probation || false,
        probation_until: member.probation_until || '',
        youtube: member.youtube || '',
        instagram: member.instagram || '',
        facebook: member.facebook || '',
        twitter: member.twitter || '',
        tiktok: member.tiktok || ''
      });
    } else {
      setForm({
        full_name: '',
        voice_part: 'Soprano',
        bio: '',
        photo_url: '',
        phone: '',
        email: '',
        joined_at: new Date().toISOString().split('T')[0],
        position_id: '',
        registration_id: '',
        is_soloist: false,
        is_on_probation: false,
        probation_until: '',
        youtube: '',
        instagram: '',
        facebook: '',
        twitter: '',
        tiktok: ''
      });
    }
  }, [member, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadMemberPhoto(file);
      setForm(prev => ({ ...prev, photo_url: url }));
    } catch (err: any) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: "Upload Failed",
        message: "Upload failed: " + (err.message || "Unknown error"),
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-[#131521] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
              {member ? 'Edit Member Profile' : 'New Member Profile'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block self-start">Profile Photo</label>
                <div className="relative group w-full aspect-square max-w-[240px] rounded-3xl overflow-hidden bg-slate-50 dark:bg-[#0b0d17] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center p-4 transition-all hover:border-indigo-500/50">
                  {form.photo_url || uploading ? (
                    <>
                      {uploading ? (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                          <Loader2 className="animate-spin text-indigo-500" size={32} />
                        </div>
                      ) : null}
                      <img
                        src={form.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.full_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                        alt=""
                        className="w-full h-full object-cover rounded-2xl"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white font-bold text-xs flex items-center gap-2">
                          <Camera size={14} /> Change Photo
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
                        <Camera size={24} />
                      </div>
                      <p className="text-xs text-slate-500 font-bold">Click to upload photo</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Full Name</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Voice Part</label>
                <select
                  value={form.voice_part}
                  onChange={e => setForm({ ...form, voice_part: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none"
                >
                  {VOICE_PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                  placeholder="080... or +234..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Join Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={form.joined_at}
                      onChange={e => setForm({ ...form, joined_at: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Position / Role</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      value={form.position_id}
                      onChange={e => setForm({ ...form, position_id: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none"
                    >
                      <option value="">Member</option>
                      {positions.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Bio (Short)</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none min-h-[100px]"
                  placeholder="Tell us about the member..."
                />
              </div>
              <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-2">Social Media Links</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Youtube size={12} className="text-rose-500" /> YouTube
                    </label>
                    <input
                      value={form.youtube}
                      onChange={e => setForm({ ...form, youtube: e.target.value })}
                      className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Instagram size={12} className="text-pink-500" /> Instagram
                    </label>
                    <input
                      value={form.instagram}
                      onChange={e => setForm({ ...form, instagram: e.target.value })}
                      className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Facebook size={12} className="text-blue-600" /> Facebook
                    </label>
                    <input
                      value={form.facebook}
                      onChange={e => setForm({ ...form, facebook: e.target.value })}
                      className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                      placeholder="facebook.com/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Twitter size={12} className="text-slate-900 dark:text-white" /> X (Twitter)
                    </label>
                    <input
                      value={form.twitter}
                      onChange={e => setForm({ ...form, twitter: e.target.value })}
                      className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Video size={12} className="text-teal-500" /> TikTok
                    </label>
                    <input
                      value={form.tiktok}
                      onChange={e => setForm({ ...form, tiktok: e.target.value })}
                      className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                      placeholder="tiktok.com/@..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Is Soloist?</span>
                  <button
                    onClick={() => setForm({ ...form, is_soloist: !form.is_soloist })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      form.is_soloist ? "bg-indigo-600" : "bg-slate-300 dark:bg-white/10"
                    )}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", form.is_soloist ? "left-7" : "left-1")} />
                  </button>
                </div>
                {form.is_soloist && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Link to Registration Slot</label>
                    <select
                      value={form.registration_id}
                      onChange={e => setForm({ ...form, registration_id: e.target.value })}
                      className="w-full bg-white dark:bg-[#131521] border border-indigo-500/20 rounded-lg px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                    >
                      <option value="">Select Soloist Slot...</option>
                      {registrations.map((r: any) => (
                        <option key={r.id} value={r.id}>S-{r.slot_id}: {r.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-indigo-500/10">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">On Probation?</span>
                  </div>
                  <button
                    onClick={() => {
                      const newProbation = !form.is_on_probation;
                      let until = form.probation_until;
                      if (newProbation && !until) {
                        const d = new Date(form.joined_at);
                        d.setMonth(d.getMonth() + 3);
                        until = d.toISOString().split('T')[0];
                      }
                      setForm({ ...form, is_on_probation: newProbation, probation_until: until });
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      form.is_on_probation ? "bg-amber-500" : "bg-slate-300 dark:bg-white/10"
                    )}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", form.is_on_probation ? "left-7" : "left-1")} />
                  </button>
                </div>

                {form.is_on_probation && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-amber-500">Probation Period Until</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50" size={12} />
                      <input
                        type="date"
                        value={form.probation_until}
                        onChange={e => setForm({ ...form, probation_until: e.target.value })}
                        className="w-full bg-white dark:bg-[#131521] border border-amber-500/20 rounded-lg pl-9 pr-3 py-2 text-xs focus:border-amber-500 outline-none font-bold text-amber-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={loading || !form.full_name}
              className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {member ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AdminSidebar({ activeTab, setActiveTab, repertoires, waitlist, onLogout }: any) {
  const menuItems = [
    { id: 'list', label: 'Member List', icon: Users },
    { id: 'checkin', label: 'Check-in', icon: Check, color: 'text-emerald-500' },
    { id: 'members', label: 'Member Profiles', icon: Grid },
    { id: 'repertoire', label: 'Song Approvals', icon: Music, badge: repertoires.filter((s: any) => s.status === 'pending').length },
    { id: 'waitlist', label: 'Waitlist', icon: History, badge: waitlist.length },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'live', label: 'Stage Mode', icon: Monitor },
    { id: 'archives', label: 'Archives', icon: Archive },
    { id: 'settings', label: 'App Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#131521] border-r border-slate-200 dark:border-white/5 py-8 px-4">
      <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold transition-all relative group",
                isActive
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/30"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-white" : item.color || "text-slate-400")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                  isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white"
                )}>
                  {item.badge}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 rounded-[1.2rem] bg-indigo-600/10 blur-xl -z-10"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-xl border-2 border-white dark:border-[#131521] overflow-hidden bg-slate-200 dark:bg-slate-800">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=admin123&backgroundColor=transparent`} alt="User" />
            </div>
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-black text-slate-900 dark:text-white leading-none truncate">Admin User</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">admin@amemusochoir.org</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          <X size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

// --- Shared Layout ---

type Theme = 'light' | 'dark' | 'system';

function Layout({ children, subtitle, isAuthenticated, onLogout, sidebar }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme-preference') as Theme) || 'system';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);

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
      <header className="h-[73px] px-8 py-4 flex justify-between items-center bg-white dark:bg-[#131521]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-50 shadow-sm dark:shadow-none shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <button className="text-slate-500 hover:text-slate-900 dark:text-white mr-2 flex items-center justify-center"><ChevronRight className="rotate-180" size={16} /></button>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:scale-105 transition-transform">
              <Music className="text-slate-900 dark:text-white" size={20} />
            </div>
            <h1 className="text-md md:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">AMEMUSO COMPULSORY Solo</h1>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-2">
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
              onClick={() => navigate('/members')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                location.pathname === '/members' ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-white"
              )}
            >
              Directory
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

          {/* User Nav (Only show in header if no sidebar) */}
          {isAuthenticated && !sidebar && (
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-white/5 relative group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                <div className="w-full h-full rounded-full border-2 border-white dark:border-[#131521] overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=admin123&backgroundColor=transparent`} alt="User" />
                </div >
              </div >
              <div className="hidden md:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Admin User</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">admin@amemusochoir.org</p>
              </div>
              <button
                onClick={onLogout}
                className="ml-2 p-2 text-slate-500 hover:text-rose-500 transition-colors"
                title="Logout"
              >
                <X size={14} />
              </button>
            </div >
          )}
        </nav >

        {/* Mobile Hamburger Toggle */}
        < button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button >

      </header >

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {
          isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -20, scaleY: 0.95 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden absolute top-[73px] left-0 w-full bg-white/95 dark:bg-[#131521]/95 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5 z-40 shadow-2xl origin-top max-h-[calc(100vh-80px)] overflow-y-auto"
            >
              <div className="flex flex-col p-6 gap-6">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}
                    className={cn("px-4 py-3 rounded-xl text-sm font-bold transition-all text-left", location.pathname === '/' ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-[#0b0d17] text-slate-700 dark:text-slate-300")}
                  >
                    Roster
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/members'); }}
                    className={cn("px-4 py-3 rounded-xl text-sm font-bold transition-all text-left", location.pathname === '/members' ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-[#0b0d17] text-slate-700 dark:text-slate-300")}
                  >
                    Directory
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
                    className={cn("px-4 py-3 rounded-xl text-sm font-bold transition-all text-left", location.pathname === '/register' ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-[#0b0d17] text-slate-700 dark:text-slate-300")}
                  >
                    Registration
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/repertoire'); }}
                    className={cn("px-4 py-3 rounded-xl text-sm font-bold transition-all text-left", location.pathname === '/repertoire' ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-[#0b0d17] text-slate-700 dark:text-slate-300")}
                  >
                    Repertoire
                  </button>
                </div>

                <div className="h-px w-full bg-slate-200 dark:bg-white/5" />

                <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0b0d17] p-2 rounded-2xl border border-slate-200 dark:border-white/5">
                  <button onClick={() => setTheme('light')} className={cn("flex-1 flex justify-center py-2 rounded-xl transition-all", theme === 'light' ? "bg-white text-indigo-500 shadow-sm dark:bg-white/10 dark:text-indigo-400" : "text-slate-500")}>
                    <Sun size={18} />
                  </button>
                  <button onClick={() => setTheme('system')} className={cn("flex-1 flex justify-center py-2 rounded-xl transition-all", theme === 'system' ? "bg-white text-indigo-500 shadow-sm dark:bg-white/10 dark:text-indigo-400" : "text-slate-500")}>
                    <Monitor size={18} />
                  </button>
                  <button onClick={() => setTheme('dark')} className={cn("flex-1 flex justify-center py-2 rounded-xl transition-all", theme === 'dark' ? "bg-white text-indigo-500 shadow-sm dark:bg-white/10 dark:text-indigo-400" : "text-slate-500")}>
                    <Moon size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        {sidebar && (
          <aside className="hidden lg:block w-72 h-full flex-shrink-0 relative z-20">
            {sidebar}
          </aside>
        )}

        {/* Mobile/Tablet Admin Drawer */}
        <AnimatePresence>
          {sidebar && isAdminDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdminDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 w-80 h-full bg-white dark:bg-[#131521] z-[70] lg:hidden shadow-2xl"
              >
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-indigo-600 text-white">
                  <span className="font-black italic uppercase tracking-tight">Admin Menu</span>
                  <button onClick={() => setIsAdminDrawerOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="h-[calc(100%-73px)] overflow-hidden" onClick={() => setIsAdminDrawerOpen(false)}>
                  {sidebar}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {/* Background Decor */}
          <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-indigo-600/5 blur-[120px] rounded-full -z-10" />
          <div className="fixed bottom-0 left-0 w-[50%] h-[50%] bg-emerald-600/5 blur-[120px] rounded-full -z-10" />

          <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-10">
            {sidebar && (
              <button
                onClick={() => setIsAdminDrawerOpen(true)}
                className="lg:hidden mb-6 flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-indigo-500/30 active:scale-95 transition-transform"
              >
                <Menu size={16} /> Dashboard Menu
              </button>
            )}
            <div className="mb-10">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3">{subtitle || "Management System"}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Public View ---

function PublicView({ setConfirmModal }: { setConfirmModal: any }) {
  const [activeVoiceTab, setActiveVoiceTab] = useState('All');
  const [maxSlots, setMaxSlots] = useState(70);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [voicePart, setVoicePart] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const [configs, regs, weeks] = await Promise.all([
        getConfigs(),
        getRegistrations(),
        getPerformanceWeeks()
      ]);
      if (configs.max_slots) setMaxSlots(parseInt(configs.max_slots));
      // Filter out test registrations for the public view
      setRegistrations(regs.filter((r: any) => !r.is_test));
      const publicWeeks = weeks.filter((w: any) => !w.is_test);

      // Auto-select the first week if none selected
      if (!selectedWeekId && publicWeeks.length > 0) {
        setSelectedWeekId(publicWeeks[0].id);
      }
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
    const isWaitlist = stats.available <= 0;

    if (!isWaitlist && !selectedSlot) return;
    if (!fullName.trim() || !voicePart || !isSupabaseConfigured) return;

    setSubmitting(true);
    try {
      if (isWaitlist) {
        await joinWaitlist(fullName, voicePart, email, phone);
      } else {
        await registerSoloist(fullName, voicePart, selectedSlot!, phone);
      }
      await fetchData(); // Immediate reload
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedSlot(null);
        setFullName('');
        setVoicePart('');
        setEmail('');
        setPhone('');
      }, 3000);
    } catch (err: any) {
      console.error('Failed to sync with server:', err);
      setConfirmModal({
        isOpen: true,
        title: "Registration Failed",
        message: "Failed to sync with server: " + (err.message || "Unknown error"),
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  const stats = {
    reserved: (registrations || []).length,
    available: maxSlots - (registrations || []).length,
    total: maxSlots
  };

  const currentPercentage = stats.total > 0 ? Math.round((stats.reserved / stats.total) * 100) : 0;
  const filledBars = Math.round((currentPercentage / 100) * 30);

  // Supabase is configured

  return (
    <Layout subtitle="Management System" isAuthenticated={false}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Selection Area */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-8 relative overflow-hidden">

            {/* Header / Search Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full">
              <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  {stats.available > 0 ? 'Pick Your Performance Slot' : 'Registration is Full!'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {stats.available > 0
                    ? 'Select an available slots from the grid below.'
                    : 'All slots have been reserved. You can still join the waitlist below.'}
                </p>
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
              {Array.from({ length: maxSlots }).map((_, i) => {
                const slotId = i + 1;
                const reg = (registrations || []).find(r => r.slot_id === slotId);
                const isTaken = !!reg;
                const isSelected = selectedSlot === slotId;

                // Filter by voice part if tab selected
                if (activeVoiceTab !== 'All' && isTaken && reg.voice_part !== activeVoiceTab) return null;

                return (
                  <button
                    key={slotId}
                    disabled={isTaken}
                    onClick={() => setSelectedSlot(slotId)}
                    className={cn(
                      "group p-4 rounded-[1.2rem] border-2 transition-all flex flex-col items-start gap-1 text-left relative overflow-hidden",
                      isSelected
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 glow-indigo"
                        : isTaken
                          ? "bg-slate-100 dark:bg-[#11131f]/50 border-[#11131f] text-slate-700 font-bold"
                          : "bg-slate-100 dark:bg-[#11131f] border-transparent hover:border-slate-300 dark:border-white/10"
                    )}
                  >
                    <div className="mt-1 mb-2 flex-1">
                      <span className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white group-disabled:text-slate-500 leading-none">S-{slotId}</span>
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
          {(selectedSlot || stats.available <= 0) && (
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
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {stats.available > 0 ? 'Selected Slot' : 'Join the Waitlist'}
                    </h3>

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
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">
                          {stats.available > 0 ? 'Reserved!' : 'Waitlisted!'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {stats.available > 0
                            ? 'Your performance slot is confirmed.'
                            : 'You have been added to the queue if a slot opens up.'}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col flex-1"
                      >
                        {stats.available > 0 ? (
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
                        ) : (
                          <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[1.5rem] relative overflow-hidden mb-8">
                            <div className="flex items-center gap-4 relative z-10">
                              <div className="w-12 h-12 bg-rose-500/20 rounded-[1.1rem] flex items-center justify-center text-rose-500 border border-rose-500/30 font-black">
                                W
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-rose-500 uppercase italic tracking-tighter">Waitlist Entry</h4>
                                <p className="text-[10px] text-rose-500/80 font-bold uppercase tracking-widest">Overflow Active</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleRegister} className="flex flex-col flex-1">
                          <div className="space-y-4 mb-8">
                            <h5 className="text-[14px] font-bold text-slate-900 dark:text-white mb-4">Performer Details</h5>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Full Name</label>
                                <input
                                  required
                                  value={fullName}
                                  onChange={e => setFullName(e.target.value)}
                                  placeholder="e.g. Samuel Adewale"
                                  className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-5 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-medium text-slate-900 dark:text-white"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Phone (Optional)</label>
                                  <input
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="080..."
                                    className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-5 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-medium text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Email (Optional)</label>
                                  <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@email.com"
                                    className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-xl px-5 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-medium text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Voice Part</label>
                                <div className="flex flex-wrap gap-2 bg-white dark:bg-[#131521] p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                                  {VOICE_PARTS.map(p => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => setVoicePart(p)}
                                      className={cn(
                                        "flex-1 min-w-[60px] py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        voicePart === p ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40" : "text-slate-500 hover:text-slate-300"
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
                              className={cn(
                                "w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 text-[14px] uppercase tracking-[0.2em] border",
                                stats.available > 0
                                  ? "bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-[0_8px_30px_rgba(79,70,229,0.4)] border-indigo-400/50"
                                  : "bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-[0_8px_30px_rgba(225,29,72,0.4)] border-rose-400/50"
                              )}
                            >
                              {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                              {submitting
                                ? 'Syncing...'
                                : !voicePart
                                  ? 'Pick Voice Part'
                                  : stats.available > 0 ? 'Reserve Slot' : 'Join Waitlist'}
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

// --- Login View ---

function LoginView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const admin = await getAdminUser(email);

      // Fallback for initial setup if the table is empty - strictly for migration
      const isInitialSetup = !admin && email === 'admin@amemusochoir.org' && password === 'Password@1';

      if (isInitialSetup || (admin && admin.password_hash === password)) {
        onLogin();
        navigate('/admin');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0d17] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass w-full max-w-md p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl space-y-8"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/40">
            <Music className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase italic tracking-tight">Admin Access</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter Email Address"
              className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-bold"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 uppercase italic tracking-wider"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : null}
            {loading ? 'Verifying...' : 'Login to Dashboard'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="w-full text-slate-500 hover:text-indigo-400 text-xs font-bold transition-all uppercase tracking-widest"
        >
          Back to Roster
        </button>
      </motion.div>
    </div>
  );
}

// --- Soloist Status View ---

function SoloistStatusView() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data, error: dbError } = await supabase
        .from('registrations')
        .select(`
          *,
          repertoire_submissions (*)
        `)
        .ilike('full_name', `%${search.trim()}%`)
        .limit(5);

      if (dbError) throw dbError;
      if (!data || data.length === 0) {
        setError('No registration found for that name.');
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching your status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout subtitle="Status Checker" isAuthenticated={false}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Search Panel */}
        <div className="glass p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase italic tracking-tight">Track Your Solo</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your name to check your registration and song status.</p>
          </div>

          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Enter your registered full name..."
                className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Check Status
            </button>
          </form>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {(result || []).map((reg: any) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-xl"
              >
                {/* Card Header */}
                <div className="p-5 sm:p-6 bg-indigo-600/5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight tracking-tight break-words">{reg.full_name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mt-1">Slot S-{reg.slot_id}</p>
                  </div>
                  <span className="shrink-0 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                    {reg.voice_part}
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {/* QR Pass */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5 border border-slate-200 dark:border-white/5">
                    <div className="bg-white p-3 rounded-2xl shadow-lg shadow-indigo-500/10 shrink-0">
                      <QRCodeCanvas
                        value={reg.id || ''}
                        size={120}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "https://amemuso.com/favicon.ico",
                          x: undefined,
                          y: undefined,
                          height: 24,
                          width: 24,
                          excavate: true,
                        }}
                      />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white">Check-in Pass</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">Present this QR code at the venue entrance for check-in.</p>
                      <div className="mt-3 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-lg inline-flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">S-{reg.slot_id} • {reg.voice_part}</span>
                      </div>
                    </div>
                  </div>

                  {/* Repertoire Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Repertoire Status</span>
                      <div className="w-24 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          (reg.repertoire_submissions || []).some((s: any) => s.status === 'approved') ? "w-full bg-emerald-500" :
                            (reg.repertoire_submissions || []).length > 0 ? "w-1/2 bg-amber-500" : "w-0"
                        )} />
                      </div>
                    </div>

                    {reg.repertoire_submissions && (reg.repertoire_submissions || []).length > 0 ? (
                      <div className="space-y-2">
                        {(reg.repertoire_submissions || []).map((sub: any) => (
                          <div key={sub.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white break-words">{sub.song_title}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{sub.artist_composer || 'N/A'}</p>
                              </div>
                              <span className={cn(
                                "shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                sub.status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                  sub.status === 'rejected' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                    "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              )}>
                                {sub.status || 'pending'}
                              </span>
                            </div>
                            {sub.admin_comments && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                                <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-tighter flex items-center gap-1">
                                  <Music size={10} /> Admin Feedback
                                </p>
                                <p className="text-[10px] text-slate-500 italic leading-relaxed">{sub.admin_comments}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-center">
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">No Song Submitted</p>
                        <p className="text-[9px] text-slate-500 mt-1">Please submit your repertoire options soon.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
// --- Members View (Phase 5) ---

function MemberProfileModal({ member, isOpen, onClose, setConfirmModal, isAdmin = false }: any) {
  if (!member || !isOpen) return null;

  const avatarUrl = member.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.full_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-[#131521] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden relative"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
          <div className="absolute -bottom-16 left-8 p-1 bg-white dark:bg-[#131521] rounded-3xl shadow-xl">
            <div className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img src={avatarUrl} alt={member.full_name} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <div className="pt-20 p-8 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{member.full_name}</h3>
              {member.is_soloist && (
                <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 text-[9px] font-black uppercase tracking-widest">
                  Soloist
                </div>
              )}
            </div>
            <p className="text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-widest text-xs">{member.voice_part}</p>
          </div>

          {member.is_on_probation && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20">
                    <ShieldAlert size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest leading-none mb-1">On Probation</p>
                    <p className="text-[10px] text-slate-500 font-medium">Until {new Date(member.probation_until).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Admit Member",
                      message: `Are you sure you want to admit ${member.full_name} as a full member of the chorale?`,
                      icon: Check,
                      confirmText: "Admit",
                      color: "bg-emerald-500",
                      onConfirm: () => {
                        promoteMemberToFull(member.id);
                        onClose();
                      }
                    });
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                >
                  Admit Member
                </button>
                <button
                  onClick={async () => {
                    const d = new Date(member.probation_until);
                    d.setMonth(d.getMonth() + 1);
                    const newDate = d.toISOString().split('T')[0];
                    setConfirmModal({
                      isOpen: true,
                      title: "Extend Probation",
                      message: `Extend probation for ${member.full_name} by 1 month (until ${newDate})?`,
                      icon: Calendar,
                      confirmText: "Extend",
                      color: "bg-indigo-600",
                      onConfirm: async () => {
                        try {
                          await updateMember(member.id, { probation_until: newDate });
                          onClose();
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    });
                  }}
                  className="px-4 py-2 bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all"
                >
                  Extend
                </button>
                <button
                  onClick={async () => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Archive Member",
                      message: `Archive ${member.full_name}? They will be removed from the active member list but retained in the archives for future reference.`,
                      icon: Trash2,
                      confirmText: "Archive",
                      color: "bg-rose-500",
                      onConfirm: async () => {
                        try {
                          await updateMember(member.id, { is_archived: true });
                          onClose();
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    });
                  }}
                  className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {member.bio && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Biography</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"{member.bio}"</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position / Role</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {member.member_positions?.title || 'Member'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Joined Choir</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {new Date(member.joined_at || member.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{member.email || 'Private'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                {isAdmin ? (member.phone || 'N/A') : 'Private'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
            {member.youtube && (
              <a href={member.youtube} target="_blank" rel="noopener noreferrer" className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                <Youtube size={18} />
              </a>
            )}
            {member.instagram && (
              <a href={member.instagram.startsWith('@') ? `https://instagram.com/${member.instagram.slice(1)}` : member.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl hover:bg-pink-500 hover:text-white transition-all">
                <Instagram size={18} />
              </a>
            )}
            {member.facebook && (
              <a href={member.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                <Facebook size={18} />
              </a>
            )}
            {member.twitter && (
              <a href={member.twitter.startsWith('@') ? `https://x.com/${member.twitter.slice(1)}` : member.twitter} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white rounded-2xl hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all">
                <Twitter size={18} />
              </a>
            )}
            {member.tiktok && (
              <a href={member.tiktok.startsWith('@') ? `https://tiktok.com/@${member.tiktok.replace('@', '')}` : member.tiktok} target="_blank" rel="noopener noreferrer" className="p-3 bg-teal-500/10 text-teal-500 rounded-2xl hover:bg-teal-500 hover:text-white transition-all">
                <Video size={18} />
              </a>
            )}
          </div>

          <MemberHistoryView memberId={member.id} />

          {member.is_soloist && member.registrations && (
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Music size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Performance Slot</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">S-{member.registrations.slot_id} • {member.registrations.voice_part}</p>
                </div>
              </div>
              <button
                onClick={() => { onClose(); window.location.href = '/status'; }}
                className="p-2 rounded-lg bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </motion.div >
    </div >
  );
}

function MemberHistoryView({ memberId }: { memberId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getMemberHistory(memberId);
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [memberId]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>;
  if (history.length === 0) return (
    <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-center border border-dashed border-slate-200 dark:border-white/5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Soloist History Found</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <History size={12} /> Performance History
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {history.map((reg) => (
          <div key={reg.id} className="p-3 bg-white dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl flex justify-between items-center group hover:border-indigo-500/30 transition-all">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {reg.repertoire_submissions?.[0]?.song_title || 'TBD'}
              </p>
              <p className="text-[9px] text-slate-500 font-medium">
                {new Date(reg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • Slot S-{reg.slot_id}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                reg.performance_status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              )}>
                {reg.performance_status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersView() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = (members || []).filter(m => {
    const matchesSearch = (m.full_name || '').toLowerCase().includes((search || '').toLowerCase());
    const matchesFilter = filter === 'All' || m.voice_part === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
    </div>
  );

  return (
    <Layout subtitle="Member Directory" isAuthenticated={false}>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Choir Directory</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Meet the talented members of our choir community.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full sm:w-64 bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500"
              />
            </div>
            <div className="flex bg-white dark:bg-[#131521] p-1 rounded-2xl border border-slate-200 dark:border-white/5">
              {['All', ...VOICE_PARTS].map(p => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === p ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredMembers.map(member => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setSelectedMember(member)}
                className="group glass p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden flex flex-col items-center text-center space-y-4"
              >
                <div className="absolute top-4 right-4 text-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={16} />
                </div>

                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-[#131521] shadow-xl group-hover:scale-105 transition-transform duration-500">
                    <img
                      src={member.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.full_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                      alt={member.full_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {member.is_soloist && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 border-4 border-white dark:border-[#131521] shadow-lg">
                      <Music size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{member.full_name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mt-2">{member.voice_part}</p>
                </div>

                {member.bio && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                    "{member.bio}"
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredMembers.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Users size={32} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic">No members found</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your search or filter.</p>
            </div>
          </div>
        )}

        <MemberProfileModal
          member={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          isAdmin={false}
        />
      </div>
    </Layout>
  );
}

// --- Analytics & Stage Views ---

function AnalyticsView({ registrations, repertoires }: { registrations: any[], repertoires: any[] }) {
  const stats = {
    total: (registrations || []).length,
    soprano: (registrations || []).filter(r => r.voice_part === 'Soprano').length,
    alto: (registrations || []).filter(r => r.voice_part === 'Alto').length,
    tenor: (registrations || []).filter(r => r.voice_part === 'Tenor').length,
    bass: (registrations || []).filter(r => r.voice_part === 'Bass').length,
  };

  const totalPossible = 70;
  const fillRate = totalPossible > 0 ? Math.round((stats.total / totalPossible) * 100) : 0;

  const submissionStats = {
    approved: (repertoires || []).filter(r => r.status === 'approved').length,
    pending: (repertoires || []).filter(r => r.status === 'pending').length,
    rejected: (repertoires || []).filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Total Fill Rate Card */}
        <div className="lg:col-span-4 glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="80" fill="transparent" stroke="currentColor" strokeWidth="16" className="text-slate-100 dark:text-white/5" />
              <motion.circle
                cx="96" cy="96" r="80" fill="transparent" stroke="currentColor" strokeWidth="16"
                strokeDasharray={502.4}
                initial={{ strokeDashoffset: 502.4 }}
                animate={{ strokeDashoffset: 502.4 - (502.4 * fillRate) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                className="text-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-900 dark:text-white leading-none">{fillRate}%</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Registration</span>
            </div>
          </div>
        </div>

        {/* Voice Distribution Bar Chart */}
        <div className="lg:col-span-8 glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider italic">Voice Distribution</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live stats</span>
            </div>
          </div>
          <div className="space-y-6">
            {VOICE_PARTS.map(part => {
              const count = stats[part.toLowerCase() as keyof typeof stats] as number;
              const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={part} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{part}</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">{count} <span className="text-slate-500 font-bold ml-1 opacity-60">/ {stats.total}</span></span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={cn(
                        "h-full rounded-full relative group",
                        part === 'Soprano' && "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]",
                        part === 'Alto' && "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
                        part === 'Tenor' && "bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]",
                        part === 'Bass' && "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      )}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Submission Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Approved', count: submissionStats.approved, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10' },
          { label: 'Pending Review', count: submissionStats.pending, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/10' },
          { label: 'Rejected / Cleanup', count: submissionStats.rejected, color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/10' }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className={cn("glass p-8 rounded-[2rem] border relative overflow-hidden group", item.bg, item.border)}
          >
            <div className="relative z-10">
              <span className={cn("text-5xl font-black block mb-2", item.color)}>{item.count}</span>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{item.label}</p>
            </div>
            <div className={cn("absolute -right-4 -bottom-4 opacity-10 blur-xl w-24 h-24 rounded-full", item.color.replace('text-', 'bg-'))} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function LiveModeView({ registrations, performanceWeeks, onUpdateStatus, onResetStatus, setConfirmModal }: {
  registrations: any[],
  performanceWeeks: any[],
  onUpdateStatus: (id: string, status: string) => Promise<void>,
  onResetStatus: () => Promise<void>,
  setConfirmModal: any
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  const selectedWeek = performanceWeeks.find(w => w.id === selectedWeekId);

  // Filter only those who haven't performed yet or are currently on stage, specifically for the selected week's slots
  const liveList = useMemo(() => {
    if (!selectedWeek) return [];

    // Sort registrations based on their index in the selected week's slot_ids array
    return selectedWeek.slot_ids
      .map((slotId: number) => registrations.find((r: any) => r.slot_id === slotId))
      .filter((r: any) => r && (!r.performance_status || (r.performance_status !== 'completed' && r.performance_status !== 'skipped')));
  }, [selectedWeek, registrations]);

  const current = liveList[0];
  const upNext = liveList.slice(1, 5);

  const handleStatus = async (id: string, status: string) => {
    setLoading(id);
    await onUpdateStatus(id, status);
    setLoading(null);
  }

  if (!selectedWeekId && performanceWeeks.length > 0) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="glass p-12 rounded-[3rem] border-slate-200 dark:border-white/5 text-center space-y-8">
          <div className="w-20 h-20 bg-indigo-600/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor size={40} />
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Select Show Date</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Please select a performance date from the roster to start managing the stage queue.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {performanceWeeks.map(week => (
              <button
                key={week.id}
                onClick={() => setSelectedWeekId(week.id)}
                className="p-6 rounded-3xl bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Roster Date</span>
                <span className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{week.date}</span>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 italic">
                  <span>{week.slot_ids.length} Slots</span>
                  <span>•</span>
                  <span>{registrations.filter(r => week.slot_ids.includes(r.slot_id)).length} Registered</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (performanceWeeks.length === 0) {
    return (
      <div className="glass p-20 rounded-[3rem] border-slate-200 dark:border-white/5 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-300 dark:border-white/10">
          <Settings size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-400 uppercase italic tracking-tight">No Roster Configured</h2>
        <p className="text-slate-500 max-w-sm mx-auto">Please set up performance weeks and allocate slots in the App Settings tab first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedWeekId(null)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Active Roster</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{selectedWeek?.date}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setConfirmModal({
                isOpen: true,
                title: "Reset Stage Roster",
                message: "Are you sure you want to reset ALL performance statuses? This will move everyone back to 'Pending'.",
                icon: Trash2,
                confirmText: "Reset All",
                color: "bg-rose-500",
                onConfirm: async () => {
                  setResetting(true);
                  await onResetStatus();
                  setResetting(false);
                }
              });
            }}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
          >
            {resetting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Reset Stage Roster
          </button>
          <div className="flex items-center gap-3 bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-full border border-indigo-500/20">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Live Mode Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          <div className="relative overflow-hidden rounded-[3rem] bg-indigo-600 p-1 shadow-2xl shadow-indigo-500/20">
            <div className="relative z-10 bg-slate-900 rounded-[2.8rem] p-12 lg:p-20 min-h-[600px] flex flex-col justify-center items-center text-center space-y-12">
              {current ? (
                <>
                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-[0.3em]"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      Active on Stage
                    </motion.div>
                    <h2 className="text-7xl lg:text-9xl font-black text-white tracking-tighter italic uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">{current.full_name}</h2>
                    <div className="flex flex-wrap items-center justify-center gap-8 mt-6">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Position</span>
                        <span className="text-4xl font-black text-indigo-400">S-{current.slot_id}</span>
                      </div>
                      <div className="w-[1px] h-12 bg-white/10 hidden sm:block" />
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Voice Part</span>
                        <span className="text-4xl font-black text-white uppercase italic">{current.voice_part}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
                    <button
                      onClick={() => handleStatus(current.id, 'completed')}
                      disabled={!!loading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 px-10 rounded-[2rem] transition-all shadow-xl shadow-emerald-500/30 uppercase tracking-[0.2em] italic active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {loading === current.id ? <Loader2 className="animate-spin" /> : <Check size={24} />}
                      Success
                    </button>
                    <button
                      onClick={() => handleStatus(current.id, 'skipped')}
                      disabled={!!loading}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-black py-6 px-10 rounded-[2rem] transition-all uppercase tracking-[0.2em] active:scale-95 disabled:opacity-50"
                    >
                      Skip / Out
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Music size={40} className="text-slate-600" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-500 uppercase italic tracking-widest">No More Performers</h2>
                  <p className="text-slate-600 font-bold">The roster for this date is completed.</p>
                </div>
              )}
            </div>
            {/* Dynamic Light Rays */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          </div>
        </div>

        <div className="xl:col-span-4 space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider italic flex items-center gap-3">
              <Activity className="text-indigo-500" size={18} /> Queue List
            </h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{liveList.length} Remaining</span>
          </div>

          <div className="space-y-4">
            {upNext.map((r: any, idx: number) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center justify-between group hover:border-indigo-500/40 transition-all cursor-default"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/5 transition-all">
                    {r.slot_id}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{r.full_name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{r.voice_part}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {upNext.length === 0 && !current && (
              <div className="p-12 text-center text-slate-500 font-black uppercase tracking-[0.3em] bg-slate-100 dark:bg-white/5 rounded-[2rem] text-xs">
                Show concluded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PositionManager({ positions, onRefresh, setConfirmModal }: { positions: any[], onRefresh: () => void, setConfirmModal: any }) {
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      await addMemberPosition(newTitle.trim());
      setNewTitle('');
      onRefresh();
    } catch (err: any) {
      setConfirmModal({
        isOpen: true,
        title: "Error",
        message: "Error adding position: " + err.message,
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Position",
      message: `Delete position "${title}"? Members with this position will be reset to "Member".`,
      icon: Trash2,
      confirmText: "Delete",
      color: "bg-rose-500",
      onConfirm: async () => {
        try {
          await deleteMemberPosition(id);
          onRefresh();
        } catch (err: any) {
          setConfirmModal({
            isOpen: true,
            title: "Error",
            message: "Error deleting position: " + err.message,
            icon: ShieldAlert,
            confirmText: "Close",
            color: "bg-slate-600",
            hideCancel: true,
            onConfirm: () => { }
          });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Briefcase size={18} className="text-indigo-400" />
        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Dynamic Positions</h4>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed px-1">Manage choir roles like MD, AMD, Part Leaders, etc.</p>

      <div className="flex gap-4">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="New Position Title (e.g. Bass Leader)"
          className="flex-1 bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all font-bold text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newTitle.trim()}
          className="px-8 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-tighter italic disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {positions.map(p => (
          <div key={p.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl group hover:border-indigo-500/30 transition-all">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.title}</span>
            <button
              onClick={() => handleDelete(p.id, p.title)}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Admin View ---

function AdminView({ onLogout, confirmModal, setConfirmModal }: { onLogout: () => void, confirmModal: any, setConfirmModal: any }) {
  const [activeTab, setActiveTab] = useState('list');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [repertoires, setRepertoires] = useState<any[]>([]);
  const [performanceWeeks, setPerformanceWeeks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [maxSlots, setMaxSlots] = useState(60);
  const [defaultProbationMonths, setDefaultProbationMonths] = useState(3);
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
  const [repertoireFilter, setRepertoireFilter] = useState('All');
  const [memberVoiceFilter, setMemberVoiceFilter] = useState('All');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingRepId, setDeletingRepId] = useState<string | null>(null);

  // Members Tab State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const [isSavingMember, setIsSavingMember] = useState(false);

  const [selectedRepertoires, setSelectedRepertoires] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);


  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        getConfigs(),
        getRegistrations(),
        getRepertoires(),
        getPerformanceWeeks(),
        getWaitlist(),
        getMembers(),
        getMemberPositions()
      ]);

      const [configsRes, regsRes, repsRes, weeksRes, waitRes, memsRes, posRes] = results;

      if (configsRes.status === 'fulfilled') {
        if ((configsRes.value as any).max_slots) setMaxSlots(parseInt((configsRes.value as any).max_slots));
        if ((configsRes.value as any).default_probation_months) setDefaultProbationMonths(parseInt((configsRes.value as any).default_probation_months));
      }
      if (regsRes.status === 'fulfilled') setRegistrations(regsRes.value as any);
      if (repsRes.status === 'fulfilled') setRepertoires(repsRes.value as any);
      if (weeksRes.status === 'fulfilled') setPerformanceWeeks(weeksRes.value as any);
      if (waitRes.status === 'fulfilled') setWaitlist(waitRes.value as any);
      if (memsRes.status === 'fulfilled') setMembers(memsRes.value as any);
      if (posRes.status === 'fulfilled') setPositions(posRes.value as any);
      else console.error("Members fetch failed:", (memsRes as any).reason);

    } catch (err) {
      console.error("Critical fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchData();
    const sub = supabase.channel('admin').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchData).subscribe();
    const sub_reps = supabase.channel('admin_reps').on('postgres_changes', { event: '*', schema: 'public', table: 'repertoire_submissions' }, fetchData).subscribe();
    const sub_wait = supabase.channel('admin_wait').on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, fetchData).subscribe();
    const sub_members = supabase.channel('admin_members').on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchData).subscribe();
    return () => {
      supabase.removeChannel(sub);
      supabase.removeChannel(sub_reps);
      supabase.removeChannel(sub_wait);
      supabase.removeChannel(sub_members);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, voicePartFilter, repertoireFilter, memberVoiceFilter, itemsPerPage, activeTab]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  // Admin Song Approval
  const handleApproveSong = async (submissionId: string, registrationId: string) => {
    setApprovingId(submissionId);
    try {
      await approveRepertoire(submissionId, registrationId);
      await fetchData(); // Immediate reload
    } catch (err: any) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: "Approval Failed",
        message: "Failed to approve song: " + (err.message || 'Unknown error'),
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectSong = async (submissionId: string) => {
    setRejectingId(submissionId);
    try {
      await rejectRepertoire(submissionId);
      await fetchData(); // Immediate reload
    } catch (err: any) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: "Rejection Failed",
        message: "Failed to reject song: " + (err.message || 'Unknown error'),
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeleteSong = async (submissionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Song Option",
      message: "Are you sure you want to completely delete this song option? The soloist will be able to submit a new one.",
      onConfirm: async () => {
        setDeletingRepId(submissionId);
        try {
          await deleteRepertoire(submissionId);
          await fetchData(); // Immediate reload
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          console.error(err);
          setConfirmModal({
            isOpen: true,
            title: "Deletion Failed",
            message: "Failed to delete song: " + (err.message || 'Unknown error'),
            icon: ShieldAlert,
            confirmText: "Close",
            color: "bg-slate-600",
            hideCancel: true,
            onConfirm: () => { }
          });
        } finally {
          setDeletingRepId(null);
        }
      }
    });
  };

  const handleSelectAllRepertoires = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const f = repertoires.filter(r => {
        const matchesSearch = r.registrations?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.registrations?.slot_id?.toString().includes(searchQuery);
        const matchesStatus = repertoireFilter === 'All' || (r.status || 'pending') === repertoireFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      });
      // Group them to match page view
      const groupedF = Object.values(f.reduce((acc, r: any) => {
        if (!acc[r.registration_id]) acc[r.registration_id] = { registration_id: r.registration_id, songs: [] };
        acc[r.registration_id].songs.push(r);
        return acc;
      }, {} as Record<string, any>)).sort((a: any, b: any) => a.songs[0].registrations?.slot_id - b.songs[0].registrations?.slot_id);

      const p = groupedF.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
      // Select all song IDs within the displayed groups
      const allDisplayedIds = p.flatMap((group: any) => group.songs.map((s: any) => s.id));
      setSelectedRepertoires(allDisplayedIds);
    } else {
      setSelectedRepertoires([]);
    }
  };

  const handleBulkDelete = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Bulk Delete Songs",
      message: `Are you sure you want to completely delete ${selectedRepertoires.length} song options?`,
      icon: Trash2,
      confirmText: "Delete",
      color: "bg-rose-500",
      onConfirm: async () => {
        setBulkActionLoading(true);
        try {
          await Promise.all(selectedRepertoires.map(id => deleteRepertoire(id)));
          await fetchData(); // Immediate reload
          setSelectedRepertoires([]);
        } catch (err: any) {
          console.error(err);
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkApprove = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Bulk Approve Songs",
      message: `Are you sure you want to approve ${selectedRepertoires.length} song options? Other pending songs for these soloists will be deleted.`,
      icon: Check,
      confirmText: "Approve",
      color: "bg-indigo-600",
      onConfirm: async () => {
        setBulkActionLoading(true);
        try {
          await Promise.all(selectedRepertoires.map(id => {
            const rep = repertoires.find(r => r.id === id);
            return approveRepertoire(id, rep.registration_id); // Safe assuming 'rep' exists
          }));
          await fetchData(); // Immediate reload
          setSelectedRepertoires([]);
        } catch (err: any) {
          console.error(err);
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleResetAllSongs = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Factory Reset Repertoires",
      message: "WARNING: Are you sure you want to delete ALL submitted repertoires? This action cannot be undone and everyone will need to start over.",
      onConfirm: async () => {
        setBulkActionLoading(true);
        try {
          await deleteAllRepertoires();
          await fetchData(); // Immediate reload
          setSelectedRepertoires([]);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          console.error(err);
          setConfirmModal({
            isOpen: true,
            title: "Reset Failed",
            message: "Failed to reset songs: " + (err.message || 'Unknown error'),
            icon: ShieldAlert,
            confirmText: "Close",
            color: "bg-slate-600",
            hideCancel: true,
            onConfirm: () => { }
          });
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const filtered = (registrations || []).filter(r => {
    const matchesSearch = r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slot_id?.toString().includes(searchQuery);
    const matchesVoice = voicePartFilter === 'All' || r.voice_part === voicePartFilter;
    return matchesSearch && matchesVoice;
  }).sort((a, b) => a.slot_id - b.slot_id);

  const submittedRepertoires = (repertoires || []).filter(r => {
    const matchesSearch = r.registrations?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registrations?.slot_id?.toString().includes(searchQuery);
    const matchesStatus = repertoireFilter === 'All' || (r.status || 'pending') === repertoireFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const groupedSubmittedRepertoires = Object.values(
    submittedRepertoires.reduce((acc, r: any) => {
      if (!acc[r.registration_id]) {
        acc[r.registration_id] = {
          registration_id: r.registration_id,
          registrations: r.registrations,
          songs: []
        };
      }
      acc[r.registration_id].songs.push(r);
      return acc;
    }, {} as Record<string, any>)
  ).sort((a: any, b: any) => a.registrations?.slot_id - b.registrations?.slot_id);
  const filteredMembers = (members || []).filter(m => {
    const matchesArchived = !m.is_archived;
    const matchesSearch = (m.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (m.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesVoice = memberVoiceFilter === 'All' || m.voice_part === memberVoiceFilter;
    return matchesArchived && matchesSearch && matchesVoice;
  }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const filteredArchivedMembers = (members || []).filter(m => {
    const matchesArchived = m.is_archived;
    const matchesSearch = (m.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (m.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesVoice = memberVoiceFilter === 'All' || m.voice_part === memberVoiceFilter;
    return matchesArchived && matchesSearch && matchesVoice;
  }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const totalPages = Math.ceil(
    activeTab === 'archives' ? (filteredArchivedMembers || []).length / itemsPerPage :
      activeTab === 'members' ? (filteredMembers || []).length / itemsPerPage :
        activeTab === 'list' ? (filtered || []).length / itemsPerPage :
          (groupedSubmittedRepertoires || []).length / itemsPerPage
  );

  const paginated = (
    activeTab === 'archives' ? (filteredArchivedMembers || []) :
      activeTab === 'members' ? (filteredMembers || []) :
        activeTab === 'list' ? (filtered || []) :
          (groupedSubmittedRepertoires || [])
  ).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statsSource = activeTab === 'archives' ? members.filter(m => m.is_archived) :
    activeTab === 'members' ? members.filter(m => !m.is_archived) : registrations;
  const stats = {
    total: (statsSource || []).length,
    soprano: (statsSource || []).filter(r => r.voice_part === 'Soprano').length,
    alto: (statsSource || []).filter(r => r.voice_part === 'Alto').length,
    tenor: (statsSource || []).filter(r => r.voice_part === 'Tenor').length,
    bass: (statsSource || []).filter(r => r.voice_part === 'Bass').length,
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
      await fetchData(); // Immediate reload
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: "Save Failed",
        message: "Failed to save edits: " + (err.message || 'Unknown error. Check RLS policies.'),
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteClick = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Registration",
      message: "Are you sure you want to completely remove this registration and free up the slot?",
      icon: Trash2,
      confirmText: "Delete",
      color: "bg-rose-500",
      onConfirm: async () => {
        setDeletingId(id);
        try {
          await deleteRegistration(id);
          await fetchData();
        } catch (err: any) {
          console.error(err);
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handlePromoteWaitlist = async (entry: any) => {
    // Automatically pick the first available slot
    const takenSlots = (registrations || []).map(r => r.slot_id);
    let nextSlot = -1;
    for (let i = 1; i <= maxSlots; i++) {
      if (!takenSlots.includes(i)) {
        nextSlot = i;
        break;
      }
    }

    if (nextSlot === -1) {
      setConfirmModal({
        isOpen: true,
        title: "No Available Slots",
        message: "No available slots to promote to. Please delete a registration first or increase max slots.",
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Promote Waitlist",
      message: `Promote ${entry.full_name} to slot S-${nextSlot}?`,
      icon: Check,
      confirmText: "Promote",
      color: "bg-indigo-600",
      onConfirm: async () => {
        try {
          setBulkActionLoading(true);
          await registerSoloist(entry.full_name, entry.voice_part, nextSlot, entry.phone);
          await deleteWaitlistEntry(entry.id);
          await fetchData();
        } catch (err: any) {
          console.error(err);
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleRemoveWaitlist = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove from Waitlist",
      message: `Are you sure you want to remove ${name} from the waitlist?`,
      icon: Trash2,
      confirmText: "Remove",
      color: "bg-rose-500",
      onConfirm: async () => {
        try {
          await deleteWaitlistEntry(id);
          await fetchData();
        } catch (err: any) {
          console.error(err);
        }
      }
    });
  };

  const handleSaveMember = async (form: any) => {
    setIsSavingMember(true);
    try {
      // Sanitize UUID fields - Postgres 400 error on empty string UUIDs
      const sanitizedForm = {
        ...form,
        registration_id: form.registration_id || null,
        position_id: form.position_id || null,
        probation_until: form.probation_until || null,
        joined_at: form.joined_at || null,
        email: form.email || null,
        phone: form.phone || null
      };

      if (editingMember) {
        await updateMember(editingMember.id, sanitizedForm);
      } else {
        await addMember(sanitizedForm);
      }
      await fetchData();
      setIsMemberModalOpen(false);
      setEditingMember(null);
    } catch (err: any) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: "Save Failed",
        message: "Failed to save member: " + (err.message || "Unknown error"),
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleRestoreMember = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Restore Member",
      message: `Restore ${name} to active member list?`,
      icon: History,
      confirmText: "Restore",
      color: "bg-indigo-600",
      onConfirm: async () => {
        try {
          await updateMember(id, { is_archived: false });
          await fetchData();
        } catch (err: any) {
          console.error(err);
        }
      }
    });
  };

  const handleImportMembers = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Import Members",
      message: "Import all registered soloists into the member directory? Duplicates will be skipped.",
      icon: Download,
      confirmText: "Import",
      color: "bg-indigo-600",
      onConfirm: async () => {
        setBulkActionLoading(true);
        try {
          const result = await importRegistrationsToMembers();
          if (result) {
            await fetchData();
            setConfirmModal({
              isOpen: true,
              title: "Import Complete",
              message: `${result.imported} new members added, ${result.total - result.imported} already existed.`,
              icon: Check,
              confirmText: "Success",
              color: "bg-emerald-500",
              hideCancel: true,
              onConfirm: () => { }
            });
          }
        } catch (err: any) {
          console.error(err);
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
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
    <Layout
      subtitle="Administrator"
      isAuthenticated={true}
      onLogout={onLogout}
      sidebar={
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          repertoires={repertoires}
          waitlist={waitlist}
          onLogout={onLogout}
        />
      }
    >
      <div className="space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Contextual Header Section */}
            {(activeTab === 'list' || activeTab === 'members' || activeTab === 'repertoire' || activeTab === 'archives') && (
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white dark:bg-[#131521]/40 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-xl shadow-black/5">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  {activeTab === 'members' && (
                    <>
                      <button
                        onClick={handleImportMembers}
                        disabled={bulkActionLoading}
                        className="flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-2xl text-sm font-bold transition-all whitespace-nowrap"
                      >
                        {bulkActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Import Registered
                      </button>
                      <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-xl border border-slate-200 dark:border-white/5">
                        {['All', ...VOICE_PARTS].map(p => (
                          <button
                            key={p}
                            onClick={() => setMemberVoiceFilter(p)}
                            className={cn(
                              "px-4 py-2 flex-1 sm:flex-none rounded-lg text-xs font-bold transition-all",
                              memberVoiceFilter === p ? "bg-indigo-600 text-white shadow-lg glow-indigo" : "text-slate-500 hover:text-slate-900 dark:text-white"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {activeTab === 'list' && (
                    <>
                      <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-xl border border-slate-200 dark:border-white/5">
                        {['All', ...VOICE_PARTS].map(p => (
                          <button
                            key={p}
                            onClick={() => setVoicePartFilter(p)}
                            className={cn(
                              "px-4 py-2 flex-1 sm:flex-none rounded-lg text-xs font-bold transition-all",
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
                    </>
                  )}
                  {activeTab === 'repertoire' && (
                    <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-xl border border-slate-200 dark:border-white/5">
                      {['All', 'Pending', 'Approved', 'Rejected'].map(p => (
                        <button
                          key={p}
                          onClick={() => setRepertoireFilter(p)}
                          className={cn(
                            "px-4 py-2 flex-1 sm:flex-none rounded-lg text-xs font-bold transition-all",
                            repertoireFilter === p ? "bg-indigo-600 text-white shadow-lg glow-indigo" : "text-slate-500 hover:text-slate-900 dark:text-white"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      placeholder={activeTab === 'members' ? "Search members..." : activeTab === 'list' ? "Search name..." : "Search song..."}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  {activeTab === 'members' && (
                    <button
                      onClick={() => {
                        setEditingMember(null);
                        setIsMemberModalOpen(true);
                      }}
                      className="w-full md:w-auto flex justify-center items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold transition-all whitespace-nowrap shadow-lg shadow-emerald-500/20"
                    >
                      <Plus size={16} /> Add Member
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Dashboard Stats */}
            {(activeTab === 'list' || activeTab === 'members') && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            )}

            {activeTab === 'members' ? (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/5">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-[#0b0d17] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-white/5">
                      <tr>
                        <th className="px-8 py-5">Member</th>
                        <th className="px-8 py-5">Voice</th>
                        <th className="px-8 py-5">Contact</th>
                        <th className="px-8 py-5">Bio Snippet</th>
                        <th className="px-8 py-5">Soloist</th>
                        <th className="px-8 py-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginated.map((m: any) => (
                        <tr key={m.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                                <img src={m.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.full_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <button
                                  onClick={() => setSelectedMember(m)}
                                  className="font-bold text-slate-900 dark:text-white leading-tight hover:text-indigo-500 transition-colors text-left block"
                                >
                                  {m.full_name}
                                </button>
                                <p className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest mt-0.5">
                                  {m.member_positions?.title || 'Member'}
                                  {m.is_on_probation && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20 rounded-md">Probation</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{m.voice_part}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="space-y-0.5">
                              {m.phone && <div className="text-[10px] text-slate-500 font-bold">{m.phone}</div>}
                              {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                              {!m.phone && !m.email && <span className="text-[10px] text-slate-600 italic">No Contact</span>}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic max-w-[200px]">
                              {m.bio || 'None'}
                            </p>
                          </td>
                          <td className="px-8 py-5">
                            {m.is_soloist ? (
                              <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Yes (S-{m.registrations?.slot_id})
                              </div>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">No</span>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingMember(m);
                                  setIsMemberModalOpen(true);
                                }}
                                className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: "Delete Member",
                                    message: `Are you sure you want to completely delete ${m.full_name}'s profile?`,
                                    icon: Trash2,
                                    confirmText: "Delete",
                                    color: "bg-rose-500",
                                    onConfirm: async () => {
                                      try {
                                        await deleteMember(m.id);
                                        await fetchData();
                                      } catch (err) { console.error(err); }
                                    }
                                  });
                                }}
                                className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'archives' ? (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/5">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-[#0b0d17] text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-white/5">
                      <tr>
                        <th className="px-8 py-5">Member</th>
                        <th className="px-8 py-5">Voice</th>
                        <th className="px-8 py-5">Contact</th>
                        <th className="px-8 py-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginated.map((m: any) => (
                        <tr key={m.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                                <img src={m.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.full_name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{m.full_name}</h4>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5 italic">Archived</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{m.voice_part}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="space-y-0.5">
                              {m.phone && <div className="text-[10px] text-slate-500 font-bold">{m.phone}</div>}
                              {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleRestoreMember(m.id, m.full_name)}
                                className="px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                Restore
                              </button>
                              <button
                                onClick={async () => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: "Delete Permanently",
                                    message: `Are you sure you want to permanently delete ${m.full_name}? This action cannot be undone.`,
                                    icon: Trash2,
                                    confirmText: "Delete",
                                    color: "bg-rose-600",
                                    onConfirm: async () => {
                                      try {
                                        await deleteMember(m.id);
                                        await fetchData();
                                      } catch (err) { console.error(err); }
                                    }
                                  });
                                }}
                                className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginated.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                            No archived members
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination same as members */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0b0d17]/50 rounded-b-[2.5rem]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="bg-white dark:bg-[#131521] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 font-medium">
                      Page <span className="text-slate-900 dark:text-white">{currentPage}</span> of {totalPages || 1}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all text-slate-600 dark:text-slate-400"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all text-slate-600 dark:text-slate-400"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'list' ? (
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
                    {paginated.map((r: any) => (
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
                    {paginated.length === 0 && (
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
            ) : activeTab === 'checkin' ? (
              <div className="space-y-8 max-w-4xl mx-auto py-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/30">
                    <Check size={40} strokeWidth={3} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Fast Check-in</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Scan QR Code or Type Soloist ID for verification</p>
                </div>

                <div className="glass p-8 rounded-[3rem] border border-emerald-500/20 shadow-2xl space-y-8">
                  <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={24} />
                    <input
                      autoFocus
                      placeholder="Scan or Enter ID..."
                      className="w-full bg-slate-50 dark:bg-[#0b0d17] border-2 border-slate-200 dark:border-white/5 rounded-[2rem] pl-16 pr-6 py-6 text-xl focus:border-emerald-500 outline-none transition-all placeholder:text-slate-700 font-bold text-center uppercase tracking-widest"
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val.length >= 20) { // IDs are long UUIDs
                          setSearchQuery(val);
                        }
                      }}
                    />
                  </div>

                  {searchQuery && (
                    <AnimatePresence mode="wait">
                      {registrations.filter(r => r.id === searchQuery).length > 0 ? (
                        registrations.filter(r => r.id === searchQuery).map(r => (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-10 space-y-8 text-center"
                          >
                            <div className="space-y-4">
                              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/40">
                                <Check size={32} className="text-slate-900" strokeWidth={4} />
                              </div>
                              <div>
                                <h4 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic leading-tight">{r.full_name}</h4>
                                <p className="text-lg font-bold text-emerald-500 uppercase tracking-[0.3em] mt-2">Slot S-{r.slot_id} • {r.voice_part}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="p-6 bg-white dark:bg-black/20 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Repertoire</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {repertoires.find(rep => rep.registration_id === r.id && rep.status === 'approved')?.song_title || 'No Approved Song'}
                                </p>
                              </div>
                              <div className="p-6 bg-white dark:bg-black/20 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                                <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Verified</p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Check-in Successful",
                                  message: `${r.full_name} has been verified and checked in successfully.`,
                                  icon: Check,
                                  confirmText: "Done",
                                  color: "bg-emerald-500",
                                  hideCancel: true,
                                  onConfirm: () => { }
                                });
                                setSearchQuery('');
                              }}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black py-6 rounded-[2rem] text-xl transition-all shadow-xl shadow-emerald-500/30 uppercase italic"
                            >
                              Confirm Arrival
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-10"
                        >
                          <p className="text-slate-500 font-bold uppercase tracking-widest italic">No match found for this ID</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            ) : activeTab === 'waitlist' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-500">
                      <Grid size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Waitlist Queue</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{waitlist.length} soloists waiting</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pos</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Name</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Voice</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contact</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Joined</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {waitlist.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                              No one on the waitlist
                            </td>
                          </tr>
                        ) : (
                          waitlist.map((w, idx) => (
                            <tr key={w.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 dark:text-white text-sm">{w.full_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                  w.voice_part === 'Soprano' ? "bg-rose-500/10 text-rose-500" :
                                    w.voice_part === 'Alto' ? "bg-amber-500/10 text-amber-500" :
                                      w.voice_part === 'Tenor' ? "bg-sky-500/10 text-sky-500" :
                                        "bg-emerald-500/10 text-emerald-500"
                                )}>
                                  {w.voice_part}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  {w.phone && <div className="text-[10px] text-slate-500 font-medium">{w.phone}</div>}
                                  {w.email && <div className="text-[10px] text-slate-400">{w.email}</div>}
                                  {!w.phone && !w.email && <div className="text-[10px] text-slate-600 italic">None Provided</div>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {new Date(w.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-[9px] text-slate-600">
                                  {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handlePromoteWaitlist(w)}
                                    disabled={bulkActionLoading || stats.total >= maxSlots}
                                    className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30"
                                  >
                                    {bulkActionLoading ? '...' : 'Promote'}
                                  </button>
                                  <button
                                    onClick={() => handleRemoveWaitlist(w.id, w.full_name)}
                                    disabled={bulkActionLoading}
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === 'analytics' ? (
              <AnalyticsView registrations={registrations} repertoires={repertoires} />
            ) : activeTab === 'live' ? (
              <LiveModeView
                registrations={registrations}
                performanceWeeks={performanceWeeks}
                onUpdateStatus={async (id: string, status: string) => {
                  try {
                    await updatePerformanceStatus(id, status);
                    await fetchData();
                  } catch (err: any) {
                    console.error(err);
                    setConfirmModal({
                      isOpen: true,
                      title: "Update Failed",
                      message: "Database Error: " + (err.message || "Failed to update status. Please ensure the 'performance_status' column exists in your registrations table."),
                      icon: ShieldAlert,
                      confirmText: "Close",
                      color: "bg-slate-600",
                      hideCancel: true,
                      onConfirm: () => { }
                    });
                  }
                }}
                onResetStatus={async () => {
                  try {
                    await resetPerformanceStatus();
                    await fetchData();
                  } catch (err: any) {
                    console.error(err);
                    setConfirmModal({
                      isOpen: true,
                      title: "Reset Failed",
                      message: "Failed to reset: " + (err.message || "Unknown error"),
                      icon: ShieldAlert,
                      confirmText: "Close",
                      color: "bg-slate-600",
                      hideCancel: true,
                      onConfirm: () => { }
                    });
                  }
                }}
              />
            ) : activeTab === 'repertoire' ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-3">
                    <Music size={24} className="text-indigo-400" />
                    <h3 className="text-2xl font-black text-white tracking-tight">Review Repertoires</h3>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {selectedRepertoires.length > 0 && (
                      <div className="flex items-center gap-2 mr-4 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-indigo-400">{selectedRepertoires.length} selected</span>
                        <button
                          onClick={handleBulkApprove}
                          disabled={bulkActionLoading}
                          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-colors disabled:opacity-50 ml-2" title="Approve Selected">
                          {bulkActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          disabled={bulkActionLoading}
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md transition-colors disabled:opacity-50" title="Delete Selected">
                          {bulkActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleResetAllSongs}
                      disabled={bulkActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {bulkActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Factory Reset Repertoires
                    </button>
                  </div>
                </div>

                {repertoires.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <p>No songs have been submitted for review yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="py-4 px-4 w-12">
                            <input
                              type="checkbox"
                              checked={paginated.length > 0 && paginated.every((group: any) => group.songs.every((s: any) => selectedRepertoires.includes(s.id)))}
                              ref={el => {
                                if (el) {
                                  const allDisplayedSelected = paginated.length > 0 && paginated.every((group: any) => group.songs.every((s: any) => selectedRepertoires.includes(s.id)));
                                  const someDisplayedSelected = paginated.some((group: any) => group.songs.some((s: any) => selectedRepertoires.includes(s.id)));
                                  el.indeterminate = someDisplayedSelected && !allDisplayedSelected;
                                }
                              }}
                              onChange={handleSelectAllRepertoires}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                            />
                          </th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Soloist</th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[150px]">Song</th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Links / Summary</th>
                          <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      {paginated.map((group: any) => {
                        const allSelected = group.songs.every((s: any) => selectedRepertoires.includes(s.id));
                        const someSelected = group.songs.some((s: any) => selectedRepertoires.includes(s.id));

                        return (
                          <tbody key={group.registration_id} className={cn("border-b border-white/5 transition-colors group/body", someSelected ? "bg-indigo-500/5" : "hover:bg-white/[0.02]")}>
                            {group.songs.map((r: any, idx: number) => {
                              const status = r.status || 'pending';
                              return (
                                <tr key={r.id}>
                                  {idx === 0 && (
                                    <>
                                      <td rowSpan={group.songs.length} className="py-4 px-4 align-top w-12 border-r border-white/5">
                                        <input
                                          type="checkbox"
                                          checked={allSelected}
                                          ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                                          onChange={() => {
                                            if (allSelected) {
                                              setSelectedRepertoires(prev => prev.filter(id => !group.songs.find((s: any) => s.id === id)));
                                            } else {
                                              const newIds = group.songs.map((s: any) => s.id).filter((id: string) => !selectedRepertoires.includes(id));
                                              setSelectedRepertoires(prev => [...prev, ...newIds]);
                                            }
                                          }}
                                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer mt-1"
                                        />
                                      </td>
                                      <td rowSpan={group.songs.length} className="py-4 px-4 align-top border-r border-white/5">
                                        <div className="font-bold text-black dark:text-white whitespace-nowrap mt-0.5">{group.registrations?.full_name}</div>
                                        <div className="text-[10px] text-black dark:text-slate-500 mt-1 uppercase">Slot {group.registrations?.slot_id} • {group.registrations?.voice_part}</div>
                                      </td>
                                    </>
                                  )}
                                  <td className={cn("py-4 px-4 align-top", idx !== 0 && "border-t border-white/5")}>
                                    <div className="font-bold text-indigo-400">{r.song_title}</div>
                                    <div className="text-xs text-slate-400 italic mt-1">{r.artist_composer}</div>
                                  </td>
                                  <td className={cn("py-4 px-4 text-xs text-slate-400 leading-relaxed max-w-[300px] break-words align-top", idx !== 0 && "border-t border-white/5")}>
                                    {(r.song_link || r.score_link) && (
                                      <div className="flex gap-4 mb-2">
                                        {r.song_link && <a href={r.song_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-widest font-black text-[10px] bg-sky-500/10 px-2 py-0.5 rounded"><LinkIcon size={10} /> Audio</a>}
                                        {r.score_link && <a href={r.score_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-widest font-black text-[10px] bg-rose-500/10 px-2 py-0.5 rounded"><ExternalLink size={10} /> Score</a>}
                                      </div>
                                    )}
                                    {r.song_summary}
                                  </td>
                                  <td className={cn("py-4 px-4 align-top", idx !== 0 && "border-t border-white/5")}>
                                    <div className="flex items-center justify-end gap-2">
                                      {status === 'approved' ? (
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                          <Check size={12} /> Approved
                                        </span>
                                      ) : status === 'rejected' ? (
                                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                          <X size={12} /> Rejected
                                        </span>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleApproveSong(r.id, r.registration_id)}
                                            disabled={approvingId === r.id || rejectingId === r.id || deletingRepId === r.id}
                                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20 disabled:opacity-50" title="Approve">
                                            {approvingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                          </button>
                                          <button
                                            onClick={() => handleRejectSong(r.id)}
                                            disabled={rejectingId === r.id || approvingId === r.id || deletingRepId === r.id}
                                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20 disabled:opacity-50" title="Reject">
                                            {rejectingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSong(r.id)}
                                            disabled={deletingRepId === r.id || rejectingId === r.id || approvingId === r.id}
                                            className="p-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 rounded-lg transition-colors border border-slate-500/20 disabled:opacity-50" title="Delete">
                                            {deletingRepId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        );
                      })}
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
                          {submittedRepertoires.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, submittedRepertoires.length)} of {submittedRepertoires.length}
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
                )}
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

                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <History size={18} className="text-amber-400" />
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Probation Period</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed px-1">Set the default number of months for new member probation.</p>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      value={defaultProbationMonths}
                      onChange={e => setDefaultProbationMonths(parseInt(e.target.value))}
                      className="flex-1 bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all font-bold"
                    />
                    <button onClick={() => updateConfig('default_probation_months', defaultProbationMonths.toString())} className="px-8 bg-amber-500 text-slate-900 font-black rounded-2xl hover:bg-amber-400 transition-all uppercase tracking-tighter italic">Update</button>
                  </div>
                </div>

                <div className="p-8 bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10 mt-8">
                  <PositionManager positions={positions} onRefresh={fetchData} setConfirmModal={setConfirmModal} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <MemberProfileModal
          member={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          setConfirmModal={setConfirmModal}
          isAdmin={true}
        />

        <MemberEntryModal
          isOpen={isMemberModalOpen}
          onClose={() => {
            setIsMemberModalOpen(false);
            setEditingMember(null);
          }}
          onSave={handleSaveMember}
          member={editingMember}
          registrations={registrations}
          positions={positions}
          loading={isSavingMember}
          setConfirmModal={setConfirmModal}
        />
      </div>
    </Layout >
  );
}

// --- Roster View ---

function RosterView() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [performanceWeeks, setPerformanceWeeks] = useState<any[]>([]); // Added this line based on usage
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [regs, weeks] = await Promise.all([
        getRegistrations(),
        getPerformanceWeeks()
      ]);
      // Filter out test registrations for the public roster
      setRegistrations(regs.filter((r: any) => !r.is_test));
      // Filter out test weeks for the public roster
      setPerformanceWeeks(weeks.filter((w: any) => !w.is_test));
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
    <Layout subtitle="Performance Roster" isAuthenticated={false}>
      <div className="glass p-8 md:p-12 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-10 relative overflow-hidden">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">Roster for Compulsory Solo Performance 2026</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Weekly performance schedule and assigned soloist slots.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(performanceWeeks || []).map((week, i) => (
            <div key={i} className="bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-none flex flex-col hover:border-indigo-500/30 transition-colors">
              <h3 className="text-xl font-black text-indigo-500 mb-6 pb-4 border-b border-slate-100 dark:border-white/5">{week.date}</h3>
              <div className="space-y-4 flex-1">
                {(week.slot_ids || []).map((slotId: number) => {
                  const reg = (registrations || []).find(r => r.slot_id === slotId);
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

function SongEntryView({ setConfirmModal }: { setConfirmModal: any }) {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [repertoires, setRepertoires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegId, setSelectedRegId] = useState<string>('');

  // Form state
  const [songs, setSongs] = useState([{ title: '', artist: '', summary: '', songLink: '', scoreLink: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = async () => {
    try {
      const [regs, reps] = await Promise.all([getRegistrations(), getRepertoires()]);
      regs.sort((a: any, b: any) => a.slot_id - b.slot_id);
      setRegistrations(regs);
      setRepertoires(reps);
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
    const sub_regs = supabase.channel('songs_regs').on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchData).subscribe();
    const sub_reps = supabase.channel('songs_reps').on('postgres_changes', { event: '*', schema: 'public', table: 'repertoire_submissions' }, fetchData).subscribe();
    return () => { supabase.removeChannel(sub_regs); supabase.removeChannel(sub_reps); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegId || songs.some(s => !s.title.trim() || !s.artist.trim())) return;

    setSubmitting(true);
    try {
      // Submit all songs within the array
      await Promise.all(songs.map(song =>
        addRepertoire(selectedRegId, song.title, song.artist, song.summary, song.songLink, song.scoreLink)
      ));

      await fetchData(); // Immediate reload

      // Clear form
      setSelectedRegId('');
      setSongs([{ title: '', artist: '', summary: '', songLink: '', scoreLink: '' }]);
      setSuccessMessage("Your song selections have been submitted for review successfully!");
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: "Submission Failed",
        message: "Failed to save songs: " + (err.message || 'Unknown error'),
        icon: ShieldAlert,
        confirmText: "Close",
        color: "bg-slate-600",
        hideCancel: true,
        onConfirm: () => { }
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addSongField = () => {
    setSongs([...songs, { title: '', artist: '', summary: '', songLink: '', scoreLink: '' }]);
  };

  const removeSongField = (index: number) => {
    if (songs.length <= 1) return;
    setSongs(songs.filter((_, i) => i !== index));
  };

  const handleSongChange = (index: number, field: string, value: string) => {
    const newSongs = [...songs];
    // @ts-ignore
    newSongs[index][field] = value;
    setSongs(newSongs);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage]);

  const filteredRepertoires = repertoires.filter(r => {
    const matchesSearch = r.song_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.artist_composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registrations?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (r.status || 'pending') === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const groupedFilteredRepertoires = Object.values(
    filteredRepertoires.reduce((acc, r: any) => {
      if (!acc[r.registration_id]) {
        acc[r.registration_id] = {
          registration_id: r.registration_id,
          registrations: r.registrations,
          songs: []
        };
      }
      acc[r.registration_id].songs.push(r);
      return acc;
    }, {} as Record<string, any>)
  ).sort((a: any, b: any) => a.registrations?.slot_id - b.registrations?.slot_id);

  const totalPages = Math.ceil(groupedFilteredRepertoires.length / itemsPerPage);
  const paginatedRepertoires = groupedFilteredRepertoires.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Compute users who are "locked" from submitting
  // Users are locked if they have ANY repertoire with status 'pending' or 'approved'.
  // If all their repertoires are 'rejected', they are allowed to submit again.
  const lockedRegIds = new Set(
    repertoires
      .filter(r => r.status === 'pending' || r.status === 'approved')
      .map(r => r.registration_id)
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0d17]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <Layout subtitle="Solo Repertoire Submission" isAuthenticated={false}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Side: Form */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 relative overflow-hidden">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Submit Your Song</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Select your allocated slot to add your chosen repertoire details.</p>

            {successMessage && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-3">
                <Check size={16} /> {successMessage}
              </div>
            )}

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
                  {registrations.map(r => {
                    const isLocked = lockedRegIds.has(r.id);
                    return (
                      <option key={r.id} value={r.id} disabled={isLocked}>
                        {isLocked ? '🔒 ' : ''}S-{r.slot_id} : {r.full_name} {isLocked ? '(Already Submitted)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-6">
                {songs.map((song, index) => (
                  <div key={index} className="p-4 rounded-2xl border border-white/5 bg-slate-50 dark:bg-white/[0.02] relative space-y-5">
                    {songs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSongField(index)}
                        className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-3">
                      <Music size={16} className="text-indigo-400" />
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">Option {index + 1}</h4>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Song Title</label>
                      <input
                        type="text"
                        placeholder="e.g. O mio babbino caro"
                        value={song.title}
                        onChange={e => handleSongChange(index, 'title', e.target.value)}
                        className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Artist / Composer</label>
                      <input
                        type="text"
                        placeholder="e.g. Giacomo Puccini"
                        value={song.artist}
                        onChange={e => handleSongChange(index, 'artist', e.target.value)}
                        className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Brief Summary (Optional)</label>
                      <textarea
                        placeholder="A short description of the piece..."
                        value={song.summary}
                        onChange={e => handleSongChange(index, 'summary', e.target.value)}
                        rows={2}
                        className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Song Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://youtu.be/..."
                          value={song.songLink}
                          onChange={e => handleSongChange(index, 'songLink', e.target.value)}
                          className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Score Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="PDF link..."
                          value={song.scoreLink}
                          onChange={e => handleSongChange(index, 'scoreLink', e.target.value)}
                          className="w-full bg-white dark:bg-[#131521] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSongField}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-indigo-400 font-bold text-sm tracking-wide rounded-2xl transition-all border border-indigo-500/20 flex items-center justify-center gap-2"
              >
                + Add Another Option
              </button>

              <button
                type="submit"
                disabled={submitting || !selectedRegId}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl transition-all shadow-lg glow-emerald disabled:opacity-50 disabled:hover:bg-emerald-500 flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Submit Repertoire Options</>}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Repertoire Table */}
        <div className="lg:col-span-8">
          <div className="glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <BookOpen size={24} className="text-indigo-500" />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Submitted Repertoire</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="flex bg-slate-50 dark:bg-[#0b0d17] p-1 rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto">
                  {['All', 'Pending', 'Approved', 'Rejected'].map(p => (
                    <button
                      key={p}
                      onClick={() => setStatusFilter(p)}
                      className={cn(
                        "px-3 py-1.5 flex-1 sm:flex-none rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                        statusFilter === p ? "bg-indigo-600 text-white shadow-lg glow-indigo" : "text-slate-500 hover:text-slate-900 dark:text-white"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input
                    placeholder="Search songs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b0d17] border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {repertoires.length === 0 ? (
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
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Links / Summary</th>
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Status</th>
                    </tr>
                  </thead>
                  {paginatedRepertoires.map((group: any) => {
                    return (
                      <tbody key={group.registration_id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group/body">
                        {group.songs.map((r: any, idx: number) => {
                          const status = r.status || 'pending';
                          return (
                            <tr key={r.id}>
                              {idx === 0 && (
                                <>
                                  <td rowSpan={group.songs.length} className="py-4 px-4 align-top w-12 border-r border-slate-50 dark:border-white/5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                                      S-{r.registrations?.slot_id}
                                    </div>
                                  </td>
                                  <td rowSpan={group.songs.length} className="py-4 px-4 align-top border-r border-slate-50 dark:border-white/5 font-bold text-slate-900 dark:text-white whitespace-nowrap pt-5">
                                    {r.registrations?.full_name}
                                  </td>
                                </>
                              )}
                              <td className={cn("py-4 px-4 align-top font-bold text-indigo-500 dark:text-indigo-400", idx !== 0 && "border-t border-slate-50 dark:border-white/5")}>{r.song_title}</td>
                              <td className={cn("py-4 px-4 align-top text-slate-600 dark:text-slate-300 italic", idx !== 0 && "border-t border-slate-50 dark:border-white/5")}>{r.artist_composer}</td>
                              <td className={cn("py-4 px-4 align-top text-xs text-slate-500 leading-relaxed max-w-[250px] truncate group-hover:whitespace-normal group-hover:break-words transition-all", idx !== 0 && "border-t border-slate-50 dark:border-white/5")}>
                                {(r.song_link || r.score_link) && (
                                  <div className="flex gap-4 mb-2">
                                    {r.song_link && <a href={r.song_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-500 hover:text-sky-400 transition-colors uppercase tracking-widest font-black text-[10px] bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded"><LinkIcon size={10} /> Audio</a>}
                                    {r.score_link && <a href={r.score_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-widest font-black text-[10px] bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded"><ExternalLink size={10} /> Score</a>}
                                  </div>
                                )}
                                {r.song_summary || '—'}
                              </td>
                              <td className={cn("py-4 px-4 align-top text-right", idx !== 0 && "border-t border-slate-50 dark:border-white/5")}>
                                <span className={cn(
                                  "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap border mt-1 inline-block",
                                  status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                    status === 'rejected' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                      "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                )}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })}
                </table>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0b0d17]/50 mt-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="bg-white dark:bg-[#131521] border border-slate-300 dark:border-white/10 text-slate-300 text-xs rounded-xl px-2 py-1 outline-none focus:border-indigo-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      {groupedFilteredRepertoires.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, groupedFilteredRepertoires.length)} of {groupedFilteredRepertoires.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="p-1.5 bg-white dark:bg-[#131521] border border-slate-300 dark:border-white/10 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="p-1.5 bg-white dark:bg-[#131521] border border-slate-300 dark:border-white/10 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('is-admin-authenticated') === 'true';
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("Global crash caught:", e.error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) return <ErrorFallback />;

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('is-admin-authenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('is-admin-authenticated');
  };

  if (!isSupabaseConfigured) {
    return <PublicView />;
  }

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    icon?: any;
    confirmText?: string;
    color?: string;
    hideCancel?: boolean;
    loading?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<PublicView setConfirmModal={setConfirmModal} />} />
        <Route path="/status" element={<SoloistStatusView />} />
        <Route path="/members" element={<MembersView />} />
        <Route
          path="/admin"
          element={isAuthenticated ? <AdminView onLogout={handleLogout} confirmModal={confirmModal} setConfirmModal={setConfirmModal} /> : <Navigate to="/login" replace />}
        />
        <Route path="/login" element={<LoginView onLogin={handleLogin} />} />
        <Route path="/" element={<RosterView />} />
        <Route path="/repertoire" element={<SongEntryView setConfirmModal={setConfirmModal} />} />
      </Routes>
      <AnimatePresence>
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          loading={confirmModal.loading}
          icon={confirmModal.icon}
          confirmText={confirmModal.confirmText}
          color={confirmModal.color}
          hideCancel={confirmModal.hideCancel}
        />
      </AnimatePresence>
    </BrowserRouter>
  );
}
