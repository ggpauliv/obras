import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const FEATURES = [
  { icon: 'photo_camera', text: 'Progresso com prova fotográfica' },
  { icon: 'warning', text: 'Alertas automáticos de atraso' },
  { icon: 'fact_check', text: 'Auditoria completa de todas as ações' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const ok = await login(username, senha);
    if (ok) {
      navigate('/dashboard');
    } else {
      setErro('Usuário ou senha inválidos.');
    }
  };

  return (
    <div className="flex h-screen w-full bg-surface-container-lowest">
      {/* Coluna esquerda (institucional) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-container relative overflow-hidden flex-col justify-center px-margin-desktop xl:px-2xl py-2xl">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect fill="url(#grid)" height="100%" width="100%" />
          </svg>
        </div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-20 pointer-events-none">
          <svg fill="none" height="600" viewBox="0 0 600 600" width="600" xmlns="http://www.w3.org/2000/svg">
            <path d="M150 450 L150 150 L250 150 L250 450 Z" fill="white" />
            <path d="M280 450 L280 250 L380 250 L380 450 Z" fill="white" />
            <path d="M410 450 L410 300 L510 300 L510 450 Z" fill="white" />
            <path d="M100 150 L300 50" stroke="white" strokeLinecap="round" strokeWidth="8" />
            <path d="M200 100 L200 150" stroke="white" strokeWidth="4" />
            <circle cx="200" cy="160" fill="white" r="10" />
          </svg>
        </div>
        <div className="relative z-10 max-w-[520px]">
          <h1 className="text-display-lg text-on-primary mb-xl leading-tight">
            Controle total da sua obra, em tempo real.
          </h1>
          <ul className="space-y-lg">
            {FEATURES.map((f) => (
              <li key={f.icon} className="flex items-start gap-md text-on-primary">
                <span className="material-symbols-outlined mt-xs text-primary-fixed">{f.icon}</span>
                <span className="text-body-lg">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Coluna direita (formulário) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-container-lowest">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-sm mb-xl">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[24px]" data-weight="fill">location_city</span>
            </div>
            <span className="text-headline-md font-bold text-on-surface">PAWLIV OBRAS</span>
          </div>

          <div className="mb-xl">
            <h2 className="text-display-lg-mobile md:text-display-lg text-on-surface mb-sm">Entrar na sua conta</h2>
            <p className="text-body-md text-on-surface-variant">Acesso exclusivo para usuários convidados</p>
          </div>

          <form className="space-y-lg" onSubmit={handleSubmit}>
            <div className="space-y-sm">
              <label className="block text-label-md text-on-surface" htmlFor="username">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">person</span>
                </div>
                <input className="block w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg text-on-surface text-body-md bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all" id="username" name="username" placeholder="seu.usuario" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
            </div>

            <div className="space-y-sm">
              <label className="block text-label-md text-on-surface" htmlFor="password">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">lock</span>
                </div>
                <input className="block w-full pl-10 pr-10 py-2 border border-outline-variant rounded-lg text-on-surface text-body-md bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all" id="password" name="password" placeholder="••••••••" type={showPwd ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-error text-body-sm bg-error-container/30 border border-error/20 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {erro}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input className="h-4 w-4 text-primary-container focus:ring-primary-container border-outline-variant rounded cursor-pointer" id="remember-me" name="remember-me" type="checkbox" />
                <label className="ml-2 block text-body-sm text-on-surface-variant cursor-pointer" htmlFor="remember-me">Lembrar-me por 30 dias</label>
              </div>
            </div>

            <button type="submit" className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-label-md text-on-primary bg-primary-container hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container transition-colors">
              Entrar
            </button>

            <div className="text-center">
              <a className="text-label-md text-primary-container hover:text-primary transition-colors" href="#a">Esqueci minha senha</a>
            </div>
          </form>

          <div className="mt-xl border-t border-outline-variant/50 pt-xl">
            <p className="text-center text-body-sm text-on-surface-variant">
              Problemas para acessar?{' '}
              <a className="text-label-sm text-primary-container hover:text-primary underline" href="#a">Entre em contato com seu administrador.</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
