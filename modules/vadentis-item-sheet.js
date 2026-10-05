import { VadentisUtility } from "./vadentis-utility.js";
import { VadentisCommerceApp } from "./vadentis-commerce.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class VadentisItemSheet extends ItemSheet {

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["foundryvtt-vadentis", "sheet", "item"],
			template: "systems/foundryvtt-vadentis/templates/item-sheet.html",
			width: 550,
			height: 550
      //tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
		});
  }

  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    // Add "Post to chat" button
    // We previously restricted this to GM and editable items only. If you ever find this comment because it broke something: eh, sorry!
    buttons.unshift(
      {
        class: "post",
        icon: "fas fa-comment",
        onclick: ev => {} //new RdDItem(this.item.data).postItem()
      })
    return buttons
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }
  
  /* -------------------------------------------- */
  async getData() {
    
    let itemData = foundry.utils.deepClone(this.object.system);
    let formData = {
      title: this.title,
      id: this.id,
      type: this.object.type,
      img: this.object.img,
      name: this.object.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      data: itemData, 
      limited: this.object.limited,
      options: this.options,
      owner: this.document.isOwner,
      isGM: game.user.isGM,
    }
    if (itemData.description) {
      formData.description = await TextEditor.enrichHTML(this.object.system.description, { async: true })
    }
    if (itemData.notes) {
      formData.notes = await TextEditor.enrichHTML(this.object.system.notes, { async: true })
    }
    if (itemData.effect) {
      formData.effect = await TextEditor.enrichHTML(this.object.system.effect, { async: true })
    }
    if (itemData.criticaleffect) {
      formData.criticaleffect = await TextEditor.enrichHTML(this.object.system.criticaleffect, { async: true })
    }
    if (this.object.type == 'sort') {
      formData.donnees = await VadentisUtility.getDonnees();
    }
    if (this.object.type == 'devotion') {
      formData.eglises = await VadentisUtility.getEglises();
    }
    if (this.object.type == 'talent') {
      const talentType = String(itemData.talentType || "").trim().toLowerCase();
      formData.isSculptureType = talentType === "sculpture";
      formData.isAlchimieType = talentType === "alchimie";
      formData.isIngenierieType = talentType === "ingenierie" || talentType === "ingénierie";
      formData.isChanteVieType = talentType === "chantevie";
      const sd = String(itemData.sculptureDonnee || "");
      formData.sculptureDonnees = ["Feu", "Eau", "Vent", "Terre", "Foudre"].map(name => ({ name, selected: name === sd }));
    }
    if (["armecc", "tir", "armurebouclier", "equipement", "statut"].includes(this.object.type)) {
      const actor = this.object.parent;
      formData.modifierCompetences = actor?.items?.filter(i => i.type === "competence").map(i => ({ id: i.id, name: i.name })) || [];
    }
    
    return formData;
  }
  
  /* -------------------------------------------- */
  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Commerce: the GM can launch the shared session window from its preparation sheet.
    html.find('.vadentis-open-commerce').on('click', async ev => {
      ev.preventDefault();
      await this._onSubmit(ev);
      await VadentisCommerceApp.open(this.object);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
    
    // Audio picker: bind explicitly on every Vadentis item sheet.
    // Foundry v12 exposes FilePicker.fromButton(), which reads data-type and
    // data-target from the button and writes the selected path into the field.
    html.find('.vadentis-sound-picker').on('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const button = ev.currentTarget;
      try {
        const picker = FilePicker.fromButton(button);
        picker.render(true);
      } catch (err) {
        console.error('Vadentis | Impossible d’ouvrir le navigateur audio', err);
        ui.notifications.error('Vadentis : impossible d’ouvrir le navigateur audio.');
      }
    });

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.object.options.actor.getOwnedItem(li.data("item-id"));
      item.sheet.render(true);
    });
    // Update Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.object.options.actor.deleteOwnedItem( li.data("item-id") ).then( this.render(true));
    });
    
  }
  
  /* -------------------------------------------- */
  get template()
  {
    let type = this.item.type;
    return `systems/foundryvtt-vadentis/templates/item-${type}-sheet.html`;
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    return this.object.update(formData);
  }
}
