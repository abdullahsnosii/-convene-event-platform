const API_BASE = 'http://localhost:5000/api';

let currentEventId = null;
let pendingDeleteAction = null;

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showConfirmModal(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-message').textContent = message;
  pendingDeleteAction = onConfirm;
  modal.classList.remove('hidden');
}

function hideConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  pendingDeleteAction = null;
}

document.getElementById('confirm-yes').addEventListener('click', () => {
  if (pendingDeleteAction) pendingDeleteAction();
  hideConfirmModal();
});

document.getElementById('confirm-no').addEventListener('click', hideConfirmModal);

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'events') loadEvents();
  if (viewName === 'create') resetForm();
}

function router() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';

  if (hash.startsWith('event/')) {
    const id = hash.split('/')[1];
    switchView('detail');
    loadEventDetail(id);
    return;
  }

  if (hash.startsWith('edit/')) {
    const id = hash.split('/')[1];
    switchView('create');
    loadEventForEdit(id);
    return;
  }

  switchView(hash);
}

window.addEventListener('hashchange', router);

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (link.dataset.view === 'create') currentEventId = null;
  });
});

async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  container.innerHTML = '<p>Loading...</p>';

  try {
    const res = await fetch(`${API_BASE}/dashboard`);
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    const stats = result.data;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Events</h3>
          <p>${stats.totalEvents}</p>
        </div>
        <div class="stat-card">
          <h3>Upcoming Events</h3>
          <p>${stats.upcomingEvents}</p>
        </div>
        <div class="stat-card">
          <h3>Total Registrations</h3>
          <p>${stats.totalRegistrations}</p>
        </div>
        <div class="stat-card">
          <h3>Most Popular Event</h3>
          <p>${stats.mostPopularEvent ? stats.mostPopularEvent.title : 'N/A'}</p>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<p>Failed to load stats</p>';
    showToast('Could not load dashboard', 'error');
  }
}

async function loadEvents() {
  const container = document.getElementById('events-list');
  container.innerHTML = '<p>Loading...</p>';

  const search = document.getElementById('search-input').value;
  const category = document.getElementById('category-input').value;
  const location = document.getElementById('location-input').value;
  const date = document.getElementById('date-input').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (location) params.append('location', location);
  if (date) params.append('date', date);

  try {
    const res = await fetch(`${API_BASE}/events?${params.toString()}`);
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    if (result.data.length === 0) {
      container.innerHTML = '<p>No events found</p>';
      return;
    }

    container.innerHTML = `<div class="events-grid">${result.data.map(renderEventCard).join('')}</div>`;

    document.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') || e.target.classList.contains('btn-delete')) return;
        window.location.hash = `event/${card.dataset.id}`;
      });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        window.location.hash = `edit/${e.target.dataset.id}`;
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        showConfirmModal('Are you sure you want to delete this event?', () => deleteEvent(id));
      });
    });

  } catch (err) {
    container.innerHTML = '<p>Failed to load events</p>';
    showToast('Could not load events', 'error');
  }
}

function renderEventCard(event) {
  const date = new Date(event.date).toLocaleString();
  return `
    <div class="event-card" data-id="${event._id}">
      <h3>${event.title}</h3>
      <p>${event.category} - ${event.location}</p>
      <p>${date}</p>
      <p>Capacity: ${event.capacity}</p>
      <div class="event-card-actions">
        <button class="btn-edit" data-id="${event._id}">Edit</button>
        <button class="btn-delete" data-id="${event._id}">Delete</button>
      </div>
    </div>
  `;
}

async function deleteEvent(id) {
  try {
    const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    showToast('Event deleted');
    loadEvents();
  } catch (err) {
    showToast('Failed to delete event', 'error');
  }
}

document.getElementById('search-input').addEventListener('input', loadEvents);
document.getElementById('category-input').addEventListener('input', loadEvents);
document.getElementById('location-input').addEventListener('input', loadEvents);
document.getElementById('date-input').addEventListener('change', loadEvents);

document.getElementById('clear-filters-btn').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('category-input').value = '';
  document.getElementById('location-input').value = '';
  document.getElementById('date-input').value = '';
  loadEvents();
});

async function loadEventDetail(id) {
  const container = document.getElementById('event-detail-content');
  container.innerHTML = '<p>Loading...</p>';

  try {
    const eventRes = await fetch(`${API_BASE}/events/${id}`);
    const eventResult = await eventRes.json();

    if (!eventResult.success) throw new Error(eventResult.message);

    const event = eventResult.data;
    const remaining = event.capacity - event.registrationsCount;

    const attendeesRes = await fetch(`${API_BASE}/events/${id}/attendees`);
    const attendeesResult = await attendeesRes.json();
    const attendees = attendeesResult.data;

    container.innerHTML = `
      <h1>${event.title}</h1>
      <p>${event.category} - ${event.location}</p>
      <p>${new Date(event.date).toLocaleString()}</p>
      <p>${event.description}</p>
      <p>Remaining spots: ${remaining}</p>

      <h2>Attendees</h2>
      <div id="attendees-list">
        ${attendees.length === 0 ? '<p>No attendees yet</p>' : attendees.map(a => `
          <div class="attendee-item">
            ${a.name} - ${a.email}
            <button class="btn-cancel-reg" data-id="${a._id}">Cancel</button>
          </div>
        `).join('')}
      </div>

      <h2>Register</h2>
      ${remaining <= 0 ? '<p>This event is at full capacity</p>' : `
        <form id="register-form">
          <div class="form-group">
            <label for="reg-name">Name</label>
            <input type="text" id="reg-name" required>
          </div>
          <div class="form-group">
            <label for="reg-email">Email</label>
            <input type="email" id="reg-email" required>
          </div>
          <button type="submit">Register</button>
        </form>
      `}
    `;

    if (remaining > 0) {
      document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        registerAttendee(id);
      });
    }

    document.querySelectorAll('.btn-cancel-reg').forEach(btn => {
      btn.addEventListener('click', () => {
        showConfirmModal('Cancel this registration?', () => cancelRegistration(id, btn.dataset.id));
      });
    });

  } catch (err) {
    container.innerHTML = '<p>Failed to load event</p>';
    showToast('Could not load event details', 'error');
  }
}

async function registerAttendee(eventId) {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;

  try {
    const res = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const result = await res.json();

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }

    showToast('Registered successfully');
    loadEventDetail(eventId);
  } catch (err) {
    showToast('Registration failed', 'error');
  }
}

async function cancelRegistration(eventId, registrationId) {
  try {
    const res = await fetch(`${API_BASE}/events/${eventId}/registrations/${registrationId}`, {
      method: 'DELETE'
    });
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    showToast('Registration cancelled');
    loadEventDetail(eventId);
  } catch (err) {
    showToast('Failed to cancel registration', 'error');
  }
}

function resetForm() {
  currentEventId = null;
  document.getElementById('form-title').textContent = 'Create Event';
  document.getElementById('event-form').reset();
  clearFormErrors();
}

function clearFormErrors() {
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

async function loadEventForEdit(id) {
  currentEventId = id;
  document.getElementById('form-title').textContent = 'Edit Event';

  try {
    const res = await fetch(`${API_BASE}/events/${id}`);
    const result = await res.json();

    if (!result.success) throw new Error(result.message);

    const event = result.data;

    document.getElementById('title').value = event.title;
    document.getElementById('category').value = event.category;
    document.getElementById('location').value = event.location;
    document.getElementById('date').value = event.date.slice(0, 16);
    document.getElementById('capacity').value = event.capacity;
    document.getElementById('description').value = event.description;

  } catch (err) {
    showToast('Could not load event for editing', 'error');
  }
}

document.getElementById('event-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormErrors();

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value.trim();
  const location = document.getElementById('location').value.trim();
  const date = document.getElementById('date').value;
  const capacity = document.getElementById('capacity').value;
  const description = document.getElementById('description').value.trim();

  let hasError = false;

  if (!title) {
    document.getElementById('title-error').textContent = 'Title is required';
    hasError = true;
  }
  if (!category) {
    document.getElementById('category-error').textContent = 'Category is required';
    hasError = true;
  }
  if (!location) {
    document.getElementById('location-error').textContent = 'Location is required';
    hasError = true;
  }
  if (!date) {
    document.getElementById('date-error').textContent = 'Date is required';
    hasError = true;
  }
  if (!capacity || capacity <= 0) {
    document.getElementById('capacity-error').textContent = 'Capacity must be greater than 0';
    hasError = true;
  }

  if (hasError) return;

  const payload = { title, category, location, date, capacity: Number(capacity), description };

  try {
    let res;
    if (currentEventId) {
      res = await fetch(`${API_BASE}/events/${currentEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const result = await res.json();

    if (!result.success) {
      if (result.errors) {
        result.errors.forEach(err => {
          const errEl = document.getElementById(`${err.field}-error`);
          if (errEl) errEl.textContent = err.message;
        });
      } else {
        showToast(result.message, 'error');
      }
      return;
    }

    showToast(currentEventId ? 'Event updated' : 'Event created');
    window.location.hash = 'events';

  } catch (err) {
    showToast('Failed to save event', 'error');
  }
});

router();