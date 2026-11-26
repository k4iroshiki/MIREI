// pages/Auth_Page/AuthPage.jsx
import React, { useState } from 'react';
import './auth.css';

const API = 'http://localhost:3000/api/auth';

// ── Step components ───────────────────────────────────────────────

const RegisterForm = ({ onSwitch, onOTPSent, onSuccess }) => {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v })); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // Dev mode: langsung dapat token tanpa OTP
      if (data.token) {
        onSuccess(data.token, data.user);
      } else {
        onOTPSent(form.email);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-header">
        <span className="auth-logo">✦</span>
        <h1 className="auth-title">Buat Akun</h1>
        <p className="auth-sub">Bergabung dengan Mirei sekarang</p>
      </div>

      <div className="auth-fields">
        <div className="auth-field">
          <label>Username</label>
          <input
            type="text" placeholder="Nama kamu"
            value={form.username} onChange={e => set('username', e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label>Email</label>
          <input
            type="email" placeholder="email@contoh.com"
            value={form.email} onChange={e => set('email', e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label>Password</label>
          <input
            type="password" placeholder="Minimal 6 karakter"
            value={form.password} onChange={e => set('password', e.target.value)}
            required
          />
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Mengirim OTP...' : 'Daftar'}
      </button>

      <p className="auth-switch">
        Sudah punya akun?{' '}
        <button type="button" onClick={onSwitch}>Masuk</button>
      </p>
    </form>
  );
};

const OTPForm = ({ email, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await fetch(`${API}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setInfo('OTP baru telah dikirim!');
      setTimeout(() => setInfo(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-header">
        <span className="auth-logo">✦</span>
        <h1 className="auth-title">Verifikasi Email</h1>
        <p className="auth-sub">Kode OTP dikirim ke<br /><strong>{email}</strong></p>
      </div>

      <div className="auth-fields">
        <div className="auth-field">
          <label>Kode OTP</label>
          <input
            type="text" placeholder="6 digit kode"
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6} className="auth-otp-input"
            required
          />
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {info && <div className="auth-info">{info}</div>}

      <button className="auth-btn" type="submit" disabled={loading || code.length < 6}>
        {loading ? 'Memverifikasi...' : 'Verifikasi'}
      </button>

      <p className="auth-switch">
        Tidak menerima kode?{' '}
        <button type="button" onClick={handleResend} disabled={resending}>
          {resending ? 'Mengirim...' : 'Kirim ulang'}
        </button>
      </p>
    </form>
  );
};

const LoginForm = ({ onSwitch, onSuccess, onForgot }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-header">
        <span className="auth-logo">✦</span>
        <h1 className="auth-title">Selamat Datang</h1>
        <p className="auth-sub">Masuk ke akun Mirei kamu</p>
      </div>

      <div className="auth-fields">
        <div className="auth-field">
          <label>Email</label>
          <input
            type="email" placeholder="email@contoh.com"
            value={form.email} onChange={e => set('email', e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <div className="auth-field-header">
            <label>Password</label>
            <button type="button" className="auth-forgot-link" onClick={onForgot}>
              Lupa password?
            </button>
          </div>
          <input
            type="password" placeholder="Password kamu"
            value={form.password} onChange={e => set('password', e.target.value)}
            required
          />
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Masuk...' : 'Masuk'}
      </button>

      <p className="auth-switch">
        Belum punya akun?{' '}
        <button type="button" onClick={onSwitch}>Daftar</button>
      </p>
    </form>
  );
};

// ── Forgot Password Form ──────────────────────────────────────────
const ForgotPasswordForm = ({ onBack }) => {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [sent, setSent]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-form">
        <div className="auth-header">
          <span className="auth-logo">✦</span>
          <h1 className="auth-title">Email Terkirim!</h1>
          <p className="auth-sub">
            Cek inbox <strong>{email}</strong><br />
            Link reset berlaku 30 menit.
          </p>
        </div>
        <div className="auth-success-icon">📬</div>
        <p className="auth-switch">
          <button type="button" onClick={onBack}>← Kembali ke Login</button>
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-header">
        <span className="auth-logo">✦</span>
        <h1 className="auth-title">Lupa Password</h1>
        <p className="auth-sub">Masukkan email kamu, kami akan kirim link reset password</p>
      </div>

      <div className="auth-fields">
        <div className="auth-field">
          <label>Email</label>
          <input
            type="email" placeholder="email@contoh.com"
            value={email} onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button className="auth-btn" type="submit" disabled={loading || !email}>
        {loading ? 'Mengirim...' : 'Kirim Link Reset'}
      </button>

      <p className="auth-switch">
        Ingat password?{' '}
        <button type="button" onClick={onBack}>Kembali ke Login</button>
      </p>
    </form>
  );
};

// ── Reset Password Form ───────────────────────────────────────────
const ResetPasswordForm = ({ token, onSuccess }) => {
  const [form, setForm]     = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Password tidak cocok');
      return;
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: form.password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-form">
        <div className="auth-header">
          <span className="auth-logo">✦</span>
          <h1 className="auth-title">Password Berhasil Direset!</h1>
          <p className="auth-sub">Silakan login dengan password baru kamu.</p>
        </div>
        <div className="auth-success-icon">✅</div>
        <button className="auth-btn" type="button" onClick={onSuccess}>
          Login Sekarang
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-header">
        <span className="auth-logo">✦</span>
        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-sub">Buat password baru untuk akun kamu</p>
      </div>

      <div className="auth-fields">
        <div className="auth-field">
          <label>Password Baru</label>
          <input
            type="password" placeholder="Minimal 6 karakter"
            value={form.password} onChange={e => set('password', e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label>Konfirmasi Password</label>
          <input
            type="password" placeholder="Ulangi password baru"
            value={form.confirm} onChange={e => set('confirm', e.target.value)}
            required
          />
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
      </button>
    </form>
  );
};

// ── Main AuthPage ─────────────────────────────────────────────────
const AuthPage = ({ onAuthenticated }) => {
  const [mode, setMode] = useState(() => {
    // Cek apakah ada reset token di URL
    const params = new URLSearchParams(window.location.search);
    return params.get('token') ? 'reset' : 'login';
  });
  const [pendingEmail, setPendingEmail] = useState('');
  const [resetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  });

  const handleOTPSent = (email) => {
    setPendingEmail(email);
    setMode('otp');
  };

  const handleSuccess = (token, user) => {
    localStorage.setItem('mirei_token', token);
    localStorage.setItem('mirei_user', JSON.stringify(user));
    onAuthenticated(user);
  };

  const handleResetSuccess = () => {
    // Bersihkan token dari URL lalu ke login
    window.history.replaceState({}, '', window.location.pathname);
    setMode('login');
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-card">
        {mode === 'login' && (
          <LoginForm
            onSwitch={() => setMode('register')}
            onSuccess={handleSuccess}
            onForgot={() => setMode('forgot')}
          />
        )}
        {mode === 'register' && (
          <RegisterForm onSwitch={() => setMode('login')} onOTPSent={handleOTPSent} onSuccess={handleSuccess} />
        )}
        {mode === 'otp' && (
          <OTPForm email={pendingEmail} onSuccess={handleSuccess} />
        )}
        {mode === 'forgot' && (
          <ForgotPasswordForm onBack={() => setMode('login')} />
        )}
        {mode === 'reset' && (
          <ResetPasswordForm token={resetToken} onSuccess={handleResetSuccess} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;
