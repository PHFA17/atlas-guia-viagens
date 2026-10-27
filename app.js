import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const $ = (id) => document.getElementById(id);
const fallbackPhoto = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000&q=85';
const featured = [
  { keys: ['paris'], url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80' },
  { keys: ['kyoto', 'quioto'], url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80' },
  { keys: ['rio de janeiro'], url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=900&q=80' },
  { keys: ['lisboa', 'lisbon'], url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80' },
  { keys: ['roma', 'rome'], url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=900&q=80' },
  { keys: ['londres', 'london'], url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&q=80' },
  { keys: ['tokyo', 'tóquio'], url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80' },
  { keys: ['nova york', 'new york'], url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80' },
  { keys: ['santorini'], url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=900&q=80' },
];
const statusNames = { wishlist: 'Quero conhecer', planning: 'Planejando', visited: 'Já visitei' };
const weatherCodes = (n) => n === 0 ? ['☀️', 'Céu limpo'] : n <= 3 ? ['🌤️', 'Parcialmente nublado'] : n <= 48 ? ['🌫️', 'Neblina'] : n <= 67 ? ['🌧️', 'Chuva'] : n <= 77 ? ['❄️', 'Neve'] : n <= 82 ? ['🌦️', 'Pancadas de chuva'] : n <= 86 ? ['🌨️', 'Neve'] : n <= 99 ? ['⛈️', 'Tempestade'] : ['🌡️', 'Condições atuais'];
const state = { items: [], filter: 'all', search: '', sort: 'new', selected: null, coords: null, configured: false, busy: false };
let db, cityTimer, cityAbort, toastTimer;

function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3500); }
function escapeHTML(text='') { return String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function imageOf(item) { if (item.image && /^https:\/\//i.test(item.image)) return item.image; const found = featured.find(x => x.keys.some(k => item.city?.toLocaleLowerCase('pt-BR').includes(k))); return found?.url || fallbackPhoto; }
function niceDate(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Não definida'; }
function currency(amount) { return amount !== '' && amount != null && Number.isFinite(Number(amount)) ? Number(amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'Não definido'; }
function setBusy(value) { state.busy = value; $('saveButton').disabled = value; $('saveButton').textContent = value ? 'Salvando...' : 'Salvar destino ↗'; }

async function init() {
  bindEvents();
  state.configured = Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('COLE_') && firebaseConfig.projectId && firebaseConfig.projectId !== 'SEU_PROJETO');
  if (!state.configured) { $('loadingState').hidden = true; render(); toast('Configure o Firebase no arquivo firebase-config.js para salvar os destinos.'); return; }
  try { const app = initializeApp(firebaseConfig); db = getFirestore(app); await refresh(); }
  catch (error) { $('loadingState').hidden = true; render(); toast(`Não foi possível conectar ao Firestore: ${error.message}`); }
}
async function refresh() {
  $('loadingState').hidden = false;
  try {
    // Ordenação no cliente evita a necessidade de criar índices compostos no Firestore.
    const snapshot = await getDocs(collection(db, 'destinos'));
    state.items = snapshot.docs.map(s => ({ id: s.id, ...s.data() }));
    render();
  } catch (error) { toast('Erro ao carregar. Verifique as regras do Firestore e a conexão.'); console.error(error); }
  finally { $('loadingState').hidden = true; }
}
function render() {
  $('totalDestinations').textContent = state.items.length;
  $('visitedCount').textContent = state.items.filter(x => x.status === 'visited').length;
  $('wishlistCount').textContent = state.items.filter(x => x.status === 'wishlist').length;
  let list = state.items.filter(item => (state.filter === 'all' || item.status === state.filter) && `${item.city} ${item.country}`.toLocaleLowerCase('pt-BR').includes(state.search));
  list.sort((a,b) => state.sort === 'name' ? a.city.localeCompare(b.city, 'pt-BR') : state.sort === 'old' ? (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0) : (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  $('destinationGrid').innerHTML = list.map(item => `<article class="destination-card" data-id="${escapeHTML(item.id)}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHTML(item.city)}"><div class="destination-photo" style="background-image:url('${escapeHTML(imageOf(item))}')"><span class="destination-badge">${escapeHTML(statusNames[item.status] || 'Quero conhecer')}</span></div><div class="destination-body"><span class="destination-country">⌖ &nbsp;${escapeHTML(item.country)}</span><h3>${escapeHTML(item.city)}</h3><p>${escapeHTML(item.notes || 'Uma nova aventura esperando para acontecer.')}</p><div class="card-bottom"><span>◷ &nbsp;${item.date ? escapeHTML(niceDate(item.date)) : 'Data a definir'}</span><span>Explorar ↗</span></div></div></article>`).join('');
  $('emptyState').hidden = list.length > 0;
  $('destinationGrid').querySelectorAll('.destination-card').forEach(card => {
    const open = () => showDetail(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}
function openForm(id=null, suggestion=null) {
  $('destinationForm').reset(); $('formError').hidden = true; $('citySuggestions').hidden = true; state.coords = null;
  $('editId').value = id || ''; $('modalTitle').textContent = id ? 'Editar destino' : 'Adicionar destino';
  if (id) { const item = state.items.find(x => x.id === id); if (!item) return; $('cityInput').value = item.city; $('countryInput').value = item.country; $('statusInput').value = item.status; $('dateInput').value = item.date || ''; $('imageInput').value = item.image || ''; $('notesInput').value = item.notes || ''; $('budgetInput').value = item.budget ?? ''; state.coords = item.latitude != null && item.longitude != null ? { latitude:item.latitude, longitude:item.longitude } : null; }
  if (suggestion) { $('cityInput').value = suggestion.city; $('countryInput').value = suggestion.country; }
  $('modalOverlay').hidden = false; document.body.style.overflow = 'hidden'; $('cityInput').focus();
}
function closeForm() { $('modalOverlay').hidden = true; $('citySuggestions').hidden = true; document.body.style.overflow = $('detailOverlay').hidden ? '' : 'hidden'; }
async function saveDestination(event) {
  event.preventDefault(); if (state.busy) return;
  if (!db) { $('formError').textContent = 'Configure primeiro o Firestore no arquivo firebase-config.js.'; $('formError').hidden = false; return; }
  const id = $('editId').value;
  const city = $('cityInput').value.trim(), country = $('countryInput').value.trim();
  if (!city || !country) return;
  const payload = { city, country, status: $('statusInput').value, date: $('dateInput').value, image: $('imageInput').value.trim(), notes: $('notesInput').value.trim(), budget: $('budgetInput').value === '' ? null : Number($('budgetInput').value), latitude: state.coords?.latitude ?? null, longitude: state.coords?.longitude ?? null, updatedAt: serverTimestamp() };
  $('formError').hidden = true; setBusy(true);
  try { if (id) await updateDoc(doc(db, 'destinos', id), payload); else await addDoc(collection(db, 'destinos'), {...payload, createdAt: serverTimestamp()}); closeForm(); toast(id ? 'Destino atualizado com sucesso!' : 'Destino adicionado à sua lista!'); await refresh(); }
  catch (error) { console.error(error); $('formError').textContent = 'Não foi possível salvar. Confirme as permissões de leitura e escrita do Firestore.'; $('formError').hidden = false; }
  finally { setBusy(false); }
}
async function searchCities(term) {
  if (cityAbort) cityAbort.abort(); cityAbort = new AbortController();
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=6&language=pt&format=json`;
    const response = await fetch(url,{ signal:cityAbort.signal }); if (!response.ok) throw Error('Falha na busca');
    const data = await response.json();
    if ($('cityInput').value.trim() !== term || $('modalOverlay').hidden) return;
    const suggestions = data.results || [];
    $('citySuggestions').innerHTML = suggestions.map((x,i)=>`<button type="button" class="suggestion" data-idx="${i}">⌖ &nbsp;${escapeHTML(x.name)} — ${escapeHTML(x.admin1 ? x.admin1+', ' : '')}${escapeHTML(x.country || '')}</button>`).join('');
    $('citySuggestions').hidden = !suggestions.length;
    $('citySuggestions').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      const x = suggestions[Number(btn.dataset.idx)]; $('cityInput').value = x.name; $('countryInput').value = x.country || ''; state.coords = {latitude:x.latitude, longitude:x.longitude}; $('citySuggestions').hidden = true;
    }));
  } catch(err) { if (err.name !== 'AbortError') console.warn('Geocoding indisponível',err); }
}
async function showDetail(id) {
  const item = state.items.find(x => x.id === id); if (!item) return;
  state.selected = id;
  $('detailCountry').textContent = `⌖ ${item.country}`;
  $('detailTitle').textContent = item.city;
  $('detailStatus').textContent = statusNames[item.status] || 'Quero conhecer';
  $('detailDate').textContent = niceDate(item.date);
  $('detailBudget').textContent = currency(item.budget);
  $('detailNotes').textContent = item.notes || 'Sem anotações por enquanto. Que tal adicionar lugares para visitar?';
  $('detailCover').style.backgroundImage = `url("${imageOf(item).replaceAll('"','%22')}")`;
  const locationText = `${item.city}, ${item.country}`;
  $('mapsLink').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
  $('searchLink').href = `https://www.google.com/search?q=${encodeURIComponent('passagens aéreas para '+locationText)}`;
  $('weatherContent').textContent = 'Consultando clima atual...';
  $('detailOverlay').hidden = false; document.body.style.overflow = 'hidden';
  try {
    let lat = item.latitude, lon = item.longitude;
    if (lat == null || lon == null) {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(item.city)}&count=10&language=pt&format=json`);
      if (!res.ok) throw Error('Cidade não encontrada');
      const data = await res.json(); const cities = data.results || [];
      const match = cities.find(x => normalize(x.country) === normalize(item.country)) || cities.find(x => normalize(x.country).includes(normalize(item.country))) || cities[0];
      if (!match) throw Error('Cidade não localizada'); lat = match.latitude; lon = match.longitude;
    }
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`);
    if (!res.ok) throw Error('Clima temporariamente indisponível');
    const data = await res.json(); if (state.selected !== id || $('detailOverlay').hidden) return;
    const current = data.current; const [icon,description] = weatherCodes(current.weather_code);
    $('weatherContent').innerHTML = `<div class="weather-data"><span class="weather-emoji">${icon}</span><strong>${Math.round(current.temperature_2m)}°C</strong><small>${description}<br>Sensação de ${Math.round(current.apparent_temperature)}°C</small></div><div class="weather-footer">Umidade: ${current.relative_humidity_2m}% &nbsp;·&nbsp; Vento: ${Math.round(current.wind_speed_10m)} km/h &nbsp;·&nbsp; Open-Meteo</div>`;
  } catch(error) { if (state.selected === id) $('weatherContent').textContent = 'Não foi possível consultar o clima deste destino agora.'; }
}
function normalize(s='') { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function closeDetail() { $('detailOverlay').hidden = true; state.selected = null; document.body.style.overflow = ''; }
async function removeSelected() {
  const id = state.selected; if (!id || !db) return;
  const item = state.items.find(x=>x.id===id);
  if (!window.confirm(`Excluir ${item?.city || 'este destino'} permanentemente?`)) return;
  try { await deleteDoc(doc(db,'destinos',id)); closeDetail(); await refresh(); toast('Destino excluído com sucesso.'); }
  catch(error) { toast('Não foi possível excluir. Confira as permissões do Firestore.'); console.error(error); }
}
function bindEvents() {
  for(const id of ['headerAdd','heroAdd','sectionAdd','emptyAdd','closingAdd']) $(id).addEventListener('click',()=>openForm());
  for(const id of ['closeModal','cancelModal']) $(id).addEventListener('click',closeForm);
  $('modalOverlay').addEventListener('click',e=>{if(e.target === $('modalOverlay'))closeForm();});
  $('detailClose').addEventListener('click',closeDetail);
  $('detailOverlay').addEventListener('click',e=>{if(e.target === $('detailOverlay'))closeDetail();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('modalOverlay').hidden)closeForm();else if(!$('detailOverlay').hidden)closeDetail();}});
  $('destinationForm').addEventListener('submit',saveDestination);
  $('detailEdit').addEventListener('click',()=>{const id=state.selected;closeDetail();openForm(id);});
  $('detailDelete').addEventListener('click',removeSelected);
  $('cityInput').addEventListener('input',e=>{state.coords=null;clearTimeout(cityTimer);const term=e.target.value.trim();$('citySuggestions').hidden=true;if(term.length>=3)cityTimer=setTimeout(()=>searchCities(term),350);});
  $('countryInput').addEventListener('input',()=>{state.coords=null;});
  $('filterSearch').addEventListener('input',e=>{state.search=e.target.value.toLocaleLowerCase('pt-BR').trim();render();});
  $('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;render();});
  document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));btn.classList.add('active');state.filter=btn.dataset.filter;render();}));
  document.querySelectorAll('.inspiration-card').forEach(btn=>btn.addEventListener('click',()=>openForm(null,{city:btn.dataset.city,country:btn.dataset.country})));
}
init();
