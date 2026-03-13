'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, Brain, Zap, TrendingUp } from 'lucide-react';
import type { DailyMetrics } from '@/lib/types';
import BottomNav from '@/components/BottomNav';
import {
  ResponsiveContainer, AreaChart, Area, Tooltip,
  ReferenceLine, XAxis, YAxis,
} from 'recharts';

const ZONES = [
  { key: 'rest'     as const, label: 'Reposo',   color: '#4ade80', range: '0–25'   },
  { key: 'low'      as const, label: 'Bajo',      color: '#facc15', range: '26–50'  },
  { key: 'moderate' as const, label: 'Moderado',  color: '#fb923c', range: '51–75'  },
  { key: 'high'     as const, label: 'Alto',      color: '#f87171', range: '76–100' },
];

function stressColor(v: number) {
  if (v <= 25) return '#4ade80';
  if (v <= 50) return '#facc15';
  if (v <= 75) return '#fb923c';
  return '#f87171';
}

function stressLabel(avg: number) {
  if (avg <= 25) return 'Muy bajo';
  if (avg <= 40) return 'Bajo';
  if (avg <= 55) return 'Moderado';
  if (avg <= 70) return 'Elevado';
  return 'Alto';
}

function computeZones(data: Array<{ time: string; value: number }>) {
  if (!data.length) return { rest: 0, low: 0, moderate: 0, high: 0 };
  const n = data.length;
  return {
    rest:     Math.round(data.filter(d => d.value <= 25).length / n * 100),
    low:      Math.round(data.filter(d => d.value > 25 && d.value <= 50).length / n * 100),
    moderate: Math.round(data.filter(d => d.value > 50 && d.value <= 75).length / n * 100),
    high:     Math.round(data.filter(d => d.value > 75).length / n * 100),
  };
}

export default function StressPage() {
  const [data, setData] = useState<DailyMetrics | null>(null);

  useEffect(() => {
    const localDate = format(new Date(), 'yyyy-MM-dd');
    fetch(`/api/health?date=${localDate}`).then(r => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <Brain size={16} className="text-stress" />
            <h1 className="text-sm font-bold text-primary">Estrés</h1>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pb-28 pt-4 flex flex-col gap-4">
          <div className="animate-pulse bg-surface rounded-2xl h-48" />
          <div className="animate-pulse bg-surface rounded-2xl h-40" />
          <div className="animate-pulse bg-surface rounded-2xl h-36" />
          <div className="animate-pulse bg-surface rounded-2xl h-32" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const { stress, weeklyTrend } = data;
  const avgColor = stressColor(stress.average);
  const zones = computeZones(stress.data);
  const peak = stress.data.length ? Math.max(...stress.data.map(d => d.value)) : stress.average;
  const tensionPct = zones.moderate + zones.high;

  // Weekly stress proxy: 100 − recovery (lower recovery ≈ higher stress load)
  const weeklyProxy = weeklyTrend.recovery.map(r => (r > 0 ? Math.max(0, 100 - r) : 0));

  const tickInterval = stress.data.length > 12
    ? Math.floor(stress.data.length / 6)
    : 0;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <Brain size={16} className="text-stress" />
          <h1 className="text-sm font-bold text-primary">Estrés</h1>
          <span
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: avgColor, backgroundColor: `${avgColor}18` }}
          >
            {stressLabel(stress.average)}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-28 pt-4 flex flex-col gap-4">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header mb-4">
            <Brain size={14} className="text-stress" />
            <span>Nivel de estrés hoy</span>
          </div>

          <div className="flex items-end gap-4 mb-5">
            <span className="text-6xl font-black leading-none" style={{ color: avgColor }}>
              {stress.average}
            </span>
            <div className="mb-1">
              <p className="text-sm font-semibold" style={{ color: avgColor }}>
                {stressLabel(stress.average)}
              </p>
              <p className="text-xs text-muted">Escala Garmin 0–100</p>
            </div>
          </div>

          {/* Gauge bar */}
          <div className="relative h-2.5 rounded-full overflow-hidden mb-4"
            style={{ background: 'linear-gradient(to right, #4ade80 0%, #facc15 33%, #fb923c 66%, #f87171 100%)' }}>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-bg shadow"
              style={{
                left: `${stress.average}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                backgroundColor: avgColor,
              }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted mb-4">
            <span className="text-green-400">Reposo</span>
            <span className="text-yellow-400">Bajo</span>
            <span className="text-orange-400">Moderado</span>
            <span className="text-red-400">Alto</span>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-bg rounded-xl p-2 text-center border border-border">
              <p className="text-[10px] text-muted mb-0.5">Pico</p>
              <p className="text-sm font-bold" style={{ color: stressColor(peak) }}>{peak}</p>
            </div>
            <div className="bg-bg rounded-xl p-2 text-center border border-border">
              <p className="text-[10px] text-muted mb-0.5">En reposo</p>
              <p className="text-sm font-bold text-green-400">{stress.restingPercentage}%</p>
            </div>
            <div className="bg-bg rounded-xl p-2 text-center border border-border">
              <p className="text-[10px] text-muted mb-0.5">Tensión</p>
              <p className="text-sm font-bold" style={{ color: tensionPct > 40 ? '#f87171' : '#facc15' }}>
                {tensionPct}%
              </p>
            </div>
          </div>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────── */}
        {stress.data.length > 0 && (
          <div className="card">
            <div className="card-header mb-4">
              <Zap size={14} className="text-secondary" />
              <span>Timeline del día</span>
              <span className="ml-auto text-xs text-muted">{stress.data.length} mediciones</span>
            </div>

            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={stress.data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="stressPageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={avgColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={avgColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  interval={tickInterval}
                />
                <YAxis domain={[0, 100]} hide />
                <ReferenceLine y={25} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.4} />
                <ReferenceLine y={50} stroke="#facc15" strokeDasharray="3 3" strokeOpacity={0.4} />
                <ReferenceLine y={75} stroke="#fb923c" strokeDasharray="3 3" strokeOpacity={0.4} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-md bg-surface border border-border px-2 py-1 text-xs">
                        <span className="text-secondary mr-1">{payload[0].payload.time}</span>
                        <span style={{ color: stressColor(Number(payload[0].value)) }}>
                          {payload[0].value} · {stressLabel(Number(payload[0].value))}
                        </span>
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={avgColor}
                  strokeWidth={2}
                  fill="url(#stressPageGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Zone legend */}
            <div className="flex flex-wrap justify-end gap-3 mt-2">
              {ZONES.map(z => (
                <span key={z.key} className="text-[9px] flex items-center gap-1" style={{ color: z.color }}>
                  <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: z.color }} />
                  {z.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Zone distribution ─────────────────────────────────────── */}
        <div className="card">
          <div className="card-header mb-4">
            <Brain size={14} className="text-secondary" />
            <span>Distribución por zonas</span>
          </div>

          {/* Stacked bar */}
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {ZONES.map(z =>
              zones[z.key] > 0 ? (
                <div
                  key={z.key}
                  style={{ width: `${zones[z.key]}%`, backgroundColor: z.color }}
                  title={`${z.label}: ${zones[z.key]}%`}
                />
              ) : null
            )}
          </div>

          {/* Legend grid */}
          <div className="grid grid-cols-2 gap-2">
            {ZONES.map(z => (
              <div key={z.key} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-bg border border-border">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-none" style={{ color: z.color }}>{z.label}</p>
                  <p className="text-[9px] text-muted mt-0.5">{z.range}</p>
                </div>
                <p className="text-sm font-bold text-primary">{zones[z.key]}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Weekly stress indicator ────────────────────────────────── */}
        <div className="card">
          <div className="card-header mb-4">
            <TrendingUp size={14} className="text-secondary" />
            <span>Indicador semanal</span>
            <span className="ml-auto text-[10px] text-muted">100 − recuperación</span>
          </div>

          <div className="flex items-end justify-between gap-1.5 h-24">
            {weeklyProxy.map((v, i) => {
              const c = stressColor(v);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium" style={{ color: c }}>
                    {v > 0 ? v : '—'}
                  </span>
                  <div
                    className="w-full rounded-t-sm transition-all duration-700"
                    style={{
                      height: `${(v / 100) * 80}%`,
                      backgroundColor: v > 0 ? c : '#1f1f1f',
                      minHeight: v > 0 ? 4 : 0,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-2">
            {weeklyTrend.dates.map((d, i) => (
              <span key={i} className="flex-1 text-center text-xs text-muted">{d}</span>
            ))}
          </div>

          <p className="text-[10px] text-muted mt-3 pt-3 border-t border-border">
            Estimado a partir del score de recuperación diaria (100 − recuperación). Una recuperación baja suele correlacionar con carga fisiológica elevada.
          </p>
        </div>

        {/* ── Educational ──────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header mb-4">
            <Brain size={14} className="text-stress" />
            <span>¿Qué mide el estrés Garmin?</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-bg border border-border">
              <p className="text-xs font-semibold text-primary mb-1">Basado en HRV, no en emociones</p>
              <p className="text-[11px] text-secondary leading-relaxed">
                Garmin mide el estrés fisiológico analizando la variabilidad entre latidos (rMSSD). No detecta estrés psicológico directamente: el ejercicio intenso también eleva el marcador porque activa el sistema nervioso simpático.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-bg border border-border">
              <p className="text-xs font-semibold text-primary mb-2">Zonas de referencia</p>
              <div className="space-y-2">
                {[
                  { label: '0–25 · Reposo',   color: '#4ade80', desc: 'Sistema parasimpático activo — HRV alto' },
                  { label: '26–50 · Bajo',    color: '#facc15', desc: 'Actividad ligera o estrés leve controlado' },
                  { label: '51–75 · Moderado',color: '#fb923c', desc: 'Carga media — ejercicio o concentración sostenida' },
                  { label: '76–100 · Alto',   color: '#f87171', desc: 'Sistema simpático dominante — prioriza recuperación' },
                ].map(z => (
                  <div key={z.label} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: z.color }} />
                    <div>
                      <span className="text-[11px] font-semibold" style={{ color: z.color }}>{z.label}</span>
                      <span className="text-[11px] text-muted ml-2">{z.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg border border-border">
              <p className="text-xs font-semibold text-primary mb-2">Cómo reducir el estrés fisiológico</p>
              <ul className="space-y-1.5">
                {[
                  'Respiración 4-7-8: inhala 4s, aguanta 7s, exhala 8s — baja el indicador en minutos',
                  'Sueño de calidad: el factor con mayor impacto en HRV nocturno y recuperación',
                  'Evita alcohol y cafeína después de las 14h — elevan el estrés nocturno',
                  'Actividad suave (caminata, yoga, estiramientos) activa el nervio vago',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-secondary">
                    <span className="text-stress mt-0.5 flex-shrink-0">·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] text-muted text-center pt-1">
              Ref: Thayer et al. 2012 — HRV as a biomarker of stress
            </p>
          </div>
        </div>

      </main>
      <BottomNav />
    </div>
  );
}
