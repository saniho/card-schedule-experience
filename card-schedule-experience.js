function defineCard(LitElement, html, css) {
  class CardScheduleExperience extends LitElement {
    static get properties() {
      return {
        hass: { type: Object },
        _config: { state: true },
        _activeTab: { state: true },
        _timeslots: { state: true },
        _scenarios: { state: true },
        _editingSlot: { state: true },
        _draggedSlot: { state: true },
        _dragOffset: { state: true },
        _previewSlot: { state: true },
        _resizeTooltip: { state: true },
        _editingScenarioId: { state: true },
        _addingActionDialog: { state: true },
      };
    }

    constructor() {
      super();
      this._activeTab = 'timeslots';
      this._editingSlot = null;
      this._draggedSlot = null;
      this._dragOffset = 0;
      this._previewSlot = null;
      this._resizeTooltip = null;
      this._editingScenarioId = null;
      this._addingActionDialog = null;

      this._timeslots = [
        { id: '1', name: 'Chauffage matin', day: 1, startTime: '07:00', endTime: '09:00', scenarioId: '1', enabled: true, color: '#3b82f6' },
        { id: '2', name: 'Eco journée', day: 1, startTime: '09:01', endTime: '17:59', scenarioId: '2', enabled: true, color: '#10b981' },
        { id: '3', name: 'Chauffage soir', day: 1, startTime: '18:00', endTime: '23:00', scenarioId: '1', enabled: true, color: '#3b82f6' }
      ];
      this._scenarios = [
        { id: '1', name: 'Chauffage confort', color: '#3b82f6', automations: [] },
        { id: '2', name: 'Mode éco', color: '#10b981', automations: [] }
      ];
    }

    setConfig(config) { this._config = config; }
    getCardSize() { return 15; }

    timeToMinutes(time) { const [h, m] = time.split(':').map(Number); return h * 60 + m; }
    timeToPercent(time) { return (this.timeToMinutes(time) / 1440) * 100; }
    percentToTime(p) { const tm = Math.round((p / 100) * 1440), h = Math.floor(tm / 60), m = Math.round((tm % 60) / 5) * 5; return `${String(h % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
    checkConflict(target) { if (this.timeToMinutes(target.startTime) >= this.timeToMinutes(target.endTime)) return { name: "Durée nulle" }; for (const s of this._timeslots.filter(s => s.day === target.day && s.id !== target.id)) { if (this.timeToMinutes(target.startTime) < this.timeToMinutes(s.endTime) && this.timeToMinutes(target.endTime) > this.timeToMinutes(s.startTime)) return s; } return null; }
    addTimeslot(day, startTime, endTime) { const newSlot = { id: Date.now().toString(), name: 'Nouveau', day, startTime, endTime, scenarioId: this._scenarios[0]?.id || '', enabled: true, color: this._scenarios[0]?.color || '#3b82f6' }; this._timeslots = [...this._timeslots, newSlot]; this._editingSlot = newSlot.id; this.requestUpdate(); }
    updateTimeslot(id, u) { this._timeslots = this._timeslots.map(s => s.id === id ? { ...s, ...u, ...(u.scenarioId && { color: this._scenarios.find(sc => sc.id === u.scenarioId)?.color || s.color, name: this._scenarios.find(sc => sc.id === u.scenarioId)?.name || s.name }) } : s); this.requestUpdate(); }
    deleteTimeslot(id) { this._timeslots = this._timeslots.filter(s => s.id !== id); if (this._editingSlot === id) this._editingSlot = null; this.requestUpdate(); }

    _updateScenario(id, updates) { this._scenarios = this._scenarios.map(s => s.id === id ? { ...s, ...updates } : s); this.requestUpdate(); }
    _addScenario() { const newScenario = { id: Date.now().toString(), name: 'Nouveau Scénario', color: '#cccccc', automations: [] }; this._scenarios = [...this._scenarios, newScenario]; this._editingScenarioId = newScenario.id; this.requestUpdate(); }
    _deleteScenario(id) { if (confirm('Supprimer ce scénario ?')) { this._scenarios = this._scenarios.filter(s => s.id !== id); if (this._editingScenarioId === id) this._editingScenarioId = null; this.requestUpdate(); } }
    _addAutomationToScenario(scenarioId, automationId) { this._scenarios = this._scenarios.map(s => s.id === scenarioId ? { ...s, automations: [...s.automations, automationId] } : s); this.requestUpdate(); }
    _removeAutomationFromScenario(scenarioId, automationId) { this._scenarios = this._scenarios.map(s => s.id === scenarioId ? { ...s, automations: s.automations.filter(id => id !== automationId) } : s); this.requestUpdate(); }

    _showAddActionDialog(scenarioId, ruleId) {
      this._addingActionDialog = { scenarioId, ruleId: null, entity: '' };
      this.requestUpdate();
    }

    _closeAddActionDialog() {
      this._addingActionDialog = null;
      this.requestUpdate();
    }

    _confirmAddAction() {
      if (!this._addingActionDialog || !this._addingActionDialog.entity) {
        alert('Veuillez sélectionner une automation');
        return;
      }

      const { scenarioId, entity } = this._addingActionDialog;
      this._addAutomationToScenario(scenarioId, entity);
      this._closeAddActionDialog();
    }

    _handleDragStart(e, slot) { if (e.target.closest('.resize-handle')) return; e.stopPropagation(); const tl = e.currentTarget.parentElement, rect = tl.getBoundingClientRect(); this._draggedSlot = slot; this._dragOffset = ((e.clientX - rect.left) / rect.width) * 100 - this.timeToPercent(slot.startTime); this._editingSlot = null; this.requestUpdate(); const mm = (me) => { if (!this._draggedSlot) return; let nsp = ((me.clientX - rect.left) / rect.width) * 100 - this._dragOffset; nsp = Math.max(0, nsp); const dur = this.timeToPercent(slot.endTime) - this.timeToPercent(slot.startTime); if (nsp + dur > 100) nsp = 100 - dur; const nst = this.percentToTime(nsp), net = this.percentToTime(nsp + dur); if (!this.checkConflict({ ...slot, startTime: nst, endTime: net })) this.updateTimeslot(slot.id, { startTime: nst, endTime: net }); }; const mu = () => { this._draggedSlot = null; this.requestUpdate(); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); }; document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); }
    _handleResizeStart(e, slot, handle) { e.stopPropagation(); const tl = e.currentTarget.closest('.timeline-bar'), rect = tl.getBoundingClientRect(); this._resizeTooltip = { content: handle === 'left' ? slot.startTime : slot.endTime, top: e.clientY, left: e.clientX }; this.requestUpdate(); const mm = (me) => { const x = me.clientX - rect.left, p = Math.max(0, Math.min(100, (x / rect.width) * 100)), nt = this.percentToTime(p); this._resizeTooltip = { content: nt, top: me.clientY, left: me.clientX }; this.requestUpdate(); if (handle === 'left') { if (this.timeToMinutes(nt) < this.timeToMinutes(slot.endTime) && !this.checkConflict({ ...slot, startTime: nt })) this.updateTimeslot(slot.id, { startTime: nt }); } else { if (this.timeToMinutes(nt) > this.timeToMinutes(slot.startTime) && !this.checkConflict({ ...slot, endTime: nt })) this.updateTimeslot(slot.id, { endTime: nt }); } }; const mu = () => { this._resizeTooltip = null; this.requestUpdate(); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); }; document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); }
    _handleTimelineMouseDown(e, dayId) { if (e.target.closest('.time-slot')) return; const tl = e.currentTarget, rect = tl.getBoundingClientRect(), sp = ((e.clientX - rect.left) / rect.width) * 100; this._previewSlot = { day: dayId, startTime: this.percentToTime(sp), endTime: this.percentToTime(sp), id: 'preview' }; this.requestUpdate(); const mm = (me) => { const x = me.clientX - rect.left, cp = Math.max(0, Math.min(100, (x / rect.width) * 100)); this._previewSlot.startTime = this.percentToTime(Math.min(sp, cp)); this._previewSlot.endTime = this.percentToTime(Math.max(sp, cp)); this.requestUpdate(); }; const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); const fs = { ...this._previewSlot }; this._previewSlot = null; this.requestUpdate(); if (this.timeToMinutes(fs.endTime) - this.timeToMinutes(fs.startTime) < 5 || this.checkConflict(fs)) return; this.addTimeslot(fs.day, fs.startTime, fs.endTime); }; document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); }

    render() {
      if (!this.hass) {
        return html``;
      }
      const days = [{id:1,l:'Lundi'},{id:2,l:'Mardi'},{id:3,l:'Mercredi'},{id:4,l:'Jeudi'},{id:5,l:'Vendredi'},{id:6,l:'Samedi'},{id:0,l:'Dimanche'}];
      return html`
        <ha-card>
          <div class="header">
            <div class="icon-container"><ha-icon icon="hass:clock-outline"></ha-icon></div>
            <div class="info-container">
              <div class="card-name">Scheduler Component</div>
              <div class="card-description">Conf. plages horaires & scénarios</div>
            </div>
          </div>
          <div class="tab-bar">
            <div class="tab ${this._activeTab==='timeslots'?'active':''}" @click=${()=>this._activeTab='timeslots'}>Planification</div>
            <div class="tab ${this._activeTab==='scenarios'?'active':''}" @click=${()=>this._activeTab='scenarios'}>Scénarios</div>
          </div>
          <div class="content">${this._activeTab==='timeslots'?this._renderTimeslots(days):this._renderScenarios()}</div>
        </ha-card>
        ${this._resizeTooltip?html`<div class="resize-tooltip" style="top:${this._resizeTooltip.top}px;left:${this._resizeTooltip.left}px;">${this._resizeTooltip.content}</div>`:''}
        ${this._renderAddActionDialog()}
      `;
    }

    _renderTimeslots(days) { const slots = (d) => this._timeslots.filter(s => s.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime)); return html`<div class="timeline-header"><div class="day-label-spacer"></div><div class="hours-container">${[0,6,12,18,24].map(h=>html`<span style="position:absolute;left:${(h/24)*100}%;transform:translateX(${h>0&&h<24?'-50%':h===24?'-100%':'0'});">${String(h===24?'24':h).padStart(2,'0')}:00</span>`)}</div></div><div class="days-container">${days.map(d=>html`<div class="day-row"><div class="day-label">${d.l}</div><div class="timeline-bar" @mousedown=${(e)=>this._handleTimelineMouseDown(e,d.id)}>${[6,12,18].map(h=>html`<div class="grid-line" style="left:${h/24*100}%"></div>`)}${slots(d.id).map(s=>html`<div class="time-slot ${this._draggedSlot?.id===s.id?'dragging':''}" style="left:${this.timeToPercent(s.startTime)}%;width:${this.timeToPercent(s.endTime)-this.timeToPercent(s.startTime)}%;background-color:${s.color};" @mousedown=${(e)=>this._handleDragStart(e,s)} @click=${()=>{if(!this._draggedSlot)this._editingSlot=s.id}}><div class="resize-handle left" @mousedown=${(e)=>this._handleResizeStart(e,s,'left')}></div><div class="slot-content"><span class="slot-name">${s.name}</span><ha-icon-button class="delete-btn" .label="Supprimer" @click=${(e)=>{e.stopPropagation();this.deleteTimeslot(s.id)}}><ha-icon icon="hass:trash-can-outline"></ha-icon></ha-icon-button></div><div class="resize-handle right" @mousedown=${(e)=>this._handleResizeStart(e,s,'right')}></div></div>`)}${this._previewSlot&&this._previewSlot.day===d.id?html`<div class="time-slot preview" style="left:${this.timeToPercent(this._previewSlot.startTime)}%;width:${this.timeToPercent(this._previewSlot.endTime)-this.timeToPercent(this._previewSlot.startTime)}%;"></div>`:''}</div></div>`)}</div>${this._editingSlot?this._renderEditPanel():''}`; }
    _renderEditPanel() { const s = this._timeslots.find(sl => sl.id === this._editingSlot); if (!s) return ''; const htc = (e, f) => { const ps = { ...s, [f]: e.target.value }; if (this.checkConflict(ps)) { alert(`Conflit avec ${this.checkConflict(ps).name}.`); e.target.value = s[f]; } else this.updateTimeslot(s.id, { [f]: e.target.value }); }; const hd = () => { if (confirm(`Supprimer "${s.name}" ?`)) this.deleteTimeslot(s.id); }; return html`<div class="edit-panel"><div class="edit-header"><h3>Édition de la plage</h3><div class="header-buttons"><ha-icon-button class="delete-btn-panel" .label="Supprimer" @click=${hd}><ha-icon icon="hass:trash-can-outline"></ha-icon></ha-icon-button><ha-icon-button .label="Fermer" @click=${()=>this._editingSlot=null}><ha-icon icon="hass:close"></ha-icon></ha-icon-button></div></div><div class="edit-content"><ha-textfield label="Début" type="time" .value=${s.startTime} @change=${(e)=>htc(e,'startTime')}></ha-textfield><ha-textfield label="Fin" type="time" .value=${s.endTime} @change=${(e)=>htc(e,'endTime')}></ha-textfield><ha-select label="Scénario" .value=${s.scenarioId} @selected=${(e)=>this.updateTimeslot(s.id,{scenarioId:e.target.value})}>${this._scenarios.map(sc=>html`<mwc-list-item .value=${sc.id}>${sc.name}</mwc-list-item>`)}</ha-select></div></div>`; }
    
    _renderScenarios() { return html`<div class="scenarios-list">${this._scenarios.map(s => this._renderScenarioItem(s))}</div><div class="add-button-container"><ha-button outlined label="Ajouter un scénario" @click=${this._addScenario}><ha-icon slot="icon" icon="hass:plus"></ha-icon></ha-button></div>`; }
    _renderScenarioItem(scenario) { const isEditing = this._editingScenarioId === scenario.id; return html`<ha-card class="scenario-item" outlined> <div class="scenario-header" @click=${() => this._editingScenarioId = isEditing ? null : scenario.id}> <div class="scenario-color" style="background-color: ${scenario.color}"></div> <span class="scenario-name">${scenario.name}</span> <ha-icon-button .label=${isEditing ? 'Fermer' : 'Ouvrir'}><ha-icon icon=${isEditing ? 'hass:chevron-up' : 'hass:chevron-down'}></ha-icon></ha-icon-button> </div> ${isEditing ? this._renderScenarioEditor(scenario) : ''} </ha-card>`; }
    _renderScenarioEditor(scenario) { return html`<div class="scenario-editor">${this._renderScenarioDetails(scenario)}${this._renderScenarioAutomations(scenario)}<div class="add-button-container"><ha-button outlined label="Ajouter une automation" @click=${() => this._showAddActionDialog(scenario.id)}><ha-icon slot="icon" icon="hass:plus-circle-outline"></ha-icon></ha-button></div></div>`; }
    _renderScenarioDetails(scenario) { return html`<div class="scenario-details"><ha-textfield label="Nom du scénario" .value=${scenario.name} @change=${e => this._updateScenario(scenario.id, { name: e.target.value })}></ha-textfield><div class="color-picker"><span>Couleur</span><input type="color" .value=${scenario.color} @input=${e => this._updateScenario(scenario.id, { color: e.target.value })} /></div><ha-icon-button class="delete-btn-panel" label="Supprimer Scénario" @click=${() => this._deleteScenario(scenario.id)}><ha-icon icon="hass:trash-can-outline"></ha-icon></ha-icon-button></div>`; }

    _renderScenarioAutomations(scenario) {
      const automations = Object.keys(this.hass.states)
        .filter(entity => entity.startsWith('automation.'))
        .map(entity => ({
          id: entity,
          name: this.hass.states[entity].attributes.friendly_name || entity
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const scenarioAutomations = scenario.automations
        .map(autoId => automations.find(a => a.id === autoId))
        .filter(a => a); // Supprimer les automations supprimées

      return html`
        <div class="automations-section">
          <h3>Automations associées</h3>
          ${scenarioAutomations.length === 0 ? html`
            <div class="no-automations-info">Aucune automation sélectionnée</div>
          ` : ''}
          <div class="automations-list">
            ${scenarioAutomations.map(auto => html`
              <div class="automation-item">
                <ha-icon icon="hass:robot"></ha-icon>
                <span class="automation-name">${auto.name}</span>
                <ha-icon-button class="delete-btn-panel" @click=${() => this._removeAutomationFromScenario(scenario.id, auto.id)}>
                  <ha-icon icon="hass:trash-can-outline"></ha-icon>
                </ha-icon-button>
              </div>
            `)}
          </div>
        </div>
      `;
    }

    _renderAddActionDialog() {
      if (!this._addingActionDialog) return '';

      // Récupérer les automations disponibles
      const automations = Object.keys(this.hass.states)
        .filter(entity => entity.startsWith('automation.'))
        .map(entity => ({
          id: entity,
          name: this.hass.states[entity].attributes.friendly_name || entity
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return html`
        <div class="dialog-overlay" @click=${() => this._closeAddActionDialog()}>
          <div class="dialog-container" @click=${e => e.stopPropagation()}>
            <div class="dialog-header">
              <h3>Ajouter une automation</h3>
              <ha-icon-button @click=${() => this._closeAddActionDialog()}>
                <ha-icon icon="hass:close"></ha-icon>
              </ha-icon-button>
            </div>
            <div class="dialog-content">
              <label class="dialog-label">Sélectionner une automation</label>
              <select class="dialog-select" .value=${this._addingActionDialog.entity} @change=${e => {
                this._addingActionDialog.entity = e.target.value;
                this.requestUpdate();
              }}>
                <option value="">-- Choisir une automation --</option>
                ${automations.map(auto => html`
                  <option .value=${auto.id}>
                    ${auto.name}
                  </option>
                `)}
              </select>

              ${automations.length === 0 ? html`
                <div class="no-automations-message">
                  ⚠️ Aucune automation trouvée. Créez-en une d'abord dans Home Assistant.
                </div>
              ` : ''}
            </div>
            <div class="dialog-actions">
              <ha-button @click=${() => this._closeAddActionDialog()}>Annuler</ha-button>
              <ha-button variant="primary" @click=${() => this._confirmAddAction()}>Ajouter</ha-button>
            </div>
          </div>
        </div>
      `;
    }

    static get styles() {
      return css`
        :host{display:block}ha-card{overflow:hidden;position:relative}.header{display:flex;align-items:center;gap:16px;background:var(--primary-color);color:var(--text-primary-color,#fff);padding:16px}.icon-container ha-icon{--mdc-icon-size:28px}.card-name{font-size:22px;font-weight:700}.card-description{font-size:14px;opacity:.9}.tab-bar{display:flex;border-bottom:1px solid var(--divider-color)}.tab{padding:12px 16px;cursor:pointer;font-weight:500;color:var(--secondary-text-color);position:relative}.tab.active{color:var(--primary-color)}.tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--primary-color)}.content{padding:16px}.timeline-header{display:flex;align-items:center;margin-bottom:8px;padding-right:10px}.day-label-spacer{width:80px;flex-shrink:0}.hours-container{flex-grow:1;position:relative;height:1em;font-size:12px;color:var(--secondary-text-color)}.days-container{display:flex;flex-direction:column;gap:12px}.day-row{display:flex;align-items:center;gap:8px}.day-label{width:80px;flex-shrink:0;font-weight:500;text-align:right;padding-right:8px}.timeline-bar{flex-grow:1;position:relative;height:48px;background-color:var(--secondary-background-color);border-radius:8px;border:1px solid var(--divider-color);cursor:crosshair}.grid-line{position:absolute;top:0;bottom:0;width:1px;background-color:var(--divider-color)}.time-slot{position:absolute;top:4px;bottom:4px;border-radius:6px;cursor:move;display:flex;align-items:center;justify-content:space-between;overflow:hidden;transition:opacity .2s}.time-slot.dragging{opacity:.7;z-index:10;box-shadow:0 4px 8px #0003}.time-slot.preview{background-color:#3b82f680;border:1px dashed var(--primary-color);z-index:1;cursor:default}.slot-content{padding:0 8px;color:#fff;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;display:flex;justify-content:space-between;align-items:center;pointer-events:none}.delete-btn{--mdc-icon-button-size:24px;--mdc-icon-size:16px;color:#fff;opacity:.7;transition:opacity .2s;pointer-events:auto}.delete-btn:hover{opacity:1}.resize-handle{position:absolute;top:0;bottom:0;width:8px;cursor:ew-resize;z-index:5}.resize-handle.left{left:0}.resize-handle.right{right:0}.edit-panel{margin-top:16px;background-color:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:8px;padding:16px}.edit-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.edit-header h3{margin:0;font-size:16px;flex-grow:1}.header-buttons{display:flex;align-items:center}.delete-btn-panel{--mdc-theme-primary:var(--error-color)}.edit-content{display:grid;grid-template-columns:1fr 1fr;gap:12px}ha-select{grid-column:1 / -1}.resize-tooltip{position:fixed;transform:translate(-50%,-120%);background-color:var(--primary-text-color,#000);color:var(--text-primary-color,#fff);padding:4px 8px;border-radius:4px;font-size:14px;font-weight:700;z-index:1000;pointer-events:none}
        .scenarios-list{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}.add-button-container{margin-top:16px;text-align:center}.scenario-item{transition:all .3s ease-in-out}.scenario-header{display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer}.scenario-color{width:24px;height:24px;border-radius:50%;border:2px solid var(--divider-color)}.scenario-name{flex-grow:1;font-weight:500}.scenario-editor{padding:0 16px 16px;border-top:1px solid var(--divider-color)}.scenario-details{display:flex;align-items:center;gap:16px;margin-bottom:16px;padding-top:16px}.color-picker{display:flex;align-items:center;gap:8px}.color-picker input{width:32px;height:32px;padding:0;border:none;background:0 0;cursor:pointer}.automations-section{margin-top:16px;padding:12px;background-color:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:8px}.automations-section h3{margin:0 0 12px 0;font-size:14px;font-weight:600}.no-automations-info{padding:8px;color:var(--secondary-text-color);font-size:13px;text-align:center;font-style:italic}.automations-list{display:flex;flex-direction:column;gap:8px}.automation-item{display:flex;align-items:center;gap:12px;padding:10px;background-color:var(--primary-background-color);border:1px solid var(--divider-color);border-radius:4px}.automation-item ha-icon{color:var(--primary-color);flex-shrink:0}.automation-name{flex-grow:1;font-weight:500;color:var(--primary-text-color)} select, ha-textfield { padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--input-fill-color); color: var(--primary-text-color); font-family: inherit; font-size: inherit; width: 100%; box-sizing: border-box; height: 40px; }
        .dialog-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background-color:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:2000}.dialog-container{background-color:var(--primary-background-color);border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,.3);width:90%;max-width:500px;max-height:90vh;overflow-y:auto}.dialog-header{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid var(--divider-color)}.dialog-header h3{margin:0;font-size:18px;font-weight:600}.dialog-content{padding:16px;display:flex;flex-direction:column;gap:16px}.dialog-label{font-weight:500;margin-bottom:8px;color:var(--primary-text-color)}.dialog-select{width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);background:var(--input-fill-color);color:var(--primary-text-color);font-family:inherit;font-size:inherit;box-sizing:border-box;height:40px}.no-automations-message{padding:12px;background-color:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:4px;color:var(--primary-text-color);font-size:14px;text-align:center}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;padding:16px;border-top:1px solid var(--divider-color)}.dialog-actions ha-button{margin:0}
      `;
    }
  }
  customElements.define('card-schedule-experience', CardScheduleExperience);
}

// Load the card definition
(async () => {
  await customElements.whenDefined('ha-card');
  try {
    const { LitElement, html, css } = await import('https://unpkg.com/lit@2.0.0/index.js?module');
    defineCard(LitElement, html, css);
  } catch (e) {
    console.error("Failed to load Lit for Card Schedule Experience", e);
  }
})();


window.customCards = window.customCards || [];
window.customCards.push({
  type: 'card-schedule-experience',
  name: 'Card Schedule Experience',
  description: 'Une carte pour gérer des plannings.',
});

console.info(
  `%c CARD-SCHEDULE-EXPERIENCE %c v0.0.21 `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);
