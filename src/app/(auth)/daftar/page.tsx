'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { validateEmail, validatePassword } from '@/lib/utils'

function RegisterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Nama minimal 2 karakter dong'
    if (!validateEmail(form.email)) errs.email = 'Format email-nya kurang bener nih'
    const passValidation = validatePassword(form.password)
    if (!passValidation.valid) errs.password = passValidation.errors[0]
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError('')
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = (await res.json()) as any;
      setLoading(false);
      if (res.ok && data.success) {
        // Redirect ke halaman OTP verifikasi
        const redirectParam = searchParams.get('redirect')
        const otpUrl = `/verifikasi-otp?email=${encodeURIComponent(data.email || form.email)}&purpose=register${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`
        router.push(otpUrl)
      } else {
        setRegisterError(data.message || 'Gagal mendaftarkan akun.');
      }
    } catch (err) {
      setLoading(false);
      setRegisterError('Gagal menyambung ke server. Pastikan server lokal kamu menyala ya!');
    }
  }

  const passStrength = (() => {
    const p = form.password
    if (p.length === 0) return null
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    if (score <= 1) return { label: 'Lemah', color: 'var(--error)', width: 25 }
    if (score === 2) return { label: 'Cukup', color: 'var(--warning)', width: 50 }
    if (score === 3) return { label: 'Bagus', color: 'var(--brand-blue)', width: 75 }
    return { label: 'Kuat!', color: 'var(--teal)', width: 100 }
  })()


  return (
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex' }}>
      {/* Left panel — info */}
      <div style={{
        flex: 1, background: 'linear-gradient(135deg, #0286C3 0%, #17B897 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48, color: 'white',
      }} className="auth-panel">
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h2 style={{ color: 'white', marginBottom: 16, fontSize: 28 }}>
            Mulai kenali diri sendiri
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 40 }}>
            Bergabung gratis dan akses assessment pertama kamu hari ini.
            Nggak perlu kartu kredit, nggak ada kejutan.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {[
              'Assessment love language & attachment style',
              'Mood tracker & journal relasi',
              'Insight personal berbasis data kamu',
              'Privasi terjaga, data nggak dijual',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle size={16} style={{ marginTop: 2, flexShrink: 0, color: 'rgba(255,255,255,0.9)' }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 440, width: '100%' }} className="animate-fadein">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 40 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #0286C3, #17B897)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Insight Hub</span>
          </Link>

          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Buat akun gratis</h1>
          <p style={{ marginBottom: 32, color: 'var(--text-secondary)' }}>
            Udah punya akun?{' '}
            <Link href={`/masuk${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} style={{ color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none' }}>Masuk di sini</Link>
          </p>

          {registerError && (
            <div style={{
              background: 'rgba(211,47,47,0.08)', border: '1px solid var(--error)',
              borderRadius: 6, padding: '12px 16px', marginBottom: 20,
              display: 'flex', gap: 8, alignItems: 'center',
              color: 'var(--error)', fontSize: 14,
            }}>
              <AlertCircle size={16} />
              {registerError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Name */}
            <div>
              <label className="label" htmlFor="name">Nama panggilan kamu</label>
              <input
                id="name"
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="Misal: Kira, Bimo, Rara..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={loading}
              />
              {errors.name && (
                <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="kamu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                disabled={loading}
              />
              {errors.email && (
                <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min. 8 karakter, ada angka & huruf kapital"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passStrength && (
                <div style={{ marginTop: 8 }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${passStrength.width}%`, background: passStrength.color, transition: 'width 300ms ease, background 300ms ease' }} />
                  </div>
                  <p style={{ fontSize: 11, color: passStrength.color, fontWeight: 600, marginTop: 4 }}>Password {passStrength.label}</p>
                </div>
              )}
              {errors.password && (
                <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Dengan daftar, kamu setuju sama{' '}
              <Link href="/terms" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>Syarat & Ketentuan</Link>
              {' '}dan{' '}
              <Link href="/privacy" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>Kebijakan Privasi</Link> kami.
            </p>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 15, fontWeight: 700 }}
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  Lagi dibuat...
                </>
              ) : (
                <>
                  Buat akun gratis
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          .auth-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner" style={{ borderColor: 'rgba(2,134,195,0.2)', borderTopColor: 'var(--brand-blue)', width: 32, height: 32 }} />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
