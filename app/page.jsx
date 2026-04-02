'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export default function PontoPage() {
  const [screen, setScreen] = useState('select');
  const [employees, setEmployees] = useState([]);
  const [storeName, setStoreName] = useState('Pet Shop');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [nextType, setNextType] = useState('entrada');
  const [photo, setPhoto] = useState(null);
  const [savedRecord, setSavedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [countdown, setCountdown] = useState(6);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [empsRes, settingsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/settings'),
      ]);
      setEmployees(await empsRes.json());
      setStoreName((await settingsRes.json()).store_name);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSelect(emp) {
    setSelectedEmp(emp);
    setNextType(emp.nextType);
    setScreen('camera');
  }

  useEffect(() => {
    if (screen === 'camera') openCamera();
    return () => closeCamera();
  }, [screen]);

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Não foi possível acessar a câmera.');
      goToSelect();
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const SIZE = 320;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const vw = video.videoWidth || SIZE;
    const vh = video.videoHeight || SIZE;
    const side = Math.min(vw, vh);
    ctx.save();
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, SIZE, SIZE);
    ctx.restore();
    const photoData = canvas.toDataURL('image/jpeg', 0.55);
    setPhoto(photoData);
    closeCamera();
    saveRecord(photoData);
  }

  async function saveRecord(photoData) {
    setSaving(true);
    try {
      const body = { employee_id: selectedEmp.id, type: nextType, photo: photoData };
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }),
        );
        body.lat = pos.coords.latitude;
        body.lng = pos.coords.longitude;
      } catch {}
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const record = await res.json();
      setSavedRecord({ ...record, employee_name: selectedEmp.name });
      setScreen('confirm');
      startCountdown();
    } catch {
      alert('Erro ao registrar ponto.');
      goToSelect();
    } finally {
      setSaving(false);
    }
  }

  function startCountdown() {
    let sec = 6;
    setCountdown(sec);
    countdownRef.current = setInterval(() => {
      sec -= 1;
      setCountdown(sec);
      if (sec <= 0) { clearInterval(countdownRef.current); goToSelect(); }
    }, 1000);
  }

  function goToSelect() {
    clearInterval(countdownRef.current);
    closeCamera();
    setScreen('select');
    setSelectedEmp(null);
    setPhoto(null);
    setSavedRecord(null);
    fetchData();
  }

  const COLORS = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-sky-600',
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-white/80 text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─── SELECIONAR ─── */}
      {screen === 'select' && (
        <div className="flex min-h-screen flex-col">
          <header className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-6 py-7 text-white shadow-xl shadow-emerald-600/15">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
            <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-white/5" />
            <div className="relative mx-auto max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">🐾 {storeName}</h1>
                  <p className="mt-1 text-sm text-emerald-100/80 capitalize">{dateStr}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-extrabold tracking-tight tabular-nums leading-none">{clock}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-8">
            <div className="mx-auto max-w-xl">
              <p className="mb-8 text-center text-sm font-medium text-slate-400 tracking-wide uppercase">
                Selecione seu nome para registrar o ponto
              </p>

              {employees.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-14 text-center">
                  <p className="text-5xl mb-4">👤</p>
                  <p className="text-slate-500 font-medium">Nenhum funcionário cadastrado</p>
                  <p className="text-slate-400 text-sm mt-1">Acesse o painel admin para adicionar</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  {employees.map((emp, i) => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelect(emp)}
                      className="group relative flex flex-col items-center gap-3.5 rounded-3xl bg-white p-6 sm:p-7 shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 active:scale-[0.97]"
                    >
                      <div className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${COLORS[i % COLORS.length]} text-xl sm:text-2xl font-extrabold text-white shadow-lg transition-transform duration-200 group-hover:scale-105`}>
                        {initials(emp.name)}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{emp.name}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide ${
                        emp.nextType === 'entrada'
                          ? 'bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-500/20'
                          : 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${emp.nextType === 'entrada' ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                        {emp.nextType === 'entrada' ? 'Fora' : 'Presente'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>

          <div className="pb-6 text-center">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-slate-400 shadow-sm ring-1 ring-black/[0.04] transition hover:text-emerald-600 hover:shadow-md">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              Painel Admin
            </Link>
          </div>
        </div>
      )}

      {/* ─── CÂMERA ─── */}
      {screen === 'camera' && (
        <div className="relative flex min-h-screen flex-col bg-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-6 pb-16 pt-8">
            <p className="text-center text-xl font-extrabold text-white drop-shadow-lg">{selectedEmp?.name}</p>
            <div className="mt-3 flex justify-center">
              <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm ${
                nextType === 'entrada' ? 'bg-emerald-500/80 shadow-emerald-500/25' : 'bg-red-500/80 shadow-red-500/25'
              }`}>
                {nextType === 'entrada' ? '📥 Registrar Entrada' : '📤 Registrar Saída'}
              </span>
            </div>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-8 pb-10 pt-20">
            <div className="flex items-center justify-between max-w-md mx-auto">
              <button onClick={goToSelect} className="rounded-full bg-white/15 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 ring-1 ring-white/20">← Voltar</button>
              <button onClick={takePhoto} disabled={saving} className="h-20 w-20 rounded-full border-[6px] border-white bg-white shadow-2xl transition-transform active:scale-90 disabled:opacity-50" aria-label="Tirar foto" />
              <div className="w-24" />
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRMAÇÃO ─── */}
      {screen === 'confirm' && (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 px-6">
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl ${
              nextType === 'entrada'
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/25'
                : 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/25'
            }`}>
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            {photo && <img src={photo} alt="" className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-xl" />}
            <div className="text-center">
              <p className="text-2xl font-extrabold text-slate-800">{savedRecord?.employee_name}</p>
              <p className={`mt-2 font-bold ${nextType === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                {nextType === 'entrada' ? '📥 Entrada registrada' : '📤 Saída registrada'}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {savedRecord && new Date(savedRecord.timestamp).toLocaleString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </p>
            </div>
            <button onClick={goToSelect} className="mt-2 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition active:scale-[0.97]">
              Concluído
            </button>
            <div className="w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000 ease-linear" style={{ width: `${(countdown / 6) * 100}%` }} />
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">Voltando em {countdown}s</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function initials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
