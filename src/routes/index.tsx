import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Table = {
  id: string
  code: string
  capacity: number
  status: string
  position_x: number
  position_y: number
  active: boolean
}

type Reservation = {
  id: string
  customer_id: string
  reservation_date: string
  start_time: string
  guest_count: number
  status: string
  notes: string | null
}

type Customer = {
  id: string
  name: string
  phone: string
}

const navItems = [
  { label: 'Visão geral', icon: '⌂', active: true },
  { label: 'Reservas', icon: '◷' },
  { label: 'Mapa de mesas', icon: '▦' },
  { label: 'Clientes', icon: '♙' },
]

const statusStyles: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  OCCUPIED: 'bg-orange-50 text-orange-700 border-orange-100',
  RESERVED: 'bg-violet-50 text-violet-700 border-violet-100',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-100',
}

function formatTime(value: string) {
  return value.slice(0, 5)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatHeaderDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(value)
}

export default function Dashboard() {
  const [tables, setTables] = useState<Table[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('As credenciais do Supabase não estão disponíveis neste ambiente.')
      setLoading(false)
      return
    }

    try {
      const today = getTodayDate()
      const [tablesResult, reservationsResult, customersResult] = await Promise.all([
        supabase.from('tables').select('id, code, capacity, status, position_x, position_y, active').eq('active', true),
        supabase
          .from('reservations')
          .select('id, customer_id, reservation_date, start_time, guest_count, status, notes')
          .eq('reservation_date', today)
          .order('start_time', { ascending: true })
          .limit(12),
        supabase.from('customers').select('id, name, phone').order('name', { ascending: true }),
      ])

      const firstError = tablesResult.error || reservationsResult.error || customersResult.error
      if (firstError) {
        setError(firstError.message)
        return
      }

      setTables((tablesResult.data ?? []) as Table[])
      setReservations((reservationsResult.data ?? []) as Reservation[])
      setCustomers((customersResult.data ?? []) as Customer[])
      setLastUpdated(new Date())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar os dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers])
  const availableTables = tables.filter((table) => table.status === 'AVAILABLE').length
  const occupiedTables = tables.filter((table) => table.status === 'OCCUPIED').length
  const confirmedReservations = reservations.filter((reservation) => reservation.status !== 'CANCELLED').length
  const totalGuests = reservations.reduce((sum, reservation) => sum + reservation.guest_count, 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-[#111827] px-5 py-6 text-white lg:flex">
          <div className="mb-12 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-lg font-black shadow-lg shadow-orange-950/30">P</div>
            <div>
              <p className="text-base font-bold tracking-tight">pulse</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">restaurant ops</p>
            </div>
          </div>

          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button key={item.label} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${item.active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-base ${item.active ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Turno de hoje</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-2xl font-bold">18:00 — 00:00</p>
            <p className="mt-1 text-xs text-slate-500">Equipe ativa no salão</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{formatHeaderDate(new Date())}</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Visão geral</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => void loadData()} className="hidden rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted sm:block">Atualizar</button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">AM</div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Não foi possível carregar os dados: {error}</div>}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Reservas hoje" value={String(confirmedReservations)} detail={`${totalGuests} pessoas esperadas`} icon="◷" tone="orange" />
              <MetricCard label="Mesas disponíveis" value={String(availableTables)} detail={`${tables.length || 0} mesas ativas`} icon="▦" tone="green" />
              <MetricCard label="Mesas ocupadas" value={String(occupiedTables)} detail="Acompanhamento em tempo real" icon="●" tone="violet" />
              <MetricCard label="Clientes cadastrados" value={String(customers.length)} detail="Base ativa do restaurante" icon="♙" tone="blue" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-panel sm:p-6">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Mapa do salão</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Status das mesas em tempo real</p>
                  </div>
                  <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
                    <Legend color="bg-emerald-400" label="Livre" />
                    <Legend color="bg-orange-400" label="Ocupada" />
                    <Legend color="bg-violet-400" label="Reservada" />
                  </div>
                </div>
                <div className="relative min-h-[310px] overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
                  <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-8 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Entrada</div>
                  {loading && <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Carregando mapa...</div>}
                  {!loading && tables.length === 0 && <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">Nenhuma mesa ativa encontrada.</div>}
                  {!loading && tables.length > 0 && <div className="grid grid-cols-2 gap-4 pt-14 sm:grid-cols-3 xl:grid-cols-4">{tables.map((table) => <TableTile key={table.id} table={table} />)}</div>}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-panel sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div><h2 className="text-lg font-bold tracking-tight">Próximas reservas</h2><p className="mt-1 text-sm text-muted-foreground">Agenda sincronizada</p></div>
                  <button className="text-xs font-bold text-orange-600 hover:text-orange-700">Ver todas</button>
                </div>
                <div className="space-y-1">
                  {loading && <p className="py-10 text-center text-sm text-muted-foreground">Carregando reservas...</p>}
                  {!loading && reservations.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma reserva encontrada.</p>}
                  {reservations.slice(0, 5).map((reservation) => {
                    const customer = customerById.get(reservation.customer_id)
                    return <ReservationRow key={reservation.id} reservation={reservation} customer={customer} />
                  })}
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>Última atualização: {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Dados conectados</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: string; tone: string }) {
  const tones: Record<string, string> = { orange: 'bg-orange-50 text-orange-600', green: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', blue: 'bg-blue-50 text-blue-600' }
  return <div className="rounded-3xl border border-border bg-card p-5 shadow-panel"><div className="flex items-start justify-between"><span className="text-sm font-medium text-muted-foreground">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${tones[tone]}`}>{icon}</span></div><p className="mt-5 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span> }

function TableTile({ table }: { table: Table }) {
  const style = statusStyles[table.status] || 'bg-slate-50 text-slate-600 border-slate-100'
  return <div className={`flex min-h-[100px] flex-col justify-between rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${style}`}><div className="flex items-center justify-between"><span className="text-sm font-bold">Mesa {table.code}</span><span className="text-[10px] font-bold uppercase">{table.status === 'AVAILABLE' ? 'Livre' : table.status === 'OCCUPIED' ? 'Ocupada' : 'Reservada'}</span></div><div className="flex items-end justify-between"><span className="text-xs opacity-70">Até {table.capacity} pessoas</span><span className="text-xl">{table.status === 'OCCUPIED' ? '●' : '○'}</span></div></div>
}

function ReservationRow({ reservation, customer }: { reservation: Reservation; customer?: Customer }) {
  const style = statusStyles[reservation.status] || 'bg-slate-50 text-slate-600 border-slate-100'
  return <div className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-muted"><div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-700"><span className="text-xs font-bold">{formatTime(reservation.start_time)}</span><span className="text-[9px] uppercase text-slate-400">{formatDate(reservation.reservation_date)}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{customer?.name || 'Cliente não identificado'}</p><p className="mt-0.5 text-xs text-muted-foreground">{reservation.guest_count} convidados {customer?.phone ? `· ${customer.phone}` : ''}</p></div><span className={`hidden rounded-full border px-2 py-1 text-[10px] font-bold uppercase sm:block ${style}`}>{reservation.status === 'CONFIRMED' ? 'Confirmada' : reservation.status}</span></div>
}
