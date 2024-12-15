let globalData = [];   // 전체 JSON 데이터를 저장해두어 검색/필터 후 원본 복원
let map;               // Leaflet 지도 인스턴스
let birthMarker;       // 탄생지 마커
let deathMarker;       // 사망지 마커

document.addEventListener('DOMContentLoaded', () => {
  // data.json에서 데이터를 가져옴
  fetch('data.json')
    .then(response => response.json())
    .then(jsonData => {
      globalData = jsonData;   // 받아온 데이터 전역 저장
      renderProfiles(globalData);
    })
    .catch(err => {
      console.error('Error loading JSON:', err);
    });

  // 팝업 닫기 버튼 이벤트
  const closeBtn = document.getElementById('close-btn');
  closeBtn.addEventListener('click', () => {
    document.getElementById('popup-overlay').style.display = 'none';
  });
});

// ============ 프로필 카드 생성 함수 ============
function renderProfiles(dataArray) {
  const container = document.getElementById('grid-container');
  container.innerHTML = ''; // 중복 렌더링 방지

  dataArray.forEach((person, index) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.causeOfDeath = person.cause_of_death || '';
    card.dataset.originalIndex = index; // 원본 순서 저장

    card.innerHTML = `
      <img src="${person.profile_pic}" alt="${person.name}" />
      <h3>${person.name}</h3>
    `;

    // 카드 클릭 시 팝업 열기
    card.addEventListener('click', () => openPopup(person));
    container.appendChild(card);
  });
}

// ============ 팝업 열기 함수 ============
function openPopup(person) {
  document.getElementById('popup-photo').src = person.profile_pic;
  document.getElementById('popup-photo').alt = person.name;
  document.getElementById('popup-name').innerText = person.name;
  document.getElementById('popup-birth').innerText =
    `Birth: ${person.birth} (${person.birth_place})`;
  document.getElementById('popup-death').innerText =
    `Death: ${person.death} (${person.death_place})`;
  document.getElementById('popup-cause').innerText =
    `Cause of Death: ${person.cause_of_death}`;
  document.getElementById('popup-bio').innerText = person.bio;

  document.getElementById('popup-overlay').style.display = 'flex';

  // 지도 초기화 (팝업 열 때마다 재생성)
  initMap(person.birth_place, person.death_place);
}

// ============ 지도 초기화 함수 (Leaflet) ============
function initMap(birthPlace, deathPlace) {
  const mapDiv = document.getElementById('map');

  // 이전에 생성된 지도 있으면 제거
  if (map) {
    map.remove();
    map = null;
  }

  // 새 지도 생성
  map = L.map(mapDiv).setView([20, 0], 2);  // 전세계가 보이게 기본 설정

  // OSM 타일
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  // 탄생지와 사망지 마커 표시
  placeMarker(birthPlace, 'Birth');
  placeMarker(deathPlace, 'Death');
}

// ============ 지오코딩 -> 마커 표시 함수 ============
function placeMarker(locationName, label) {
  if (!locationName) return; // 값이 없으면 스킵

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const coords = [parseFloat(lat), parseFloat(lon)];

        const marker = L.marker(coords).addTo(map);
        marker.bindPopup(`${label}: ${locationName}`);
        
        // 위치로 지도 중심 이동
        map.setView(coords, 8);
      } else {
        console.log(`No results for ${locationName}`);
      }
    })
    .catch(err => console.error('Geocoding error:', err));
}

/* =================== 사망 원인 필터 =================== */
function highlightCause(cause) {
  const cards = document.querySelectorAll('.profile-card');
  cards.forEach(card => {
    card.classList.remove('accident', 'drug', 'disease');
  });

  // 원인 필터 해제 시
  if (cause === 'none') {
    reorderCardsByCause(null);
    return;
  }

  // cause를 소문자로 변환해 부분 매칭
  cards.forEach(card => {
    const cardCause = card.dataset.causeOfDeath.toLowerCase();

    if (cause === 'Car Accident' && cardCause.includes('accident')) {
      card.classList.add('accident');
    }
    if (cause === 'Drug Overdose' && cardCause.includes('drug')) {
      card.classList.add('drug');
    }
    if (cause === 'Disease' && cardCause.includes('disease')) {
      card.classList.add('disease');
    }
  });

  // 해당 cause 일치 카드를 앞으로 재배치
  reorderCardsByCause(cause);
}

// ============ 카드 DOM 재정렬 ============
function reorderCardsByCause(cause) {
  const container = document.getElementById('grid-container');
  const cards = Array.from(container.children);

  cards.sort((a, b) => {
    if (!cause) {
      // 원본 순서로 복원
      return parseInt(a.dataset.originalIndex) - parseInt(b.dataset.originalIndex);
    }
    const isMatchA = a.dataset.causeOfDeath.toLowerCase().includes(cause.toLowerCase());
    const isMatchB = b.dataset.causeOfDeath.toLowerCase().includes(cause.toLowerCase());

    if (isMatchA === isMatchB) {
      // 둘 다 같은 상태면 원본 순서
      return parseInt(a.dataset.originalIndex) - parseInt(b.dataset.originalIndex);
    }
    return isMatchA ? -1 : 1;
  });

  container.innerHTML = '';
  cards.forEach(card => container.appendChild(card));
}

/* =================== 이름 검색 기능 =================== */
function searchByName() {
  const searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!searchInput) return;

  const filteredData = globalData.filter(person =>
    person.name.toLowerCase().includes(searchInput)
  );
  renderProfiles(filteredData);
}

function resetSearch() {
  document.getElementById('searchInput').value = '';
  renderProfiles(globalData);
}
