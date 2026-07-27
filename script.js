// --- Carte de base centrée sur Paris ---
const map = L.map('map', { zoomControl: true }).setView([48.8566, 2.3522], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// --- État de l'application ---
const STORAGE_KEY = 'paris-map-data';
let mode = 'none'; // 'none' | 'point' | 'line'
let currentLine = null; // L.Polyline en cours de construction
let currentLineCoords = [];
const layerGroup = L.layerGroup().addTo(map);

// --- Données d'exemple (affichées si aucune donnée sauvegardée) ---
const sampleData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Tour Eiffel', kind: 'point' }, geometry: { type: 'Point', coordinates: [2.2945, 48.8584] } },
    { type: 'Feature', properties: { name: 'Musée du Louvre', kind: 'point' }, geometry: { type: 'Point', coordinates: [2.3364, 48.8606] } },
    { type: 'Feature', properties: { name: 'Notre-Dame', kind: 'point' }, geometry: { type: 'Point', coordinates: [2.3499, 48.8530] } },
    { type: 'Feature', properties: { name: 'Sacré-Cœur', kind: 'point' }, geometry: { type: 'Point', coordinates: [2.3431, 48.8867] } },
    {
      type: 'Feature',
      properties: { name: 'Balade le long de la Seine', kind: 'line' },
      geometry: { type: 'LineString', coordinates: [
        [2.2945, 48.8584], [2.3106, 48.8619], [2.3272, 48.8600], [2.3364, 48.8606], [2.3499, 48.8530]
      ] }
    }
  ]
};

// --- Chargement / sauvegarde locale ---
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* ignore, fallback */ }
  }
  return sampleData;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();

function renderAll() {
  layerGroup.clearLayers();
  data.features.forEach(f => renderFeature(f));
}

function renderFeature(feature) {
  const name = feature.properties && feature.properties.name ? feature.properties.name : '';
  if (feature.geometry.type === 'Point') {
    const [lng, lat] = feature.geometry.coordinates;
    const marker = L.circleMarker([lat, lng], {
      radius: 7, color: '#ffb03b', fillColor: '#ffb03b', fillOpacity: 0.9, weight: 2
    });
    if (name) marker.bindTooltip(name, { permanent: false, direction: 'top', className: 'point-label' });
    marker.addTo(layerGroup);
  } else if (feature.geometry.type === 'LineString') {
    const latlngs = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const line = L.polyline(latlngs, { color: '#ffb03b', weight: 3, opacity: 0.85 });
    if (name) line.bindTooltip(name, { sticky: true, className: 'point-label' });
    line.addTo(layerGroup);
  }
}

renderAll();

// --- Gestion des modes ---
const modeButtons = document.querySelectorAll('.mode-btn');
const modeHint = document.getElementById('mode-hint');
const finishLineBtn = document.getElementById('finish-line');

const hints = {
  none: 'Touchez la carte pour la déplacer et zoomer.',
  point: 'Touchez la carte pour poser un point.',
  line: 'Touchez plusieurs endroits pour dessiner une ligne, puis validez.',
};

function setMode(newMode) {
  if (mode === 'line' && currentLine) cancelLine();
  mode = newMode;
  modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  modeHint.textContent = hints[mode];
  finishLineBtn.classList.toggle('hidden', mode !== 'line');
}

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

function cancelLine() {
  if (currentLine) { map.removeLayer(currentLine); }
  currentLine = null;
  currentLineCoords = [];
}

finishLineBtn.addEventListener('click', () => {
  if (currentLineCoords.length >= 2) {
    const name = window.prompt('Nom de la ligne :', 'Ligne sans titre') || 'Ligne sans titre';
    data.features.push({
      type: 'Feature',
      properties: { name, kind: 'line' },
      geometry: { type: 'LineString', coordinates: currentLineCoords.map(([lat, lng]) => [lng, lat]) }
    });
    saveData(data);
  }
  cancelLine();
  renderAll();
});

// --- Clic sur la carte selon le mode ---
map.on('click', (e) => {
  const { lat, lng } = e.latlng;

  if (mode === 'point') {
    const name = window.prompt('Nom du point :', 'Point sans titre') || 'Point sans titre';
    data.features.push({
      type: 'Feature',
      properties: { name, kind: 'point' },
      geometry: { type: 'Point', coordinates: [lng, lat] }
    });
    saveData(data);
    renderAll();
  }

  if (mode === 'line') {
    currentLineCoords.push([lat, lng]);
    if (currentLine) map.removeLayer(currentLine);
    currentLine = L.polyline(currentLineCoords, { color: '#ffb03b', weight: 3, dashArray: '6 6' }).addTo(map);
  }
});

// --- Export en fichier .geojson ---
document.getElementById('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'carte-paris.geojson';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// --- Import d'un fichier .geojson ---
document.getElementById('import-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (imported.type === 'FeatureCollection' && Array.isArray(imported.features)) {
        data = imported;
        saveData(data);
        renderAll();
      } else {
        alert('Fichier non reconnu (attendu : GeoJSON FeatureCollection).');
      }
    } catch (err) {
      alert('Impossible de lire ce fichier.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// --- Tout effacer ---
document.getElementById('clear-btn').addEventListener('click', () => {
  if (confirm('Effacer tous les points et lignes ?')) {
    data = { type: 'FeatureCollection', features: [] };
    saveData(data);
    renderAll();
  }
});

// --- Menu mobile ---
const panel = document.getElementById('panel');
document.getElementById('menu-toggle').addEventListener('click', () => {
  panel.classList.toggle('open');
});

// --- Enregistrement du service worker (mode hors ligne) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW échoué :', err));
  });
}
