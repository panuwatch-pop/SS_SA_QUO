'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ 
          text: 'ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ (หากใน Supabase เปิดตั้งค่า Confirm Email ไว้ คุณจะต้องกดยืนยันในอีเมลก่อน)', 
          type: 'success' 
        });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Let the AuthContext detect the session and redirect automatically
        // or force a push here just in case
        router.push('/');
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'เกิดข้อผิดพลาดในการดำเนินการ', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-box animate-fade-in">
        <div className="login-header">
          <h1>{isSignUp ? 'สร้างบัญชีผู้ใช้' : 'เข้าสู่ระบบ'}</h1>
          <p>ระบบทำใบเสนอราคาและแคตตาล็อค</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="label">อีเมล</label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="label">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : (isSignUp ? 'ลงทะเบียน' : 'เข้าสู่ระบบ')}
          </button>
        </form>

        <div className="toggle-auth">
          <button 
            type="button" 
            className="toggle-btn"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครใช้งาน'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1rem;
          background: radial-gradient(circle at center, var(--primary-color) 0%, var(--bg-color) 100%);
        }
        .login-box {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .login-header {
          text-align: center;
          margin-bottom: 1rem;
        }
        .login-header h1 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }
        .login-header p {
          color: var(--text-light);
          font-size: 0.9rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .message {
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          text-align: center;
        }
        .message.success {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--success-color);
          border: 1px solid var(--success-color);
        }
        .message.error {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--error-color);
          border: 1px solid var(--error-color);
        }
        .toggle-auth {
          text-align: center;
          margin-top: 1rem;
        }
        .toggle-btn {
          background: none;
          border: none;
          color: var(--text-color);
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.9rem;
          opacity: 0.8;
        }
        .toggle-btn:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
