// Shared hospital floor plan — loaded by dashboard.html (all vehicles),
// device-detail.html (one vehicle), and staff-app.html (room pickers).
// Rendered as an architectural blueprint: white paper, black walls, door
// swings, and simple furniture icons per room type — not the app's dark
// theme, deliberately, since this is meant to read as an actual floor plan.
// viewBox is fixed at 0 0 1240 900 across every page that uses this file.

const FLOORPLAN_VIEWBOX = { w: 1240, h: 900 };
const PAPER_BG = '#f6f4ee';
const WALL_COLOR = '#20242a';
const LABEL_COLOR = '#22303a';

const HOSPITAL_ROOMS = [
  // Top row — doors open downward into the top corridor
  { id:'1',  label:'1 · General Ward',  type:'ward',     x:10,   y:10, w:148, h:140, door:'bottom' },
  { id:'2',  label:'2 · General Ward',  type:'ward',     x:163,  y:10, w:148, h:140, door:'bottom' },
  { id:'3',  label:'3 · General Ward',  type:'ward',     x:316,  y:10, w:148, h:140, door:'bottom' },
  { id:'4',  label:'4 · Consultation',  type:'consult',  x:469,  y:10, w:148, h:140, door:'bottom' },
  { id:'5',  label:'5 · Consultation',  type:'consult',  x:622,  y:10, w:148, h:140, door:'bottom' },
  { id:'6',  label:'6 · Pharmacy',      type:'pharmacy', x:775,  y:10, w:148, h:140, door:'bottom' },
  { id:'7',  label:'7 · General Ward',  type:'ward',     x:928,  y:10, w:148, h:140, door:'bottom' },
  { id:'8',  label:'8 · General Ward',  type:'ward',     x:1081, y:10, w:149, h:140, door:'bottom' },

  { id:'corridor-top', label:'', type:'corridor', x:10, y:150, w:1220, h:45 },

  { id:'20', label:'20 · Storage',    type:'storage', x:10,  y:195, w:140, h:195, door:'right' },
  { id:'19', label:'19 · Staff Room', type:'staff',   x:10,  y:400, w:140, h:195, door:'right' },
  { id:'corridor-left', label:'', type:'corridor', x:150, y:195, w:20, h:400 },

  { id:'stairs',      label:'Stairs',          type:'common', x:170, y:195, w:110, h:400 },
  { id:'elevator',    label:'Elevator',        type:'common', x:290, y:195, w:110, h:400 },
  { id:'male-wash',   label:'Male Washroom',   type:'wash',   x:410, y:195, w:110, h:195, door:'right' },
  { id:'female-wash', label:'Female Washroom', type:'wash',   x:410, y:400, w:110, h:195, door:'right' },
  { id:'waiting',     label:'Waiting Area',    type:'common', x:530, y:195, w:380, h:300 },
  { id:'reception',   label:'Reception',       type:'reception', x:530, y:495, w:380, h:100 },

  { id:'corridor-right', label:'', type:'corridor', x:910, y:195, w:20, h:400 },
  { id:'9',  label:'9 · Diagnostics (X-Ray/USG)', type:'diagnostics', x:930, y:195, w:149, h:195, door:'left' },
  { id:'10', label:'10 · Equipment',              type:'storage',     x:930, y:400, w:149, h:195, door:'left' },

  { id:'corridor-bottom', label:'', type:'corridor', x:10, y:595, w:1220, h:45 },

  { id:'11', label:'11 · General Ward',  type:'ward',      x:10,  y:640, w:144, h:140, door:'top' },
  { id:'12', label:'12 · General Ward',  type:'ward',      x:159, y:640, w:144, h:140, door:'top' },
  { id:'13', label:'13 · General Ward',  type:'ward',      x:308, y:640, w:144, h:140, door:'top' },
  { id:'14', label:'14 · Isolation',     type:'isolation', x:457, y:640, w:144, h:140, door:'top' },
  { id:'corridor-entrance-spine', label:'', type:'corridor', x:601, y:640, w:37, h:140 },
  { id:'15', label:'15 · Consultation',  type:'consult',   x:638, y:640, w:144, h:140, door:'top' },
  { id:'16', label:'16 · Male Washroom', type:'wash',      x:787, y:640, w:144, h:140, door:'top' },
  { id:'17', label:'17 · General Ward',  type:'ward',      x:936, y:640, w:144, h:140, door:'top' },
  { id:'18', label:'18 · General Ward',  type:'ward',      x:1085,y:640, w:145, h:140, door:'top' },

  { id:'corridor-entrance', label:'', type:'corridor', x:560, y:780, w:120, h:60 },
  { id:'entrance', label:'Main Entrance', type:'common', x:560, y:840, w:120, h:60, door:'top' }
];

const DELIVERY_ROOM_IDS = HOSPITAL_ROOMS
  .filter(r => !['common','wash','corridor'].includes(r.type))
  .map(r => r.id);

// Pastel blueprint fills, echoing a real floor-plan legend rather than the app's dark palette.
const ROOM_TYPE_COLOR = {
  ward:'#bcd7ee', consult:'#c9e8cf', pharmacy:'#f6c9d0', diagnostics:'#ddd0f2',
  isolation:'#f6d6ae', wash:'#a9c9e6', storage:'#f3dfa0', staff:'#bfe3df',
  common:'#dcdcdc', reception:'#e9dfc5', corridor:'#efece2'
};

function roomById(id){ return HOSPITAL_ROOMS.find(r => r.id === id); }

function roomAtPoint(x, y){
  return HOSPITAL_ROOMS.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
}

// A device counts as online only if it's actually online AND its last
// heartbeat is recent — a crashed device that never wrote online:false
// would otherwise show as online forever.
const STALE_MS = 30000;
function isDeviceOnline(status){
  if(!status || !status.online) return false;
  if(typeof status.lastSeen !== 'number') return true;
  return (Date.now() - status.lastSeen) < STALE_MS;
}

// Classic architectural door symbol: a leaf line + a quarter-circle swing arc.
function doorSymbolSVG(r){
  if(!r.door) return '';
  const s = Math.min(22, Math.min(r.w, r.h) / 4);
  let hinge, leafEnd, arcEnd;
  if(r.door === 'bottom'){ hinge = {x:r.x + r.w/2 - s, y:r.y + r.h}; leafEnd = {x:hinge.x, y:hinge.y + s}; arcEnd = {x:hinge.x + s, y:hinge.y}; }
  else if(r.door === 'top'){ hinge = {x:r.x + r.w/2 - s, y:r.y}; leafEnd = {x:hinge.x, y:hinge.y - s}; arcEnd = {x:hinge.x + s, y:hinge.y}; }
  else if(r.door === 'left'){ hinge = {x:r.x, y:r.y + r.h/2 - s}; leafEnd = {x:hinge.x - s, y:hinge.y}; arcEnd = {x:hinge.x, y:hinge.y + s}; }
  else if(r.door === 'right'){ hinge = {x:r.x + r.w, y:r.y + r.h/2 - s}; leafEnd = {x:hinge.x + s, y:hinge.y}; arcEnd = {x:hinge.x, y:hinge.y + s}; }
  else return '';
  return `
    <line x1="${hinge.x}" y1="${hinge.y}" x2="${leafEnd.x}" y2="${leafEnd.y}" stroke="${WALL_COLOR}" stroke-width="1.5"/>
    <path d="M ${leafEnd.x} ${leafEnd.y} A ${s} ${s} 0 0 1 ${arcEnd.x} ${arcEnd.y}" fill="none" stroke="${WALL_COLOR}" stroke-width="1" stroke-dasharray="2,2" opacity="0.7"/>
    <rect x="${Math.min(hinge.x,arcEnd.x)-2}" y="${Math.min(hinge.y,arcEnd.y)-2}" width="${Math.abs(arcEnd.x-hinge.x)+4 || 4}" height="${Math.abs(arcEnd.y-hinge.y)+4 || 4}" fill="${PAPER_BG}" opacity="0" />
  `;
}

// Small generic furniture/fixture glyphs so each room type reads at a glance,
// like a real floor plan legend (bed, desk, cross, etc.) rather than a bare box.
function typeIconSVG(type, cx, cy){
  const s = WALL_COLOR;
  switch(type){
    case 'ward':
      return `<rect x="${cx-16}" y="${cy-6}" width="32" height="16" rx="3" fill="none" stroke="${s}" stroke-width="1.3"/>
              <circle cx="${cx-10}" cy="${cy-6}" r="4" fill="none" stroke="${s}" stroke-width="1.2"/>`;
    case 'consult':
      return `<rect x="${cx-15}" y="${cy-2}" width="30" height="10" fill="none" stroke="${s}" stroke-width="1.3"/>
              <rect x="${cx-6}" y="${cy-12}" width="12" height="10" fill="none" stroke="${s}" stroke-width="1.2"/>`;
    case 'pharmacy':
      return `<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${s}" stroke-width="1.3"/>
              <line x1="${cx-6}" y1="${cy}" x2="${cx+6}" y2="${cy}" stroke="${s}" stroke-width="1.6"/>
              <line x1="${cx}" y1="${cy-6}" x2="${cx}" y2="${cy+6}" stroke="${s}" stroke-width="1.6"/>`;
    case 'diagnostics':
      return `<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="${s}" stroke-width="2"/>
              <circle cx="${cx}" cy="${cy}" r="5" fill="${s}"/>`;
    case 'isolation':
      return `<polygon points="${cx},${cy-14} ${cx-13},${cy+9} ${cx+13},${cy+9}" fill="none" stroke="${s}" stroke-width="1.4"/>
              <text x="${cx}" y="${cy+6}" text-anchor="middle" font-size="11" fill="${s}" font-weight="700">!</text>`;
    case 'storage':
      return `<rect x="${cx-14}" y="${cy-11}" width="28" height="22" fill="none" stroke="${s}" stroke-width="1.3"/>
              <line x1="${cx-14}" y1="${cy}" x2="${cx+14}" y2="${cy}" stroke="${s}" stroke-width="1"/>
              <line x1="${cx}" y1="${cy-11}" x2="${cx}" y2="${cy+11}" stroke="${s}" stroke-width="1"/>`;
    case 'staff':
      return `<circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="${s}" stroke-width="1.3"/>
              <circle cx="${cx-16}" cy="${cy}" r="4" fill="none" stroke="${s}" stroke-width="1"/>
              <circle cx="${cx+16}" cy="${cy}" r="4" fill="none" stroke="${s}" stroke-width="1"/>`;
    case 'wash':
      return `<circle cx="${cx}" cy="${cy-9}" r="5" fill="none" stroke="${s}" stroke-width="1.3"/>
              <polygon points="${cx-7},${cy+10} ${cx+7},${cy+10} ${cx+5},${cy-3} ${cx-5},${cy-3}" fill="none" stroke="${s}" stroke-width="1.2"/>`;
    case 'reception':
      return `<rect x="${cx-22}" y="${cy-6}" width="44" height="12" rx="2" fill="none" stroke="${s}" stroke-width="1.3"/>
              <circle cx="${cx}" cy="${cy-16}" r="5" fill="none" stroke="${s}" stroke-width="1.2"/>`;
    default:
      return '';
  }
}

function stairsIconSVG(r){
  let out = '';
  const steps = 5;
  for(let i=0;i<steps;i++){
    const y = r.y + 20 + i*(r.h-40)/steps;
    out += `<line x1="${r.x+20}" y1="${y}" x2="${r.x+r.w-20}" y2="${y}" stroke="${WALL_COLOR}" stroke-width="1" opacity="0.6"/>`;
  }
  return out;
}
function elevatorIconSVG(r){
  const cx = r.x + r.w/2, cy = r.y + r.h/2;
  return `<rect x="${cx-18}" y="${cy-24}" width="36" height="48" fill="none" stroke="${WALL_COLOR}" stroke-width="1.3"/>
          <line x1="${cx}" y1="${cy-24}" x2="${cx}" y2="${cy+24}" stroke="${WALL_COLOR}" stroke-width="1"/>
          <polygon points="${cx-8},${cy-10} ${cx-2},${cy-10} ${cx-5},${cy-16}" fill="${WALL_COLOR}"/>
          <polygon points="${cx+2},${cy+10} ${cx+8},${cy+10} ${cx+5},${cy+16}" fill="${WALL_COLOR}"/>`;
}

function floorPlanRoomsSVG(){
  const border = `<rect x="4" y="4" width="${FLOORPLAN_VIEWBOX.w-8}" height="${FLOORPLAN_VIEWBOX.h-8}" fill="${PAPER_BG}" stroke="${WALL_COLOR}" stroke-width="6"/>`;
  const compass = `<g transform="translate(${FLOORPLAN_VIEWBOX.w-46},34)">
      <polygon points="0,-20 7,6 0,0 -7,6" fill="${WALL_COLOR}"/>
      <text x="0" y="-24" text-anchor="middle" font-size="13" font-weight="700" fill="${WALL_COLOR}">N</text>
    </g>`;

  const rooms = HOSPITAL_ROOMS.map(r => {
    const isCorridor = r.type === 'corridor';
    const showLabel = r.label && r.w >= 55 && r.h >= 34;
    const cx = r.x + r.w/2, cy = r.y + r.h/2 + (showLabel ? -14 : 0);
    let icon = '';
    if(r.id === 'stairs') icon = stairsIconSVG(r);
    else if(r.id === 'elevator') icon = elevatorIconSVG(r);
    else if(!isCorridor) icon = typeIconSVG(r.type, cx, cy);

    return `
    <g class="fp-room" data-room="${r.id}">
      <rect data-base-fill="${ROOM_TYPE_COLOR[r.type]}" data-base-stroke="${WALL_COLOR}"
        x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
        fill="${ROOM_TYPE_COLOR[r.type]}" stroke="${WALL_COLOR}" stroke-width="${isCorridor ? 1 : 2.5}"></rect>
      ${icon}
      ${showLabel ? `<text x="${r.x + r.w/2}" y="${r.y + r.h - 12}" text-anchor="middle"
        font-size="11.5" fill="${LABEL_COLOR}" font-family="'IBM Plex Sans',sans-serif" style="pointer-events:none;">${r.label}</text>` : ''}
      ${doorSymbolSVG(r)}
    </g>`;
  }).join('');

  return border + rooms + compass;
}

function floorPlanMarkerSVG(device){
  if(device.x == null || device.y == null) return '';
  const color = device.online ? '#1fae63' : '#d9463a';
  const shortLabel = (device.shortLabel || device.id).toString().slice(-2);
  return `
    <g class="fp-marker" data-device-id="${device.id}" style="cursor:pointer;" transform="translate(${device.x},${device.y})">
      <circle r="15" fill="${color}" stroke="#ffffff" stroke-width="2.5"></circle>
      <text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">${shortLabel}</text>
    </g>`;
}

function renderFloorPlan(svgEl, options = {}){
  const { devices = [], highlightPickup = null, highlightDest = null, onMarkerClick = null, onMapClick = null } = options;
  svgEl.setAttribute('viewBox', `0 0 ${FLOORPLAN_VIEWBOX.w} ${FLOORPLAN_VIEWBOX.h}`);
  let html = floorPlanRoomsSVG();
  devices.forEach(d => { html += floorPlanMarkerSVG(d); });
  svgEl.innerHTML = html;

  if(highlightPickup){
    const rect = svgEl.querySelector(`.fp-room[data-room="${highlightPickup}"] rect`);
    if(rect){ rect.setAttribute('fill', '#7fdba0'); rect.setAttribute('stroke', '#1f8f56'); rect.setAttribute('stroke-width','3'); }
  }
  if(highlightDest){
    const rect = svgEl.querySelector(`.fp-room[data-room="${highlightDest}"] rect`);
    if(rect){ rect.setAttribute('fill', '#8fb9ef'); rect.setAttribute('stroke', '#2a63a8'); rect.setAttribute('stroke-width','3'); }
  }
  if(onMarkerClick){
    svgEl.querySelectorAll('.fp-marker').forEach(g => {
      g.onclick = (evt) => { evt.stopPropagation(); onMarkerClick(g.dataset.deviceId); };
    });
  }
  if(onMapClick){
    svgEl.onclick = (evt) => onMapClick(svgPointFromEvent(svgEl, evt));
  }
}

function svgPointFromEvent(svgEl, evt){
  const pt = svgEl.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = svgEl.getScreenCTM().inverse();
  const transformed = pt.matrixTransform(ctm);
  return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
}

function populateRoomSelect(selectEl, currentValue){
  selectEl.innerHTML = '<option value="">— none —</option>' + DELIVERY_ROOM_IDS.map(id => {
    const r = roomById(id);
    return `<option value="${id}" ${id === currentValue ? 'selected' : ''}>${r.label}</option>`;
  }).join('');
}
