const NS = "foundryvtt-vadentis";

export class VadentisCommerceApp extends Application {
  constructor(commerce, options = {}) {
    super(options);
    this.commerce = commerce || null;
    this.remoteState = options.remoteState || null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vadentis-commerce", classes: ["foundryvtt-vadentis", "vadentis-commerce-app"],
      template: `systems/${NS}/templates/commerce-window.html`, width: 1040, height: 760,
      resizable: true, title: "Vadentis — Commerce & Butin"
    });
  }

  get title() { return `Vadentis — ${this.commerce?.name || this.remoteState?.name || "Commerce & Butin"}`; }

  _rawState() {
    if (this.commerce) return {
      id: this.commerce.id, name: this.commerce.name, img: this.commerce.img,
      mode: this.commerce.system.mode || "magasin",
      stock: foundry.utils.deepClone(this.commerce.system.stock || []),
      actorIds: foundry.utils.deepClone(this.commerce.system.actorIds || []),
      carts: foundry.utils.deepClone(this.commerce.system.carts || {})
    };
    return foundry.utils.deepClone(this.remoteState || {});
  }

  _connectedActors() {
    const actors = [], seen = new Set();
    for (const user of game.users) {
      if (!user.active || user.isGM || !user.character || seen.has(user.character.id)) continue;
      seen.add(user.character.id); actors.push(user.character);
    }
    return actors;
  }

  _moneyFor(actor) { return actor?.items?.filter(i => i.type === "monnaie").map(i => ({id:i.id,name:i.name,img:i.img,amount:Number(i.system.nombre||0)})) || []; }

  async getData() {
    const state = this._rawState(), selected = new Set(state.actorIds || []), mode = state.mode || "magasin";
    const allStock = (state.stock || []).map((entry,index) => ({...entry,index,cost:Number(entry.item?.system?.cost||0),qty:Math.max(0,Number(entry.qty??1)),infinite:!!entry.infinite}));
    const stockById = new Map(allStock.map(e => [e.id || `legacy-${e.index}`, e]));
    // Depuis 12.0.51, un dépôt retire immédiatement un exemplaire du stock fini.
    // Le panier devient donc une vraie réservation et la quantité affichée est la quantité restante.
    const stock = allStock.map(e => ({...e, available:e.infinite ? e.qty : e.qty, displayQty:e.qty}))
      .filter(e => e.infinite || e.qty > 0);
    const actors = this._connectedActors().map(actor => {
      const own = game.user.isGM || actor.isOwner || game.user.character?.id === actor.id;
      const rawCart = state.carts?.[actor.id] || [];
      const cart = rawCart.map(c => {
        const entry = stockById.get(c.entryId);
        const item = c.item || entry?.item || {};
        const qty = Math.max(1, Number(c.qty || 1));
        const unitCost = Number(c.unitCost ?? item.system?.cost ?? entry?.cost ?? 0);
        return {...c,item,qty,unitCost,lineTotal:unitCost*qty};
      });
      const total = cart.reduce((n,c)=>n+c.lineTotal,0);
      const money = own ? this._moneyFor(actor) : [];
      const firstMoney = money[0] || null;
      return {id:actor.id,name:actor.name,img:actor.img,selected:selected.has(actor.id),canSeeMoney:own,money,cart,total,
        firstMoneyId:firstMoney?.id||"", firstMoneyName:firstMoney?.name||"", firstMoneyAmount:firstMoney?.amount??0,
        projected:firstMoney ? firstMoney.amount-total : null};
    });
    return {isGM:game.user.isGM,commerceId:state.id,name:state.name,img:state.img,mode,isMagasin:mode==="magasin",isLoot:mode==="loot",isCoffre:mode==="coffre",stock,actors};
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!game.user.isGM) return;
    html.find(".commerce-actor-toggle").on("change", ev=>this._toggleActor(ev));
    html.find(".commerce-remove").on("click", ev=>this._remove(ev));
    html.find(".commerce-qty").on("change", ev=>this._changeQty(ev));
    html.find(".commerce-infinite").on("change", ev=>this._changeInfinite(ev));
    html.find(".commerce-cart-remove").on("click", ev=>this._cartRemove(ev));
    html.find(".commerce-cart-clear").on("click", ev=>this._cartClear(ev));
    html.find(".commerce-validate").on("click", ev=>this._validateCart(ev));
    html.find(".commerce-close-session").on("click", ev=>this._closeSession(ev));
    html.on("dragstart", ".commerce-item[data-index]", ev=>this._dragStock(ev));
    html.on("dragover", ".commerce-stock", ev=>{ev.preventDefault();ev.originalEvent.dataTransfer.dropEffect="copy";});
    html.on("drop", ".commerce-stock", ev=>this._onDropItem(ev));
    html.on("dragover", ".commerce-fortune-card.is-selected", ev=>{ev.preventDefault();ev.originalEvent.dataTransfer.dropEffect="copy";});
    html.on("drop", ".commerce-fortune-card.is-selected", ev=>this._dropOnActor(ev));
  }

  async _sync(render=true) { await this.broadcast(); if (render) this.render(false); }

  async _toggleActor(ev) {
    if (!this.commerce) return;
    const id=ev.currentTarget.dataset.actorId, ids=new Set(this.commerce.system.actorIds||[]);
    ev.currentTarget.checked ? ids.add(id) : ids.delete(id);
    await this.commerce.update({"system.actorIds":[...ids]}); await this._sync();
  }

  async _ensureStockIds(stock) {
    let changed=false;
    for (const e of stock) if (!e.id) { e.id=foundry.utils.randomID(); changed=true; }
    if (changed) await this.commerce.update({"system.stock":stock});
    return stock;
  }

  async _onDropItem(ev) {
    ev.preventDefault(); if (!this.commerce) return;
    let data; try { data=JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain")); } catch(_){return;}
    if (data.type!=="Item") return;
    const source=await fromUuid(data.uuid); if(!source)return;
    const item=source.toObject(); delete item._id; delete item.folder; delete item.sort; delete item.ownership;
    const stock=foundry.utils.deepClone(this.commerce.system.stock||[]);
    stock.push({id:foundry.utils.randomID(),item,qty:1,infinite:(this.commerce.system.mode||"magasin")==="magasin"});
    await this.commerce.update({"system.stock":stock}); await this._sync();
  }

  _dragStock(ev) {
    const index=Number(ev.currentTarget.dataset.index);
    ev.originalEvent.dataTransfer.setData("text/plain",JSON.stringify({type:"VadentisCommerceStock",commerceId:this.commerce.id,index}));
    ev.originalEvent.dataTransfer.effectAllowed="copy";
  }

  async _dropOnActor(ev) {
    ev.preventDefault();
    let data; try {data=JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain"));}catch(_){return;}
    if(data.type!=="VadentisCommerceStock"||data.commerceId!==this.commerce.id)return;
    const actorId=ev.currentTarget.dataset.actorId;
    if(!(this.commerce.system.actorIds||[]).includes(actorId))return;
    const stock=await this._ensureStockIds(foundry.utils.deepClone(this.commerce.system.stock||[]));
    const entry=stock[Number(data.index)]; if(!entry)return;
    const carts=foundry.utils.deepClone(this.commerce.system.carts||{}), cart=carts[actorId]||[];
    if(!entry.infinite && Number(entry.qty||0)<=0){ui.notifications.warn("Il n'en reste plus en stock.");return;}
    const existing=cart.find(c=>c.entryId===entry.id);
    if(existing) existing.qty=Number(existing.qty||1)+1;
    else cart.push({entryId:entry.id,item:foundry.utils.deepClone(entry.item),qty:1,unitCost:Number(entry.item?.system?.cost||0)});
    if(!entry.infinite) entry.qty=Math.max(0,Number(entry.qty||0)-1);
    carts[actorId]=cart;
    await this.commerce.update({"system.stock":stock,"system.carts":carts}); await this._sync();
  }

  async _cartRemove(ev){
    const actorId=ev.currentTarget.dataset.actorId, entryId=ev.currentTarget.dataset.entryId;
    const carts=foundry.utils.deepClone(this.commerce.system.carts||{}), cart=carts[actorId]||[], line=cart.find(c=>c.entryId===entryId);
    if(!line)return;
    const stock=foundry.utils.deepClone(this.commerce.system.stock||[]), entry=stock.find(e=>e.id===entryId);
    if(entry && !entry.infinite) entry.qty=Math.max(0,Number(entry.qty||0)+1);
    line.qty=Number(line.qty||1)-1; if(line.qty<=0) cart.splice(cart.indexOf(line),1); carts[actorId]=cart;
    await this.commerce.update({"system.stock":stock,"system.carts":carts}); await this._sync();
  }
  async _cartClear(ev){
    const actorId=ev.currentTarget.dataset.actorId,carts=foundry.utils.deepClone(this.commerce.system.carts||{}),cart=carts[actorId]||[];
    const stock=foundry.utils.deepClone(this.commerce.system.stock||[]);
    for(const line of cart){const entry=stock.find(e=>e.id===line.entryId);if(entry&&!entry.infinite)entry.qty=Math.max(0,Number(entry.qty||0)+Number(line.qty||1));}
    carts[actorId]=[];await this.commerce.update({"system.stock":stock,"system.carts":carts});await this._sync();
  }

  async _remove(ev){const index=Number(ev.currentTarget.dataset.index),stock=foundry.utils.deepClone(this.commerce.system.stock||[]);const removed=stock[index];stock.splice(index,1);const carts=foundry.utils.deepClone(this.commerce.system.carts||{});if(removed?.id)for(const id of Object.keys(carts))carts[id]=(carts[id]||[]).filter(c=>c.entryId!==removed.id);await this.commerce.update({"system.stock":stock,"system.carts":carts});await this._sync();}
  async _changeQty(ev){const index=Number(ev.currentTarget.dataset.index),stock=foundry.utils.deepClone(this.commerce.system.stock||[]);if(!stock[index])return;stock[index].qty=Math.max(0,Number(ev.currentTarget.value||0));await this.commerce.update({"system.stock":stock});await this._sync(false);}
  async _changeInfinite(ev){const index=Number(ev.currentTarget.dataset.index),stock=foundry.utils.deepClone(this.commerce.system.stock||[]);if(!stock[index])return;stock[index].infinite=ev.currentTarget.checked;await this.commerce.update({"system.stock":stock});await this._sync(false);}

  async _validateCart(ev){
    const actorId=ev.currentTarget.dataset.actorId, actor=game.actors.get(actorId); if(!actor)return;
    const mode=this.commerce.system.mode||"magasin", carts=foundry.utils.deepClone(this.commerce.system.carts||{}), cart=carts[actorId]||[]; if(!cart.length)return;
    const total=cart.reduce((n,c)=>n+Number(c.unitCost||0)*Number(c.qty||1),0);
    let currency=null, before=0;
    if(mode==="magasin"&&total>0){
      const select=this.element.find(`.commerce-currency[data-actor-id="${actorId}"]`); const currencyId=select.val()||actor.items.find(i=>i.type==="monnaie")?.id;
      currency=actor.items.get(currencyId); if(!currency||currency.type!=="monnaie"){ui.notifications.warn(`${actor.name} n'a aucune monnaie utilisable.`);return;}
      before=Number(currency.system.nombre||0); if(before<total){ui.notifications.warn(`${actor.name} n'a pas assez de ${currency.name} (${before}/${total}).`);return;}
    }
    const lines=cart.map(c=>`<li>${c.item.name}${Number(c.qty||1)>1?` ×${c.qty}`:""}</li>`).join("");
    const payment=(mode==="magasin"&&total>0)?`<p>Prix total : <strong>${total} ${currency.name}</strong><br>${before} → <strong>${before-total}</strong></p>`:"<p><strong>Distribution gratuite</strong></p>";
    const ok=await Dialog.confirm({title:mode==="magasin"?"Valider l'achat":"Valider la distribution",content:`<p><strong>${actor.name}</strong> reçoit :</p><ul>${lines}</ul>${payment}`}); if(!ok)return;
    if(currency) await currency.update({"system.nombre":before-total});
    for(const c of cart){
      for(let q=0;q<Number(c.qty||1);q++){
        const itemData=foundry.utils.deepClone(c.item); delete itemData._id;
        if(mode!=="magasin"&&itemData.type==="monnaie"){
          const existing=actor.items.find(i=>i.type==="monnaie"&&i.name===itemData.name);
          if(existing) await existing.update({"system.nombre":Number(existing.system.nombre||0)+Number(itemData.system?.nombre||0)}); else await actor.createEmbeddedDocuments("Item",[itemData]);
        } else await actor.createEmbeddedDocuments("Item",[itemData]);
      }
    }
    // Le stock fini a déjà été décrémenté au moment du glisser-déposer : on ne le retire pas une seconde fois ici.
    const stock=foundry.utils.deepClone(this.commerce.system.stock||[]);
    const filtered=stock.filter(e=>e.infinite||Number(e.qty||0)>0); carts[actorId]=[];
    await this.commerce.update({"system.stock":filtered,"system.carts":carts}); ui.notifications.info(`Transaction validée pour ${actor.name}.`); await this._sync();
  }

  async _closeSession(ev){
    ev?.preventDefault?.();
    if(!game.user.isGM||!this.commerce)return;
    const ok=await Dialog.confirm({title:"Clôturer la session",content:"<p>Fermer le magasin / loot / coffre chez tous les joueurs connectés ?</p>"});
    if(!ok)return;
    game.socket.emit(`system.${NS}`,{name:"msg_commerce_close",data:{commerceId:this.commerce.id}});
    await this.close({force:true});
  }

  async broadcast(){if(!game.user.isGM||!this.commerce)return;game.socket.emit(`system.${NS}`,{name:"msg_commerce_state",data:this._rawState()});}
  static async open(commerce){const app=new VadentisCommerceApp(commerce);app.render(true);await app.broadcast();return app;}
  static receive(state){
    if(game.user.isGM)return;
    if(!state?.actorIds?.includes(game.user.character?.id)){if(game.vadentisCommerceApp){game.vadentisCommerceApp.close({force:true});game.vadentisCommerceApp=null;}return;}
    if(game.vadentisCommerceApp){game.vadentisCommerceApp.remoteState=foundry.utils.deepClone(state);game.vadentisCommerceApp.render(false);return;}
    game.vadentisCommerceApp=new VadentisCommerceApp(null,{remoteState:state});game.vadentisCommerceApp.render(true);
  }
}
export function initVadentisCommerce(){game.socket.on(`system.${NS}`,msg=>{
  if(msg?.name==="msg_commerce_state") VadentisCommerceApp.receive(msg.data);
  if(msg?.name==="msg_commerce_close" && !game.user.isGM && game.vadentisCommerceApp){game.vadentisCommerceApp.close({force:true});game.vadentisCommerceApp=null;}
});}
