import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowRight, Plus, ShieldCheck} from 'lucide-react';
import SqlAppointments from './SqlAppointments';
import SqlExam from './SqlExam';
import {actorRoles} from './roles';
import './auth.css';

export default function SqlWorkspace() {
  const [account, setAccount] = useState(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', {signal: controller.signal, cache: 'no-store'})
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setAccount)
      .catch(() => {
        if (controller.signal.aborted) return;
        setAccount(null);
        setError('Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.');
      });
    return () => controller.abort();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    await execute('login', {username: data.get('username'), password: data.get('password')});
  }

  async function execute(action, data = {}) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/' + action, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error);
        return;
      }
      setAccount(action === 'logout' ? null : result);
    } catch {
      setError('Không thể kết nối dịch vụ đăng nhập.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const expire = useCallback(() => {
    setAccount(null);
    setError('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
  }, []);

  if (account) return <main className="sql-workspace">
    <header className="panel-heading">
      <div><a href="#trang-chu">Trang chủ MediCare</a><h1>{actorRoles[account.role].home}</h1><p>{account.name} · {actorRoles[account.role].name}</p></div>
      <button className="secondary" disabled={busy} onClick={() => execute('logout')}>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
    </header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {account.role === 'doctor' ? <SqlExam onExpired={expire}/> : <SqlAppointments onExpired={expire}/>}
  </main>;

  return <div className="auth-page">
    <section className="auth-story">
      <a className="brand" href="#trang-chu"><span className="brand-mark"><Plus size={28}/></span><span>MediCare<small>HOSPITAL MANAGEMENT</small></span></a>
      <div className="auth-story-content"><h1>Không gian làm việc MediCare</h1><p>Đăng nhập bằng tài khoản do bệnh viện cấp.</p></div>
    </section>
    <section className="auth-main">
      {account === undefined ? <p role="status">Đang kiểm tra phiên đăng nhập…</p> :
        <form className="auth-form sql-login" onSubmit={submit}>
          <h2>Đăng nhập</h2>
          <label>Tên đăng nhập<input name="username" autoComplete="username" maxLength={50} required disabled={busy}/></label>
          <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" maxLength={256} required disabled={busy}/></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary full" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'} <ArrowRight size={17}/></button>
          <div className="auth-footer"><ShieldCheck size={15}/>Tài khoản MediCare HIS</div>
        </form>}
    </section>
  </div>;
}
