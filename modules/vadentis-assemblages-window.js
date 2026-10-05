export class VadentisAssemblagesWindow extends Application {
  constructor(actor, options = {}) { super(options); this.actor = actor; }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vadentis-assemblages-window",
      classes: ["vadentis", "vadentis-assemblages-window"],
      template: "systems/foundryvtt-vadentis/templates/assemblages-window.html",
      title: "Assemblages",
      width: 820,
      height: 680,
      resizable: true
    });
  }

  get title() { return `${this.actor?.name || "Personnage"} · Assemblages`; }

  async getData() {
    const items = (this.actor?.items || [])
      .filter(i => foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.inventorySection") === "assemblages")
      .map(i => {
        const data = i.toObject(false);
        const f = foundry.utils.getProperty(data, "flags.foundryvtt-vadentis.ingenierie") || {};
        const def = this.actor?.getIngenierieAssemblages?.().find(a => a.id === f.assemblyId) || {};
        if(def.icon) data.img=def.icon;
        data._assembly = {
          remaining: Number(f.usesRemaining ?? 0),
          max: Number(f.usesMax ?? 1),
          orbes: f.orbes || "—",
          usesLabel: f.usesLabel || `${Number(f.usesMax ?? 1)} utilisation(s)`,
          time: f.time || "—",
          difficulty: f.difficulty || "—",
          transferable: f.transferable ?? def.transferable ?? (["—","-"].includes(String(f.difficulty||"—").trim()) || f.assemblyId === "fleches"),
          automation: f.automation || def.automation || "manuel",
          automationLabel: def.automationLabel || ((f.automation||"")==="auto"?"Automatisable":(f.automation||"")==="assiste"?"Assisté":"Narratif"),
          weaponLike: f.weaponLike ?? def.weaponLike ?? false,
          ammoLike: f.ammoLike ?? def.ammoLike ?? false
        };
        return data;
      });
    return { actor: this.actor, assemblages: items, hasAssemblages: items.length > 0, canTransfer: this.actor?.isOwner ?? false };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.vadentis-aw10-name').click(ev => {
      ev.preventDefault();
      const row = $(ev.currentTarget).closest('.vadentis-aw10-card');
      row.toggleClass('expanded');
      row.find('.vadentis-aw-details').stop(true, true).slideToggle(150);
    });
    html.find('.vadentis-aw-use').click(async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const id = ev.currentTarget.dataset.itemId;
      if (id) { await this.actor.useEngineeringAssembly(id); this.render(false); }
    });
    html.find('.vadentis-aw-recharge').click(async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const id = ev.currentTarget.dataset.itemId;
      if (id) { await this.actor.rechargeEngineeringAssembly(id); this.render(false); }
    });
    html.find('.vadentis-aw-edit').click(ev => {
      ev.preventDefault(); ev.stopPropagation();
      this.actor.items.get(ev.currentTarget.dataset.itemId)?.sheet?.render(true);
    });
    html.find('.vadentis-aw-transfer').click(async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const id = ev.currentTarget.dataset.itemId;
      if (id) await this._transferAssembly(id);
    });
    html.find('.vadentis-aw-delete').click(async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const id=ev.currentTarget.dataset.itemId, item=this.actor.items.get(id); if(!item)return;
      const ok=await new Promise(resolve=>{
        new Dialog({
          title:"Supprimer l’Assemblage",
          content:`<p>Supprimer définitivement <strong>${foundry.utils.escapeHTML(item.name)}</strong> ?</p>`,
          buttons:{
            yes:{label:"Supprimer",icon:'<i class="fas fa-trash"></i>',callback:()=>resolve(true)},
            no:{label:"Annuler",callback:()=>resolve(false)}
          },
          default:"no",close:()=>resolve(false)
        }).render(true);
      });
      if(!ok)return;
      await this.actor.deleteEmbeddedDocuments("Item",[id]);
      ui.notifications.info(`${item.name} supprimé.`);
      await this.render(false);
    });
  }

  _onlineTransferTargets(){
    const seen=new Set(), out=[];
    for(const user of game.users.filter(u=>u.active && !u.isGM && u.id!==game.user.id)){
      const actor=user.character;
      if(!actor || actor.type!=="personnage" || actor.id===this.actor.id || seen.has(actor.id)) continue;
      seen.add(actor.id); out.push({actor,user});
    }
    return out.sort((a,b)=>a.actor.name.localeCompare(b.actor.name));
  }

  async _transferAssembly(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const f=foundry.utils.getProperty(item,"flags.foundryvtt-vadentis.ingenierie")||{};
    const def=this.actor.getIngenierieAssemblages?.().find(a=>a.id===f.assemblyId);
    const transferable=f.transferable ?? def?.transferable ?? (["—","-"].includes(String(f.difficulty||"—").trim()) || f.assemblyId==="fleches");
    if(!transferable) return ui.notifications.warn(`${item.name} nécessite l’Ingénierie élémentaire et ne peut pas être confié.`);

    const targets=this._onlineTransferTargets();
    if(!targets.length) return ui.notifications.warn("Aucun autre personnage de joueur connecté n’est disponible.");
    const options=targets.map(({actor,user})=>`<option value="${actor.id}" data-user-id="${user.id}">${foundry.utils.escapeHTML(actor.name)} · ${foundry.utils.escapeHTML(user.name)}</option>`).join("");
    const choice=await new Promise(resolve=>{
      new Dialog({
        title:`Confier · ${item.name}`,
        content:`<div class="vadentis-aw-transfer-dialog"><p>À quel personnage connecté confier <strong>${foundry.utils.escapeHTML(item.name)}</strong> ?</p><select id="vadentis-aw-target">${options}</select><p class="hint">L’objet complet, ses Orbes et ses charges actuelles seront transférés.</p></div>`,
        buttons:{ok:{label:"Confier",icon:'<i class="fas fa-handshake"></i>',callback:html=>{const el=html.find('#vadentis-aw-target')[0];resolve({actorId:el.value,userId:el.selectedOptions[0]?.dataset?.userId});}},cancel:{label:"Annuler",callback:()=>resolve(null)}},
        default:"ok",close:()=>resolve(null)
      },{width:480}).render(true);
    });
    if(!choice) return;
    const target=game.actors.get(choice.actorId); if(!target)return;

    // MJ ou double propriété : transfert local immédiat.
    if(game.user.isGM || (this.actor.testUserPermission(game.user,"OWNER") && target.testUserPermission(game.user,"OWNER"))){
      const clone=item.toObject(); delete clone._id;
      await target.createEmbeddedDocuments("Item",[clone]); await item.delete();
      ui.notifications.info(`${item.name} confié à ${target.name}.`); this.render(false); this.actor.sheet?.render(false); target.sheet?.render(false); return;
    }

    // Sinon, le client du destinataire crée l'Item. Aucun MJ n'est requis.
    const requestId=foundry.utils.randomID(), clone=item.toObject(); delete clone._id;
    const result=await new Promise(resolve=>{
      let done=false;
      const finish=v=>{if(done)return;done=true;try{game.socket.off("system.foundryvtt-vadentis",listener);}catch(_){} resolve(v);};
      const listener=msg=>{if(msg?.name!=="msg_engineering_transfer_response"||msg?.data?.requestId!==requestId||msg?.data?.requesterId!==game.user.id)return;finish(msg.data);};
      game.socket.on("system.foundryvtt-vadentis",listener);
      game.socket.emit("system.foundryvtt-vadentis",{name:"msg_engineering_transfer_to_owner",data:{requestId,requesterId:game.user.id,targetUserId:choice.userId,targetActorId:target.id,itemData:clone}});
      setTimeout(()=>finish({ok:false,error:"Le personnage destinataire n’a pas répondu."}),10000);
    });
    if(result?.ok){await item.delete();ui.notifications.info(`${item.name} confié à ${target.name}.`);this.render(false);this.actor.sheet?.render(false);}
    else ui.notifications.warn(result?.error||"Le transfert n’a pas pu être effectué.");
  }

}
