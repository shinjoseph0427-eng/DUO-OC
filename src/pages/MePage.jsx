// src/pages/MePage.jsx
// Profile-centric "Me" tab — profile summary + settings + account actions.

import { useState } from 'react';
import { Pencil, Calendar, Inbox, LogOut, ChevronRight } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import { deleteAccount } from '../lib/auth.js';

function Row({ icon: Icon, label, sub, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: C.cardElevated, border: 'none',
        borderBottom: `0.5px solid ${C.border}`, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: danger ? 'rgba(239,68,68,0.08)' : C.amberT08,
        border: `0.5px solid ${danger ? 'rgba(239,68,68,0.25)' : C.brownBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={danger ? C.danger : C.amber} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: danger ? C.danger : C.white, margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{sub}</p>}
      </div>
      {!danger && <ChevronRight size={18} color={C.muted} />}
    </button>
  );
}

export default function MePage({ currentUser, profile, go, showToast, onLogout }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const photo = profile?.photos?.[0] ?? null;
  const name  = profile?.name || 'Your profile';
  const meta  = [profile?.city, profile?.username && `@${profile.username}`].filter(Boolean).join(' · ') || 'Orange County';

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount(); // soft-delete + signOut → App routes to home
    } catch (err) {
      showToast?.(err?.message ?? 'Failed to delete account. Please try again.', 'error');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.white }}>
      <TopBar onLogoClick={() => go('home')} />

      <div style={{ padding: '22px 16px 104px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.white, margin: '0 0 18px', letterSpacing: '-0.5px' }}>
          Me
        </h1>

        {/* Profile summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: photo ? 'transparent' : C.amberT08,
            border: `1.5px solid ${photo ? C.border : C.brownBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: C.amber,
          }}>
            {photo
              ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (name[0]?.toUpperCase() ?? '?')}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 19, fontWeight: 800, color: C.white, margin: 0 }}>{name}</p>
            <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>{meta}</p>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p style={{ fontSize: 14, color: 'rgba(17,17,17,0.78)', lineHeight: 1.55, margin: '0 0 20px' }}>
            {profile.bio}
          </p>
        )}

        {/* Actions */}
        <div style={{ borderRadius: 16, overflow: 'hidden', border: `0.5px solid ${C.border}`, marginBottom: 14 }}>
          <Row icon={Pencil}   label="Edit Profile"        sub="Photos, name, bio"              onClick={() => go('edit_profile')} />
          <Row icon={Calendar} label="My Weekly Card"      sub="Set when you're free this week" onClick={() => go('weekly_card')} />
          <Row icon={Inbox}    label="Solo Requests"       sub="Requests you've sent & received" onClick={() => go('solo_inbox')} />
        </div>

        {/* Account */}
        <div style={{ borderRadius: 16, overflow: 'hidden', border: `0.5px solid ${C.border}` }}>
          {onLogout && (
            <Row icon={LogOut} label="Sign out" sub="Log out of this account" onClick={onLogout} />
          )}
          <Row icon={LogOut} label="Delete account" danger onClick={() => setShowDeleteConfirm(true)} />
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => !deleting && setShowDeleteConfirm(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 28px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bg, borderRadius: 22, padding: '28px 24px 22px',
              width: '100%', maxWidth: 360, border: `0.5px solid ${C.border}`, textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 19, fontWeight: 900, color: C.white, margin: '0 0 8px' }}>
              Delete your account?
            </h2>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
              All your data will be removed. This can't be undone.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                background: C.danger, color: '#fff', fontSize: 15, fontWeight: 800,
                cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.7 : 1, marginBottom: 10,
              }}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              style={{
                width: '100%', padding: '12px 0', background: 'none', border: 'none',
                color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
