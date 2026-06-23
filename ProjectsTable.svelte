<!--
  ProjectsTable.svelte — Tabel Kelola Proyek (CRUD lengkap)
  Stack: Svelte 5 (runes) + Tailwind CSS 4
  Fitur: tambah / edit / hapus + konfirmasi, cari, filter status,
         progress bar terjual, monogram, pagination, toast notifikasi.

  Cara pakai:
    import ProjectsTable from '$lib/components/ProjectsTable.svelte';
    <ProjectsTable />

  Menyambung ke backend: lihat komentar ber-tag  // 🔌 API  di bawah.
-->
<script>
  /* ───────────────── DATA ─────────────────
     Ganti array ini dengan data dari API/DB Anda (lihat onMount di bawah). */
  let projects = $state([
    { id:1, name:'Noblesse Grand Avenue',   type:'Tipe 45 · 60 · 90', location:'Bandung Utara',  price:2800, units:240, sold:168, status:'Ready Stock'  },
    { id:2, name:'Noblesse Hills Residence', type:'Tipe 45 · 60',      location:'Sentul, Bogor',  price:1500, units:150, sold:92,  status:'Selling Fast' },
    { id:3, name:'Noblesse Signature',       type:'Tipe 90',           location:'BSD, Tangerang', price:4200, units:180, sold:84,  status:'New Launch'   },
    { id:4, name:'Noblesse Park Lavanya',    type:'Tipe 36 · 45',      location:'Cibubur, Depok', price:980,  units:320, sold:320, status:'Sold Out'     },
    { id:5, name:'Noblesse Riverside',       type:'Tipe 60 · 75',      location:'Bekasi Selatan', price:1900, units:200, sold:46,  status:'New Launch'   },
  ]);
  let nextId = 6;

  /* ──────────────── STATE UI ──────────────── */
  const PER_PAGE = 5;
  const STATUSES = ['Ready Stock', 'New Launch', 'Selling Fast', 'Sold Out'];

  let query     = $state('');
  let filter    = $state('Semua');
  let page      = $state(1);
  let modalOpen = $state(false);
  let editId    = $state(null);
  let delId     = $state(null);
  let toast     = $state('');
  let form      = $state(blankForm());

  function blankForm() {
    return { name:'', location:'', type:'', price:'', units:'', sold:'', status:'Ready Stock' };
  }

  /* ──────────── FILTER + SEARCH + PAGINATION (reaktif) ──────────── */
  const filtered = $derived(projects.filter(p => {
    const okFilter = filter === 'Semua' || p.status === filter;
    const q = query.trim().toLowerCase();
    const okQuery = !q || p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
    return okFilter && okQuery;
  }));

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
  // jaga agar halaman tetap valid saat data menyusut
  $effect(() => { if (page > totalPages) page = totalPages; });

  const rows = $derived(filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE));

  /* ──────────────── HELPERS ──────────────── */
  const idr = jt => jt >= 1000
    ? `Rp ${(jt / 1000).toFixed(jt % 1000 ? 1 : 0).replace('.', ',')} M`
    : `Rp ${jt} Jt`;

  const pct = p => (p.units ? Math.round(p.sold / p.units * 100) : 0);

  const mono = name => {
    const w = name.replace(/^Noblesse\s*/i, '').trim().split(/\s+/);
    return ((w[0]?.[0] ?? 'N') + (w[1]?.[0] ?? w[0]?.[1] ?? '')).toUpperCase();
  };

  const badge = s => ({
    'Ready Stock' : 'text-emerald-600 bg-emerald-50',
    'New Launch'  : 'text-amber-700 bg-amber-100',
    'Selling Fast': 'text-blue-600 bg-blue-50',
    'Sold Out'    : 'text-red-500 bg-red-50',
  }[s] ?? 'text-slate-600 bg-slate-100');

  let toastTimer;
  function showToast(msg) {
    toast = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2600);
  }

  /* ──────────────── CRUD ──────────────── */
  function openCreate() { editId = null; form = blankForm(); modalOpen = true; }

  function openEdit(p) {
    editId = p.id;
    form = { name:p.name, location:p.location, type:p.type,
             price:String(p.price), units:String(p.units), sold:String(p.sold), status:p.status };
    modalOpen = true;
  }

  async function save(e) {
    e.preventDefault();
    const rec = {
      name: form.name.trim(),
      location: form.location.trim(),
      type: form.type.trim() || '—',
      price: +form.price || 0,
      units: +form.units || 0,
      sold: Math.min(+form.sold || 0, +form.units || 0),
      status: form.status,
    };

    if (editId != null) {
      // 🔌 API: await fetch(`/api/projects/${editId}`, { method:'PUT', body: JSON.stringify(rec) });
      projects = projects.map(p => (p.id === editId ? { ...p, ...rec } : p));
      showToast('Proyek berhasil diperbarui');
    } else {
      // 🔌 API: const { id } = await (await fetch('/api/projects', { method:'POST', body: JSON.stringify(rec) })).json();
      const id = nextId++;
      projects = [{ id, ...rec }, ...projects];
      page = 1;
      showToast('Proyek baru ditambahkan');
    }
    modalOpen = false;
  }

  async function remove() {
    const p = projects.find(x => x.id === delId);
    // 🔌 API: await fetch(`/api/projects/${delId}`, { method:'DELETE' });
    projects = projects.filter(x => x.id !== delId);
    showToast(`"${p?.name ?? 'Proyek'}" dihapus`);
    delId = null;
  }

  function setFilter(f) { filter = f; page = 1; }

  /* ──────────── (opsional) muat data dari backend ────────────
  import { onMount } from 'svelte';
  onMount(async () => {
    projects = await (await fetch('/api/projects')).json();
  });
  ------------------------------------------------------------- */
</script>

<div class="font-[Inter,sans-serif] text-[#0A1F44]">

  <!-- HEAD -->
  <div class="flex items-end justify-between flex-wrap gap-4 mb-6">
    <div>
      <h1 class="font-[Playfair_Display,serif] font-extrabold text-3xl md:text-4xl">Kelola Proyek</h1>
      <p class="text-sm text-slate-400 mt-1.5"><b class="text-[#0A1F44]">{projects.length}</b> proyek terdaftar</p>
    </div>
    <button onclick={openCreate}
            class="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-[#E7C76A] to-[#D4AF37]
                   text-[#08152E] text-sm font-bold shadow-lg shadow-[#D4AF37]/30
                   transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#D4AF37]/45">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Tambah Proyek
    </button>
  </div>

  <!-- TOOLBAR -->
  <div class="bg-white border border-slate-200 border-b-0 rounded-t-2xl p-4 flex items-center gap-3 flex-wrap">
    <div class="relative flex-1 min-w-[200px] max-w-sm">
      <svg class="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa3b5" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input bind:value={query} oninput={() => page = 1} placeholder="Cari nama atau lokasi…"
             class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm
                    outline-none transition focus:border-[#D4AF37] focus:bg-white" />
    </div>
    <div class="flex gap-1.5 bg-slate-100 p-1.5 rounded-lg flex-wrap">
      {#each ['Semua', ...STATUSES] as f}
        <button onclick={() => setFilter(f)}
                class="px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition
                       {filter === f ? 'bg-white text-[#0A1F44] shadow-sm' : 'text-slate-500 hover:text-[#0A1F44]'}">{f}</button>
      {/each}
    </div>
  </div>

  <!-- TABEL -->
  <div class="bg-white border border-slate-200 rounded-b-2xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse min-w-[880px]">
        <thead>
          <tr class="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
            <th class="px-5 py-3.5 text-left font-semibold border-b border-slate-100">Proyek</th>
            <th class="px-3 py-3.5 text-left font-semibold border-b border-slate-100">Lokasi</th>
            <th class="px-3 py-3.5 text-left font-semibold border-b border-slate-100">Harga Mulai</th>
            <th class="px-3 py-3.5 text-center font-semibold border-b border-slate-100">Total Unit</th>
            <th class="px-3 py-3.5 text-center font-semibold border-b border-slate-100">Terjual</th>
            <th class="px-3 py-3.5 text-left font-semibold border-b border-slate-100">Status</th>
            <th class="px-5 py-3.5 text-right font-semibold border-b border-slate-100">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as p (p.id)}
            <tr class="border-b border-slate-100 transition hover:bg-amber-50/40">
              <!-- Nama + monogram -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#0A1F44] to-[#08152E]
                               text-[#D4AF37] flex items-center justify-center shrink-0
                               font-[Playfair_Display,serif] font-bold text-base">{mono(p.name)}</span>
                  <div>
                    <div class="text-[14.5px] font-semibold text-[#0A1F44]">{p.name}</div>
                    <div class="text-xs text-slate-400">{p.type}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-4 text-[13.5px] text-slate-600">{p.location}</td>
              <td class="px-3 py-4 text-sm font-bold text-[#D4AF37] font-[Playfair_Display,serif]">{idr(p.price)}</td>
              <td class="px-3 py-4 text-center text-[13.5px] text-slate-600">{p.units}</td>
              <!-- Progress terjual -->
              <td class="px-3 py-4">
                <div class="flex flex-col items-center gap-1.5">
                  <span class="text-[13px] font-semibold text-[#0A1F44]">{pct(p)}%</span>
                  <span class="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden block">
                    <span class="block h-full rounded-full bg-gradient-to-r from-[#E7C76A] to-[#D4AF37]" style="width:{pct(p)}%"></span>
                  </span>
                </div>
              </td>
              <td class="px-3 py-4">
                <span class="text-xs font-semibold px-3 py-1.5 rounded-full {badge(p.status)}">{p.status}</span>
              </td>
              <!-- Aksi -->
              <td class="px-5 py-4">
                <div class="flex gap-1.5 justify-end">
                  <button onclick={() => openEdit(p)} aria-label="Edit" title="Edit"
                          class="w-[34px] h-[34px] rounded-lg border border-slate-200 bg-white flex items-center justify-center
                                 text-slate-500 transition hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-amber-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button onclick={() => delId = p.id} aria-label="Hapus" title="Hapus"
                          class="w-[34px] h-[34px] rounded-lg border border-slate-200 bg-white flex items-center justify-center
                                 text-slate-500 transition hover:border-red-500 hover:text-red-500 hover:bg-red-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    {#if filtered.length === 0}
      <div class="py-16 text-center text-[15px] text-slate-400">Tidak ada proyek yang cocok dengan pencarian.</div>
    {/if}

    <!-- Pagination -->
    <div class="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-t border-slate-100">
      <div class="text-[13px] text-slate-400">
        Menampilkan <b class="text-[#0A1F44]">{rows.length}</b> dari <b class="text-[#0A1F44]">{filtered.length}</b> proyek
      </div>
      <div class="flex gap-1.5">
        <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
                class="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm transition
                       disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#D4AF37]">‹</button>
        {#each Array(totalPages) as _, i}
          <button onclick={() => page = i + 1}
                  class="px-3.5 py-2 rounded-lg text-sm font-semibold transition
                         {page === i + 1 ? 'bg-[#0A1F44] text-white border-none' : 'border border-slate-200 bg-white text-slate-600 hover:border-[#D4AF37]'}">{i + 1}</button>
        {/each}
        <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
                class="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm transition
                       disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#D4AF37]">›</button>
      </div>
    </div>
  </div>
</div>

<!-- ───────────── MODAL TAMBAH / EDIT ───────────── -->
{#if modalOpen}
  <div class="fixed inset-0 z-[100] flex items-start justify-center p-6 sm:p-10 overflow-y-auto">
    <button class="fixed inset-0 bg-[#08152E]/55 backdrop-blur-sm" aria-label="Tutup" onclick={() => modalOpen = false}></button>
    <form onsubmit={save}
          class="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden
                 motion-safe:animate-[pop_.35s_cubic-bezier(.16,1,.3,1)]">
      <div class="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="font-[Playfair_Display,serif] font-bold text-xl text-[#0A1F44]">{editId != null ? 'Edit Proyek' : 'Tambah Proyek Baru'}</h3>
          <p class="text-[13px] text-slate-400 mt-0.5">{editId != null ? 'Perbarui informasi proyek' : 'Lengkapi data proyek hunian'}</p>
        </div>
        <button type="button" onclick={() => modalOpen = false} aria-label="Tutup"
                class="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 text-lg flex items-center justify-center transition hover:border-red-500 hover:text-red-500">×</button>
      </div>

      <div class="px-7 py-6 space-y-4">
        <div>
          <label for="np-name" class="block text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Nama Proyek</label>
          <input id="np-name" bind:value={form.name} required placeholder="cth. Noblesse Grand Avenue" class="inp" />
        </div>
        <div class="flex gap-4 flex-wrap">
          <div class="flex-1 min-w-[180px]">
            <label for="np-loc" class="block text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Lokasi</label>
            <input id="np-loc" bind:value={form.location} required placeholder="cth. Bandung Utara" class="inp" />
          </div>
          <div class="flex-1 min-w-[180px]">
            <label for="np-type" class="block text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Tipe Unit</label>
            <input id="np-type" bind:value={form.type} placeholder="cth. Tipe 45 / 60 / 90" class="inp" />
          </div>
        </div>
        <div class="flex gap-4 flex-wrap">
          <div class="flex-1 min-w-[140px]">
            <label for="np-price" class="block text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Harga Mulai (Juta)</label>
            <input id="np-price" bind:value={form.price} type="number" min="0" step="50" required placeholder="2800" class="inp" />
          </div>
          <div class="flex-1 min-w-[120px]">
            <label for="np-units" class="block text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Total Unit</label>
            <input id="np-units" bind:value={form.units} type="number" min="1" required placeholder="240" class="inp" />
          </div>
          <div class="flex-1 min-w-[120px]">
            <label for="np-sold" class="block text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Unit Terjual</label>
            <input id="np-sold" bind:value={form.sold} type="number" min="0" required placeholder="168" class="inp" />
          </div>
        </div>
        <div>
          <span class="block text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Status</span>
          <div class="flex gap-2.5 flex-wrap">
            {#each STATUSES as st}
              <button type="button" onclick={() => form.status = st}
                      class="px-4 py-2.5 rounded-lg text-[13px] font-semibold border-[1.5px] transition
                             {form.status === st ? 'border-[#D4AF37] bg-amber-100/60 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}">{st}</button>
            {/each}
          </div>
        </div>
      </div>

      <div class="px-7 py-5 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onclick={() => modalOpen = false}
                class="px-5 py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold transition hover:border-slate-400">Batal</button>
        <button type="submit"
                class="px-6 py-3 rounded-lg bg-gradient-to-br from-[#E7C76A] to-[#D4AF37] text-[#08152E] text-sm font-bold
                       shadow-lg shadow-[#D4AF37]/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#D4AF37]/45">
          {editId != null ? 'Simpan Perubahan' : 'Tambah Proyek'}
        </button>
      </div>
    </form>
  </div>
{/if}

<!-- ───────────── KONFIRMASI HAPUS ───────────── -->
{#if delId != null}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button class="fixed inset-0 bg-[#08152E]/55 backdrop-blur-sm" aria-label="Tutup" onclick={() => delId = null}></button>
    <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center motion-safe:animate-[pop_.35s_cubic-bezier(.16,1,.3,1)]">
      <span class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D64545" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </span>
      <h3 class="font-[Playfair_Display,serif] font-bold text-xl text-[#0A1F44] mb-2.5">Hapus Proyek?</h3>
      <p class="text-[14.5px] text-slate-500 leading-relaxed mb-6">
        Anda akan menghapus <b class="text-[#0A1F44]">{projects.find(p => p.id === delId)?.name}</b>. Tindakan ini tidak dapat dibatalkan.
      </p>
      <div class="flex gap-3">
        <button onclick={() => delId = null} class="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold transition hover:border-slate-400">Batal</button>
        <button onclick={remove} class="flex-1 py-3 rounded-lg bg-red-500 text-white text-sm font-bold transition hover:bg-red-600">Ya, Hapus</button>
      </div>
    </div>
  </div>
{/if}

<!-- ───────────── TOAST ───────────── -->
{#if toast}
  <div class="toast fixed bottom-7 left-1/2 z-[200] flex items-center gap-3
              bg-[#0A1F44] text-white px-6 py-3.5 rounded-xl shadow-2xl text-sm font-medium">
    <span class="w-5.5 h-5.5 rounded-full bg-gradient-to-br from-[#E7C76A] to-[#D4AF37] flex items-center justify-center shrink-0">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#08152E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>
    </span>
    {toast}
  </div>
{/if}

<style>
  /* util lokal untuk input form (kelas .inp dipakai berulang di atas) */
  :global(.inp) {
    width: 100%;
    padding: 0.7rem 0.9rem;
    border: 1px solid #e2e5ec;
    border-radius: 0.55rem;
    background: #fafbfc;
    font-size: 0.875rem;
    color: #0A1F44;
    outline: none;
    transition: all .2s;
  }
  :global(.inp:focus) { border-color: #D4AF37; background: #fff; }

  @keyframes pop {
    from { opacity: 0; transform: translateY(14px) scale(.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* toast: animasi tetap menjaga pemusatan horizontal (-translate-x-1/2) */
  .toast { animation: toastIn .3s ease both; }
  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 14px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }
</style>
