let globalData = []; // 전체 JSON 데이터를 저장해두어 검색/필터 후에도 원본을 복원 가능
let map;            // Leaflet 지도 인스턴스 저장용

document.addEventListener('DOMContentLoaded', () => {
  // data.json에서 데이터를 가져와 렌더링
  fetch('data.json')
    .then(response => response.json())
    .then(jsonData => {
      globalData = jsonData; // 받아온 데이터를 전역 변수에 저장
      renderProfiles(globalData);
    })
    .catch(err => {
      console.error('Error loading JSON:', err);
    });

  const closeBtn = document.getElementById('close-btn');
  closeBtn.addEventListener('click', () => {
    document.getElementById('popup-overlay').style.display = 'none';
  });
});

// 프로필 카드 생성 함수
function renderProfiles(dataArray) {
  const container = document.getElementById('grid-container');
  container.innerHTML = ''; // 중복 렌더링 방지

  dataArray.forEach((person, index) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.causeOfDeath = person.cause_of_death || '';
    card.dataset.originalIndex = index; // 만약 정렬 복원을 위해 원본 인덱스가 필요하다면

    card.innerHTML = `
      <img src="${person.profile_pic}" alt="${person.name}" />
      <div class="name-overlay">${person.name}</div>
    `;

    // 카드 클릭 시 팝업 호출
    card.addEventListener('click', () => openPopup(person));
    container.appendChild(card);
  });
}

// 팝업 열기 함수
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

  // 지도 초기화 (팝업 열 때마다 다시 생성)
  initMap(person.birth_place, person.death_place);
}

// Leaflet 지도 초기화 함수
function initMap(birthPlace, deathPlace) {
  const mapDiv = document.getElementById('map');

  // 만약 이전에 생성된 지도 인스턴스가 있으면 제거
  if (map) {
    map.remove();
    map = null;
  }

  // 새 지도 생성 (center, zoom은 임의로 지정, 나중에 마커로 조정)
  map = L.map(mapDiv).setView([20, 0], 2); // 대략 전세계가 보이게

  // 타일 레이어 (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // 탄생지와 사망지 위치를 찾아 표시
  placeMarker(birthPlace, 'Birth');
  placeMarker(deathPlace, 'Death');
}

// geocoding API를 통해 장소 이름 -> 위도경도 변환, 지도에 마커 표시
function placeMarker(locationName, label) {
  if (!locationName) return; // 값이 없으면 스킵

  // Nominatim API 사용
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const coords = [parseFloat(lat), parseFloat(lon)];

        // 지도에 마커 추가
        const marker = L.marker(coords).addTo(map);
        marker.bindPopup(`${label}: ${locationName}`);

        // 첫 번째 마커에 맞춰서 지도 중심 설정
        if (label === 'Birth') {
          map.setView(coords, 8);
        }
      }
    })
    .catch(err => console.log('Geocoding error:', err));
}

// 사망 원인별 색상 강조 함수
function highlightCause(cause) {
  const cards = document.querySelectorAll('.profile-card');

  // 모든 카드에서 기존 강조 클래스를 제거
  cards.forEach(card => {
    card.classList.remove('accident', 'drug', 'disease');
  });

  // 'none'이면 필터 해제 & 원래 순서 복원
  if (cause === 'none') {
    reorderCardsByCause(null);
    return;
  }

  // cause_of_death 비교 후 해당 원인에 따라 CSS 클래스 적용
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

  // 해당 cause를 가진 카드를 앞으로 정렬
  reorderCardsByCause(cause);
}

// 카드 DOM 재정렬 함수
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
      return parseInt(a.dataset.originalIndex) - parseInt(b.dataset.originalIndex);
    }
    return isMatchA ? -1 : 1;
  });

  container.innerHTML = '';
  cards.forEach(card => container.appendChild(card));
}

// =================== 검색 기능 =================== //

// 사용자가 "Search" 버튼을 클릭하면 실행
function searchByName() {
  const searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!searchInput) return; // 빈칸이면 아무것도 안 함

  // globalData에서 이름에 searchInput이 포함된 프로필만 필터링
  const filteredData = globalData.filter(person =>
    person.name.toLowerCase().includes(searchInput)
  );

  // 필터링된 데이터만 렌더링
  renderProfiles(filteredData);
}

// "Reset Search" 버튼 클릭 시, 원본 데이터를 다시 렌더링
function resetSearch() {
  document.getElementById('searchInput').value = ''; // 검색창 초기화
  renderProfiles(globalData); // 전체 목록 복원
}
