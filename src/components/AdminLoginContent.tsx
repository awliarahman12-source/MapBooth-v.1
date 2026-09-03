import { useState, useRef, type KeyboardEvent } from 'react';
import { Lock } from 'lucide-react';
import { adminLogin } from '@/adminStore';

interface AdminLoginContentProps {
  onSuccess: () => void;
}

export default function AdminLoginContent({ onSuccess }: AdminLoginContentProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (adminLogin(passcode)) {
      setError('');
      setPasscode('');
      onSuccess();
    } else {
      setError('Incorrect passcode');
      setPasscode('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="admin-login-body">
      <div className="admin-login-icon">
        <Lock size={32} color="white" />
      </div>
      <div className="admin-login-title">Admin Login</div>
      <div className="admin-login-subtitle">Enter passcode to access dashboard</div>
      <input
        ref={inputRef}
        type="password"
        className="admin-passcode-input"
        placeholder="••••••"
        value={passcode}
        autoFocus
        onChange={(e) => { setPasscode(e.target.value); setError(''); }}
        onKeyDown={handleKeyDown}
      />
      <div className="admin-login-error">{error}</div>
      <button className="admin-login-btn" onClick={handleSubmit}>Unlock</button>
    </div>
  );
}
