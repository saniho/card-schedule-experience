function defineCard(LitElement, html, css) {
  class CardScheduleExperience extends LitElement {
    static get properties() {
      return {
        hass: {},
        _config: { state: true },
        _activeTab: { state: true },
        _timeslots: { state: true },
        _scenarios: { state: true },
        _editingSlot: { state: true },
        _draggedSlot: { state: true },
        _dragOffset: { state: true },
      };
    }

    constructor() {
      super();
      this._activeTab = 'timeslots';
      this._editingSlot = null;
      this._draggedSlot = null;
      this._dragOffset = 0;

      // Données par défaut
      this._timeslots = [
        { id: '1', name: 'Chauffage matin', day: 1, startTime: '07:00', endTime: '09:00', scenarioId: '1', enabled: true, color: '#3b82f6' },
        { id: '2', name: 'Eco journée', day: 1, startTime: '09:00', endTime: '18:00', scenarioId: '2', enabled: true, color: '#10b981' },
        { id: '3', name: 'Chauffage soir', day: 1, startTime: '18:00', endTime: '23:00', scenarioId: '1', enabled: true, color: '#3b82f6' }
      ];
      this._scenarios = [
        { id: '1', name: 'Chauffage confort', color: '#3b82f6', rules: [] },
        { id: '2', name: 'Mode éco', color: '#10b981', rules: [] }
      ];
    }

    // --- Lovelace Card Interface ---
    setConfig(config) {
      this._config = config;
    }

    getCardSize() {
      return 15;
    }

    // --- Logique de la carte ---
    timeToMinutes(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    }

    timeToPercent(time) {
      return (this.timeToMinutes(time) / (24 * 60)) * 100;
    }

    percentToTime(percent) {
      const totalMinutes = Math.round((percent / 100) * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const snappedMinutes = Math.round(minutes / 5) * 5;
      const finalMinutes = snappedMinutes % 60;
      const finalHours = hours + Math.floor(snappedMinutes / 60);
      return `${String(finalHours % 24).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
    }

    checkConflict(targetSlot) {
      if (this.timeToMinutes(targetSlot.startTime) >= this.timeToMinutes(targetSlot.endTime)) {
        return { name: "Durée nulle ou négative" };
      }
      const slotsInDay = this._timeslots.filter(s => s.day === targetSlot.day && s.id !== targetSlot.id);
      const targetStart = this.timeToMinutes(targetSlot.startTime);
      const targetEnd = this.timeToMinutes(targetSlot.endTime);

      for (const existingSlot of slotsInDay) {
        const existingStart = this.timeToMinutes(existingSlot.startTime);
        const existingEnd = this.timeToMinutes(existingSlot.endTime);
        if (targetStart < existingEnd && targetEnd > existingStart) {
          return existingSlot;
        }
      }
      return null;
    }

    addTimeslot(day) {
      const newSlot = {
        id: Date.now().toString(),
        name: 'Nouveau',
        day: day,
        startTime: '08:00',
        endTime: '12:00',
        scenarioId: this._scenarios[0]?.id || '',
        enabled: true,
        color: this._scenarios[0]?.color || '#3b82f6'
      };

      if (this.checkConflict(newSlot)) {
        alert("Impossible d'ajouter : Conflit d'horaire détecté.");
        return;
      }

      this._timeslots = [...this._timeslots, newSlot];
      this._editingSlot = newSlot.id;
      this.requestUpdate();
    }

    updateTimeslot(id, updates) {
      this._timeslots = this._timeslots.map(slot => {
        if (slot.id === id) {
          const updated = { ...slot, ...updates };
          if (updates.scenarioId) {
            const scenario = this._scenarios.find(s => s.id === updates.scenarioId);
            updated.color = scenario?.color || slot.color;
            updated.name = scenario?.name || slot.name;
          }
          return updated;
        }
        return slot;
      });
      this.requestUpdate();
    }

    deleteTimeslot(id) {
      this._timeslots = this._timeslots.filter(slot => slot.id !== id);
      if (this._editingSlot === id) this._editingSlot = null;
      this.requestUpdate();
    }

    // --- Fonctions de Drag & Drop ---
    _handleDragStart(e, slot) {
      if (e.target.closest('.resize-handle')) return;
      e.stopPropagation();

      const timeline = e.currentTarget.parentElement;
      const timelineRect = timeline.getBoundingClientRect();
      const slotStartPercent = this.timeToPercent(slot.startTime);
      const clickPercent = ((e.clientX - timelineRect.left) / timelineRect.width) * 100;
      
      this._draggedSlot = slot;
      this._dragOffset = clickPercent - slotStartPercent;
      this._editingSlot = null;
      this.requestUpdate();

      const handleMouseMove = (moveEvent) => {
        if (!this._draggedSlot) return;

        const x = moveEvent.clientX - timelineRect.left;
        let newStartPercent = ((x / timelineRect.width) * 100) - this._dragOffset;
        newStartPercent = Math.max(0, newStartPercent);

        const durationPercent = this.timeToPercent(slot.endTime) - this.timeToPercent(slot.startTime);
        if (newStartPercent + durationPercent > 100) {
          newStartPercent = 100 - durationPercent;
        }

        const newStartTime = this.percentToTime(newStartPercent);
        const newEndTime = this.percentToTime(newStartPercent + durationPercent);
        
        const proposedSlot = { ...slot, startTime: newStartTime, endTime: newEndTime };
        if (!this.checkConflict(proposedSlot)) {
          this.updateTimeslot(slot.id, { startTime: newStartTime, endTime: newEndTime });
        }
      };

      const handleMouseUp = () => {
        this._draggedSlot = null;
        this.requestUpdate();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    _handleResizeStart(e, slot, handle) {
        e.stopPropagation();
        const timeline = e.currentTarget.closest('.timeline-bar');
        const timelineRect = timeline.getBoundingClientRect();

        const handleMouseMove = (moveEvent) => {
            const x = moveEvent.clientX - timelineRect.left;
            const percent = Math.max(0, Math.min(100, (x / timelineRect.width) * 100));
            const newTime = this.percentToTime(percent);

            if (handle === 'left') {
                if (newTime < slot.endTime) {
                    const proposedSlot = { ...slot, startTime: newTime };
                    if (!this.checkConflict(proposedSlot)) {
                        this.updateTimeslot(slot.id, { startTime: newTime });
                    }
                }
            } else { // right
                if (newTime > slot.startTime) {
                    const proposedSlot = { ...slot, endTime: newTime };
                    if (!this.checkConflict(proposedSlot)) {
                        this.updateTimeslot(slot.id, { endTime: newTime });
                    }
                }
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // --- Rendu ---
    render() {
      const daysOfWeek = [
          { id: 1, label: 'Lundi' }, { id: 2, label: 'Mardi' }, { id: 3, label: 'Mercredi' },
          { id: 4, label: 'Jeudi' }, { id: 5, label: 'Vendredi' }, { id: 6, label: 'Samedi' }, { id: 0, label: 'Dimanche' }
      ];

      return html`
        <ha-card>
          <div class="header">
            <div class="icon-container">
              <ha-icon icon="hass:clock-outline"></ha-icon>
            </div>
            <div class="info-container">
              <div class="card-name">Scheduler Component</div>
              <div class="card-description">Configuration des plages horaires et scénarios</div>
            </div>
          </div>

          <div class="tab-bar">
            <div
              class="tab ${this._activeTab === 'timeslots' ? 'active' : ''}"
              @click=${() => { this._activeTab = 'timeslots'; this.requestUpdate(); }}
            >
              Planification
            </div>
            <div
              class="tab ${this._activeTab === 'scenarios' ? 'active' : ''}"
              @click=${() => { this._activeTab = 'scenarios'; this.requestUpdate(); }}
            >
              Scénarios
            </div>
          </div>

          <div class="content">
            ${this._activeTab === 'timeslots' ? this._renderTimeslots(daysOfWeek) : this._renderScenarios()}
          </div>
        </ha-card>
      `;
    }

    _renderTimeslots(daysOfWeek) {
      const getSlotsForDay = (dayId) => this._timeslots.filter(slot => slot.day === dayId).sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      return html`
        <div class="timeline-header">
          <div class="day-label-spacer"></div>
          <div class="hours-container">
            ${[0, 6, 12, 18, 24].map(h => html`<span>${String(h).padStart(2, '0')}:00</span>`)}
          </div>
        </div>
        <div class="days-container">
          ${daysOfWeek.map(day => html`
            <div class="day-row">
              <div class="day-label">${day.label}</div>
              <div class="timeline-bar">
                <!-- Grid lines -->
                ${[6, 12, 18].map(h => html`<div class="grid-line" style="left: ${h/24*100}%"></div>`)}
                
                <!-- Slots -->
                ${getSlotsForDay(day.id).map(slot => {
                  const startPercent = this.timeToPercent(slot.startTime);
                  const widthPercent = this.timeToPercent(slot.endTime) - startPercent;
                  const isDragging = this._draggedSlot?.id === slot.id;

                  return html`
                    <div
                      class="time-slot ${isDragging ? 'dragging' : ''}"
                      style="left: ${startPercent}%; width: ${widthPercent}%; background-color: ${slot.color};"
                      @mousedown=${(e) => this._handleDragStart(e, slot)}
                      @click=${() => { if (!this._draggedSlot) { this._editingSlot = slot.id; this.requestUpdate(); } }}
                    >
                      <div class="resize-handle left" @mousedown=${(e) => this._handleResizeStart(e, slot, 'left')}></div>
                      <div class="slot-content">
                        <span class="slot-name">${slot.name}</span>
                        <ha-icon-button class="delete-btn" .label="Supprimer" @click=${(e) => { e.stopPropagation(); this.deleteTimeslot(slot.id); }}>
                            <ha-icon icon="hass:trash-can-outline"></ha-icon>
                        </ha-icon-button>
                      </div>
                      <div class="resize-handle right" @mousedown=${(e) => this._handleResizeStart(e, slot, 'right')}></div>
                    </div>
                  `;
                })}
                 <ha-icon-button class="add-btn" .label="Ajouter" @click=${() => this.addTimeslot(day.id)}>
                    <ha-icon icon="hass:plus"></ha-icon>
                 </ha-icon-button>
              </div>
            </div>
          `)}
        </div>
        ${this._editingSlot ? this._renderEditPanel() : ''}
      `;
    }

    _renderEditPanel() {
      const slot = this._timeslots.find(s => s.id === this._editingSlot);
      if (!slot) return '';

      const handleTimeChange = (e, field) => {
          const proposedSlot = { ...slot, [field]: e.target.value };
          const conflict = this.checkConflict(proposedSlot);
          if (conflict) {
              alert(`Conflit d'horaire détecté avec ${conflict.name}.`);
              e.target.value = slot[field]; // Revert
          } else {
              this.updateTimeslot(slot.id, { [field]: e.target.value });
          }
      };

      return html`
        <div class="edit-panel">
          <div class="edit-header">
            <h3>Édition de la plage</h3>
            <ha-icon-button .label="Fermer" @click=${() => { this._editingSlot = null; this.requestUpdate(); }}>
              <ha-icon icon="hass:close"></ha-icon>
            </ha-icon-button>
          </div>
          <div class="edit-content">
            <ha-textfield
              label="Heure de début"
              type="time"
              .value=${slot.startTime}
              @change=${(e) => handleTimeChange(e, 'startTime')}
            ></ha-textfield>
            <ha-textfield
              label="Heure de fin"
              type="time"
              .value=${slot.endTime}
              @change=${(e) => handleTimeChange(e, 'endTime')}
            ></ha-textfield>
            <ha-select
              label="Scénario"
              .value=${slot.scenarioId}
              @selected=${(e) => this.updateTimeslot(slot.id, { scenarioId: e.target.value })}
            >
              ${this._scenarios.map(sc => html`<mwc-list-item .value=${sc.id}>${sc.name}</mwc-list-item>`)}
            </ha-select>
          </div>
        </div>
      `;
    }

    _renderScenarios() {
      return html`
        <div class="scenarios-container">
          <p>La configuration des scénarios n'est pas encore implémentée dans cette version.</p>
        </div>
      `;
    }

    // --- Styles ---
    static get styles() {
      return css`
        :host { display: block; }
        ha-card { overflow: hidden; }
        .header { display: flex; align-items: center; gap: 16px; background: var(--primary-color); color: var(--text-primary-color, white); padding: 16px; }
        .icon-container ha-icon { --mdc-icon-size: 28px; }
        .card-name { font-size: 22px; font-weight: bold; }
        .card-description { font-size: 14px; opacity: 0.9; }
        .tab-bar { display: flex; border-bottom: 1px solid var(--divider-color); }
        .tab { padding: 12px 16px; cursor: pointer; font-weight: 500; color: var(--secondary-text-color); position: relative; }
        .tab.active { color: var(--primary-color); }
        .tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--primary-color); }
        .content { padding: 16px; }
        .timeline-header { display: flex; align-items: center; margin-bottom: 8px; padding-right: 30px; }
        .day-label-spacer { width: 80px; flex-shrink: 0; }
        .hours-container { flex-grow: 1; display: flex; justify-content: space-between; font-size: 12px; color: var(--secondary-text-color); }
        .days-container { display: flex; flex-direction: column; gap: 12px; }
        .day-row { display: flex; align-items: center; gap: 8px; }
        .day-label { width: 80px; flex-shrink: 0; font-weight: 500; text-align: right; padding-right: 8px; }
        .timeline-bar { flex-grow: 1; position: relative; height: 48px; background-color: var(--secondary-background-color); border-radius: 8px; border: 1px solid var(--divider-color); }
        .grid-line { position: absolute; top: 0; bottom: 0; width: 1px; background-color: var(--divider-color); }
        .time-slot { position: absolute; top: 4px; bottom: 4px; border-radius: 6px; cursor: move; display: flex; align-items: center; justify-content: space-between; overflow: hidden; transition: opacity 0.2s; min-width: 60px; }
        .time-slot.dragging { opacity: 0.7; z-index: 10; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .slot-content { padding: 0 8px; color: white; font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: flex; justify-content: space-between; align-items: center; pointer-events: none; }
        .delete-btn { --mdc-icon-button-size: 24px; --mdc-icon-size: 16px; color: white; opacity: 0; transition: opacity 0.2s; pointer-events: auto; }
        .time-slot:hover .delete-btn { opacity: 0.8; }
        .delete-btn:hover { opacity: 1; }
        .add-btn { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); --mdc-icon-button-size: 32px; background-color: var(--primary-color); color: var(--text-primary-color); border-radius: 50%; }
        .resize-handle { position: absolute; top: 0; bottom: 0; width: 8px; cursor: ew-resize; z-index: 5; }
        .resize-handle.left { left: 0; }
        .resize-handle.right { right: 0; }
        .edit-panel { margin-top: 16px; background-color: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 16px; }
        .edit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .edit-header h3 { margin: 0; font-size: 16px; }
        .edit-content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        ha-select { grid-column: 1 / -1; }
      `;
    }
  }
  customElements.define('card-schedule-experience', CardScheduleExperience);
}

async function loadCard() {
  try {
    const { LitElement, html, css } = await import('https://unpkg.com/lit@2.0.0/index.js?module');
    defineCard(LitElement, html, css);
  } catch (e) {
    console.error("Failed to load Lit for Card Schedule Experience", e);
  }
}

loadCard();

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'card-schedule-experience',
  name: 'Card Schedule Experience',
  description: 'Une carte pour gérer des plannings.',
});

console.info(
  `%c CARD-SCHEDULE-EXPERIENCE %c v0.1.2 `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);
