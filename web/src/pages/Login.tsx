import { useState, FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-5"
      >
        <h1 className="text-2xl font-bold text-center text-violet-700">النورس للشحن</h1>
        <p className="text-center text-slate-500 text-sm">تسجيل الدخول</p>

        <input
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm text-center">❌ {error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg py-2 font-medium transition"
        >
          {busy ? 'جارٍ الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
