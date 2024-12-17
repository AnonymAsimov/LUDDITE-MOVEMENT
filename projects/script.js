let globalData = [];
let activeButton = null;

document.addEventListener('DOMContentLoaded', () => {
  fetch('data.json')
    .then(response => response.json())
    .then(jsonData => {
      globalData = jsonData;
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


function renderProfiles(dataArray) {
  const container = document.getElementById('grid-container');
  container.innerHTML = '';

  dataArray.forEach((person, index) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.causeOfDeath = (person.cause_of_death || '').toLowerCase();
    card.dataset.originalIndex = index;

    card.innerHTML = `
      <img src="${person.profile_pic}" alt="${person.name}" />
      <div class="name-overlay">${person.name}</div>
    `;

    card.addEventListener('click', () => openPopup(person));
    container.appendChild(card);
  });
}


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
}


function highlightCause(cause) {
  const buttons = document.querySelectorAll('.filter-buttons button');


  if (activeButton) {
    activeButton.classList.remove('active');
  }

 
  buttons.forEach(button => {
    if (button.textContent.toLowerCase() === cause) {
      button.classList.add('active');
      activeButton = button; 
    }
  });

  const cards = document.querySelectorAll('.profile-card');
  cards.forEach(card => {
    card.style.display = card.dataset.causeOfDeath.includes(cause) ? 'block' : 'none';
  });

  if (cause === 'none') {
    renderProfiles(globalData);
    activeButton = null;
  }
}
