import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = url && key ? createClient(url, key) : null
const vets = ['Aleyna', 'Hasan', 'Metehan']
const statuses = [
  { value: 'Bekliyor', label: 'Bekliyor' },
  { value: 'Devam ediyor', label: 'Devam ediyor' },
  { value: 'Tamamlandı', label: 'Tamamlandı' }
]

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [villages, setVillages] = useState([])
  const [assignments, setAssignments] = useState([])
  const [district, setDistrict] = useState('Tümü')
  const [vet, setVet] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [selectedVillage, setSelectedVillage] = useState('')
  const [selectedVet, setSelectedVet] = useState('Aleyna')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadData() {
    if (!supabase) return
    const [v, a] = await Promise.all([
      supabase.from('villages').select('*').order('name'),
      supabase.from('assignments').select('*').order('created_at', { ascending: false })
    ])
    if (v.error) setMessage('Köyler yüklenemedi: ' + v.error.message)
    else setVillages(v.data || [])
    if (a.error) setMessage('Görevler yüklenemedi: ' + a.error.message)
    else setAssignments(a.data || [])
  }

  useEffect(() => {
    if (!session) return
    loadData()
    const channel = supabase.channel('vetbolge-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'villages' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session])

  async function signIn(e) {
    e.preventDefault()
    setBusy(true); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setMessage('Giriş yapılamadı: ' + error.message)
  }

  async function addAssignment(e) {
    e.preventDefault()
    if (!selectedVillage) return setMessage('Önce köy seçmelisin.')
    setBusy(true); setMessage('')
    const { error } = await supabase.from('assignments').insert({
      village_id: selectedVillage,
      vet_name: selectedVet,
      status: 'Bekliyor',
      notes
    })
    setBusy(false)
    if (error) setMessage('Görev eklenemedi: ' + error.message)
    else { setNotes(''); setMessage('Görev eklendi.'); loadData() }
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('assignments').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setMessage('Durum güncellenemedi: ' + error.message)
    else loadData()
  }

  const filteredVillages = useMemo(() => villages.filter(v => {
    const d = v.district || v.ilce || ''
    const n = v.name || v.village_name || ''
    return (district === 'Tümü' || d === district) && n.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))
  }), [villages, district, search])

  const districts = ['Tümü', ...new Set(villages.map(v => v.district || v.ilce).filter(Boolean))]
  const villageName = id => {
    const v = villages.find(x => String(x.id) === String(id))
    return v?.name || v?.village_name || 'Köy'
  }
  const filteredAssignments = assignments.filter(a => vet === 'Tümü' || a.vet_name === vet)

  if (!supabase) return <main className="shell"><section className="panel"><h1>VetBölge</h1><p>Uygulama bağlantısı henüz ayarlanmadı.</p><p>Vercel ayarlarına Supabase Project URL ve Publishable key eklenmelidir.</p></section></main>

  if (!session) return <main className="shell"><section className="login panel">
    <div className="logo">🐾</div><h1>VetBölge</h1><p className="muted">Veteriner saha takip sistemi</p>
    <form onSubmit={signIn}>
      <label>E-posta<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <label>Şifre<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
      <button disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
    </form>{message && <p className="message">{message}</p>}
  </section></main>

  return <main className="shell">
    <header className="top"><div><div className="eyebrow">AYDIN • SAHA YÖNETİMİ</div><h1>VetBölge <span>🐾</span></h1></div><button className="out" onClick={()=>supabase.auth.signOut()}>Çıkış</button></header>
    <section className="stats">
      <div className="stat"><b>{villages.length}</b><small>Köy / mahalle</small></div>
      <div className="stat"><b>{assignments.length}</b><small>Toplam görev</small></div>
      <div className="stat"><b>{assignments.filter(a=>a.status==='Tamamlandı').length}</b><small>Tamamlandı</small></div>
    </section>
    <section className="panel">
      <h2>Yeni görevlendirme</h2>
      <form onSubmit={addAssignment}>
        <label>İlçe<select value={district} onChange={e=>setDistrict(e.target.value)}>{districts.map(d=><option key={d}>{d}</option>)}</select></label>
        <label>Köy / mahalle<select value={selectedVillage} onChange={e=>setSelectedVillage(e.target.value)} required><option value="">Köy seç</option>{filteredVillages.map(v=><option key={v.id} value={v.id}>{v.name || v.village_name}</option>)}</select></label>
        <label>Veteriner<select value={selectedVet} onChange={e=>setSelectedVet(e.target.value)}>{vets.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Not (isteğe bağlı)<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Görev notu…" rows="2" /></label>
        <button disabled={busy}>{busy ? 'Kaydediliyor…' : 'Görevi oluştur'}</button>
      </form>
      {message && <p className="message">{message}</p>}
    </section>
    <section className="panel">
      <div className="section-head"><h2>Görevler</h2><select value={vet} onChange={e=>setVet(e.target.value)}><option>Tümü</option>{vets.map(x=><option key={x}>{x}</option>)}</select></div>
      {filteredAssignments.length===0 ? <p className="muted">Henüz görev yok.</p> : filteredAssignments.map(a=><article className="task" key={a.id}>
        <div className="task-title"><b>{villageName(a.village_id)}</b><span>{a.vet_name}</span></div>
        {a.notes && <p>{a.notes}</p>}
        <label>İş durumu<select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)}>{statuses.map(s=><option key={s.value}>{s.value}</option>)}</select></label>
        <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(villageName(a.village_id)+' Aydın')}`}>Haritada aç ↗</a>
      </article>)}
    </section>
    <section className="panel">
      <h2>Köy / mahalle listesi</h2>
      <input placeholder="Köy ara…" value={search} onChange={e=>setSearch(e.target.value)} />
      <div className="village-list">{filteredVillages.map(v=><div key={v.id}><span>{v.name || v.village_name}</span><small>{v.district || v.ilce}</small></div>)}</div>
    </section>
    <footer>VetBölge • Ortak ekip kullanımı</footer>
  </main>
}
