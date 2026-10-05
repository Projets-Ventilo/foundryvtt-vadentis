/* -------------------------------------------- */
import { VadentisUtility } from "./vadentis-utility.js";

/* -------------------------------------------- */
const MIN_PV = -50;
const MIN_PE = -50;

/* -------------------------------------------- */
/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class VadentisActor extends Actor {

  /* -------------------------------------------- */
  /**
   * Override the create() function to provide additional SoS functionality.
   *
   * This overrided create() function adds initial items 
   * Namely: Basic skills, money, 
   *
   * @param {Object} data        Barebones actor data which this function adds onto.
   * @param {Object} options     (Unused) Additional options which customize the creation workflow.
   *
   */

  static async create(data, options) {

    // Case of compendium global import
    if (data instanceof Array) {
      return super.create(data, options);
    }

    // If the created actor has items (only applicable to foundry.utils.duplicated actors) bypass the new actor creation logic
    if (data.items) {
      let actor = super.create(data, options);
      return actor;
    }

    const actor = await super.create(data, options);
    if (actor?.type === "personnage") {
      const baseSkills = ["Athlétisme", "Habileté", "Perception", "Mental", "Social", "Connaissances"];
      const existing = new Set(actor.items.filter(i => i.type === "competence").map(i => String(i.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
      const initialItems = baseSkills.filter(name => !existing.has(name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())).map(name => ({
        name, type: "competence", img: "icons/svg/d20-grey.svg", system: {xp:0, base:0, bonus:0, malus:0, competencerole:false, description:""}
      }));
      if (!actor.items.some(i => i.type === "monnaie" && String(i.name || "").toLowerCase().includes("vadentien"))) {
        initialItems.push({name:"Vadentiens", type:"monnaie", img:"icons/svg/coins.svg", system:{nombre:0, enc:0, description:"Monnaie de Vadentis."}});
      }
      if (initialItems.length) await actor.createEmbeddedDocuments("Item", initialItems);
    }
    return actor;
  }

  /* -------------------------------------------- */
  async prepareData() {
    super.prepareData();
  }

  /* -------------------------------------------- */
  getCompetences() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'competence') || []
    );
  }

  /* -------------------------------------------- */
  getDonnees() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'donnee') || []
    );
  }

  /* -------------------------------------------- */
  getEglises() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'eglise') || []
    );
  }

  /* -------------------------------------------- */
  getSorts() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'sort') || []
    );
  }
/* -------------------------------------------- */
getStatuts() {
  return foundry.utils.duplicate(
    this.items.filter(item => item.type == 'statut') || []
  );
}

  /* -------------------------------------------- */
  getSortsParDonnee(sortPaliers = {}) {
    const donnees = this.getDonnees();
    const sorts = this.getSorts();

    return donnees.map(donnee => {

      const sortsDonnee = sorts.filter(sort => {
        return sort.system.donnee === donnee.name;
      });

      return {
        id: donnee.id,
        name: donnee.name,
        img: donnee.img,

        paliers: [
          {
            id: "I",
            label: "Palier I",
            ouvert: sortPaliers[donnee.id]?.I !== false,
            sorts: sortsDonnee.filter(sort => {
              return !sort.system.palier || sort.system.palier === "I";
            }).sort((a, b) => Number(foundry.utils.getProperty(a, "flags.foundryvtt-vadentis.spellOrder") ?? a.sort ?? 0) - Number(foundry.utils.getProperty(b, "flags.foundryvtt-vadentis.spellOrder") ?? b.sort ?? 0))
          },
          {
            id: "II",
            label: "Palier II",
            ouvert: sortPaliers[donnee.id]?.II !== false,
            sorts: sortsDonnee.filter(sort => {
              return sort.system.palier === "II";
            }).sort((a, b) => Number(foundry.utils.getProperty(a, "flags.foundryvtt-vadentis.spellOrder") ?? a.sort ?? 0) - Number(foundry.utils.getProperty(b, "flags.foundryvtt-vadentis.spellOrder") ?? b.sort ?? 0))
          },
          {
            id: "III",
            label: "Palier III",
            ouvert: sortPaliers[donnee.id]?.III !== false,
            sorts: sortsDonnee.filter(sort => {
              return sort.system.palier === "III";
            }).sort((a, b) => Number(foundry.utils.getProperty(a, "flags.foundryvtt-vadentis.spellOrder") ?? a.sort ?? 0) - Number(foundry.utils.getProperty(b, "flags.foundryvtt-vadentis.spellOrder") ?? b.sort ?? 0))
          }
        ]
      };
    });
  }

  /* -------------------------------------------- */
  getAttributs() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'attribut') || []
    );
  }

  /* -------------------------------------------- */
  getTalents() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'talent') || []
    );
  }

  /* -------------------------------------------- */
  getTechniques() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'technique') || []
    );
  }

  /* -------------------------------------------- */
  getDevotions() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'devotion') || []
    );
  }

  /* -------------------------------------------- */
  getEquipements() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'equipement') || []
    );
  }

  /* -------------------------------------------- */
  getArmes() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'armecc' || item.type == 'tir') || []
    );
  }

  /* -------------------------------------------- */
  getArmures() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'armurebouclier') || []
    );
  }

  /* -------------------------------------------- */
  getMonnaies() {
    return foundry.utils.duplicate(
      this.items.filter(item => item.type == 'monnaie') || []
    );
  }

  /* -------------------------------------------- */
  getIngenierieMaterialItem() {
    const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"'").trim();
    return Array.from(this.items||[]).find(i=>i.type==="monnaie" && ["materiel d'ingenierie","materiel ingenierie"].includes(norm(i.name))) || null;
  }

  getIngenierieAssemblages() {
    const list = [
      {id:"piege",name:"Piège élémentaire",time:"4h",cost:80,orbes:["libre"],uses:"Détruit à la première utilisation",difficulty:"2",description:"S’active au contact. Feu : 2D8 dégâts (rayon 6m) · Eau : 2D4 (9m) · Foudre : 2D6 (6m) + paralysie 1 tour · Terre : 2D4 + trou 5m/3m · Vent : 2D4 + projection (6m)."},
      {id:"crampons",name:"Crampons telluriques",time:"2 jours",cost:80,orbes:["Terre","Terre"],uses:"10 utilisations",difficulty:"—",description:"Semelles devenant extrêmement lourdes ; la personne peut peser jusqu’à 200 kg."},
      {id:"grenade",name:"Grenade élémentaire",time:"1 heure",cost:80,orbes:["libre"],uses:"1 utilisation",difficulty:"—",description:"Explose à l’impact. Feu : 2D8 (3m) · Eau : 2D4 (6m) · Foudre : 2D6 (6m) + paralysie · Terre : 2D4 + trou · Vent : 2D4 + projection."},
      {id:"grappin",name:"Grappin tracteur",time:"1 jour",cost:100,orbes:["Vent"],uses:"10 utilisations",difficulty:"5",description:"Portée 15m. Tracter une cible : Ingénierie + Force VS Force. Se tracter : Ingénierie difficulté 5."},
      {id:"aiguisage",name:"Aiguisage élémentaire",time:"1 jour",cost:100,orbes:["libre"],uses:"1 minute",difficulty:"—",description:"Ajoute un effet élémentaire à une arme de corps-à-corps pendant 1 minute. Utilisable sans Ingénierie."},
      {id:"bottes",name:"Bottes foudroyantes",time:"1 jour",cost:100,orbes:["Foudre","Foudre"],uses:"20 utilisations",difficulty:"—",description:"Double la vitesse de déplacement. Utilisable sans Ingénierie."},
      {id:"brumeur",name:"Brumeur tactique",time:"1 jour",cost:100,orbes:["Feu","Eau"],uses:"10 utilisations",difficulty:"2",description:"Crée une brume dense jusqu’à 18m de rayon pour se camoufler ou aveugler."},
      {id:"diademe",name:"Diadème extra-sensorielle",time:"24 heures",cost:150,orbes:["Vent","Foudre","Terre","Lumière"],uses:"48 heures",difficulty:"—",description:"Perception +6 ; Social +6 pour deviner les intentions."},
      {id:"lanceflamme",name:"Lance-flamme",time:"3 jours",cost:200,orbes:["Feu"],uses:"5 utilisations",difficulty:"Opposition",description:"Demi-cercle de 6m, 2D8 dégâts. Athlétisme VS Ingénierie pour réduire de moitié."},
      {id:"fleches",name:"Flèches élémentaires",time:"1 jour",cost:200,orbes:["libre"],uses:"10 munitions",difficulty:"5",description:"Munitions élémentaires ; l’effet dépend de l’Orbe. Peuvent être confiées à une personne sans Ingénierie."},
      {id:"aquajet",name:"Aqua-Jet Pack",time:"4 jours",cost:300,orbes:["Eau","Eau"],uses:"100 mètres",difficulty:"8",description:"Projection aérienne : 10m en 6 secondes, hauteur maximale 15m."},
      {id:"masque",name:"Masque de plongée",time:"3 jours",cost:300,orbes:["Eau"],uses:"1 heure",difficulty:"—",description:"Filtre l’eau afin d’en extraire l’oxygène."},
      {id:"ailes",name:"Ailes de Vents artificielles",time:"5 jours",cost:300,orbes:["Vent","Vent"],uses:"30 minutes",difficulty:"9",description:"Permet de flotter et augmente la longueur des sauts."},
      {id:"paradonnees",name:"Para-Données portatif",time:"5 jours",cost:500,orbes:["special:3 Orbes de l’élément opposé"],uses:"10 minutes",difficulty:"10",description:"Contre une Donnée dans un rayon de 18m ; les Sorts élémentaires traversant le champ s’annulent."},
      {id:"aimant",name:"Puissant aimant à portée sélective",time:"2 semaines",cost:500,orbes:["Foudre","Terre"],uses:"10 utilisations",difficulty:"Ingénierie VS Défense",description:"Attire à 20m une cible portant du métal, de 10m toutes les 6 secondes."},
      {id:"sacroche",name:"Sac-à-dos en roche flottante",time:"6 heures",cost:500,orbes:["Vent","Vent"],uses:"48 heures",difficulty:"—",description:"Porte jusqu’à 100kg sans difficulté. Nécessite de la Roche flottante."},
      {id:"lentilles",name:"Lentilles du Voile élémentaire",time:"14 jours",cost:1000,orbes:["Feu","Vent","Foudre","Terre","Eau"],uses:"1 heure",difficulty:"10",description:"Permet de voir les flux élémentaires, affiliations, pièges, Sorts et objets touchés par les Données."},
      {id:"charrette",name:"Charrette à poussée automatique",time:"60 jours",cost:1500,orbes:["Vent","Vent","Vent","Vent"],uses:"12 heures",difficulty:"12",description:"Jusqu’à 4 passagers, 15 km/h sur route entretenue."},
      {id:"exosquelette",name:"Exo-squelette à vibration améliorée",time:"30 jours",cost:1500,orbes:["Foudre","Foudre","Foudre","Foudre","Lumière"],uses:"12 heures",difficulty:"15",description:"Attaque +2, Défense +2, Force +2, Acrobatie +2, Vitesse ×1,5, Habileté -6. Installation : échec = 1D4 dégâts."},
      {id:"biodrone",name:"Bio-drone",time:"60 jours",cost:2000,orbes:["Lumière","Vent","Foudre"],uses:"1 heure",difficulty:"12 / 10 min",description:"Partage une partie de ses sens avec son créateur ; flotte jusqu’à 1km et pousse de petits objets."}
    ];
    const automatic = new Set(["piege","grenade","aiguisage","bottes","diademe","exosquelette"]);
    const assisted = new Set(["grappin","brumeur","lanceflamme","fleches","aquajet","ailes","paradonnees","aimant","lentilles","biodrone"]);
    const weaponLike = new Set(["lanceflamme"]), ammoLike = new Set(["fleches"]);
    return list.map(a => ({
      ...a,
      icon:`systems/foundryvtt-vadentis/images/assemblages/${a.id}.png`,
      transferable: ["—","-"].includes(String(a.difficulty).trim()) || a.id === "fleches",
      automation: automatic.has(a.id) ? "auto" : assisted.has(a.id) ? "assiste" : "manuel",
      automationLabel: automatic.has(a.id) ? "Automatisable" : assisted.has(a.id) ? "Assisté" : "Narratif",
      weaponLike: weaponLike.has(a.id),
      ammoLike: ammoLike.has(a.id)
    }));
  }

  _ingenierieNorm(v){ return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(); }
  _ingenierieCompetence(){ return this._alchemyCompetenceTotal("Ingénierie élémentaire"); }
  _ingenierieOwnData(){
    const allowed=["Feu","Eau","Vent","Terre","Foudre","Lumière"];
    return allowed.map(name=>{ const n=this._ingenierieNorm(name); const item=this.items.find(i=>i.type==="donnee" && this._ingenierieNorm(i.name).includes(n)); return item?{name,img:item.img}:null; }).filter(Boolean);
  }
  _ingenierieOrbIcon(dataName){
    const key=this._ingenierieNorm(dataName);
    const icons={feu:"orbe-feu.png",eau:"orbe-eau.png",vent:"orbe-vent.png",terre:"orbe-terre.png",foudre:"orbe-foudre.png",lumiere:"orbe-lumiere.png",vide:"orbe-vide.png"};
    return `systems/foundryvtt-vadentis/images/ingenierie/${icons[key]||"orbe-vide.png"}`;
  }
  _ingenierieOrbData(item){
    const flagged=foundry.utils.getProperty(item,"flags.foundryvtt-vadentis.ingenierie.donnee"); if(flagged)return flagged;
    const n=this._ingenierieNorm(item?.name); return ["Feu","Eau","Vent","Terre","Foudre","Lumière"].find(x=>n.includes(this._ingenierieNorm(x)))||null;
  }
  _ingenierieEmptyOrbs(){ return this.items.filter(i=>i.type==="equipement" && /orbe/i.test(String(i.name||"")) && !this._ingenierieOrbData(i) && /vide|elementaire|élémentaire/i.test(String(i.name||""))); }
  _ingenierieEmptyOrb(){ return this._ingenierieEmptyOrbs().find(i=>Number(i.system?.quantite||0)>0) || this._ingenierieEmptyOrbs()[0]; }
  _ingenierieFilledOrbs(){ return this.items.filter(i=>i.type==="equipement" && !!this._ingenierieOrbData(i) && Number(i.system?.quantite||0)>0); }
  getIngenierieOrbSummary(){
    const names=["Vide","Feu","Eau","Vent","Terre","Foudre","Lumière"];
    return names.map(name=>{let qty=0;if(name==="Vide") qty=this._ingenierieEmptyOrbs().reduce((n,i)=>n+Number(i.system?.quantite||0),0);else qty=this._ingenierieFilledOrbs().filter(i=>this._ingenierieNorm(this._ingenierieOrbData(i))===this._ingenierieNorm(name)).reduce((n,i)=>n+Number(i.system?.quantite||0),0);return {name,qty,img:this._ingenierieOrbIcon(name)};});
  }
  async setIngenierieOrbQuantity(dataName, value){
    const qty=Math.max(0,Math.floor(Number(value)||0));
    const isEmpty=this._ingenierieNorm(dataName)==="vide";
    const matches=isEmpty ? this._ingenierieEmptyOrbs() : this.items.filter(i=>i.type==="equipement" && this._ingenierieNorm(this._ingenierieOrbData(i))===this._ingenierieNorm(dataName));
    if(qty===0){ if(matches.length) await this.deleteEmbeddedDocuments("Item",matches.map(i=>i.id)); return; }
    let primary=matches[0]||null;
    if(!primary){
      const created=await this.createEmbeddedDocuments("Item",[{name:isEmpty?"Orbe élémentaire vide":`Orbe élémentaire de ${dataName}`,type:"equipement",img:this._ingenierieOrbIcon(dataName),system:{quantite:qty,equipee:false,description:isEmpty?"Orbe élémentaire vide.":`Orbe rempli avec la Donnée ${dataName}.`,effect:isEmpty?"":`Donnée : ${dataName}`,enc:0,cost:0},flags:{"foundryvtt-vadentis":{inventorySection:"orbes",ingenierie:{orbe:true,donnee:isEmpty?null:dataName}}}}]);
      primary=created?.[0]||null;
    } else await primary.update({"system.quantite":qty,"flags.foundryvtt-vadentis.inventorySection":"orbes"});
    const extras=matches.filter(i=>i.id!==primary?.id); if(extras.length) await this.deleteEmbeddedDocuments("Item",extras.map(i=>i.id));
  }
  _vadentisPlayCraftSound(kind){
    const src={alchimie:"systems/foundryvtt-vadentis/sounds/ingenierie/alchimie.wav",orbe:"systems/foundryvtt-vadentis/sounds/ingenierie/orbe-rempli.wav",assemblage:"systems/foundryvtt-vadentis/sounds/ingenierie/assemblages.wav"}[kind];
    if(!src)return; try{ AudioHelper.play({src,volume:0.18,autoplay:true,loop:false},true); }catch(err){ console.warn("Vadentis | bruitage",err); }
  }
  async _ingenierieConsumeQty(item,n=1){ const q=Number(item?.system?.quantite||0); if(q<n)return false; if(q===n) await item.delete(); else await item.update({"system.quantite":q-n}); return true; }
  async _ingenierieCreateOrb(dataName){
    const existing=this._ingenierieFilledOrbs().find(i=>this._ingenierieNorm(i.name)===this._ingenierieNorm(`Orbe élémentaire de ${dataName}`));
    if(existing){ await existing.update({"system.quantite":Number(existing.system?.quantite||0)+1}); return existing; }
    const d=this._ingenierieOwnData().find(x=>this._ingenierieNorm(x.name)===this._ingenierieNorm(dataName));
    return (await this.createEmbeddedDocuments("Item",[{name:`Orbe élémentaire de ${dataName}`,type:"equipement",img:this._ingenierieOrbIcon(dataName),system:{quantite:1,equipee:false,description:`Orbe rempli avec la Donnée ${dataName}.`,effect:`Donnée : ${dataName}`,enc:0,cost:0},flags:{"foundryvtt-vadentis":{inventorySection:"orbes",ingenierie:{orbe:true,donnee:dataName}}}}]))?.[0];
  }
  _ingenieriePersonalTier(total,natural){ if(natural===20)return {time:"5 minutes",pe:2}; if(total<=10)return {time:"2h",pe:15}; if(total<=15)return {time:"1h",pe:10}; if(total<=20)return {time:"30 minutes",pe:5}; return {time:"15 minutes",pe:3}; }
  _ingenierieJointTier(total,critical){ if(critical)return {time:"15 minutes",pe:2}; if(total<=20)return {time:"3h",pe:15}; if(total<=25)return {time:"2h",pe:10}; if(total<=30)return {time:"1h",pe:5}; return {time:"30 minutes",pe:3}; }
  async _ingenierieChooseData(data,title="Choisir une Donnée"){
    if(!data.length){ui.notifications.warn("Aucune Donnée élémentaire disponible.");return null;}
    const pe=Number(this.system?.stats?.pointsenergie?.value||0);
    const cards=data.map(d=>`<button type="button" class="vadentis-engineering-data-card" data-name="${d.name}"><img src="${d.img||'icons/svg/orb.svg'}"><strong>${d.name}</strong></button>`).join("");
    return new Promise(resolve=>{let chosen=null;const dlg=new Dialog({title,content:`<div class="vadentis-engineering-picker"><p><b>PE disponibles : ${pe}</b></p><div class="vadentis-engineering-data-grid">${cards}</div></div>`,buttons:{cancel:{label:"Annuler",callback:()=>resolve(null)}},close:()=>resolve(chosen)},{width:520});dlg.render(true);Hooks.once("renderDialog",(app,html)=>{if(app!==dlg)return;html.find('.vadentis-engineering-data-card').on('click',ev=>{chosen=data.find(d=>d.name===ev.currentTarget.dataset.name)||null;dlg.close();});});});
  }
  async _ingenierieChat({title, outcome="INGÉNIERIE ÉLÉMENTAIRE", result=null, resultLabel="RÉSULTAT", img=null, state="engineering", msg="", target=null, critique=false}={}){
    const rollMode=game.settings.get("core","rollMode");
    const actorImg=this.getActiveTokens?.()[0]?.document?.texture?.src || this.img;
    const data={alias:this.name,actorImg,img:img||"systems/foundryvtt-vadentis/images/ingenierie/assemblages.png",rollMode,title,state,outcome,result,resultLabel,target,msg,critique};
    if(["gmroll","blindroll"].includes(rollMode)) data.whisper=ChatMessage.getWhisperRecipients("GM").map(u=>u.id);
    if(rollMode==="blindroll") data.blind=true; else if(rollMode==="selfroll") data.whisper=[game.user.id];
    const content=await renderTemplate("systems/foundryvtt-vadentis/templates/chat-generic-result.html",data);
    return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this}),whisper:data.whisper,blind:data.blind,content});
  }
  _ingenierieChatBody({headline="",text="",chips=[]}={}){
    const chipHtml=(chips||[]).filter(Boolean).map(c=>`<span class="vadentis-engineering-chat-chip">${c}</span>`).join("");
    return `<div class="vadentis-engineering-result-body">${headline?`<strong>${headline}</strong>`:""}${text?`<p>${text}</p>`:""}${chipHtml?`<div class="vadentis-engineering-chat-chips">${chipHtml}</div>`:""}</div>`;
  }
  async fillElementalOrb(){
    const data=await this._ingenierieChooseData(this._ingenierieOwnData(),"Remplir un Orbe élémentaire"); if(!data)return;
    const roll=await(new Roll(`1d20 + ${this._ingenierieCompetence()}`)).evaluate();
    const natural=Number(roll.dice?.[0]?.results?.[0]?.result||0), tier=this._ingenieriePersonalTier(Number(roll.total||0),natural), peNow=Number(this.system?.stats?.pointsenergie?.value||0);
    if(peNow<tier.pe){await this.update({"system.stats.pointsenergie.value":0}); await this._ingenierieChat({title:`Orbe élémentaire de ${data.name}`,outcome:"ÉNERGIE INSUFFISANTE",result:`${peNow}/${tier.pe}`,resultLabel:"PE DISPONIBLES / REQUIS",img:this._ingenierieOrbIcon(data.name),state:"engineering-failure",msg:this._ingenierieChatBody({headline:"Remplissage interrompu",text:"Les PE disponibles sont consommés, mais aucun Orbe n’est rempli.",chips:[`<i class="fas fa-dice-d20"></i> Jet ${roll.total}`,`<i class="far fa-clock"></i> ${tier.time}`]})});return;}
    const orb=this._ingenierieEmptyOrb(); if(!orb||Number(orb.system?.quantite||0)<1)return ui.notifications.warn("Aucun Orbe élémentaire vide disponible dans l’inventaire.");
    await this.update({"system.stats.pointsenergie.value":peNow-tier.pe}); await this._ingenierieConsumeQty(orb,1); await this._ingenierieCreateOrb(data.name); this._vadentisPlayCraftSound("orbe");
    await this._ingenierieChat({title:`Orbe élémentaire de ${data.name}`,outcome:natural===20?"RÉUSSITE CRITIQUE · ORBE REMPLI":"ORBE REMPLI",result:Number(roll.total||0),resultLabel:"JET D’INGÉNIERIE",img:this._ingenierieOrbIcon(data.name),state:natural===20?"engineering-critical":"engineering-success",msg:this._ingenierieChatBody({headline:"Remplissage réussi",text:"1 Orbe élémentaire vide est transformé.",chips:[`<i class="fas fa-bolt"></i> ${tier.pe} PE`, `<i class="far fa-clock"></i> ${tier.time}`]})}); this.sheet?.render(false);
  }
  async _ingenierieChoosePartner(){
    const entries=[];const seen=new Set();for(const t of canvas.tokens?.placeables||[]){const a=t.actor;if(!a||!t.document?.actorLink||a.id===this.id||seen.has(a.id))continue;const data=a.items.filter(i=>i.type==="donnee");if(!data.length)continue;const owners=game.users.filter(u=>u.active&&!u.isGM&&a.testUserPermission(u,"OWNER"));if(!game.user.isGM&&!owners.length)continue;seen.add(a.id);entries.push({actor:a,token:t,owners});}
    if(!entries.length){ui.notifications.warn("Aucun élémentiste disponible sur la scène.");return null;}const cards=entries.map(e=>`<button class="vadentis-alchemy-actor-card" data-actor-id="${e.actor.id}"><img src="${e.token.document.texture?.src||e.actor.img}"><span>${e.actor.name}</span></button>`).join("");
    return new Promise(resolve=>{let chosen=null;const dlg=new Dialog({title:"Ingénierie · Choisir l’élémentiste",content:`<div class="vadentis-alchemy-actor-picker"><p>Qui participe au remplissage de l’Orbe ?</p><div class="vadentis-alchemy-actor-grid">${cards}</div></div>`,buttons:{cancel:{label:"Annuler",callback:()=>resolve(null)}},close:()=>resolve(chosen)},{width:520});dlg.render(true);Hooks.once("renderDialog",(app,html)=>{if(app!==dlg)return;html.find('.vadentis-alchemy-actor-card').on('click',ev=>{chosen=game.actors.get(ev.currentTarget.dataset.actorId)||null;dlg.close();});});});
  }
  async _ingenierieRemote(actor,action,payload={}){
    const owners=game.users.filter(u=>u.active&&!u.isGM&&actor.testUserPermission(u,"OWNER")); const owner=owners[0];
    if(!owner || owner.id===game.user.id || (game.user.isGM&&!owners.length)) return {local:true,ownerId:owner?.id};
    const requestId=foundry.utils.randomID(), channel="system.foundryvtt-vadentis";
    return new Promise(resolve=>{const timeout=setTimeout(()=>{game.socket.off(channel,listener);resolve(null)},120000);const listener=msg=>{if(msg?.name!==`msg_engineering_${action}_response`||msg?.data?.requestId!==requestId||msg?.data?.requesterId!==game.user.id)return;clearTimeout(timeout);game.socket.off(channel,listener);resolve(msg.data?.ok===false?null:msg.data)};game.socket.on(channel,listener);game.socket.emit(channel,{name:`msg_engineering_${action}_request`,data:{requestId,requesterId:game.user.id,targetUserId:owner.id,actorId:actor.id,engineerName:this.name,...payload}});});
  }
  async fillElementalOrbWithElementalist(){
    const partner=await this._ingenierieChoosePartner();if(!partner)return;const remote=await this._ingenierieRemote(partner,"choose_data");let data;
    if(remote?.local){const available=["Feu","Eau","Vent","Terre","Foudre","Lumière"].map(name=>{const n=this._ingenierieNorm(name),i=partner.items.find(x=>x.type==="donnee"&&this._ingenierieNorm(x.name).includes(n));return i?{name,img:i.img}:null}).filter(Boolean);data=await this._ingenierieChooseData(available,`${partner.name} · Choisir la Donnée`);} else data=remote?.data;
    if(!data)return;
    const engRoll=await(new Roll(`1d20 + ${this._ingenierieCompetence()}`)).evaluate();
    let masteryTotal=0,critical=false;
    if(remote?.local){const md=partner.system?.magie?.matriseelementaire||{},m=partner._getCombatValue?partner._getCombatValue(md):Number(md.total??md.base??0);const r=await(new Roll(`1d20 + ${m}`)).evaluate();masteryTotal=Number(r.total||0);critical=Number(r.dice?.[0]?.results?.[0]?.result||0)===20||Number(engRoll.dice?.[0]?.results?.[0]?.result||0)===20;} else {const mr=await this._ingenierieRemote(partner,"mastery",{dataName:data.name});if(!mr)return;masteryTotal=Number(mr.total||0);critical=!!mr.critical||Number(engRoll.dice?.[0]?.results?.[0]?.result||0)===20;}
    const total=Number(engRoll.total||0)+masteryTotal,tier=this._ingenierieJointTier(total,critical);let paid=false;
    if(remote?.local){const pe=Number(partner.system?.stats?.pointsenergie?.value||0);if(pe<tier.pe){await partner.update({"system.stats.pointsenergie.value":0});await this._ingenierieChat({title:`Orbe élémentaire de ${data.name}`,outcome:"REMPLISSAGE CONJOINT · ÉCHEC",result:`${pe}/${tier.pe}`,resultLabel:`PE DE ${partner.name.toUpperCase()}`,img:this._ingenierieOrbIcon(data.name),state:"engineering-failure",msg:this._ingenierieChatBody({headline:"Énergie insuffisante",text:"Les PE disponibles de l’élémentiste sont consommés. Aucun Orbe n’est rempli.",chips:[`<i class="fas fa-gears"></i> Ingénierie ${engRoll.total}`,`<i class="fas fa-wand-magic-sparkles"></i> Maîtrise ${masteryTotal}`]})});return;}await partner.update({"system.stats.pointsenergie.value":pe-tier.pe});paid=true;} else {paid=!!(await this._ingenierieRemote(partner,"pay_pe",{peCost:tier.pe}));if(!paid)return;}
    const orb=this._ingenierieEmptyOrb();if(!orb||Number(orb.system?.quantite||0)<1)return ui.notifications.warn("Aucun Orbe élémentaire vide disponible chez l’ingénieur.");await this._ingenierieConsumeQty(orb,1);await this._ingenierieCreateOrb(data.name);this._vadentisPlayCraftSound("orbe");
    await this._ingenierieChat({title:`Orbe élémentaire de ${data.name}`,outcome:critical?"RÉUSSITE CRITIQUE · REMPLISSAGE CONJOINT":"REMPLISSAGE CONJOINT RÉUSSI",result:total,resultLabel:"TOTAL COMBINÉ",img:this._ingenierieOrbIcon(data.name),state:critical?"engineering-critical":"engineering-success",msg:this._ingenierieChatBody({headline:`${this.name} + ${partner.name}`,text:"1 Orbe élémentaire vide est transformé.",chips:[`<i class="fas fa-gears"></i> Ingénierie ${engRoll.total}`,`<i class="fas fa-wand-magic-sparkles"></i> Maîtrise ${masteryTotal}`,`<i class="fas fa-bolt"></i> ${tier.pe} PE`,`<i class="far fa-clock"></i> ${tier.time}`]})});this.sheet?.render(false);
  }
  async craftEngineeringAssembly(id){
    const a=this.getIngenierieAssemblages().find(x=>x.id===id); if(!a)return;
    const mat=this.getIngenierieMaterialItem(), have=Number(mat?.system?.nombre||0);
    if(!mat || have<a.cost) return ui.notifications.warn(`Fabrication refusée : Matériel d’Ingénierie insuffisant (${have}/${a.cost}).`);
    if(a.orbes.some(x=>x.startsWith("special:"))) return ui.notifications.warn("Cet Assemblage demande un choix d’Orbes spécial : l’automatisation sera ajoutée à une étape suivante.");

    // Pré-contrôle strict : aucune fabrication ni dépense tant que TOUS les Orbes requis ne sont pas présents.
    const stock=this._ingenierieFilledOrbs();
    const qtyFor=name=>stock.filter(i=>this._ingenierieNorm(this._ingenierieOrbData(i))===this._ingenierieNorm(name)).reduce((n,i)=>n+Number(i.system?.quantite||0),0);
    const specific={}; let freeNeeded=0;
    for(const req of a.orbes){ if(req==="libre") freeNeeded++; else specific[req]=(specific[req]||0)+1; }
    for(const [name,needed] of Object.entries(specific)){ const haveOrb=qtyFor(name); if(haveOrb<needed)return ui.notifications.warn(`Fabrication refusée : ${needed} Orbe(s) de ${name} requis, ${haveOrb} disponible(s).`); }
    const reserved=Object.entries(specific).reduce((n,[name,needed])=>n+needed,0);
    const totalStock=stock.reduce((n,i)=>n+Number(i.system?.quantite||0),0);
    if(totalStock-reserved<freeNeeded)return ui.notifications.warn(`Fabrication refusée : ${freeNeeded} Orbe(s) élémentaire(s) supplémentaire(s) requis.`);

    const selected=[];
    const takeSpecific=name=>{for(const item of stock.filter(i=>this._ingenierieNorm(this._ingenierieOrbData(i))===this._ingenierieNorm(name))){const already=selected.filter(x=>x.id===item.id).length;if(Number(item.system?.quantite||0)>already)return item;}return null;};
    for(const req of a.orbes.filter(x=>x!=="libre")){const item=takeSpecific(req);if(!item)return ui.notifications.warn(`Fabrication refusée : Orbe de ${req} indisponible.`);selected.push(item);}
    for(let n=0;n<freeNeeded;n++){
      const available=stock.filter(i=>Number(i.system?.quantite||0)>selected.filter(x=>x.id===i.id).length);
      const opts=available.map(i=>({name:this._ingenierieOrbData(i),img:this._ingenierieOrbIcon(this._ingenierieOrbData(i)),item:i}));
      const d=await this._ingenierieChooseData(opts,`${a.name} · Choisir l’Orbe ${freeNeeded>1?`${n+1}/${freeNeeded}`:""}`); if(!d)return;
      selected.push(d.item);
    }
    const counts={};for(const i of selected)counts[i.id]=(counts[i.id]||0)+1;
    // Revalidation juste avant dépense (évite toute fabrication si l’inventaire a changé pendant le choix).
    if(Number(mat.system?.nombre||0)<a.cost)return ui.notifications.warn("Fabrication refusée : le Matériel d’Ingénierie n’est plus suffisant.");
    for(const [iid,n] of Object.entries(counts)){const item=this.items.get(iid);if(!item||Number(item.system?.quantite||0)<n)return ui.notifications.warn(`Fabrication refusée : quantité d’Orbes insuffisante (${item?.name||"Orbe manquant"}).`);}
    await mat.update({"system.nombre":Number(mat.system?.nombre||0)-a.cost});
    for(const [iid,n] of Object.entries(counts))await this._ingenierieConsumeQty(this.items.get(iid),n);
    const orbNames=selected.map(i=>this._ingenierieOrbData(i)||i.name).join(", ");
    const usesMatch=String(a.uses||"").match(/^(\d+)/); const maxUses=usesMatch?Number(usesMatch[1]):1;
    await this.createEmbeddedDocuments("Item",[{name:a.name,type:"equipement",img:a.icon||"systems/foundryvtt-vadentis/images/ingenierie/assemblages.png",system:{quantite:1,equipee:false,description:a.description,effect:`Orbes : ${orbNames} · Utilisations : ${a.uses} · Difficulté : ${a.difficulty}`,enc:0,cost:0},flags:{"foundryvtt-vadentis":{inventorySection:"assemblages",ingenierie:{assemblyId:a.id,orbes:orbNames,orbeTypes:selected.map(i=>this._ingenierieOrbData(i)||i.name),time:a.time,difficulty:a.difficulty,cost:a.cost,usesLabel:a.uses,usesRemaining:maxUses,usesMax:maxUses,transferable:!!a.transferable,automation:a.automation,weaponLike:!!a.weaponLike,ammoLike:!!a.ammoLike}}}}]);
    this._vadentisPlayCraftSound("assemblage");
    await this._ingenierieChat({title:a.name,outcome:"ASSEMBLAGE FABRIQUÉ",img:a.icon||"systems/foundryvtt-vadentis/images/ingenierie/assemblages.png",state:"engineering-success",msg:this._ingenierieChatBody({headline:"Fabrication terminée",text:a.description,chips:[`<i class="fas fa-circle-dot"></i> ${orbNames}`,`<i class="fas fa-screwdriver-wrench"></i> ${a.cost} Matériel`,`<i class="far fa-clock"></i> ${a.time}`,`<i class="fas fa-box"></i> ${a.uses}`]})}); this.sheet?.render(false);
  }


  _ingenierieAssemblyFlag(item){ return foundry.utils.getProperty(item,"flags.foundryvtt-vadentis.ingenierie") || {}; }
  _ingenierieAssemblyDefinition(item){
    const id=this._ingenierieAssemblyFlag(item).assemblyId;
    return this.getIngenierieAssemblages().find(a=>a.id===id) || null;
  }
  _ingenierieAssemblyOrbTypes(item){
    const f=this._ingenierieAssemblyFlag(item);
    if(Array.isArray(f.orbeTypes) && f.orbeTypes.length) return f.orbeTypes.filter(Boolean);
    return String(f.orbes||"").split(",").map(x=>x.trim()).filter(Boolean);
  }
  async _ingenierieRollActivation(a,item){
    const diff=String(a?.difficulty||"—").trim();
    const numeric=/^\d+$/.test(diff) ? Number(diff) : null;
    if(numeric===null){
      if(diff!=="—" && diff!=="-") await this._ingenierieChat({title:item.name,outcome:"ACTIVATION SPÉCIALE",img:item.img,state:"engineering",msg:this._ingenierieChatBody({headline:diff,text:a?.description||item.system?.description||""})});
      return {ok:true,rolled:false};
    }
    const bonus=this._ingenierieCompetence(); const roll=await(new Roll(`1d20 + ${bonus}`)).evaluate(); const success=Number(roll.total||0)>=numeric;
    await this._ingenierieChat({title:item.name,outcome:success?"ACTIVATION RÉUSSIE":"ACTIVATION ÉCHOUÉE",result:Number(roll.total||0),resultLabel:"JET D’ACTIVATION",target:numeric,img:item.img,state:success?"engineering-success":"engineering-failure",msg:this._ingenierieChatBody({headline:success?"Mécanisme activé":"Aucune charge consommée",chips:[`<i class="fas fa-dice-d20"></i> 1D20 + ${bonus}`,`<i class="fas fa-bullseye"></i> Difficulté ${numeric}`]})});
    return {ok:success,rolled:true,total:Number(roll.total||0),difficulty:numeric};
  }
  async _ingenierieApplySimpleElementalDamage(a,item){
    if(!["piege","grenade"].includes(a?.id)) return false;
    const targets=[...game.user.targets].filter(t=>t?.actor);
    if(!targets.length){ ui.notifications.warn(`${item.name} : désignez au moins une cible. L’utilisation reste possible manuellement.`); return false; }
    const orb=this._ingenierieAssemblyOrbTypes(item)[0] || "";
    const formulas={Feu:"2d8",Eau:"2d4",Foudre:"2d6",Terre:"2d4",Vent:"2d4"};
    const formula=formulas[orb]; if(!formula) return false;
    const roll=await (new Roll(formula)).evaluate();
    for(const t of targets) await t.actor.applyDamage(Number(roll.total||0),{img:t.document?.texture?.src||t.actor.img,silent:true,formula});
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this}),flavor:`${item.name} · ${orb} · ${targets.length} cible(s)`});
    const secondary=orb==="Foudre"?"Paralysie : appliquez l’état prévu par la règle.":orb==="Terre"?"Effet de terrain : créez le trou manuellement.":orb==="Vent"?"Projection : déplacez les cibles manuellement.":"";
    if(secondary) ui.notifications.info(secondary);
    return true;
  }

  async useEngineeringAssembly(itemId){
    const item=this.items.get(itemId); if(!item)return;
    const f=this._ingenierieAssemblyFlag(item), a=this._ingenierieAssemblyDefinition(item);
    if(!a)return ui.notifications.warn("Cet objet n’est pas reconnu comme un Assemblage d’Ingénierie.");
    const remaining=Number(f.usesRemaining??0), max=Number(f.usesMax??1);
    if(remaining<=0)return ui.notifications.warn(`${item.name} est épuisé : rechargez-le avant de l’utiliser.`);
    const activation=await this._ingenierieRollActivation(a,item);
    if(!activation.ok){ ui.notifications.warn(`Activation de ${item.name} échouée : aucune charge consommée.`); return; }
    await this._ingenierieApplySimpleElementalDamage(a,item);
    const disposable=["piege","grenade"].includes(a.id);
    const next=Math.max(0,remaining-1);
    this._vadentisPlayCraftSound("assemblage");
    await this._ingenierieChat({title:item.name,outcome:"ASSEMBLAGE UTILISÉ",result:next,resultLabel:"CHARGES RESTANTES",target:max,img:item.img,state:"engineering-success",msg:this._ingenierieChatBody({text:a.description,chips:[`<i class="fas fa-battery-half"></i> ${remaining} → ${next}${disposable?" · consommé":""}`]})});
    if(disposable){ await item.delete(); ui.notifications.info(`${item.name} a été consommé.`); }
    else await item.update({"flags.foundryvtt-vadentis.ingenierie.usesRemaining":next,"flags.foundryvtt-vadentis.ingenierie.usesMax":max});
    this.sheet?.render(false);
  }
  async rechargeEngineeringAssembly(itemId){
    const item=this.items.get(itemId); if(!item)return;
    const f=this._ingenierieAssemblyFlag(item), a=this._ingenierieAssemblyDefinition(item);
    if(!a)return ui.notifications.warn("Cet objet n’est pas reconnu comme un Assemblage d’Ingénierie.");
    if(["piege","grenade"].includes(a.id))return ui.notifications.warn(`${item.name} est un Assemblage à usage unique et ne peut pas être rechargé.`);
    const remaining=Number(f.usesRemaining??0), max=Number(f.usesMax??1);
    if(remaining>0)return ui.notifications.warn(`${item.name} possède encore ${remaining} charge(s).`);
    const needed=this._ingenierieAssemblyOrbTypes(item);
    if(!needed.length)return ui.notifications.warn("Impossible de déterminer les Orbes nécessaires à la recharge.");
    const stock=this._ingenierieFilledOrbs();
    const selected=[];
    for(const name of needed){
      const n=this._ingenierieNorm(name);
      const candidate=stock.find(i=>this._ingenierieNorm(this._ingenierieOrbData(i))===n && Number(i.system?.quantite||0)>selected.filter(x=>x.id===i.id).length);
      if(!candidate)return ui.notifications.warn(`Recharge refusée : il manque un Orbe de ${name}.`);
      selected.push(candidate);
    }
    const counts={}; for(const i of selected)counts[i.id]=(counts[i.id]||0)+1;
    for(const [iid,n] of Object.entries(counts)){const it=this.items.get(iid);if(!it||Number(it.system?.quantite||0)<n)return ui.notifications.warn(`Recharge refusée : quantité insuffisante (${it?.name||"Orbe manquant"}).`);}
    for(const [iid,n] of Object.entries(counts))await this._ingenierieConsumeQty(this.items.get(iid),n);
    await item.update({"flags.foundryvtt-vadentis.ingenierie.usesRemaining":max});
    await this._ingenierieChat({title:item.name,outcome:"RECHARGE TERMINÉE",result:max,resultLabel:"CHARGES RESTAURÉES",target:max,img:item.img,state:"engineering-recharge",msg:this._ingenierieChatBody({headline:"Prêt à l’emploi",chips:[`<i class="fas fa-circle-dot"></i> ${needed.join(", ")}`]})});
    ui.notifications.info(`${item.name} rechargé (${max}/${max}).`); this.sheet?.render(false);
  }

  /* -------------------------------------------- */
  getAlchimieVAItem() {
    const normalize = value => String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[’']/g, "'").trim();
    const monnaies = Array.from(this.items || []).filter(i => i.type === "monnaie");
    if (!monnaies.length) return null;

    // Les Conceptions alchimiques consomment désormais une ressource dédiée.
    // On garde une reconnaissance tolérante aux accents/apostrophes, mais on ne
    // retombe volontairement plus sur les VA : cela évite toute dépense accidentelle.
    return monnaies.find(i => {
      const n = normalize(i.name);
      return n === "materiel d'alchimie" || n === "materiel alchimie" || n.includes("materiel d'alchimie");
    }) || null;
  }

  /* -------------------------------------------- */
  getAlchimieConceptions() {
    // Catalogue officiel du manuel Vadentis (version 29.09.2026).
    // Cette première étape détermine le résultat de fabrication sans encore
    // créer/consommer l'Item obtenu : ce sera branché à l'inventaire ensuite.
    return [
      { id:"cuisine", name:"Cuisine alchimique", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/cuisine.png", time:"1h", cost:10, costSuffix:" / portion", tiers:[
        {min:1,max:10,name:"Cuisine simple",effect:"Rend 2 PV"},
        {min:11,max:15,name:"Cuisine de goût",effect:"Rend 4 PV"},
        {min:16,max:20,name:"Cuisine excellente",effect:"Rend 6 PV et 1 Point de Mental"},
        {min:21,max:25,name:"Cuisine de maître",effect:"Rend 8 PV et 2 Points de Mental"},
        {min:26,max:999,name:"Cuisine parfaite",effect:"Rend 8 PV, 4 Points de Mental et octroie +1 dans toutes les Compétences pendant 1h"}
      ]},
      { id:"soin", name:"Potion de soin", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/soin.png", time:"2h", cost:40, tiers:[
        {min:1,max:10,name:"Potion de soins mineurs",effect:"Rend 1D8 PV"},{min:11,max:15,name:"Potion de soins",effect:"Rend 2D8 PV"},{min:16,max:20,name:"Potion de soins supérieurs",effect:"Rend 4D8 PV"},{min:21,max:25,name:"Potion de soins de maître",effect:"Rend 5D8 PV"},{min:26,max:999,name:"Potion de soins parfaits",effect:"Rend 6D8 PV"}
      ]},
      { id:"energie", name:"Potion d’énergie", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/energie.png", time:"2h", cost:40, tiers:[
        {min:1,max:10,name:"Potion d’énergie mineure",effect:"Rend 1D8 PE"},{min:11,max:15,name:"Potion d’énergie",effect:"Rend 2D8 PE"},{min:16,max:20,name:"Potion d’énergie supérieure",effect:"Rend 4D8 PE"},{min:21,max:25,name:"Potion d’énergie de maître",effect:"Rend 5D8 PE"},{min:26,max:999,name:"Potion d’énergie parfaite",effect:"Rend 6D8 PE"}
      ]},
      { id:"adrenaline", name:"Potion d’Adrénaline", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/adrenaline.png", time:"2h", cost:50, tiers:[
        {min:1,max:10,name:"Potion d’adrénaline mineure",effect:"Rend 1 PA"},{min:11,max:15,name:"Potion d’adrénaline",effect:"Rend 1D4 PA"},{min:16,max:20,name:"Potion d’adrénaline supérieure",effect:"Rend 2D4 PA"},{min:21,max:25,name:"Potion d’adrénaline de maître",effect:"Rend 3D4 PA"},{min:26,max:999,name:"Potion d’adrénaline parfaite",effect:"Rend 4D4 PA"}
      ]},
      { id:"antidote", name:"Antidote", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/antidote.png", time:"1h", cost:50, note:"Il faut connaître le poison que l’on souhaite guérir.", tiers:[
        {min:1,max:5,name:"Échec",effect:"La Conception échoue."},{min:6,max:15,name:"Antidote",effect:"Guérit la personne empoisonnée"},{min:16,max:25,name:"Antidote supérieur",effect:"Guérit la personne empoisonnée et rend 2D8 PV"},{min:26,max:999,name:"Antidote parfait",effect:"Guérit la personne empoisonnée, rend 2D8 PV et permet d’isoler le poison"}
      ]},
      { id:"deflagration", name:"Déflagration en bouteille", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/deflagration.png", time:"1h", cost:50, note:"Il faut détruire le flacon pour l’activer.", tiers:[
        {min:1,max:10,name:"Déflagration mineure",effect:"Explosion de 3m : 2D6 dégâts"},{min:11,max:15,name:"Déflagration standard",effect:"Explosion de 3m : 2D8 dégâts"},{min:16,max:20,name:"Déflagration supérieure",effect:"Explosion de 6m : 2D10 dégâts"},{min:21,max:25,name:"Déflagration de maître",effect:"Explosion de 9m : 3D10 dégâts"},{min:26,max:999,name:"Déflagration parfaite",effect:"Explosion de 12m : 4D10 dégâts"}
      ]},
      { id:"acceleration", name:"Potion d’Accélération", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/acceleration.png", time:"4h", cost:50, tiers:[
        {min:1,max:10,name:"Potion d’accélération mineure",effect:"Déplacement ×1,5 pendant 1 minute / 6 tours"},{min:11,max:15,name:"Potion d’accélération",effect:"Déplacement ×2 pendant 1 minute / 6 tours"},{min:16,max:20,name:"Potion d’accélération supérieure",effect:"Déplacement ×2 pendant 1 heure"},{min:21,max:25,name:"Potion d’accélération de maître",effect:"Déplacement ×2 pendant 4 heures"},{min:26,max:999,name:"Potion d’accélération parfaite",effect:"Déplacement ×2 pendant 12 heures, +2 Défense et +2 Attaque"}
      ]},
      { id:"force", name:"Potion de Force", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/force.png", time:"2h", cost:70, tiers:[
        {min:1,max:12,name:"Potion de force mineure",effect:"+1 Force pendant 1h"},{min:13,max:19,name:"Potion de force",effect:"+2 Force pendant 1h"},{min:20,max:25,name:"Potion de force supérieure",effect:"+3 Force pendant 1h"},{min:26,max:999,name:"Potion de force parfaite",effect:"+4 Force pendant 1h"}
      ]},
      { id:"somnifere", name:"Somnifère", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/somnifere.png", time:"4h", cost:150, note:"Peut être bu, respiré sous forme gazeuse ou enduit sur un objet.", tiers:[
        {min:1,max:12,name:"Somnifère mineur",effect:"Sommeil 15 minutes ; réveil au moindre dégât subi"},{min:13,max:19,name:"Somnifère",effect:"Sommeil 30 minutes ; réveil au moindre dégât subi"},{min:20,max:25,name:"Somnifère supérieur",effect:"Sommeil 1 heure ; réveil au moindre dégât subi"},{min:26,max:999,name:"Somnifère parfait",effect:"Sommeil 4 heures ; réveil au moindre dégât subi"}
      ]},
      { id:"poison", name:"Poison", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/poison.png", time:"4h", cost:150, note:"Peut être bu, respiré sous forme gazeuse ou enduit sur un objet.", tiers:[
        {min:1,max:12,name:"Poison mineur",effect:"1D4 dégâts toutes les 6 secondes pendant 1 minute"},{min:13,max:19,name:"Poison",effect:"2D4 dégâts toutes les 6 secondes pendant 1 minute"},{min:20,max:25,name:"Poison supérieur",effect:"2D6 dégâts toutes les 6 secondes pendant 1 minute"},{min:26,max:999,name:"Poison parfait",effect:"3D6 dégâts toutes les 6 secondes pendant 1 minute"}
      ]},
      { id:"verite", name:"Potion de vérité", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/verite.png", time:"4h", cost:150, note:"Peut être bue ou respirée sous forme gazeuse.", tiers:[
        {min:1,max:12,name:"Potion de vérité basique",effect:"La cible répond à une seule question et s’en aperçoit après avoir répondu"},{min:13,max:19,name:"Potion de vérité",effect:"La cible répond à une seule question sans s’en apercevoir"},{min:20,max:25,name:"Potion de vérité supérieure",effect:"La cible ne déclare que des vérités pendant 10 minutes"},{min:26,max:999,name:"Potion de vérité parfaite",effect:"La cible ne déclare que des vérités pendant 1h"}
      ]},
      { id:"evanescent", name:"Potion d’état évanescent", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/evanescent.png", time:"4h", cost:150, note:"La cible ne fera jamais quelque chose qu’elle n’a pas envie de faire, mais peut être davantage encline à accorder certaines faveurs.", tiers:[
        {min:1,max:12,name:"Potion d’état évanescent basique",effect:"+5 en Social avec la cible pendant 1 minute"},{min:13,max:19,name:"Potion d’état évanescent",effect:"+5 en Social avec la cible pendant 30 minutes"},{min:20,max:25,name:"Potion d’état évanescent supérieure",effect:"+10 en Social avec la cible pendant 30 minutes"},{min:26,max:999,name:"Potion d’état évanescent parfaite",effect:"+15 en Social avec la cible pendant 1 heure"}
      ]},
      { id:"paralysie", name:"Potion de Paralysie", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/paralysie.png", time:"4h", cost:200, tiers:[
        {min:1,max:12,name:"Paralysie mineure",effect:"La cible ne peut plus se déplacer pendant 12 secondes ; autres actions complexes possibles"},{min:13,max:19,name:"Paralysie",effect:"Pas de déplacement pendant 12 secondes ; attaques et sorts possibles ; Défense divisée par deux (arrondie à l’inférieur)"},{min:20,max:25,name:"Paralysie supérieure",effect:"Pas de déplacement ni d’actions complexes pendant 12 secondes ; Défense divisée par deux"},{min:26,max:999,name:"Paralysie parfaite",effect:"Pas de déplacement ni d’actions complexes pendant 18 secondes ; Défense divisée par deux"}
      ]},
      { id:"sort-bouteille", name:"Un sort en bouteille", icon:"systems/foundryvtt-vadentis/images/icons/alchimie/sort-bouteille.png", time:"Selon le résultat", cost:null, special:true, note:"Travail conjoint avec un élémentiste. L’élémentiste dépense les PE nécessaires au lancement du Sort. Sort élémentaire de Palier 1 : 200 Matériel d’Alchimie ; Palier 2 : 300 ; Palier 3 : 400.", tiers:[] }
    ];
  }

  /* -------------------------------------------- */
  async rollAlchimieConception(conceptionId) {
    const conception = this.getAlchimieConceptions().find(c => c.id === conceptionId);
    if (!conception) return ui.notifications.warn("Conception alchimique introuvable.");
    if (conception.special) return this._alchemyCraftSpellBottle(conception);

    const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const competence = this.items.find(i => i.type === "competence" && normalize(i.name) === "alchimie");
    if (!competence) return ui.notifications.warn(`${this.name} ne possède pas la Compétence Alchimie.`);

    const equipmentMods = this.getModificateursEquipement();
    const eq = equipmentMods.competences?.[competence.name] || { bonus:0, malus:0 };
    const statValue = this._vadentisNumber(competence.system.base) + this._vadentisNumber(competence.system.malus) + this._vadentisNumber(competence.system.bonus) + this._vadentisNumber(eq.bonus) + this._vadentisNumber(eq.malus);
    const rollMode = game.settings.get("core", "rollMode");
    const roll = await VadentisUtility.processRoll(`1d20+${statValue}`, rollMode);
    const natural = roll.dice?.[0]?.results?.[0]?.result;
    const paBonus = (natural === 1 || natural === 20) ? 0 : await this.requestPABonus(`la Conception alchimique ${conception.name}`, roll.total);
    const total = roll.total + paBonus;
    const tier = conception.tiers.find(t => total >= t.min && total <= t.max) || conception.tiers[conception.tiers.length - 1];

    const actorImg = this.getActiveTokens?.()[0]?.document?.texture?.src || this.img;
    const costText = `${conception.cost} Matériel d’Alchimie${conception.costSuffix || ""}`;
    const rangeText = tier.max >= 999 ? `${tier.min}+` : `${tier.min}–${tier.max}`;
    const msgData = {
      alias:this.name, actorImg,
      img:conception.icon || "systems/foundryvtt-vadentis/images/icons/talents/alchimie.png",
      rollMode, title:`Alchimie · ${conception.name}`, state:natural === 20 ? "critical-success" : (natural === 1 ? "critical-failure" : "roll"),
      outcome:natural === 20 ? "RÉUSSITE CRITIQUE" : (natural === 1 ? "ÉCHEC CRITIQUE" : "CONCEPTION"),
      result:total, resultLabel:"RÉSULTAT",
      msg:`<div class="vadentis-alchemy-chat-result"><strong>${tier.name}</strong><span>${tier.effect}</span><small>Palier ${rangeText} · <b>Temps de conception : ${conception.time}</b> · ${costText}</small>${paBonus ? `<em>${this.paBonusChat(paBonus, roll.total)}</em>` : ""}</div>`
    };
    if (natural === 20 || natural === 1) {
      msgData.critique = true;
      msgData.imgcritique = natural === 20 ? "systems/foundryvtt-vadentis/images/icons/tchat_réussite_critique.png" : "systems/foundryvtt-vadentis/images/icons/tchat_échec_critique.png";
      msgData.msgCritique = msgData.outcome;
    }
    if (["gmroll","blindroll"].includes(rollMode)) msgData.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (rollMode === "blindroll") msgData.blind = true;
    else if (rollMode === "selfroll") msgData.whisper = [game.user.id];
    // Étape Alchimie 2 : la fabrication consomme réellement les VA et crée
    // la Conception obtenue dans « Potions et conceptions alchimiques ».
    const vaItem = this.getAlchimieVAItem();
    const vaCost = Number(conception.cost || 0);
    if (vaCost > 0 && (!vaItem || Number(vaItem.system?.nombre || 0) < vaCost)) {
      return ui.notifications.warn(`${this.name} ne possède pas assez de Matériel d’Alchimie pour fabriquer ${conception.name} (${vaCost} nécessaires).`);
    }

    if (vaCost > 0) await this.updateEmbeddedDocuments("Item", [{ _id: vaItem.id, "system.nombre": Math.max(0, Number(vaItem.system?.nombre || 0) - vaCost) }]);

    let craftedItem = null;
    const isFailure = conception.id === "antidote" && tier.name === "Échec";
    if (!isFailure) {
      const existing = this.items.find(i => i.type === "equipement" && normalize(i.name) === normalize(tier.name)
        && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.alchimie.conceptionId") === conception.id
        && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.alchimie.tierName") === tier.name);
      if (existing) {
        const quantity = Math.max(0, Number(existing.system?.quantite || 0)) + 1;
        await this.updateEmbeddedDocuments("Item", [{ _id: existing.id, "system.quantite": quantity }]);
        craftedItem = existing;
      } else {
        const created = await this.createEmbeddedDocuments("Item", [{
          name: tier.name, type: "equipement",
          img: conception.icon || "systems/foundryvtt-vadentis/images/icons/talents/alchimie.png",
          system: { quantite:1, equipee:false, description:`Conception alchimique : ${conception.name}`, effect:tier.effect, enc:0, cost:0 },
          flags: { "foundryvtt-vadentis": { inventorySection:"potions", alchimie:{ conceptionId:conception.id, tierName:tier.name, effect:tier.effect, crafted:true, quality:this._alchemyTierQuality(tier.name) } } }
        }]);
        craftedItem = created?.[0] || null;
      }
    }

    msgData.msg = `<div class="vadentis-alchemy-chat-result vadentis-alchemy-crafted-card quality-${this._alchemyTierQuality(tier.name)}"><img src="${conception.icon}" alt=""><div><strong>${tier.name}</strong><span>${tier.effect}</span><small>Palier ${rangeText} · <b>Temps de conception : ${conception.time}</b> · ${costText}</small>${isFailure ? `<em>Le Matériel d’Alchimie est consommé, mais aucun objet n’est obtenu.</em>` : `<em><i class="fas fa-flask"></i> Ajouté à Potions et conceptions alchimiques.</em>`}${paBonus ? `<em>${this.paBonusChat(paBonus, roll.total)}</em>` : ""}</div></div>`;
    await ChatMessage.create({ whisper:msgData.whisper, blind:msgData.blind, content:await renderTemplate("systems/foundryvtt-vadentis/templates/chat-generic-result.html", msgData) });
    if(craftedItem) this._vadentisPlayCraftSound("alchimie");
    return { conception, tier, total, natural, craftedItem };
  }

  /* -------------------------------------------- */
  _alchemyTierQuality(name) {
    const n=String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    if(n.includes("parfait")) return "perfect";
    if(n.includes("maitre")) return "master";
    if(n.includes("superieur")) return "superior";
    if(n.includes("mineur") || n.includes("basique") || n.includes("simple")) return "minor";
    return "standard";
  }

  /* -------------------------------------------- */
  _alchemyCompetenceTotal(name) {
    const normalize = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const c = this.items.find(i => i.type === "competence" && normalize(i.name) === normalize(name));
    if (!c) return 0;
    const eq = this.getModificateursEquipement().competences?.[c.name] || {bonus:0,malus:0};
    const st = this.getModificateursStatuts().competences?.[c.name] || 0;
    return Number(c.system?.base||0)+Number(c.system?.malus||0)+Number(c.system?.bonus||0)+Number(eq.bonus||0)+Number(eq.malus||0)+Number(st||0);
  }

  async _alchemyChooseSpellActor() {
    const entries=[]; const seen=new Set();
    for (const t of canvas.tokens?.placeables || []) {
      const actor=t.actor;
      if (!actor || !t.document?.actorLink || seen.has(actor.id)) continue;
      const sorts=actor.items.filter(i=>i.type==="sort");
      if (!sorts.length) continue;
      const activeOwners=game.users.filter(u=>u.active && !u.isGM && actor.testUserPermission(u,"OWNER"));
      // Le MJ peut piloter un personnage sans propriétaire connecté ; un joueur ne peut proposer que les acteurs ayant un propriétaire actif.
      if (!game.user.isGM && !activeOwners.length) continue;
      seen.add(actor.id); entries.push({actor,token:t,owners:activeOwners});
    }
    if(!entries.length){ ui.notifications.warn("Aucun élémentiste disponible possédant un Sort de Donnée sur la scène."); return null; }
    const cards=entries.map(({actor,token,owners})=>`<button type="button" class="vadentis-alchemy-actor-card" data-actor-id="${actor.id}"><img src="${token.document.texture?.src||actor.img}" alt=""><span>${actor.name}</span>${owners.length?`<small>${owners.map(u=>u.name).join(", ")}</small>`:`<small>Contrôle MJ</small>`}</button>`).join("");
    return new Promise(resolve=>{
      let chosen=null;
      const dlg=new Dialog({title:"Un sort en bouteille · Choisir l’élémentiste",content:`<div class="vadentis-alchemy-actor-picker"><p>Avec quel personnage souhaitez-vous cuisiner ?</p><div class="vadentis-alchemy-actor-grid">${cards}</div></div>`,buttons:{cancel:{label:"Annuler",callback:()=>resolve(null)}},close:()=>resolve(chosen)} ,{width:520});
      dlg.render(true);
      Hooks.once("renderDialog",(app,html)=>{ if(app!==dlg)return; html.find('.vadentis-alchemy-actor-card').on('click',ev=>{ chosen=game.actors.get(ev.currentTarget.dataset.actorId)||null; dlg.close(); }); });
    });
  }

  async _alchemyChooseSpell(actor) {
    const sorts=actor.items.filter(i=>i.type==="sort");
    if(!sorts.length) return null;
    const cards=sorts.map(sp=>`<button type="button" class="vadentis-alchemy-spell-card" data-spell-id="${sp.id}"><img src="${sp.img}" alt=""><span><strong>${sp.name}</strong><small>${sp.system?.donnee||"Donnée"} · Palier ${sp.system?.palier||"?"} · ${Number(sp.system?.pe||0)} PE</small></span></button>`).join("");
    return new Promise(resolve=>{ let chosen=null; const dlg=new Dialog({title:`${actor.name} · Sort à enfermer`,content:`<div class="vadentis-alchemy-spell-picker"><p>Choisissez le Sort de Donnée à enfermer dans la bouteille.</p>${cards}</div>`,buttons:{cancel:{label:"Annuler",callback:()=>resolve(null)}},close:()=>resolve(chosen)},{width:500}); dlg.render(true); Hooks.once("renderDialog",(app,html)=>{if(app!==dlg)return;html.find('.vadentis-alchemy-spell-card').on('click',ev=>{chosen=actor.items.get(ev.currentTarget.dataset.spellId)||null;dlg.close();});}); });
  }

  async _alchemyRequestOwnerSpell(actor) {
    const owners=game.users.filter(u=>u.active && !u.isGM && actor.testUserPermission(u,"OWNER"));
    if(game.user.isGM && !owners.length) {
      const spell=await this._alchemyChooseSpell(actor);
      return spell ? { local:true, spell } : null;
    }
    const owner=owners[0];
    if(!owner){ ui.notifications.warn(`${actor.name} n’a aucun propriétaire connecté.`); return null; }
    if(owner.id===game.user.id) {
      const spell=await this._alchemyChooseSpell(actor);
      return spell ? { local:true, spell } : null;
    }
    const requestId=foundry.utils.randomID();
    ui.notifications.info(`Demande envoyée à ${owner.name} : ${actor.name} doit choisir le Sort à enfermer.`);
    return new Promise(resolve=>{
      const channel="system.foundryvtt-vadentis";
      const timeout=setTimeout(()=>{ game.socket.off(channel,listener); ui.notifications.warn("La demande de Sort en bouteille a expiré."); resolve(null); },120000);
      const listener=msg=>{
        if(msg?.name!=="msg_alchemy_spell_response"||msg?.data?.requestId!==requestId||msg?.data?.requesterId!==game.user.id)return;
        clearTimeout(timeout); game.socket.off(channel,listener);
        resolve(msg.data?.spell ? {local:false, ownerId:owner.id, spell:msg.data.spell} : null);
      };
      game.socket.on(channel,listener);
      game.socket.emit(channel,{name:"msg_alchemy_spell_request",data:{requestId,requesterId:game.user.id,targetUserId:owner.id,actorId:actor.id,alchemistName:this.name}});
    });
  }

  async _alchemyRequestRemoteMastery(actor, ownerId, spellData) {
    const requestId=foundry.utils.randomID();
    return new Promise(resolve=>{
      const channel="system.foundryvtt-vadentis";
      const timeout=setTimeout(()=>{ game.socket.off(channel,listener); ui.notifications.warn("Le jet de Maîtrise Données a expiré."); resolve(null); },120000);
      const listener=msg=>{
        if(msg?.name!=="msg_alchemy_mastery_response"||msg?.data?.requestId!==requestId||msg?.data?.requesterId!==game.user.id)return;
        clearTimeout(timeout); game.socket.off(channel,listener); resolve(msg.data?.ok ? msg.data : null);
      };
      game.socket.on(channel,listener);
      game.socket.emit(channel,{name:"msg_alchemy_mastery_request",data:{requestId,requesterId:game.user.id,targetUserId:ownerId,actorId:actor.id,spellId:spellData.id,alchemistName:this.name}});
    });
  }

  async _alchemyCraftSpellBottle(conception) {
    const elementalist=await this._alchemyChooseSpellActor(); if(!elementalist) return;
    const choice=await this._alchemyRequestOwnerSpell(elementalist); if(!choice) return;
    const spellData=choice.local ? {
      id:choice.spell.id,name:choice.spell.name,img:choice.spell.img,system:foundry.utils.deepClone(choice.spell.system||{})
    } : choice.spell;
    const roman=String(spellData.system?.palier||"I").toUpperCase();
    const palier=roman==="III"?3:roman==="II"?2:1;
    const cost={1:200,2:300,3:400}[palier];
    const mat=this.getAlchimieVAItem(); const have=Number(mat?.system?.nombre||0);
    if(!mat || have<cost) return ui.notifications.warn(`${this.name} ne possède pas assez de Matériel d’Alchimie (${have}/${cost}).`);

    // Une fois le Sort accepté, le jet d'Alchimie est toujours le premier jet visible.
    const alchBonus=this._alchemyCompetenceTotal("Alchimie");
    const alchRoll=await (new Roll(`1d20 + ${alchBonus}`)).evaluate();
    await alchRoll.toMessage({speaker:ChatMessage.getSpeaker({actor:this}),flavor:`Alchimie · ${this.name} prépare ${spellData.name}`});

    let masteryTotal=0, peCost=Number(spellData.system?.pe||0), resolvedSpell=spellData;
    if(choice.local) {
      const peNow=Number(elementalist.system?.stats?.pointsenergie?.value||0);
      if(peNow<peCost) return ui.notifications.warn(`${elementalist.name} n’a pas assez de PE (${peNow}/${peCost}).`);
      const masteryData=elementalist.system?.magie?.matriseelementaire || {};
      const mastery=elementalist._getCombatValue ? elementalist._getCombatValue(masteryData) : Number(masteryData.total ?? masteryData.base ?? 0);
      const masteryRoll=await (new Roll(`1d20 + ${mastery}`)).evaluate();
      await masteryRoll.toMessage({speaker:ChatMessage.getSpeaker({actor:elementalist}),flavor:`Maîtrise Données · ${elementalist.name} enferme ${spellData.name}`});
      await elementalist.update({"system.stats.pointsenergie.value":peNow-peCost});
      masteryTotal=Number(masteryRoll.total||0);
    } else {
      const remote=await this._alchemyRequestRemoteMastery(elementalist,choice.ownerId,spellData);
      if(!remote) return; // aucun Matériel n'est dépensé si l'Élémentiste refuse/échoue à payer ses PE
      masteryTotal=Number(remote.total||0); peCost=Number(remote.peCost??peCost); resolvedSpell=remote.spell||spellData;
    }

    // Le Matériel d'Alchimie n'est débité qu'après les deux jets réussis.
    await mat.update({"system.nombre":have-cost});
    const total=Number(alchRoll.total||0)+masteryTotal;
    const notes=String(resolvedSpell.system?.notes||""); const effect=String(resolvedSpell.system?.effect||""); const crit=String(resolvedSpell.system?.criticaleffect||"");
    const description=`<h3>${resolvedSpell.name}</h3><p><strong>Donnée :</strong> ${resolvedSpell.system?.donnee||"—"} · <strong>Palier :</strong> ${resolvedSpell.system?.palier||"—"}</p>${notes}${effect?`<h4>Effets</h4>${effect}`:""}${crit?`<h4>Effets critiques</h4>${crit}`:""}`;
    const conceptionTime = total <= 15 ? "5h" : total <= 25 ? "4h" : total <= 30 ? "3h" : total <= 35 ? "2h" : "1h";
    const bottleIcon="systems/foundryvtt-vadentis/images/icons/alchimie/sort-bouteille.png";
    const created=await this.createEmbeddedDocuments("Item",[{name:`Sort en bouteille · ${resolvedSpell.name}`,type:"equipement",img:bottleIcon,system:{quantite:1,equipee:false,description:`Sort de ${elementalist.name} enfermé en bouteille.`,effect:`${resolvedSpell.name} · ${resolvedSpell.system?.donnee||"Donnée"} · Palier ${resolvedSpell.system?.palier||"?"}`,enc:0,cost:0},flags:{"foundryvtt-vadentis":{inventorySection:"potions",alchimie:{crafted:true,conceptionId:"sort-bouteille",tierName:`Sort en bouteille · ${resolvedSpell.name}`,effect:`${resolvedSpell.name}`,quality:"special",spellBottle:{spellName:resolvedSpell.name,spellImg:resolvedSpell.img,donnee:resolvedSpell.system?.donnee,palier:resolvedSpell.system?.palier,pe:peCost,description,alchimieRoll:alchRoll.total,masteryRoll:masteryTotal,total,conceptionTime,elementalistName:elementalist.name}}}}}]);
    this._vadentisPlayCraftSound("alchimie");
    await ChatMessage.create({content:`<div class="vadentis-alchemy-chat-result vadentis-alchemy-crafted-card"><img src="${bottleIcon}" alt=""><div><strong>Sort en bouteille · ${resolvedSpell.name}</strong><span>${elementalist.name} dépense ${peCost} PE · ${this.name} dépense ${cost} Matériel d’Alchimie.</span><small>Alchimie ${alchRoll.total} + Maîtrise Données ${masteryTotal} = <b>${total}</b></small><span><b>Temps de conception : ${conceptionTime}</b></span><em>La bouteille est ajoutée à l’inventaire.</em></div></div>`});
    this.sheet?.render(false); return created?.[0]||null;
  }

  async _alchemyChooseTarget({ hostileOnly = false } = {}) {
    const sourceToken = this.getActiveTokens?.()[0] || canvas.tokens?.controlled?.find(t => t.actor?.id === this.id) || null;
    let tokens = (canvas.tokens?.placeables || []).filter(t => t.actor && t.document?.actorLink);
    if (hostileOnly && sourceToken) tokens = tokens.filter(t => Number(t.document.disposition) * Number(sourceToken.document.disposition) < 0);
    if (!tokens.length) { ui.notifications.warn(hostileOnly ? "Aucune cible hostile active et liée à un Actor sur la scène." : "Aucun personnage actif et lié à un Actor sur la scène."); return null; }

    const cards=tokens.map((t,i)=>`<label class="vadentis-alchemy-target-card"><input type="radio" name="target" value="${t.id}" ${i===0?"checked":""}><span><img src="${t.document.texture?.src||t.actor.img}" alt=""><strong>${t.name}</strong></span></label>`).join("");
    return await new Promise(resolve => {
      new Dialog({
        title: hostileOnly ? "Choisir une cible hostile" : "Donner la potion à…",
        content: `<form class="vadentis-alchemy-target-picker"><div class="vadentis-alchemy-target-grid">${cards}</div></form>`,
        buttons: { ok:{ icon:'<i class="fas fa-check"></i>', label:"Utiliser", callback:html => resolve(canvas.tokens.get(html.find('[name="target"]:checked').val()) || null) }, cancel:{ label:"Annuler", callback:()=>resolve(null) } },
        default:"ok", close:()=>resolve(null)
      }).render(true);
    });
  }

  async _alchemyConsumeItem(item) {
    const qty = Number(item.system?.quantite || 0);
    if (qty <= 1) await this.deleteEmbeddedDocuments("Item", [item.id]);
    else await this.updateEmbeddedDocuments("Item", [{_id:item.id, "system.quantite":qty-1}]);
  }

  async _alchemyCreateStatus(targetActor, name, description, mods = {}, flags = {}) {
    const old = targetActor.items.find(i => i.type === "statut" && foundry.utils.getProperty(i,"flags.foundryvtt-vadentis.alchimie.sourceName") === name);
    if (old) await targetActor.deleteEmbeddedDocuments("Item", [old.id]);
    const system = { actif:true, description, initiative:0, force:0, attaque:0, defense:0, vitesse:0, matriseelementaire:0, devotion:0, modifiers:{m1:{target:"",kind:"bonus",value:0},m2:{target:"",kind:"bonus",value:0},m3:{target:"",kind:"bonus",value:0}}, ...mods };
    await targetActor.createEmbeddedDocuments("Item", [{ name, type:"statut", img:"systems/foundryvtt-vadentis/images/icons/talents/alchimie.png", system, flags:{"foundryvtt-vadentis":{alchimie:{sourceName:name,...flags}}} }]);
  }

  async _alchemyDeflagration(item, alch) {
    if (!canvas?.ready) return ui.notifications.warn("Déflagration : aucune scène active.");

    const effect = String(alch.effect || item.system?.effect || "");
    const m = effect.match(/(?:Explosion de|rayon de)\s*(\d+)\s*m.*?(\d+D\d+)/i);
    // Pour l'automatisation Alchimie, les mètres affichés correspondent au diamètre de la zone.
    const diameterM = Number(m?.[1] || 3);
    const formula = String(m?.[2] || "2d6").toLowerCase();
    const pxPerGrid = Number(canvas.dimensions?.size || canvas.scene?.grid?.size || 100);
    const metersPerGrid = Number(canvas.dimensions?.distance || canvas.scene?.grid?.distance || 1);
    const radiusPx = Math.max(8, (diameterM / 2) * (pxPerGrid / Math.max(0.0001, metersPerGrid)));

    const eventPoint = event => {
      try {
        if (typeof event.getLocalPosition === "function") {
          const p = event.getLocalPosition(canvas.stage); return {x:p.x,y:p.y};
        }
        if (event.data?.getLocalPosition) {
          const p = event.data.getLocalPosition(canvas.stage); return {x:p.x,y:p.y};
        }
        const g = event.global || event.data?.global;
        if (g && canvas.stage.worldTransform?.applyInverse) {
          const p = canvas.stage.worldTransform.applyInverse(g); return {x:p.x,y:p.y};
        }
      } catch (err) { console.warn("Vadentis | coordonnées Déflagration", err); }
      return null;
    };

    const graphics = new PIXI.Graphics();
    graphics.zIndex = 100003;
    const targetOverlay = new PIXI.Graphics();
    targetOverlay.zIndex = 100004;
    canvas.stage.sortableChildren = true;
    canvas.stage.addChild(graphics);
    canvas.stage.addChild(targetOverlay);

    let center = null;
    let placed = false;
    let dragging = false;
    let dragOffset = {x:0,y:0};
    let finished = false;

    const validTargets = () => {
      if (!center) return [];
      return (canvas.tokens?.placeables || []).filter(t => {
        if (!t.actor || !t.document?.actorLink) return false;
        const c = t.center || {x:t.x+(t.w||0)/2,y:t.y+(t.h||0)/2};
        // Distance du centre du token à la zone, avec prise en compte de sa surface.
        const tokenRadius = Math.min(t.w || 0, t.h || 0) / 2;
        return Math.hypot(c.x-center.x,c.y-center.y) <= radiusPx + tokenRadius;
      });
    };

    const draw = () => {
      graphics.clear(); targetOverlay.clear();
      if (!center) return;
      graphics.lineStyle(5, 0xffb066, 0.98);
      graphics.beginFill(0xd14a28, 0.30);
      graphics.drawCircle(center.x, center.y, radiusPx);
      graphics.endFill();
      graphics.lineStyle(2, 0xffe0bd, 0.90);
      graphics.drawCircle(center.x, center.y, Math.max(4, radiusPx-5));
      graphics.beginFill(0xffd2a8, 0.95);
      graphics.drawCircle(center.x, center.y, 7);
      graphics.endFill();
      for (const token of validTargets()) {
        const b = token.bounds ?? new PIXI.Rectangle(token.x, token.y, token.w, token.h);
        targetOverlay.beginFill(0x050505, 0.46);
        targetOverlay.drawRoundedRect(b.x,b.y,b.width,b.height,Math.max(8,Math.min(b.width,b.height)*0.12));
        targetOverlay.endFill();
        targetOverlay.lineStyle(5,0xff7b45,0.98);
        targetOverlay.drawRoundedRect(b.x-3,b.y-3,b.width+6,b.height+6,Math.max(9,Math.min(b.width,b.height)*0.13));
      }
    };

    const hud = document.createElement("div");
    Object.assign(hud.style,{position:"fixed",top:"78px",right:"18px",zIndex:100000,width:"320px",padding:"10px 12px",borderRadius:"8px",background:"rgba(35,14,8,.95)",color:"#f7eee7",border:"1px solid #d87842",boxShadow:"0 4px 18px rgba(0,0,0,.45)",textAlign:"center"});
    hud.innerHTML = `<div style="font-size:16px;font-weight:700;margin-bottom:5px;">${item.name}</div><div style="font-size:13px;line-height:1.35;">Zone : <strong>${diameterM} m de diamètre</strong><br>Déplacez la zone avec la souris · clic : poser/repositionner · glisser : déplacer<br><strong>Entrée</strong> : faire exploser · <strong>Échap</strong> : annuler</div>`;
    document.body.appendChild(hud);

    ui.notifications.info("Déflagration : placez la zone sur la scène, puis Entrée pour valider.");

    return await new Promise(resolve => {
      const cleanup = result => {
        if (finished) return; finished = true;
        canvas.stage.off("pointermove", onMove); canvas.stage.off("pointerdown", onDown);
        canvas.stage.off("pointerup", onUp); canvas.stage.off("pointerupoutside", onUp);
        window.removeEventListener("keydown", onKey);
        try { graphics.destroy({children:true}); } catch(_) { try{canvas.stage.removeChild(graphics);}catch(_){} }
        try { targetOverlay.destroy({children:true}); } catch(_) { try{canvas.stage.removeChild(targetOverlay);}catch(_){} }
        hud.remove(); resolve(result);
      };
      const onMove = event => {
        const p=eventPoint(event); if(!p) return;
        if (!placed) center=p;
        else if (dragging) center={x:p.x-dragOffset.x,y:p.y-dragOffset.y};
        draw();
      };
      const onDown = event => {
        const button=event.button ?? event.data?.button ?? 0; if(button!==0) return;
        try { event.preventDefault?.(); event.stopPropagation?.(); event.stopImmediatePropagation?.(); } catch(_) {}
        const p=eventPoint(event); if(!p) return;
        if (!placed) { center=p; placed=true; draw(); return; }
        if (center && Math.hypot(p.x-center.x,p.y-center.y) <= radiusPx) {
          dragging=true; dragOffset={x:p.x-center.x,y:p.y-center.y};
        } else { center=p; draw(); }
      };
      const onUp = () => { dragging=false; };
      const finish = async () => {
        if(!center) return ui.notifications.warn("Déflagration : placez d’abord la zone.");
        const targets=validTargets();
        // Retirer l'interface avant les jets pour que le résultat soit immédiatement lisible.
        canvas.stage.off("pointermove", onMove); canvas.stage.off("pointerdown", onDown);
        canvas.stage.off("pointerup", onUp); canvas.stage.off("pointerupoutside", onUp);
        window.removeEventListener("keydown", onKey);
        try { graphics.destroy({children:true}); } catch(_) {}
        try { targetOverlay.destroy({children:true}); } catch(_) {}
        hud.remove(); finished=true;
        const roll=await (new Roll(formula)).evaluate();
        await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this}),flavor:`${item.name} · Déflagration (${diameterM} m)`});
        for(const t of targets) await t.actor.applyDamage(Number(roll.total||0),{img:t.document.texture?.src||t.actor.img,formula});
        await this._alchemyConsumeItem(item);
        resolve(true);
      };
      const onKey = event => {
        if(event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cleanup(false); }
        else if(event.key === "Enter") { event.preventDefault(); event.stopPropagation(); finish(); }
      };
      canvas.stage.on("pointermove", onMove); canvas.stage.on("pointerdown", onDown);
      canvas.stage.on("pointerup", onUp); canvas.stage.on("pointerupoutside", onUp);
      window.addEventListener("keydown", onKey);
    });
  }

  async useAlchimieItem(itemId) {
    const item=this.items.get(itemId); if(!item) return;
    let alch=foundry.utils.getProperty(item,"flags.foundryvtt-vadentis.alchimie");
    // Compatibilité avec les anciennes potions déjà présentes dans l'inventaire :
    // une formule explicite « Rend X PV/PE/PA » suffit à activer Utiliser.
    if(!alch?.crafted) {
      const legacyEffect=String(item.system?.effect||item.system?.description||"");
      if(!/Rend\s+(?:\d+D\d+|\d+)\s+(PV|PE|PA)/i.test(legacyEffect))
        return ui.notifications.warn("Cet objet ne possède pas encore d’effet automatisable reconnu.");
      alch={crafted:true,conceptionId:"legacy-restore",effect:legacyEffect};
    }
    if(Number(item.system?.quantite||0)<1) return ui.notifications.warn("Il n’en reste plus.");
    const id=String(alch.conceptionId||"");
    if(id === "sort-bouteille") {
      const b=alch.spellBottle||{};
      await ChatMessage.create({content:`<div class="vadentis-spell-bottle-chat"><div class="vadentis-spell-bottle-head"><img src="${b.spellImg||item.img}"><div><strong>${b.spellName||item.name}</strong><small>${b.donnee||"Donnée"} · Palier ${b.palier||"?"}</small></div></div><div class="vadentis-spell-bottle-body">${b.description||item.system?.description||""}</div></div>`});
      await this._alchemyConsumeItem(item); return;
    }
    if(id === "deflagration") return this._alchemyDeflagration(item,alch);
    const supported=["cuisine","soin","energie","adrenaline","acceleration","force","poison","evanescent"];
    const genericRestore=/Rend\s+(?:\d+D\d+|\d+)\s+(PV|PE|PA)/i.test(String(alch.effect||item.system?.effect||""));
    if(!supported.includes(id) && !genericRestore) return ui.notifications.info("Cette Conception n’est pas encore automatisée.");
    const token=await this._alchemyChooseTarget({hostileOnly:id==="poison"}); if(!token) return;
    const target=token.actor, effect=String(alch.effect||item.system?.effect||"");
    let roll=null, amount=0;
    const dice=effect.match(/(\d+D\d+)/i)?.[1]?.toLowerCase();
    if(dice){ roll=await (new Roll(dice)).evaluate(); amount=Number(roll.total||0); await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this}),flavor:`${item.name} → ${target.name}`}); }
    if(genericRestore && !supported.includes(id)) {
      if(!dice) amount=Number(effect.match(/Rend\s+(\d+)\s*(?:PV|PE|PA)/i)?.[1]||0);
      const resource=(effect.match(/Rend\s+(?:\d+D\d+|\d+)\s+(PV|PE|PA)/i)||[])[1]?.toUpperCase();
      if(resource==="PV") await target.applyHealing(amount,{img:token.document.texture?.src||target.img});
      if(resource==="PE"){const d=target.system.stats.pointsenergie,b=Number(d.value||0),mx=Number(d.max||b);await target.update({"system.stats.pointsenergie.value":Math.min(mx,b+amount)});}
      if(resource==="PA"){const d=target.system.stats.pointsadrenaline,b=Number(d.value||0),mx=Number(d.max||b);await target.update({"system.stats.pointsadrenaline.value":Math.min(mx,b+amount)});}
    }
    if(id==="cuisine" || id==="soin") { if(!dice) amount=Number(effect.match(/Rend\s+(\d+)\s*PV/i)?.[1]||0); await target.applyHealing(amount,{img:token.document.texture?.src||target.img}); }
    if(id==="energie") { const d=target.system.stats.pointsenergie, before=Number(d.value||0), max=Number(d.max||before); await target.update({"system.stats.pointsenergie.value":Math.min(max,before+amount)}); }
    if(id==="adrenaline") { if(!dice) amount=Number(effect.match(/Rend\s+(\d+)\s*PA/i)?.[1]||0); const d=target.system.stats.pointsadrenaline, before=Number(d.value||0), max=Number(d.max||before); await target.update({"system.stats.pointsadrenaline.value":Math.min(max,before+amount)}); }
    if(id==="force") { const bonus=Number(effect.match(/\+(\d+)\s*Force/i)?.[1]||0); await this._alchemyCreateStatus(target,item.name,effect,{force:bonus},{kind:"force"}); }
    if(id==="acceleration") { const mult=Number((effect.match(/×\s*([\d,.]+)/)||[])[1]?.replace(",",".")||1); const base=target.getVitesseScore?.() ?? target._getCombatValue?.(target.system.combat.vitesse) ?? 0; const speedBonus=Math.max(0,Math.round(base*(mult-1))); const perfect=/\+2 Défense/i.test(effect); await this._alchemyCreateStatus(target,item.name,effect,{vitesse:speedBonus,defense:perfect?2:0,attaque:perfect?2:0},{kind:"acceleration",multiplier:mult}); }
    if(id==="evanescent") { const bonus=Number(effect.match(/\+(\d+)\s+en Social/i)?.[1]||0); await this._alchemyCreateStatus(target,item.name,effect,{modifiers:{m1:{target:"competence:Social",kind:"bonus",value:bonus},m2:{target:"",kind:"bonus",value:0},m3:{target:"",kind:"bonus",value:0}}},{kind:"evanescent"}); }
    if(id==="poison") { const formula=(effect.match(/(\d+D\d+)/i)?.[1]||"1d4").toLowerCase(); await this._alchemyCreateStatus(target,item.name,effect,{}, {kind:"poison",damageFormula:formula,remainingTurns:10}); }
    await this._alchemyConsumeItem(item);
    await ChatMessage.create({content:`<div class="vadentis-alchemy-chat-result"><strong>${item.name}</strong><span>Utilisé sur <b>${target.name}</b>.</span><small>${effect}</small></div>`});
  }

  /* -------------------------------------------- */
  async updateCompetence(name, field, value) {
    let competence = this.items.find(
      item => item.type == 'competence' && item.name == name
    );

    if (competence) {
      let dataPath = 'system.' + field;
      await this.updateEmbeddedDocuments(
        "Item",
        [{ _id: competence.id, [dataPath]: value }]
      );
    }
  }

  /* -------------------------------------------- */
  async equiperObject(equipementId) {
    let item = this.items.get(equipementId);

    if (item) {
      let update = {
        _id: item.id,
        "system.equipee": !item.system.equipee
      };

      await this.updateEmbeddedDocuments("Item", [update]);
    }
  }

  /* -------------------------------------------- */
  buildListeActionsCombat() {
    let armes = [];
  }

/* -------------------------------------------- */
getModificateursEquipement() {
  const stats = {};
  for (const key of ["initiative", "force", "attaque", "defense", "vitesse", "matriseelementaire", "devotion"]) {
    stats[key] = { bonus: 0, malus: 0 };
  }
  const competences = {};
  const types = new Set(["armecc", "tir", "armurebouclier", "equipement"]);
  const equipes = this.items.filter(item => types.has(item.type) && item.system.equipee === true);

  for (const item of equipes) {
    const modifiers = item.system.modifiers || {};
    for (const mod of Object.values(modifiers)) {
      const target = String(mod?.target || "");
      if (!target) continue;
      const raw = Math.abs(this._vadentisNumber(mod?.value));
      if (!raw) continue;
      const value = mod?.kind === "malus" ? -raw : raw;
      const bucket = mod?.kind === "malus" ? "malus" : "bonus";

      if (target.startsWith("competence:")) {
        const id = target.slice("competence:".length);
        if (!competences[id]) competences[id] = { bonus: 0, malus: 0 };
        competences[id][bucket] += value;
      } else if (stats[target]) {
        stats[target][bucket] += value;
      }
    }
  }
  return { stats, competences };
}

/* -------------------------------------------- */
getModificateursStatuts() {
  const modificateurs = {
    initiative: 0, force: 0, attaque: 0, defense: 0, vitesse: 0,
    matriseelementaire: 0, devotion: 0, competences: {}
  };
  const statutsActifs = this.items.filter(item => item.type === "statut" && item.system.actif === true);
  for (const statut of statutsActifs) {
    // Compatibilité avec tous les anciens Statuts Vadentis.
    for (const key of ["initiative","force","attaque","defense","vitesse","matriseelementaire","devotion"]) {
      modificateurs[key] += Number(statut.system[key]) || 0;
    }
    // Nouveaux modificateurs libres, notamment les Compétences.
    for (const mod of Object.values(statut.system.modifiers || {})) {
      const target=String(mod?.target||""); if(!target) continue;
      const raw=Math.abs(Number(mod?.value)||0); if(!raw) continue;
      const value=mod?.kind === "malus" ? -raw : raw;
      if (target.startsWith("competence:")) {
        const name=target.slice("competence:".length);
        modificateurs.competences[name]=(modificateurs.competences[name]||0)+value;
      } else if (Object.hasOwn(modificateurs,target) && target !== "competences") modificateurs[target]+=value;
    }
  }
  return modificateurs;
}


/* -------------------------------------------- */
calculerSommeStats() {

  const modificateursStatuts = this.getModificateursStatuts();
  const modificateursEquipement = this.getModificateursEquipement();

  for (const key in this.system.combat) {

    const combatData = this.system.combat[key];

    const modificateurStatut =
      modificateursStatuts[key] || 0;

    combatData.statut = modificateurStatut;
    combatData.equipementBonus = Number(modificateursEquipement.stats?.[key]?.bonus || 0);
    combatData.equipementMalus = Number(modificateursEquipement.stats?.[key]?.malus || 0);
    combatData.equipement = combatData.equipementBonus + combatData.equipementMalus;

    combatData.total =
      Number(combatData.base || 0) +
      Number(combatData.malus || 0) +
      Number(combatData.bonus || 0) +
      modificateurStatut + combatData.equipement;
  }


  for (const key in this.system.magie) {

    const magieData = this.system.magie[key];

    const modificateurStatut =
      modificateursStatuts[key] || 0;

    magieData.statut = modificateurStatut;
    magieData.equipementBonus = Number(modificateursEquipement.stats?.[key]?.bonus || 0);
    magieData.equipementMalus = Number(modificateursEquipement.stats?.[key]?.malus || 0);
    magieData.equipement = magieData.equipementBonus + magieData.equipementMalus;

    magieData.total =
      Number(magieData.base || 0) +
      Number(magieData.malus || 0) +
      Number(magieData.bonus || 0) +
      modificateurStatut + magieData.equipement;
  }
}

  /* -------------------------------------------- */
  async processSortDevotion(name, devotionSort) {
    if (this.system.stats.pointsenergie.value == 0) {
      ChatMessage.create({
        content: `${this.name} n'a pas assez de Points d'Energie pour lancer ${name} ${devotionSort.name}`
      });
      return;
    }

    let scores = this.system.magie[
      (name == "devotion") ? 'devotion' : 'matriseelementaire'
    ];

let statValue = this._getCombatValue(scores);
    let formulaFull = this.buildTexteFormula(scores);
    let myRoll = await VadentisUtility.processRoll("1d20+" + statValue);
    const naturalResult = myRoll.dice[0].results[0].result;
    const isNaturalCritical = naturalResult === 1 || naturalResult >= Number(devotionSort.system.valuecritical || 20);
    const difficulty = Number(devotionSort.system.difficulty || 0);
    // Les PA servent uniquement à tenter de rattraper un échec :
    // si le sort est déjà réussi sans PA, aucune fenêtre ne s'ouvre.
    const alreadySuccessful = naturalResult > 1 && myRoll.total >= difficulty;
    const paBonus = (isNaturalCritical || alreadySuccessful) ? 0 : await this.requestPABonus(`${name == "devotion" ? "la dévotion" : "le sort"} ${devotionSort.name}`, myRoll.total);
    const finalTotal = myRoll.total + paBonus;

    const sourceItem = name == "devotion"
      ? this.getEglises().find(item => item.name === devotionSort.system.eglise)
      : this.getDonnees().find(item => item.name === devotionSort.system.donnee);

    // Le ciblage des sorts est facultatif : sans cible, le sort fonctionne comme avant.
    const spellTarget = VadentisUtility.getTarget();
    const spellTargetActor = spellTarget?.actor;
    const spellTargetImg = spellTarget?.document?.texture?.src || spellTargetActor?.img || "";
    const spellTargetName = spellTarget?.name || spellTargetActor?.name || "";
    const spellTargetId = spellTarget?.id || spellTarget?.document?.id || "";
    const spellSourceId = this.getActiveTokens?.()[0]?.id || "";

    let msgData = {
      alias: this.name,
      actorImg: this.getActiveTokens?.()[0]?.document?.texture?.src || this.img,
      title: `${name == "devotion" ? "Dévotion" : "Sort"} · ${devotionSort.name}`,
      isSort: true,
      sourceName: sourceItem?.name || devotionSort.system.donnee || devotionSort.system.eglise || "",
      img: sourceItem?.img || devotionSort.img,
      state: "spell",
      result: finalTotal,
      target: devotionSort.system.difficulty
    };

    if (
      myRoll.dice[0].results[0].result > 1 &&
      finalTotal >= devotionSort.system.difficulty
    ) {
      msgData.state = "success";
      msgData.outcome = "RÉUSSITE";

      msgData.msg =
        `${this.name} a réussi son ${name} et perd ${devotionSort.system.pe} Points d'Energie ` +
        `(lancer : ${formulaFull} => <strong>${myRoll.total} / ${devotionSort.system.difficulty}</strong>).` + this.paBonusChat(paBonus, myRoll.total);

      if (!devotionSort.system.notes) {
        devotionSort.system.notes = "";
      }

      msgData.msg +=
        `<br><strong>Description : </strong>${devotionSort.system.notes.replace(/<\/?[^>]+(>|$)/g, "")}`;

      let newEnergie =
        this.system.stats.pointsenergie.value - devotionSort.system.pe;

      await this.update({
        'system.stats.pointsenergie.value': newEnergie
      });

      if (
        myRoll.dice[0].results[0].result >= devotionSort.system.valuecritical
      ) {
        msgData.critique = true;
        msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_réussite_critique.png';
        msgData.msgCritique = "RÉUSSITE CRITIQUE";
        msgData.state = "critical-success";
        msgData.outcome = "RÉUSSITE CRITIQUE";

        msgData.msg +=
          "<br>C'est une <strong>réussite critique</strong> !";

        msgData.msg +=
          `<br><strong>Effet critique : </strong>${devotionSort.system.criticaleffect.replace(/<\/?[^>]+(>|$)/g, "")}`;
      } else {
        msgData.msg +=
          `<br><strong>Effet : </strong>${devotionSort.system.effect.replace(/<\/?[^>]+(>|$)/g, "")}`;
      }

      const effectType = devotionSort.system.effectType || "none";
      if (effectType !== "none" && devotionSort.system.damage) {
        const isCritical = myRoll.dice[0].results[0].result >= devotionSort.system.valuecritical;
        let formula = isCritical && devotionSort.system.damagecritical
          ? devotionSort.system.damagecritical
          : devotionSort.system.damage;
        formula = VadentisUtility.processDamageString(formula, this);
        const effectRoll = await VadentisUtility.processRoll(formula, undefined, game.user);
        msgData.effectAmount = effectRoll.total;
        msgData.effectFormula = formula;
        msgData.effectType = effectType;
        msgData.effectLabel = effectType === "heal" ? "SOINS REÇUS" : "DÉGÂTS INFLIGÉS";
        msgData.targetImg = spellTargetImg;
        msgData.targetName = spellTargetName;
        msgData.msg += `<br>${effectType === "heal" ? "Soins" : "Dégâts"} : <strong>${formula}</strong>.`;

        if (spellTargetActor) {
          const effectData = {
            targetActorId: spellTargetActor.id,
            targetTokenImg: spellTargetImg,
            amount: effectRoll.total,
            effectType,
            sourceTokenId: spellSourceId, targetTokenId: spellTargetId,
            animation: (name === "sort" && devotionSort.system.donnee) ? "projectile" : (devotionSort.system.animation || "auto"), sound: devotionSort.system.sound || "",
            donnee: devotionSort.system.donnee || devotionSort.system.eglise || "",
            sourceImg: sourceItem?.img || devotionSort.img || "",
            sourceName: sourceItem?.name || devotionSort.system.donnee || devotionSort.system.eglise || "",
            critical: isCritical
          };
          if (game.user.isGM) {
            await VadentisUtility.applySpellEffect(effectData);
          } else {
            game.socket.emit("system.foundryvtt-vadentis", { name: "msg_spell_effect", data: effectData });
          }
        }
      }

      // L'animation d'un sort réussi est indépendante de ses dégâts/soins.
      // Sans cible, elle se joue autour du lanceur lui-même.
      const spellIsCritical = naturalResult >= Number(devotionSort.system.valuecritical || 20);
      VadentisUtility.broadcastVFX({
        sourceTokenId: spellSourceId,
        targetTokenId: spellTargetId || spellSourceId,
        animation: devotionSort.system.animation || "auto",
        sound: devotionSort.system.sound || "",
        kind: (devotionSort.system.effectType || "none"),
        donnee: devotionSort.system.donnee || devotionSort.system.eglise || "",
        sourceImg: sourceItem?.img || devotionSort.img || "",
        sourceName: sourceItem?.name || devotionSort.system.donnee || devotionSort.system.eglise || "",
        palier: name === "sort" ? (devotionSort.system.palier || "I") : "I",
        critical: spellIsCritical
      });

      if (newEnergie < 0) {
        msgData.msg +=
          `<br><strong>Attention</strong> : Les Points d'Energie de ${this.name} sont négatifs ! Il convient d'éditer ses Points de Vie en conséquence.`;
      }

    } else {

      msgData.state = "failure";
      msgData.outcome = "ÉCHEC";

      if (myRoll.dice[0].results[0].result == 1) {
        msgData.critique = true;
        msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_échec_critique.png';
        msgData.msgCritique = "ÉCHEC CRITIQUE";
        msgData.state = "critical-failure";
        msgData.outcome = "ÉCHEC CRITIQUE";

        const criticalFailureCost = Number(devotionSort.system.pe || 0);
        const criticalFailureEnergy = this.system.stats.pointsenergie.value - criticalFailureCost;
        await this.update({ 'system.stats.pointsenergie.value': criticalFailureEnergy });

        msgData.msg =
          `${this.name} a fait un <strong>échec critique</strong> à son lancer de ${name} et perd ${criticalFailureCost} Points d'Energie.`;

        if (criticalFailureEnergy < 0) {
          msgData.msg += `<br><strong>Attention</strong> : Les Points d'Energie de ${this.name} sont négatifs ! Il convient d'éditer ses Points de Vie en conséquence.`;
        }
      } else {
        msgData.msg =
          `${this.name} a échoué son lancer de ${name} (${formulaFull} => <strong>${myRoll.total} / ${devotionSort.system.difficulty}</strong>)` + this.paBonusChat(paBonus, myRoll.total);
      }
    }


    ChatMessage.create({
      content: await renderTemplate(
        `systems/foundryvtt-vadentis/templates/chat-generic-result.html`,
        msgData
      )
    });
  }

  /* -------------------------------------------- */
  async _chooseSculptureMode(talent, donnee) {
    return new Promise(resolve => {
      let done = false;
      const finish = value => { if (!done) { done = true; resolve(value); } };
      new Dialog({
        title: `Sculpture élémentaire · ${donnee}`,
        content: `
          <div class="vadentis-sculpture-dialog">
            <div class="vadentis-sculpture-dialog-title"><strong>${donnee}</strong><span>${talent.system.sculptureSuperieure ? "Sculpture supérieure" : "Sculpture élémentaire"}</span></div>
            <div class="form-group"><label>Effet</label><select name="mode"><option value="hostile">Hostile</option><option value="favorable">Favorable</option></select></div>
            <div class="form-group"><label>Point de départ</label><select name="origin"><option value="self">Depuis le personnage</option><option value="external">Depuis une source élémentaire extérieure</option></select></div>
            <p class="notes">Avec une source extérieure, le premier clic sur la scène définit le point de départ du Trait. Le coût en PE est ensuite calculé uniquement depuis cette source.</p>
          </div>`,
        buttons: {
          trace: { icon: '<i class="fas fa-draw-polygon"></i>', label: "Tracer sur la scène", callback: html => finish({ mode: String(html.find('[name="mode"]').val() || "hostile"), origin: String(html.find('[name="origin"]').val() || "self") }) },
          cancel: { icon: '<i class="fas fa-times"></i>', label: "Annuler", callback: () => finish(null) }
        },
        default: "trace",
        close: () => finish(null)
      }, { classes: ["vadentis", "vadentis-sculpture-window"] }).render(true);
    });
  }

  /* -------------------------------------------- */
  async _traceSculpturePath(segmentLength, donnee, mode = "hostile", origin = "self") {
    if (!canvas?.ready) {
      ui.notifications.warn("Vadentis : ouvrez une scène avant de tracer une Sculpture.");
      return null;
    }

    // La Sculpture part du token du Chanteur/élémentiste. La gestion d'une source
    // élémentaire distante sera ajoutée avec l'automatisation environnementale.
    const controlled = canvas.tokens?.controlled?.find(t => t.actor?.id === this.id);
    const token = controlled || this.getActiveTokens?.()[0];
    if (!token) {
      ui.notifications.warn("Vadentis : placez le personnage sur la scène (ou contrôlez son token) avant de tracer la Sculpture.");
      return null;
    }

    const useExternalSource = origin === "external";
    const start = { x: token.center.x, y: token.center.y };

    // Confort de tracé : sélectionner le token et recentrer doucement la vue.
    try {
      if (!token.controlled) token.control({ releaseOthers: true });
      if (typeof canvas.animatePan === "function") {
        await canvas.animatePan({ x: start.x, y: start.y, duration: 450 });
      } else if (canvas.pan) {
        canvas.pan({ x: start.x, y: start.y });
      }
    } catch (e) {
      console.warn("Vadentis | recentrage Sculpture", e);
    }

    // Depuis une source extérieure, le premier clic devient l'origine du Trait.
    // Le personnage reste nécessaire pour déterminer le camp des cibles et pour recentrer la caméra.
    const points = useExternalSource ? [] : [start];
    let hover = null;
    const availablePE = Math.max(0, Number(this.system.stats.pointsenergie.value || 0));
    let finished = false;

    const graphics = new PIXI.Graphics();
    graphics.zIndex = 100000;
    canvas.stage.sortableChildren = true;
    canvas.stage.addChild(graphics);

    const pxPerGrid = Number(canvas.dimensions?.size || canvas.scene?.grid?.size || 100);
    const metersPerGrid = Number(canvas.dimensions?.distance || canvas.scene?.grid?.distance || 1);
    const metersPerPixel = metersPerGrid / Math.max(1, pxPerGrid);

    const distanceOf = pts => {
      let pixels = 0;
      for (let i = 1; i < pts.length; i++) {
        pixels += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }
      return pixels * metersPerPixel;
    };

    const eventPoint = event => {
      try {
        if (typeof event.getLocalPosition === "function") {
          const p = event.getLocalPosition(canvas.stage);
          return { x: p.x, y: p.y };
        }
        if (event.data?.getLocalPosition) {
          const p = event.data.getLocalPosition(canvas.stage);
          return { x: p.x, y: p.y };
        }
        const g = event.global || event.data?.global;
        if (g && canvas.stage.worldTransform?.applyInverse) {
          const p = canvas.stage.worldTransform.applyInverse(g);
          return { x: p.x, y: p.y };
        }
      } catch (e) { console.warn("Vadentis | coordonnées Sculpture", e); }
      return null;
    };

    const hud = document.createElement("div");
    hud.className = "vadentis-sculpture-trace-hud";
    Object.assign(hud.style, {
      position: "fixed", top: "78px", right: "18px", left: "auto", transform: "none",
      zIndex: 100000, width: "330px", maxWidth: "calc(100vw - 36px)", padding: "10px 12px", borderRadius: "8px",
      background: "rgba(20,20,20,.94)", color: "#f3f0e8", border: "1px solid #b58a48",
      boxShadow: "0 4px 18px rgba(0,0,0,.45)", textAlign: "center"
    });
    hud.innerHTML = `
      <div style="font-size:16px;font-weight:700;margin-bottom:5px;">Sculpture élémentaire · ${donnee}</div>
      <div style="font-size:12px;opacity:.85;margin-bottom:8px;line-height:1.35;">${useExternalSource ? '<strong>Premier clic : choisir la source élémentaire.</strong><br>' : ''}Clic gauche : ajouter un point · <strong>Entrée</strong> : valider · <strong>Échap</strong> : annuler · Retour arrière : retirer le dernier point.</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;margin-bottom:8px;text-align:left;">
        <span>PE actuels : <strong data-vad-current-pe>${availablePE} PE</strong></span>
        <span>PE restants : <strong data-vad-remaining-pe>${availablePE} PE</strong></span>
        <span>Longueur : <strong data-vad-distance>0 m</strong></span>
        <span>Segments : <strong data-vad-segments>0</strong></span>
        <span style="grid-column:1 / -1;">Coût du Trait : <strong data-vad-cost>0 PE</strong></span>
      </div>
      <div data-vad-budget-warning style="display:none;margin:0 0 8px;padding:6px 8px;border:1px solid #b94a48;border-radius:5px;background:rgba(120,20,20,.35);font-size:12px;line-height:1.3;">Vous n'avez pas assez de PE pour prolonger davantage ce Trait.</div>
      <div style="display:flex;justify-content:center;gap:6px;">
        <button type="button" data-vad-undo><i class="fas fa-undo"></i> Retirer le dernier point</button>
        <button type="button" data-vad-finish><i class="fas fa-check"></i> Valider le Trait</button>
        <button type="button" data-vad-cancel><i class="fas fa-times"></i> Annuler</button>
      </div>`;
    document.body.appendChild(hud);

    const distanceEl = hud.querySelector('[data-vad-distance]');
    const segmentsEl = hud.querySelector('[data-vad-segments]');
    const costEl = hud.querySelector('[data-vad-cost]');
    const remainingPEEl = hud.querySelector('[data-vad-remaining-pe]');
    const budgetWarningEl = hud.querySelector('[data-vad-budget-warning]');

    const statsFor = pts => {
      const distance = distanceOf(pts);
      const segments = distance > 0 ? Math.max(1, Math.ceil((distance - 0.0001) / segmentLength)) : 0;
      return { distance, segments, cost: segments * 2 };
    };

    // Prévisualisation des cibles : overlay PIXI dédié au-dessus des Tokens.
    // On ne modifie ni la sélection Foundry ni l'alpha du Token : cela évite
    // que le Canvas réécrase notre feedback au prochain rafraîchissement.
    const previewTargetOverlay = new PIXI.Graphics();
    previewTargetOverlay.zIndex = 100002;
    canvas.stage.sortableChildren = true;
    canvas.stage.addChild(previewTargetOverlay);
    const restorePreviewTokens = () => {
      try { previewTargetOverlay.clear(); } catch (_) {}
    };

    const draw = () => {
      // Le feedback de pré-ciblage agit directement sur le conteneur PIXI du Token.
      // Il ne touche jamais au document Foundry et est restauré à chaque frame.
      restorePreviewTokens();
      graphics.clear();
      const preview = hover ? [...points, hover] : [...points];
      if (preview.length > 1) {
        // La bande affichée correspond exactement à la hitbox mécanique : 1 m de large.
        const traitWidthPx = (1 / Math.max(0.0001, metersPerGrid)) * pxPerGrid;
        const intentColor = mode === "favorable" ? 0x52D9B0 : 0xF06A4A;
        // Matérialise franchement la bande mécanique de 1 m : corps translucide + liserés.
        graphics.lineStyle(traitWidthPx, intentColor, 0.48);
        graphics.moveTo(preview[0].x, preview[0].y);
        for (let i = 1; i < preview.length; i++) graphics.lineTo(preview[i].x, preview[i].y);
        graphics.lineStyle(Math.max(2, traitWidthPx + 2), intentColor, 0.28);
        graphics.moveTo(preview[0].x, preview[0].y);
        for (let i = 1; i < preview.length; i++) graphics.lineTo(preview[i].x, preview[i].y);
        graphics.lineStyle(Math.max(3, Math.min(8, traitWidthPx * 0.16)), 0xF1B24A, 0.98);
        graphics.moveTo(preview[0].x, preview[0].y);
        for (let i = 1; i < preview.length; i++) graphics.lineTo(preview[i].x, preview[i].y);
        graphics.lineStyle(2, 0xFFF2C7, 0.95);
        graphics.moveTo(preview[0].x, preview[0].y);
        for (let i = 1; i < preview.length; i++) graphics.lineTo(preview[i].x, preview[i].y);

        // Prévisualisation : uniquement les cibles réellement éligibles Hostile/Favorable.
        // On assombrit le Token lui-même (rendu PIXI uniquement) pour que le résultat soit
        // évident même si la couche de Tokens est au-dessus de notre Graphics de tracé.
        const previewTargets = this._getSculptureAffectedTokens(preview, token, mode);
        for (const token of previewTargets) {
          const b = token.bounds ?? new PIXI.Rectangle(token.x, token.y, token.w, token.h);
          // Assombrissement franc du portrait + liseré d'intention. L'overlay est
          // purement visuel et disparaît dès que la cible sort de la hitbox.
          previewTargetOverlay.beginFill(0x050505, 0.52);
          previewTargetOverlay.drawRoundedRect(b.x, b.y, b.width, b.height, Math.max(8, Math.min(b.width,b.height)*0.12));
          previewTargetOverlay.endFill();
          previewTargetOverlay.lineStyle(6, intentColor, 0.98);
          previewTargetOverlay.drawRoundedRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8, Math.max(10, Math.min(b.width,b.height)*0.14));
        }
      }
      for (const p of points) {
        graphics.beginFill(0xF1B24A, 1); graphics.drawCircle(p.x, p.y, 6); graphics.endFill();
      }
      const st = statsFor(preview);
      const overBudget = st.cost > availablePE;
      distanceEl.textContent = `${st.distance.toFixed(1)} m`;
      segmentsEl.textContent = String(st.segments);
      costEl.textContent = `${st.cost} PE`;
      costEl.style.color = overBudget ? "#ff7777" : "";
      remainingPEEl.textContent = `${Math.max(0, availablePE - st.cost)} PE`;
      remainingPEEl.style.color = overBudget ? "#ff7777" : "";
      budgetWarningEl.style.display = overBudget ? "block" : "none";
    };

    return new Promise(resolve => {
      const cleanup = result => {
        if (finished) return;
        finished = true;
        canvas.stage.off("pointermove", onMove);
        canvas.stage.off("pointerdown", onDown);
        window.removeEventListener("keydown", onKey);
        restorePreviewTokens();
        try { previewTargetOverlay.destroy({ children: true }); } catch (_) { try { canvas.stage.removeChild(previewTargetOverlay); } catch (_) {} }
        try { graphics.destroy({ children: true }); } catch (e) { try { canvas.stage.removeChild(graphics); } catch (_) {} }
        hud.remove();
        resolve(result);
      };

      const onMove = event => {
        const p = eventPoint(event);
        if (!p) return;
        hover = (useExternalSource && points.length === 0) ? null : p;
        draw();
      };
      const onDown = event => {
        const button = event.button ?? event.data?.button ?? 0;
        if (button !== 0) return;
        // Le clic appartient au mode Sculpture : il ne doit ni contrôler ni cibler un Token Foundry.
        try { event.preventDefault?.(); event.stopPropagation?.(); event.stopImmediatePropagation?.(); } catch (_) {}
        const p = eventPoint(event);
        if (!p) return;
        const candidate = [...points, p];
        if (statsFor(candidate).cost > availablePE) {
          ui.notifications.warn(`Sculpture : PE insuffisants. ${this.name} possède actuellement ${availablePE} PE.`);
          return;
        }
        points.push(p);
        hover = null;
        draw();
      };
      const onKey = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cleanup(null);
          return;
        }
        const minimumPoints = useExternalSource ? 0 : 1;
        if ((event.key === "Backspace" || event.key === "Delete") && points.length > minimumPoints) {
          event.preventDefault();
          event.stopPropagation();
          points.pop(); hover = null; draw();
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          if (points.length < 2) {
            ui.notifications.warn("Vadentis : ajoutez au moins un point au Trait avant de le valider.");
            return;
          }
          const st = statsFor(points);
          if (st.cost > availablePE) {
            ui.notifications.warn(`Sculpture : ce Trait coûte ${st.cost} PE, mais ${this.name} n’en possède que ${availablePE}.`);
            return;
          }
          cleanup({ points: points.map(p => ({ x: p.x, y: p.y })), ...st });
        }
      };

      hud.querySelector('[data-vad-undo]').addEventListener('click', () => {
        if (points.length > 1) points.pop();
        hover = null; draw();
      });
      hud.querySelector('[data-vad-cancel]').addEventListener('click', () => cleanup(null));
      hud.querySelector('[data-vad-finish]').addEventListener('click', () => {
        if (points.length < 2) {
          ui.notifications.warn("Vadentis : ajoutez au moins un point au Trait avant de le valider.");
          return;
        }
        const st = statsFor(points);
        if (st.cost > availablePE) {
          ui.notifications.warn(`Sculpture : ce Trait coûte ${st.cost} PE, mais ${this.name} n’en possède que ${availablePE}.`);
          return;
        }
        cleanup({ points: points.map(p => ({ x: p.x, y: p.y })), ...st });
      });

      canvas.stage.on("pointermove", onMove);
      canvas.stage.on("pointerdown", onDown);
      window.addEventListener("keydown", onKey);
      draw();
      ui.notifications.info("Sculpture : tracez le Trait sur la scène, puis validez.");
    });
  }

  /* -------------------------------------------- */
  _getSculptureAffectedTokens(points, sourceToken, mode = "hostile") {
    if (!canvas?.ready || !Array.isArray(points) || points.length < 2) return [];

    const pxPerGrid = Number(canvas.dimensions?.size || canvas.scene?.grid?.size || 100);
    const metersPerGrid = Number(canvas.dimensions?.distance || canvas.scene?.grid?.distance || 1);
    const halfWidthPx = (0.5 / Math.max(0.0001, metersPerGrid)) * pxPerGrid; // Trait d'environ 1m de large.
    const sourceDisposition = Number(sourceToken?.document?.disposition ?? CONST.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1);

    const segmentHitsRect = (a, b, rect) => {
      // Test de Liang-Barsky sur un rectangle élargi de la demi-largeur du Trait.
      const left = rect.x - halfWidthPx;
      const right = rect.x + rect.width + halfWidthPx;
      const top = rect.y - halfWidthPx;
      const bottom = rect.y + rect.height + halfWidthPx;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      let t0 = 0;
      let t1 = 1;
      const clip = (p, q) => {
        if (p === 0) return q >= 0;
        const r = q / p;
        if (p < 0) {
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
        return true;
      };
      return clip(-dx, a.x - left)
        && clip(dx, right - a.x)
        && clip(-dy, a.y - top)
        && clip(dy, bottom - a.y);
    };

    const tokens = canvas.tokens?.placeables ?? [];
    return tokens.filter(token => {
      if (!token?.actor || (token === sourceToken && mode !== "favorable")) return false;
      const disposition = Number(token.document?.disposition ?? 0);
      const isFriendly = disposition !== 0 && sourceDisposition !== 0 && disposition === sourceDisposition;
      const isHostile = disposition !== 0 && sourceDisposition !== 0 && Math.sign(disposition) !== Math.sign(sourceDisposition);
      const eligible = mode === "favorable" ? isFriendly : isHostile;
      if (!eligible) return false;

      const bounds = token.bounds ?? new PIXI.Rectangle(token.x, token.y, token.w, token.h);
      for (let i = 1; i < points.length; i++) {
        if (segmentHitsRect(points[i - 1], points[i], bounds)) return true;
      }
      return false;
    });
  }

  /* -------------------------------------------- */
  async _chooseSculptureVentDirection(targetName = "") {
    return new Promise(resolve => {
      const dirs = [
        ["↖", -1, -1], ["↑", 0, -1], ["↗", 1, -1],
        ["←", -1, 0],                 ["→", 1, 0],
        ["↙", -1, 1],  ["↓", 0, 1],  ["↘", 1, 1]
      ];
      const buttons = dirs.map(([label, dx, dy]) =>
        `<button type="button" class="vadentis-vent-dir" data-dx="${dx}" data-dy="${dy}" style="font-size:24px;min-width:52px;min-height:44px;">${label}</button>`
      ).join("");
      const dialog = new Dialog({
        title: `Sculpture de Vent · projection${targetName ? ` · ${targetName}` : ""}`,
        content: `<p>Choisissez la direction dans laquelle les cibles seront projetées de 2m.</p><div style="display:grid;grid-template-columns:repeat(3,56px);gap:5px;justify-content:center;">${buttons.slice(0, buttons.indexOf('data-dx="-1" data-dy="0"'))}${buttons}</div>`,
        buttons: { cancel: { label: "Sans projection", callback: () => resolve(null) } },
        close: () => resolve(null),
        render: html => {
          html.find(".vadentis-vent-dir").on("click", ev => {
            const el = ev.currentTarget;
            const dir = { dx: Number(el.dataset.dx || 0), dy: Number(el.dataset.dy || 0) };
            resolve(dir);
            dialog.close();
          });
        }
      }, { classes: ["vadentis", "vadentis-sculpture-window"] });
      // Rebuild the content cleanly (8 arrows, centre intentionally empty).
      dialog.data.content = `<p>Choisissez la direction dans laquelle les cibles seront projetées de 2m.</p>
        <div style="display:grid;grid-template-columns:repeat(3,56px);gap:5px;justify-content:center;align-items:center;">
          <button type="button" class="vadentis-vent-dir" data-dx="-1" data-dy="-1" style="font-size:24px;height:44px;">↖</button>
          <button type="button" class="vadentis-vent-dir" data-dx="0" data-dy="-1" style="font-size:24px;height:44px;">↑</button>
          <button type="button" class="vadentis-vent-dir" data-dx="1" data-dy="-1" style="font-size:24px;height:44px;">↗</button>
          <button type="button" class="vadentis-vent-dir" data-dx="-1" data-dy="0" style="font-size:24px;height:44px;">←</button>
          <div style="text-align:center;opacity:.55;">2m</div>
          <button type="button" class="vadentis-vent-dir" data-dx="1" data-dy="0" style="font-size:24px;height:44px;">→</button>
          <button type="button" class="vadentis-vent-dir" data-dx="-1" data-dy="1" style="font-size:24px;height:44px;">↙</button>
          <button type="button" class="vadentis-vent-dir" data-dx="0" data-dy="1" style="font-size:24px;height:44px;">↓</button>
          <button type="button" class="vadentis-vent-dir" data-dx="1" data-dy="1" style="font-size:24px;height:44px;">↘</button>
        </div>`;
      dialog.render(true);
    });
  }

  /* -------------------------------------------- */
  async _applySculptureEffects(affectedTokens, donnee, mode, sculptureId, sourceToken, options = {}) {
    if (!affectedTokens?.length) return { summary: "" };
    const key = String(donnee || "").trim().toLowerCase();
    const payload = {
      sculptureId,
      sourceActorId: this.id,
      sourceTokenId: sourceToken?.id || sourceToken?.document?.id || "",
      sceneId: canvas?.scene?.id || "",
      donnee: key,
      mode,
      targets: affectedTokens.map(t => ({ actorId: t.actor?.id, tokenId: t.id || t.document?.id, name: t.name || t.actor?.name || "Cible" })).filter(t => t.actorId)
    };

    const hostileDamage = { feu: "1d6", eau: "1d4", vent: "1d4", terre: "1d8", foudre: "1d6" };
    if (mode === "hostile" && hostileDamage[key]) {
      // Lors d'un déclenchement en cours de déplacement / début de tour, on garde
      // le jet discret afin d'éviter un dé visuel parasite avant les effets différés.
      const roll = (options.dynamic && game.combat)
        ? await (new Roll(hostileDamage[key])).evaluate({ async: true })
        : await VadentisUtility.processRoll(hostileDamage[key], undefined, game.user);
      payload.damage = Number(roll.total || 0);
      payload.damageFormula = hostileDamage[key];
    }
    if (mode === "hostile" && key === "vent" && !options.skipVentProjection) {
      for (const target of payload.targets) {
        target.ventDirection = await this._chooseSculptureVentDirection(target.name);
      }
    }

    // Icône officielle de la Donnée : utilisée aussi pour le marqueur visuel sous les cibles.
    const norm = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "'").trim();
    const strip = v => norm(v).replace(/^donnee\s+(du|de la|de l'|d')\s*/, "");
    const wanted = strip(donnee);
    const sourcePool = [...this.items, ...game.items].filter(i => i.type === "donnee" && i.img);
    let sourceItem = sourcePool.find(i => strip(i.name) === wanted) || sourcePool.find(i => strip(i.name).includes(wanted) || wanted.includes(strip(i.name)));
    if (!sourceItem) {
      for (const pack of game.packs) {
        try {
          const index = await pack.getIndex({ fields:["name","type","img"] });
          sourceItem = index.find(i => i.type === "donnee" && i.img && strip(i.name) === wanted)
            || index.find(i => i.type === "donnee" && i.img && (strip(i.name).includes(wanted) || wanted.includes(strip(i.name))));
          if (sourceItem) break;
        } catch (_) {}
      }
    }
    payload.donneeImg = sourceItem?.img || "";

    if (game.user.isGM) await VadentisUtility.applySculptureEffect(payload);
    else game.socket.emit("system.foundryvtt-vadentis", { name: "msg_sculpture_effect", data: payload });

    const parts = [];
    if (payload.damageFormula) parts.push(`Dégâts : <strong>${payload.damageFormula} = ${payload.damage}</strong>`);
    const labels = {
      "feu:hostile": "Brûlure : 1D4 dégâts au début du prochain tour de chaque cible.",
      "eau:hostile": "Défense -2 pendant 1 tour de la cible.",
      "vent:hostile": payload.ventDirection ? "Projection : 2m dans la direction choisie." : "Projection ignorée.",
      "terre:hostile": "Le Trait constitue un terrain difficile jusqu’à sa disparition.",
      "foudre:hostile": "Attaque -2 pendant 1 tour de la cible.",
      "feu:favorable": "Attaque +2 pendant 1 tour de la cible.",
      "eau:favorable": "Défense +2 pendant 1 tour de la cible.",
      "vent:favorable": "Déplacement +3m pendant 1 tour de la cible.",
      "terre:favorable": "Réduction de 1D4 dégâts subis pendant 1 tour de la cible.",
      "foudre:favorable": "Initiative +2 et Attaque +2 pendant 1 tour de la cible."
    };
    if (labels[`${key}:${mode}`]) parts.push(labels[`${key}:${mode}`]);
    return { summary: parts.join("<br>") };
  }

  /* -------------------------------------------- */
  _persistSculptureTrait(points, donnee, actorId, sculptureId = null, mode = "hostile", sourceToken = null, initiallyAffected = []) {
    if (!canvas?.ready || !Array.isArray(points) || points.length < 2) return null;

    const palette = {
      feu: 0xF06A2A,
      eau: 0x3A9DFF,
      vent: 0xBDECF2,
      terre: 0x9A7446,
      foudre: 0xE7D84B
    };
    const key = String(donnee || "").trim().toLowerCase();
    const color = palette[key] ?? 0xF1B24A;

    const graphics = new PIXI.Graphics();
    graphics.zIndex = 95000;
    canvas.stage.sortableChildren = true;
    canvas.stage.addChild(graphics);

    const gridSizeForWidth = Number(canvas.dimensions?.size || canvas.scene?.grid?.size || 100);
    const gridDistanceForWidth = Number(canvas.dimensions?.distance || canvas.scene?.grid?.distance || 1);
    const traitWidthPx = (1 / Math.max(0.0001, gridDistanceForWidth)) * gridSizeForWidth;
    graphics.lineStyle(traitWidthPx, color, mode === "favorable" ? 0.26 : 0.34);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);
    graphics.lineStyle(5, color, 0.92);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);
    graphics.lineStyle(1.5, 0xFFFFFF, 0.72);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);

    // Animation légère 100% PIXI/Foundry : halo qui respire + étincelles qui
    // glissent le long du Trait. Pas de vidéo ni d'asset externe.
    const animatedLayer = new PIXI.Container();
    animatedLayer.zIndex = 95001;
    canvas.stage.addChild(animatedLayer);
    const glow = new PIXI.Graphics();
    // Halo natif PIXI/Foundry : on utilise le même pipeline de rendu Canvas que
    // les lumières, sans créer de vrais AmbientLightDocuments sur la scène.
    // C'est plus léger, suit parfaitement une polyligne et reste compatible V11/V12.
    try {
      const blur = new PIXI.filters.BlurFilter();
      blur.blur = key === "foudre" ? 5 : key === "vent" ? 8 : 6;
      blur.quality = 2;
      glow.filters = [blur];
    } catch (_) {}
    glow.lineStyle(Math.max(10, traitWidthPx * 1.08), color, key === "vent" ? 0.22 : 0.30);
    glow.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) glow.lineTo(points[i].x, points[i].y);
    animatedLayer.addChild(glow);
    // Ruban animé à la largeur mécanique complète (1 m), pour que l'animation
    // et la hitbox racontent exactement la même chose visuellement.
    const ribbon = new PIXI.Graphics();
    ribbon.lineStyle(Math.max(4, traitWidthPx), color, mode === "favorable" ? 0.18 : 0.26);
    ribbon.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ribbon.lineTo(points[i].x, points[i].y);
    animatedLayer.addChild(ribbon);
    const sparkLayer = new PIXI.Graphics();
    animatedLayer.addChild(sparkLayer);
    const segmentLengths = []; let animatedTotal = 0;
    for (let i = 1; i < points.length; i++) {
      const len = Math.hypot(points[i].x-points[i-1].x, points[i].y-points[i-1].y);
      segmentLengths.push(len); animatedTotal += len;
    }
    const pointAt = distance => {
      let d = ((distance % animatedTotal) + animatedTotal) % animatedTotal;
      for (let i=1;i<points.length;i++) {
        const len = segmentLengths[i-1] || 1;
        if (d <= len) { const r=d/len; return { x:points[i-1].x+(points[i].x-points[i-1].x)*r, y:points[i-1].y+(points[i].y-points[i-1].y)*r }; }
        d -= len;
      }
      return points[points.length-1];
    };
    let animPhase = Math.random()*1000;
    const animateTrait = delta => {
      if (removed || animatedLayer.destroyed || !animatedTotal) return;
      animPhase += Number(delta || 1);
      // L'intention de la Sculpture se lit aussi dans son mouvement :
      // hostile = pulsations plus franches et flux nerveux ; favorable = flux doux,
      // plus lent et continu. La couleur reste celle de la Donnée.
      const hostile = mode !== "favorable";
      const baseSpeed = key === "foudre" ? 4.6 : key === "vent" ? 2.7 : key === "eau" ? 1.45 : key === "feu" ? 2.2 : 0.85;
      const speed = baseSpeed * (hostile ? 1.28 : 0.68);
      const pulseRate = hostile ? (key === "foudre" ? 0.16 : 0.075) : 0.025;
      const pulse = key === "foudre" && hostile ? Math.abs(Math.sin(animPhase*pulseRate)) : (0.5 + 0.5*Math.sin(animPhase*pulseRate));
      glow.alpha = hostile
        ? ((key === "vent" ? 0.34 : 0.48) + pulse*(key === "foudre" ? 0.44 : 0.34))
        : ((key === "vent" ? 0.22 : 0.30) + pulse*0.18);
      ribbon.alpha = hostile ? (0.55 + pulse * 0.35) : (0.34 + pulse * 0.22);
      animatedLayer.scale.set(hostile ? 1 : 0.995 + pulse*0.010);
      sparkLayer.clear();
      sparkLayer.alpha = hostile ? 1.0 : 0.62;
      const count = Math.max(4, Math.min(hostile ? 18 : 14, Math.round(animatedTotal / (hostile ? 92 : 118))));
      for (let i=0;i<count;i++) {
        const direction = hostile ? 1 : -1;
        const p = pointAt(direction*animPhase*speed + (animatedTotal/count)*i);
        const phase = animPhase*(hostile ? 0.085 : 0.038) + i*1.7;
        if (key === "foudre") {
          const r = 2.0 + (i%3);
          sparkLayer.lineStyle(1.4, 0xFFFFFF, 0.72);
          sparkLayer.moveTo(p.x-r*2, p.y+r); sparkLayer.lineTo(p.x, p.y-r); sparkLayer.lineTo(p.x+r*2, p.y+r*0.3);
        } else if (key === "vent") {
          sparkLayer.lineStyle(1.2, 0xFFFFFF, 0.34);
          sparkLayer.arc(p.x, p.y, 4+(i%3)*2, phase, phase+1.25);
        } else if (key === "eau") {
          sparkLayer.beginFill(0xFFFFFF, 0.42 + 0.16*Math.sin(phase));
          sparkLayer.drawEllipse(p.x, p.y, 3.6+(i%2)*1.4, 1.6); sparkLayer.endFill();
        } else if (key === "feu") {
          sparkLayer.beginFill(i%3 ? 0xFFFFFF : 0xFFD27A, 0.58);
          sparkLayer.drawCircle(p.x + Math.sin(phase)*2, p.y - 2-Math.abs(Math.sin(phase))*4, 1.8+(i%2)); sparkLayer.endFill();
        } else {
          sparkLayer.beginFill(i%2 ? 0xFFFFFF : color, 0.42);
          const r=1.8+(i%3)*0.7; sparkLayer.drawRect(p.x-r, p.y-r, r*2, r*2); sparkLayer.endFill();
        }
      }
    };
    const traitTicker = canvas.app?.ticker;
    traitTicker?.add(animateTrait);

    // Petit contrôle de suppression directement sur la scène, visible uniquement par le MJ.
    // Il suit le Trait lorsque la caméra bouge/zoome puisqu'il vit dans le même espace PIXI.
    let gmDeleteControl = null;
    if (game.user?.isGM) {
      let total = 0;
      const lengths = [];
      for (let i = 1; i < points.length; i++) {
        const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        lengths.push(len);
        total += len;
      }
      let target = total / 2;
      let mid = { ...points[0] };
      for (let i = 1; i < points.length; i++) {
        const len = lengths[i - 1];
        if (target <= len || i === points.length - 1) {
          const ratio = len > 0 ? Math.max(0, Math.min(1, target / len)) : 0;
          mid = {
            x: points[i - 1].x + (points[i].x - points[i - 1].x) * ratio,
            y: points[i - 1].y + (points[i].y - points[i - 1].y) * ratio
          };
          break;
        }
        target -= len;
      }

      gmDeleteControl = new PIXI.Container();
      gmDeleteControl.zIndex = 95010;
      gmDeleteControl.position.set(mid.x, mid.y - 22);
      gmDeleteControl.interactive = true;
      gmDeleteControl.buttonMode = true;
      gmDeleteControl.cursor = "pointer";

      const bg = new PIXI.Graphics();
      bg.beginFill(0x171717, 0.92);
      bg.lineStyle(2, 0xFFFFFF, 0.85);
      bg.drawCircle(0, 0, 13);
      bg.endFill();
      gmDeleteControl.addChild(bg);

      const label = new PIXI.Text("×", {
        fontFamily: "Arial", fontSize: 22, fontWeight: "bold", fill: 0xFFFFFF, align: "center"
      });
      label.anchor.set(0.5);
      label.position.set(0, -1);
      gmDeleteControl.addChild(label);
      gmDeleteControl.hitArea = new PIXI.Circle(0, 0, 18);
      canvas.stage.addChild(gmDeleteControl);
    }

    const startCombatId = game.combat?.id ?? null;
    const startRound = Number(game.combat?.round ?? 0);
    const startTurn = Number(game.combat?.turn ?? -1);
    let removed = false;
    let hookId = null;
    let deleteHookId = null;
    let canvasHookId = null;
    let tokenMoveHookId = null;
    let turnEnterHookId = null;
    const triggered = new Map();
    const everTriggered = new Set();
    const currentTurnKey = () => game.combat
      ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}`
      : "hors-combat";
    for (const token of (initiallyAffected || [])) {
      const tid = token?.id || token?.document?.id;
      if (tid) { triggered.set(tid, currentTurnKey()); everTriggered.add(tid); }
    }
    const canTrigger = (token) => {
      const tid = token?.id || token?.document?.id;
      if (!tid) return false;
      const keyNow = currentTurnKey();
      if (triggered.get(tid) === keyNow) return false;
      triggered.set(tid, keyNow); // verrou avant application, notamment pour la projection du Vent
      return true;
    };
    const triggerToken = async (token, triggerOptions = {}) => {
      if (removed || !token?.actor || !canTrigger(token)) return;
      const tid = token?.id || token?.document?.id;
      if (tid) everTriggered.add(tid);
      await this._applySculptureEffects([token], donnee, mode, sculptureId, sourceToken, {
        dynamic: true,
        skipVentProjection: Boolean(triggerOptions.startTurn)
      });
    };
    const tokenTouchesTrait = (tokenOrDoc, positionOverride = null) => {
      const doc = tokenOrDoc?.document || tokenOrDoc;
      const actor = tokenOrDoc?.actor || doc?.actor;
      if (!doc || !actor) return false;
      const sourceId = sourceToken?.id || sourceToken?.document?.id;
      if (doc.id === sourceId && mode !== "favorable") return false;
      const sourceDisposition = Number(sourceToken?.document?.disposition ?? CONST.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1);
      const disposition = Number(doc.disposition ?? 0);
      const isFriendly = disposition === sourceDisposition && disposition !== 0;
      if (mode === "favorable" ? !isFriendly : isFriendly) return false;

      const gridSize = Number(canvas.dimensions?.size || canvas.scene?.grid?.size || 100);
      const gridDistance = Number(canvas.dimensions?.distance || canvas.scene?.grid?.distance || 1);
      const halfWidthPx = (0.5 / Math.max(0.0001, gridDistance)) * gridSize;
      const w = Number(doc.width || 1) * gridSize, h = Number(doc.height || 1) * gridSize;
      // updateToken n'est pas garanti de refléter les nouvelles coordonnées au même
      // moment sur toutes les versions de Foundry. On peut donc injecter explicitement
      // la position finale reçue dans le hook. Le contact avec la bande de 1m suffit.
      const rect = {
        x: Number(positionOverride?.x ?? doc.x ?? 0),
        y: Number(positionOverride?.y ?? doc.y ?? 0),
        width: w, height: h
      };
      const segmentHitsRect = (a,b) => {
        const left=rect.x-halfWidthPx, right=rect.x+rect.width+halfWidthPx, top=rect.y-halfWidthPx, bottom=rect.y+rect.height+halfWidthPx;
        const dx=b.x-a.x, dy=b.y-a.y; let t0=0,t1=1;
        const clip=(p,q)=>{ if(p===0) return q>=0; const r=q/p; if(p<0){if(r>t1)return false;if(r>t0)t0=r;}else{if(r<t0)return false;if(r<t1)t1=r;} return true; };
        return clip(-dx,a.x-left)&&clip(dx,right-a.x)&&clip(-dy,a.y-top)&&clip(dy,bottom-a.y);
      };
      for(let i=1;i<points.length;i++) if(segmentHitsRect(points[i-1],points[i])) return true;
      return false;
    };

    const remove = (options = {}) => {
      if (removed) return;
      removed = true;
      try { graphics.destroy({ children: true }); } catch (_) { try { canvas.stage.removeChild(graphics); } catch (_) {} }
      try { traitTicker?.remove(animateTrait); } catch (_) {}
      try { animatedLayer.destroy({ children: true }); } catch (_) { try { canvas.stage.removeChild(animatedLayer); } catch (_) {} }
      if (gmDeleteControl) {
        try { gmDeleteControl.destroy({ children: true }); } catch (_) { try { canvas.stage.removeChild(gmDeleteControl); } catch (_) {} }
        gmDeleteControl = null;
      }
      if (hookId !== null) Hooks.off("updateCombat", hookId);
      if (deleteHookId !== null) Hooks.off("deleteCombat", deleteHookId);
      if (canvasHookId !== null) Hooks.off("canvasTearDown", canvasHookId);
      if (tokenMoveHookId !== null) Hooks.off("updateToken", tokenMoveHookId);
      if (turnEnterHookId !== null) Hooks.off("updateCombat", turnEnterHookId);
      if (sculptureId) {
        const cleanupData = { sculptureId, forceAll: Boolean(options.forceCleanup) };
        if (game.user.isGM) VadentisUtility.cleanupSculptureEffects(cleanupData);
        else game.socket.emit("system.foundryvtt-vadentis", { name: "msg_sculpture_cleanup", data: cleanupData });
      }
    };

    if (gmDeleteControl) {
      gmDeleteControl.on("pointertap", event => {
        try { event?.stopPropagation?.(); } catch (_) {}
        remove({ forceCleanup: !game.combat });
        ui.notifications.info("Sculpture : Trait supprimé.");
      });
    }

    // Hors combat, le Trait reste visible jusqu'à suppression par le MJ ou changement de scène.
    // En combat, il disparaît lorsque revient le début du prochain tour de son créateur.
    if (startCombatId) {
      hookId = Hooks.on("updateCombat", combat => {
        if (combat.id !== startCombatId) return;
        const currentActorId = combat.combatant?.actorId ?? combat.combatant?.actor?.id;
        const moved = Number(combat.round ?? 0) !== startRound || Number(combat.turn ?? -1) !== startTurn;
        if (moved && currentActorId === actorId) remove();
      });
      deleteHookId = Hooks.on("deleteCombat", combat => {
        if (combat.id === startCombatId) remove();
      });
    }
    // Si une cible entre ensuite dans le Trait, elle reçoit l'effet une fois par tour.
    tokenMoveHookId = Hooks.on("updateToken", async (tokenDoc, changes) => {
      if (removed || tokenDoc.parent?.id !== canvas.scene?.id) return;
      if (!("x" in changes) && !("y" in changes)) return;
      const finalPos = {
        x: ("x" in changes) ? Number(changes.x) : Number(tokenDoc.x || 0),
        y: ("y" in changes) ? Number(changes.y) : Number(tokenDoc.y || 0)
      };
      // Déclenchement sur CONTACT : le rectangle final du token est élargi par la
      // demi-largeur du Trait (0,5m de chaque côté). Il n'est pas nécessaire de
      // traverser la ligne centrale.
      if (!tokenTouchesTrait(tokenDoc, finalPos)) return;
      // Une frame laisse à Foundry le temps de synchroniser le Placeable visuel.
      await new Promise(resolve => setTimeout(resolve, 25));
      const token = canvas.tokens?.get(tokenDoc.id);
      if (!token) return;
      await triggerToken(token);
    });

    // Une cible qui commence son tour sur le Trait est également affectée,
    // même si elle ne s'est pas déplacée pour y entrer.
    turnEnterHookId = Hooks.on("updateCombat", async combat => {
      if (removed || !combat?.combatant) return;
      const tokenId = combat.combatant.tokenId || combat.combatant.token?.id;
      const token = tokenId ? canvas.tokens?.get(tokenId) : null;
      if (!token || !tokenTouchesTrait(token)) return;
      const tid = token.id || token.document?.id;
      // Un début de tour ne rejoue jamais un effet déjà reçu : la Brûlure et
      // les durées sont gérées séparément. Une cible qui apparaît/commence sur
      // le Trait sans l'avoir encore déclenché peut toutefois être affectée.
      if (tid && everTriggered.has(tid)) return;
      await triggerToken(token, { startTurn: true });
    });

    canvasHookId = Hooks.on("canvasTearDown", () => remove({ forceCleanup: !game.combat }));
    return { graphics, remove };
  }

  /* -------------------------------------------- */
  async useSculpture(talentId, choice = null) {
    const talent = this.items.get(talentId);
    if (!talent || talent.type !== "talent") return;
    const talentType = String(talent.system.talentType || "").trim().toLowerCase();
    const talentName = String(talent.name || "").trim().toLowerCase();
    const isSculpture = talentType === "sculpture"
      || Boolean(String(talent.system.sculptureDonnee || "").trim())
      || talentName.includes("sculpture élémentaire")
      || talentName.includes("sculpture elementaire");
    if (!isSculpture) return;

    const donnee = String(talent.system.sculptureDonnee || "").trim();
    if (!donnee) {
      ui.notifications.warn("Vadentis : configurez d’abord la Donnée de cette Sculpture dans l’Item Talent.");
      return;
    }

    // Depuis la fiche personnage, le mode et l’origine sont choisis directement
    // via les quatre boutons d’action. Le dialogue reste en secours pour les
    // appels externes/macros qui n’envoient pas encore ces informations.
    const sculptureChoice = choice || await this._chooseSculptureMode(talent, donnee);
    if (!sculptureChoice) return;
    const mode = typeof sculptureChoice === "string" ? sculptureChoice : sculptureChoice.mode;
    const origin = typeof sculptureChoice === "string" ? "self" : sculptureChoice.origin;

    const segmentLength = talent.system.sculptureSuperieure ? 6 : 3;

    // La feuille se range pendant le tracé afin de libérer la scène.
    const actorSheet = this.sheet;
    const sheetWasOpen = Boolean(actorSheet?.rendered);
    const savedSheetPosition = sheetWasOpen ? { ...actorSheet.position } : null;
    if (sheetWasOpen) {
      try { await actorSheet.close({ submit: false }); }
      catch (e) { console.warn("Vadentis | fermeture feuille Sculpture", e); }
    }

    try {
      const trace = await this._traceSculpturePath(segmentLength, donnee, mode, origin);
      if (!trace) return;

      const distance = trace.distance;
    const segments = trace.segments;
    const normalCost = trace.cost;
    if (!segments) return;

    const currentPE = Math.max(0, Number(this.system.stats.pointsenergie.value || 0));
    if (currentPE < normalCost) {
      ui.notifications.error(`Sculpture : PE insuffisants. Ce Trait coûte ${normalCost} PE et ${this.name} n’en possède que ${currentPE}.`);
      return;
    }

    const scores = this.system.magie.matriseelementaire;
    const statValue = this._getCombatValue(scores);
    const roll = await VadentisUtility.processRoll(`1d20+${statValue}`);
    const natural = roll.dice[0].results[0].result;
    const difficulty = 12;
    const alreadySuccessful = natural > 1 && roll.total >= difficulty;
    const paBonus = (natural === 1 || natural === 20 || alreadySuccessful) ? 0 : await this.requestPABonus(`la Sculpture élémentaire (${donnee})`, roll.total);
    const finalTotal = roll.total + paBonus;
    const success = natural > 1 && finalTotal >= difficulty;
    const critical = natural === 20;
    const cost = critical ? Math.ceil(normalCost / 2) : normalCost;

    let outcome = "ÉCHEC";
    let state = "failure";
    if (success) { outcome = critical ? "RÉUSSITE CRITIQUE" : "RÉUSSITE"; state = critical ? "critical-success" : "success"; }

    let msg = `<strong>${donnee}</strong> · Sculpture ${mode === "favorable" ? "favorable" : "hostile"}${origin === "external" ? " · source extérieure" : ""}<br>`;
    msg += `Trait tracé : <strong>${distance.toFixed(1)}m</strong> · ${segments} segment${segments > 1 ? "s" : ""} de ${segmentLength}m · coût normal : <strong>${normalCost} PE</strong>.<br>`;
    msg += `Maîtrise Données : <strong>${roll.total} / ${difficulty}</strong>${this.paBonusChat(paBonus, roll.total)}`;

    if (success) {
      await this.update({ 'system.stats.pointsenergie.value': Math.max(0, currentPE - cost) });
      msg += `<br>${critical ? "Réussite critique : coût divisé par deux. " : ""}<strong>${cost} PE dépensés.</strong>`;

      const sourceToken = canvas.tokens?.controlled?.find(t => t.actor?.id === this.id) || this.getActiveTokens?.()[0];
      const affectedTokens = this._getSculptureAffectedTokens(trace.points, sourceToken, mode);
      const sculptureId = foundry.utils.randomID();
      this._persistSculptureTrait(trace.points, donnee, this.id, sculptureId, mode, sourceToken, affectedTokens);
      // Les effets sont volontairement résolus APRÈS la carte principale de Sculpture.
      // On conserve ici les données nécessaires, puis on déclenche dégâts/statuts plus bas.
      var pendingSculptureEffects = { affectedTokens, donnee, mode, sculptureId, sourceToken };

      if (affectedTokens.length) {
        const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[c]);
        const tokenCards = affectedTokens.map(t => {
          const name = escapeHtml(t.name || t.actor?.name || "Cible");
          const img = t.document?.texture?.src || t.actor?.img || "icons/svg/mystery-man.svg";
          return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;width:64px;vertical-align:top;">
            <img src="${img}" alt="${name}" title="${name}" style="width:48px;height:48px;object-fit:cover;border:2px solid rgba(255,255,255,.55);border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.45);">
            <span style="max-width:64px;font-size:10px;line-height:1.05;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${name}">${name}</span>
          </div>`;
        }).join("");
        msg += `<br><strong>Cibles traversées (${affectedTokens.length}) :</strong>`;
        msg += `<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:6px;align-items:flex-start;">${tokenCards}</div>`;
      } else {
        msg += `<br><strong>Cibles traversées :</strong> aucune cible ${mode === "favorable" ? "alliée" : "hostile"} détectée.`;
      }
    } else if (natural === 1) {
      msg += `<br><strong>Échec critique.</strong> Aucun effet supplémentaire n’est appliqué automatiquement : les règles actuelles de Sculpture ne définissent pas de conséquence particulière.`;
    }

    const normalizeDonneeName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const wantedDonnee = normalizeDonneeName(donnee);
    const cleanDonneeName = value => normalizeDonneeName(value).replace(/^donnee\s+(du|de la|de l'|d')\s*/, "");
    let donneeItem = [...this.items, ...game.items].find(i => i.type === "donnee" && i.img && (() => {
      const n = cleanDonneeName(i.name);
      return n === wantedDonnee || n.includes(wantedDonnee) || wantedDonnee.includes(n);
    })());
    if (!donneeItem) {
      for (const pack of game.packs) {
        try {
          const index = await pack.getIndex({ fields:["name","type","img"] });
          donneeItem = index.find(i => i.type === "donnee" && i.img && cleanDonneeName(i.name) === wantedDonnee)
            || index.find(i => i.type === "donnee" && i.img && (cleanDonneeName(i.name).includes(wantedDonnee) || wantedDonnee.includes(cleanDonneeName(i.name))));
          if (donneeItem) break;
        } catch (_) {}
      }
    }
    const sculptureChatImg = donneeItem?.img || talent.img;

    const sculptureChatMessage = await ChatMessage.create({
      content: await renderTemplate(`systems/foundryvtt-vadentis/templates/chat-generic-result.html`, {
        alias: this.name,
        actorImg: this.getActiveTokens?.()[0]?.document?.texture?.src || this.img,
        title: `Talent · Sculpture élémentaire · ${donnee}`,
        img: sculptureChatImg,
        state,
        outcome,
        result: finalTotal,
        target: difficulty,
        msg
      })
    });

    // Maintenant que la carte de Sculpture est visible, on résout les effets.
    // Ainsi, hors combat comme en combat : Sculpture -> dégâts -> Brûlure/statuts.
    if (typeof pendingSculptureEffects !== "undefined" && pendingSculptureEffects) {
      await this._applySculptureEffects(
        pendingSculptureEffects.affectedTokens, pendingSculptureEffects.donnee, pendingSculptureEffects.mode,
        pendingSculptureEffects.sculptureId, pendingSculptureEffects.sourceToken
      );
    }
    } finally {
      // Échap comme validation : retour automatique à la feuille si elle était ouverte.
      if (sheetWasOpen && actorSheet) {
        try {
          actorSheet.render(true);
          if (savedSheetPosition) {
            setTimeout(() => {
              try { actorSheet.setPosition(savedSheetPosition); } catch (_) {}
            }, 50);
          }
        } catch (e) { console.warn("Vadentis | réouverture feuille Sculpture", e); }
      }
    }
  }

  /* -------------------------------------------- */
  async rollDamage(weapon, damageType) {
    let formula =
      VadentisUtility.processDamageString(
        weapon.system[damageType],
        this
      );

    let degatsRoll =
      await VadentisUtility.processRoll(formula);

    let msgData = {
      alias: this.name,
      img: "systems/foundryvtt-vadentis/images/icons/tchat_dégâts_infligés.png",
      title: `Dégâts de ${weapon.name}`,
      state: "damage",
      result: degatsRoll.total,
      resultLabel: "DÉGÂTS",
      msg: `${this.name} frappe avec ${weapon.name}. <strong>${formula}</strong>`
    };

    ChatMessage.create({
      content: await renderTemplate(
        `systems/foundryvtt-vadentis/templates/chat-generic-result.html`,
        msgData
      )
    });
  }

  /* -------------------------------------------- */
  async rollSortDevotionDamage(sort, damageType) {
    let formula =
      VadentisUtility.processDamageString(
        sort.system[damageType],
        this
      );

    const echoDamage = this.getFlag("foundryvtt-vadentis","echoNextDamageBonus");
    if(echoDamage?.value){
      formula = `(${formula}) + ${Number(echoDamage.value||0)}`;
      await this.unsetFlag("foundryvtt-vadentis","echoNextDamageBonus");
    }

    let degatsRoll =
      await VadentisUtility.processRoll(formula);

    let msgData = {
      alias: this.name,
      img: "systems/foundryvtt-vadentis/images/icons/tchat_dégâts_infligés.png",
      title: `Dégâts de ${sort.name}`,
      state: "damage",
      result: degatsRoll.total,
      resultLabel: "DÉGÂTS",
      msg: `Le sort ${sort.name} inflige des dégâts. <strong>${formula}</strong>`
    };

    ChatMessage.create({
      content: await renderTemplate(
        `systems/foundryvtt-vadentis/templates/chat-generic-result.html`,
        msgData
      )
    });
  }

  /* -------------------------------------------- */
  async applyDamage(damageValue, options = {}) {
    let pvData = this.system.stats.pointsvie;
    let finalDamage = Number(damageValue || 0);
    const earthGuard = this.items.find(i => i.type === "statut" && i.system.actif === true && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.damageReduction") === "1d4");
    if (earthGuard && finalDamage > 0) {
      const reductionRoll = await VadentisUtility.processRoll("1d4");
      const reduction = Math.min(finalDamage, Number(reductionRoll.total || 0));
      finalDamage = Math.max(0, finalDamage - reduction);
      if (!options.silent) ui.notifications.info(`${this.name} réduit les dégâts de ${reduction} grâce à la Sculpture de Terre.`);
    }

    let newValue = Math.max(
      pvData.value - finalDamage,
      MIN_PV
    );

    await this.update({
      'system.stats.pointsvie.value': newValue
    });

    let msgData = {
      alias: this.name,
      img: "systems/foundryvtt-vadentis/images/icons/tchat_dégâts_infligés.png",
      actorImg: options.sourceActorImg || null,
      title: `Dégâts reçus`,
      state: "damage",
      result: finalDamage,
      resultLabel: "DÉGÂTS REÇUS",
      damage: finalDamage,
      damageFormula: options.formula || "",
      targetImg: options.img || this.getActiveTokens?.()[0]?.document?.texture?.src || this.img,
      targetName: this.name,
      msg: ""
    };

    if (options.silent) return { before: Number(pvData.value || 0), after: Number(newValue || 0), max: Number(pvData.max || 0), damage: finalDamage };

    if (game.user.isGM) {
      msgData.isGMHealth = true;
      msgData.healthBefore = pvData.value;
      msgData.healthAfter = newValue;
      msgData.healthMax = pvData.max;
      msgData.msg = "";
      ChatMessage.create({
        whisper: ChatMessage.getWhisperRecipients('GM'),
        content: await renderTemplate(
          `systems/foundryvtt-vadentis/templates/chat-generic-result.html`,
          msgData
        )
      });
    }
  }

  /* -------------------------------------------- */
  async applyHealing(healValue, options = {}) {
    const pvData = this.system.stats.pointsvie;
    const before = Number(pvData.value || 0);
    const max = Number(pvData.max || before);
    const newValue = Math.min(before + Number(healValue || 0), max);
    await this.update({ 'system.stats.pointsvie.value': newValue });

    if (options.silent) return { before, after: Number(newValue || 0), max };

    if (game.user.isGM) {
      const msgData = {
        alias: this.name,
        img: options.img || this.img,
        title: `${this.name} reçoit des soins`,
        state: "heal",
        result: Number(healValue || 0),
        resultLabel: "SOINS REÇUS",
        isGMHealth: true,
        healthBefore: before,
        healthAfter: newValue,
        healthMax: max,
        msg: ""
      };
      ChatMessage.create({
        whisper: ChatMessage.getWhisperRecipients('GM'),
        content: await renderTemplate(`systems/foundryvtt-vadentis/templates/chat-generic-result.html`, msgData)
      });
    }
  }

  /* -------------------------------------------- */
  async repos(type) {

    const pv = this.system.stats.pointsvie;
    const pe = this.system.stats.pointsenergie;
    const pa = this.system.stats.pointsadrenaline;

    let newPV = pv.value;
    let newPE = pe.value;
    let newPA = pa.value;

    if (type === "repos") {

      // Repos normal :
      // PV : récupération de la moitié du maximum
      // PE : récupération jusqu'au maximum
      // PA : récupération jusqu'au maximum

      newPV = Math.min(
        pv.value + Math.floor(pv.max / 2),
        pv.max
      );

      newPE = pe.max;
      newPA = pa.max;

    } else if (type === "mauvais") {

      // Mauvais repos :
      // PV : récupération d'un tiers du maximum
      // PE : récupération de la moitié du maximum
      // PA : récupération de la moitié du maximum

      newPV = Math.min(
        pv.value + Math.floor(pv.max / 3),
        pv.max
      );

      newPE = Math.min(
        pe.value + Math.floor(pe.max / 2),
        pe.max
      );

      newPA = Math.min(
        pa.value + Math.floor(pa.max / 2),
        pa.max
      );
    }

    await this.update({
      'system.stats.pointsvie.value': newPV,
      'system.stats.pointsenergie.value': newPE,
      'system.stats.pointsadrenaline.value': newPA
    });

    // Chante-vie : tout Repos / Mauvais repos réinitialise le Répertoire inné.
    // Mise à jour groupée des Items embarqués : plus fiable qu'une succession de
    // talent.update() pendant le re-rendu provoqué par le repos de l'Actor.
    const chanteVieResets = this.items
      .filter(item => {
        if (item.type !== "talent") return false;
        const talentType = String(item.system?.talentType || item.system?.type || "").toLowerCase();
        const name = String(item.name || "").toLowerCase();
        const isChanteVie = talentType === "chante-vie" || talentType === "chantevie"
          || name.includes("chante-vie") || name.includes("chante vie");
        return isChanteVie && Object.keys(item.system?.echoPowersUsed || {}).length > 0;
      })
      .map(item => ({ _id: item.id, "system.echoPowersUsed": {} }));

    if (chanteVieResets.length) {
      await this.updateEmbeddedDocuments("Item", chanteVieResets);
    }
  }

  /* -------------------------------------------- */
  _vadentisNumber(value) {
    if (Array.isArray(value)) value = value[0];
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  /* -------------------------------------------- */
 _getCombatValue(mydata) {
  if (!mydata) return 0;
  return this._vadentisNumber(mydata.base) +
    this._vadentisNumber(mydata.malus) +
    this._vadentisNumber(mydata.bonus) +
    this._vadentisNumber(mydata.statut) +
    this._vadentisNumber(mydata.equipement);
}

  /* -------------------------------------------- */
  getInitiativeScore() {
    let initData = this.system.combat.initiative;
    return this._getCombatValue(initData);
  }

  /* -------------------------------------------- */
  getDefenseScore() {
    let defenseData = this.system.combat.defense;
    return this._getCombatValue(defenseData);
  }

  /* -------------------------------------------- */
  getForceScore() {
    let forceData = this.system.combat.force;
    return this._getCombatValue(forceData);
  }

  /* -------------------------------------------- */
  getAttaqueScore() {
    let attaqueData = this.system.combat.attaque;
    return this._getCombatValue(attaqueData);
  }

  /* -------------------------------------------- */
buildTexteFormula(stat) {

  const base = this._vadentisNumber(stat?.base);
  const malus = this._vadentisNumber(stat?.malus);
  const bonus = this._vadentisNumber(stat?.bonus);
  const statut = this._vadentisNumber(stat?.statut);
  const equipement = this._vadentisNumber(stat?.equipement);

  const signMalus =
    malus < 0 ? "" : "+";

  const signStatut =
    statut < 0 ? "" : "+";

  let formule =
    `1d20 + ${base} ${signMalus} ${malus} + ${bonus}`;

  if (statut !== 0) {
    formule += ` ${signStatut} ${statut} (Statut)`;
  }
  if (equipement !== 0) {
    formule += ` ${equipement < 0 ? "" : "+"} ${equipement} (Équipement)`;
  }

  return formule;
}
  /* -------------------------------------------- */
  async requestPABonus(contextLabel = "ce jet", currentTotal = null) {
    const available = Math.max(0, this._vadentisNumber(this.system.stats?.pointsadrenaline?.value));
    if (available <= 0) return 0;

    const spent = await new Promise(resolve => {
      let resolved = false;
      const finish = value => { if (!resolved) { resolved = true; resolve(value); } };
      new Dialog({
        title: "Renforcer le jet avec de l’Adrénaline",
        content: `
          <div class="vadentis-pa-dialog">
            <div class="vadentis-pa-dialog-hero">
              <i class="fas fa-bolt"></i>
              <div><strong>Dépenser des Points d’Adrénaline ?</strong><span>${contextLabel}</span></div>
            </div>
            <div class="vadentis-pa-current"><span>Résultat actuel</span><strong>${Number.isFinite(Number(currentTotal)) ? Number(currentTotal) : "—"}</strong><small>avant dépense de PA</small></div>
            <div class="vadentis-pa-rule"><strong>1 PA</strong><span>=</span><strong>+1 au résultat final</strong></div>
            <div class="vadentis-pa-available">Vous avez <strong>${available} PA</strong> disponibles.</div>
            <div class="vadentis-pa-picker">
              <button type="button" class="vadentis-pa-step" data-step="-1" aria-label="Retirer un PA">−</button>
              <input type="number" name="paSpent" value="0" min="0" max="${available}" step="1">
              <button type="button" class="vadentis-pa-step" data-step="1" aria-label="Ajouter un PA">+</button>
              <span class="vadentis-pa-picker-label">PA</span>
            </div>
            <div class="vadentis-pa-preview">Résultat du jet <strong>+ <span class="vadentis-pa-preview-value">0</span></strong></div>
          </div>`,
        buttons: {
          apply: {
            icon: '<i class="fas fa-bolt"></i>',
            label: "Renforcer le jet",
            callback: html => {
              const raw = Number(html.find('[name="paSpent"]').val() || 0);
              finish(Math.min(available, Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0))));
            }
          },
          none: { icon: '<i class="fas fa-dice-d20"></i>', label: "Garder le résultat", callback: () => finish(0) }
        },
        default: "apply",
        render: html => {
          const input = html.find('[name="paSpent"]');
          const preview = html.find('.vadentis-pa-preview-value');
          const normalize = value => Math.min(available, Math.max(0, Math.floor(Number(value) || 0)));
          const refresh = value => { const v = normalize(value); input.val(v); preview.text(v); };
          html.find('.vadentis-pa-step').on('click', event => refresh(Number(input.val()) + Number(event.currentTarget.dataset.step || 0)));
          input.on('input change', () => refresh(input.val()));
        },
        close: () => finish(0)
      }, { classes: ["vadentis", "vadentis-pa-window"] }).render(true);
    });

    const bonus = this._vadentisNumber(spent);
    if (bonus > 0) await this.update({ 'system.stats.pointsadrenaline.value': available - bonus });
    return bonus;
  }

  paBonusChat(bonus, rollTotal = null) {
    if (bonus <= 0) return "";
    const before = this._vadentisNumber(rollTotal);
    const final = before + this._vadentisNumber(bonus);
    return `<div class="vadentis-pa-bonus"><span>⚡ Adrénaline : ${bonus} PA</span><strong>${before} + ${bonus} = ${final}</strong><small>Résultat final avec PA</small></div>`;
  }

  /* -------------------------------------------- */
  async rollSort(sortId) {
    let sort = this.items.get(sortId);

    if (sort) {
      sort = foundry.utils.duplicate(sort);
      this.processSortDevotion("sort", sort);
    }
  }

  /* -------------------------------------------- */
  async rollDevotion(devotionId) {
    let devotion = this.items.get(devotionId);

    if (devotion) {
      devotion = foundry.utils.duplicate(devotion);
      this.processSortDevotion("devotion", devotion);
    }
  }

  /* -------------------------------------------- */
  rollSortOuDevotion(sortId) {
    let sort = this.items.get(sortId);
    this.processSortDevotion(sort.type, sort);
  }

  /* -------------------------------------------- */
  async rollTechnique(techniqueId) {
    let technique = this.items.get(techniqueId);

    if (technique) {
      technique = foundry.utils.duplicate(technique);

      let msgData = {
        alias: this.name,
        img: technique.img,
        title: `Technique ${technique.name}`
      };

      if (
        this.system.stats.pointsadrenaline.value <
        technique.system.pacost
      ) {

        msgData.msg =
          `${this.name} n'a pas assez de Points d'Adrénaline ` +
          `pour éxecuter sa technique ${technique.name}`;

      } else {

        let newAdrenaline =
          this.system.stats.pointsadrenaline.value -
          technique.system.pacost;

        await this.update({
          'system.stats.pointsadrenaline.value': newAdrenaline
        });

        msgData.msg =
          `${this.name} execute sa technique ${technique.name}, ` +
          `pour un côut de ${technique.system.pacost} Points d'Adrénaline<br>` +
          `Les effets sont : ${technique.system.effect}`;
      }

      ChatMessage.create({
        content: await renderTemplate(
          `systems/foundryvtt-vadentis/templates/chat-generic-result.html`,
          msgData
        )
      });

    } else {
      ui.notifications.warn("Technique non trouvée");
    }
  }

  /* -------------------------------------------- */
  async rollCompetence(competenceId) {


    let competence = this.items.get(competenceId);

    if (competence) {

      competence = foundry.utils.duplicate(competence);

      let msgData = {
        alias: this.name,
        actorImg: this.getActiveTokens?.()[0]?.document?.texture?.src || this.img,
        img: competence.img,
        rollMode: game.settings.get("core", "rollMode"),
        title: `Compétence ${competence.name}`,
        state: "roll",
        outcome: "JET"
      };

      const equipmentMods = this.getModificateursEquipement();
      const competenceEquip = equipmentMods.competences?.[competence.name] || { bonus: 0, malus: 0 };
      competence.system.equipementBonus = this._vadentisNumber(competenceEquip.bonus);
      competence.system.equipementMalus = this._vadentisNumber(competenceEquip.malus);
      competence.system.equipement = competence.system.equipementBonus + competence.system.equipementMalus;

      const statusMods = this.getModificateursStatuts();
      const competenceStatut = this._vadentisNumber(statusMods.competences?.[competence.name]);
      competence.system.statut = competenceStatut;
      let statValue =
        this._vadentisNumber(competence.system.base) +
        this._vadentisNumber(competence.system.malus) +
        this._vadentisNumber(competence.system.bonus) +
        competence.system.equipement + competenceStatut;

      let formulaFull =
        this.buildTexteFormula(competence.system);

      // Chante-vie : bonus de Compétence ponctuel / temporaire.
      let echoSkillBonus = 0;
      const nextSkill = this.getFlag("foundryvtt-vadentis","echoNextSkillBonus");
      const universal = this.getFlag("foundryvtt-vadentis","echoNextUniversalBonus");
      const timed = this.getFlag("foundryvtt-vadentis","echoBuff");
      if(nextSkill?.value){ echoSkillBonus += Number(nextSkill.value||0); await this.unsetFlag("foundryvtt-vadentis","echoNextSkillBonus"); }
      else if(universal?.value){ echoSkillBonus += Number(universal.value||0); await this.unsetFlag("foundryvtt-vadentis","echoNextUniversalBonus"); }
      if(timed?.expires && Number(timed.expires)>Date.now()) echoSkillBonus += Number(timed.skill||0) + (String(competence.name||"").toLowerCase().includes("perception") ? Number(timed.perception||0) : 0);
      else if(timed?.expires) await this.unsetFlag("foundryvtt-vadentis","echoBuff");
      statValue += echoSkillBonus;
      if(echoSkillBonus) formulaFull += ` + ${echoSkillBonus} (Écho)`;

      let myRoll =
        await VadentisUtility.processRoll(
          "1d20+" + statValue,
          msgData.rollMode
        );
      const naturalResult = myRoll.dice[0].results[0].result;
      const paBonus = (naturalResult === 1 || naturalResult === 20) ? 0 : await this.requestPABonus(`la compétence ${competence.name}`, myRoll.total);
      const finalTotal = myRoll.total + paBonus;
      msgData.result = finalTotal;

      msgData.msg =
        `${formulaFull} => <strong>${myRoll.total}</strong>${this.paBonusChat(paBonus, myRoll.total)}`;


      if (myRoll.dice[0].results[0].result == 1) {
        msgData.critique = true;
        msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_échec_critique.png';
        msgData.msgCritique = "ÉCHEC CRITIQUE";
        msgData.state = "critical-failure";
        msgData.outcome = "ÉCHEC CRITIQUE";

        msgData.state = "critical-failure";
        msgData.outcome = "ÉCHEC CRITIQUE";
        msgData.msg +=
          `<br>C'est un <strong>échec critique</strong> !`;
      }

      if (myRoll.dice[0].results[0].result == 20) {
        msgData.critique = true;
        msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_réussite_critique.png';
        msgData.msgCritique = "RÉUSSITE CRITIQUE";
        msgData.state = "critical-success";
        msgData.outcome = "RÉUSSITE CRITIQUE";

        msgData.state = "critical-success";
        msgData.outcome = "RÉUSSITE CRITIQUE";
        msgData.msg +=
          `<br>C'est une <strong>réussite critique</strong> !`;
      }

      if (["gmroll", "blindroll"].includes(msgData.rollMode)) {
        msgData["whisper"] =
          ChatMessage.getWhisperRecipients("GM").map(u => u.id);
      }

      if (msgData.rollMode === "blindroll") {
        msgData["blind"] = true;
      } else if (msgData.rollMode === "selfroll") {
        msgData["whisper"] = [game.user];
      }

      ChatMessage.create({
        whisper: msgData["whisper"],
        content: await renderTemplate(
          `systems/foundryvtt-vadentis/templates/chat-generic-result.html`,
          msgData
        )
      });

    } else {
      ui.notifications.warn("Compétence non trouvée");
    }
  }

  /* -------------------------------------------- */
  async genericRoll(stat, key) {

    let statValue = this._getCombatValue(stat);
    let formulaFull = this.buildTexteFormula(stat);

    let myRoll =
      await VadentisUtility.processRoll("1d20+" + statValue);
    const naturalResult = myRoll.dice[0].results[0].result;
    const paBonus = (naturalResult === 1 || naturalResult === 20) ? 0 : await this.requestPABonus(VadentisUtility.buildJetText(stat), myRoll.total);
    const finalTotal = myRoll.total + paBonus;

    let msgData = {
      alias: this.name,
      actorImg: this.getActiveTokens?.()[0]?.document?.texture?.src || this.img,
      img: `systems/foundryvtt-vadentis/images/icons/feuille_perso_${key}.webp`,
      title: VadentisUtility.buildJetText(stat),
      state: "roll",
      outcome: "JET",
      result: finalTotal,
      msg: `${formulaFull} => <strong>${myRoll.total}</strong>${this.paBonusChat(paBonus, myRoll.total)}`
    };

    if (myRoll.dice[0].results[0].result == 1) {
      msgData.critique = true;
      msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_échec_critique.png';
      msgData.msgCritique = "ÉCHEC CRITIQUE";
      msgData.state = "critical-failure";
      msgData.outcome = "ÉCHEC CRITIQUE";
      msgData.msg += `<br>C'est un <strong>échec critique</strong> !`;
    }

    if (myRoll.dice[0].results[0].result == 20) {
      msgData.critique = true;
      msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_réussite_critique.png';
      msgData.msgCritique = "RÉUSSITE CRITIQUE";
      msgData.state = "critical-success";
      msgData.outcome = "RÉUSSITE CRITIQUE";
      msgData.msg += `<br>C'est une <strong>réussite critique</strong> !`;
    }

    ChatMessage.create({
      content: await renderTemplate(
        `systems/foundryvtt-vadentis/templates/chat-generic-result.html`,
        msgData
      )
    });
  }

  /* -------------------------------------------- */
  async rollCombat(combatName) {
    let stat = this.system.combat[combatName];
    this.genericRoll(stat, combatName);
  }

  /* -------------------------------------------- */
  rollMagie(magieName) {
    let stat = this.system.magie[magieName];
    this.genericRoll(stat, magieName);
  }

  /* -------------------------------------------- */
  async incrementeArgent(arme) {
    let monnaie = this.items.find(
      item => item.type == 'monnaie' && item.name == arme.name
    );

    if (monnaie) {
      monnaie = foundry.utils.duplicate(monnaie);

      let newValeur = monnaie.system.nombre + 1;

      await this.updateEmbeddedDocuments(
        'Item',
        [{ _id: monnaie._id, 'system.nombre': newValeur }]
      );
    }
  }

  /* -------------------------------------------- */
  async decrementeArgent(arme) {
    let monnaie = this.items.find(
      item => item.type == 'monnaie' && item.name == arme.name
    );

    if (monnaie) {
      monnaie = foundry.utils.duplicate(monnaie);

      let newValeur = monnaie.system.nombre - 1;

      newValeur = (newValeur <= 0) ? 0 : newValeur;

      await this.updateEmbeddedDocuments(
        "Item",
        [{ _id: monnaie._id, 'system.nombre': newValeur }]
      );
    }
  }

  /* -------------------------------------------- */
  async incrementeMunition(arme) {
    let armeTir = this.items.find(
      item => item.type == 'tir' && item.name == arme.name
    );

    if (armeTir) {
      armeTir = foundry.utils.duplicate(armeTir);

      let newMunition = armeTir.system.munition + 1;

      await this.updateEmbeddedDocuments(
        "Item",
        [{ _id: armeTir._id, 'system.munition': newMunition }]
      );
    }
  }

  /* -------------------------------------------- */
  async decrementeMunition(arme) {
    let armeTir = this.items.find(
      item => item.type == 'tir' && item.name == arme.name
    );

    if (armeTir) {
      armeTir = foundry.utils.duplicate(armeTir);

      let newMunition = armeTir.system.munition - 1;

      newMunition = (newMunition <= 0) ? 0 : newMunition;

      await this.updateEmbeddedDocuments(
        "Item",
        [{ _id: armeTir._id, 'system.munition': newMunition }]
      );
    }
  }

  /* -------------------------------------------- */
  async incrementeQuantite(objet) {
    let objetQ = this.items.find(
      item => item._id == objet._id
    );

    if (objetQ) {
      objetQ = foundry.utils.duplicate(objetQ);

      let newQ = objetQ.system.quantite + 1;

      await this.updateEmbeddedDocuments(
        "Item",
        [{ _id: objetQ._id, 'system.quantite': newQ }]
      );
    }
  }

  /* -------------------------------------------- */
  async decrementeQuantite(objet) {
    let objetQ = this.items.find(
      item => item._id == objet._id
    );

    if (objetQ) {
      objetQ = foundry.utils.duplicate(objetQ);

      let newQ = objetQ.system.quantite - 1;

      newQ = (newQ <= 0) ? 0 : newQ;

      await this.updateEmbeddedDocuments(
        "Item",
        [{ _id: objetQ._id, 'system.quantite': newQ }]
      );
    }
  }

  /* -------------------------------------------- */
  async rollArme(armeId) {

    let target = VadentisUtility.getTarget();

    if (target) {

      let arme = this.items.find(
        item =>
          (item.type == 'armecc' || item.type == 'tir') &&
          item.id == armeId
      );

      if (arme) {

        arme = foundry.utils.duplicate(arme);

        if (arme.type == 'tir' && arme.system.munition <= 0) {
          ui.notifications.warn(
            "Vous n'avez plus de munitions avec cette arme."
          );
          return;
        }

        let combatData = {
  attackerActorId: this.id,
  attackerTokenImg: this.getActiveTokens?.()[0]?.document?.texture?.src || this.img,
  attackerTokenId: this.getActiveTokens?.()[0]?.id || "",
  targetActorId: target.actor.id,
  targetTokenImg: target.document?.texture?.src || target.actor?.img || "",
  targetTokenName: target.name || target.actor?.name || "",
  targetTokenId: target.id || target.document?.id || "",
  attackerUserId: game.user.id,
  arme: foundry.utils.duplicate(arme)
};

        if (game.user.isGM) {
          await VadentisUtility.performAttack(combatData);
        } else {
          // Le joueur lance lui-même son d20, puis choisit ses PA avant que le MJ
          // ne résolve l'attaque. Ainsi la fenêtre d'Adrénaline apparaît au bon utilisateur.
          const attaque = this.getAttaqueScore();
          const formulaFull = this.buildTexteFormula(this.system.combat.attaque);
          const myRoll = await VadentisUtility.processRoll("1d20+" + attaque, undefined, game.user);
          const naturalResult = myRoll.dice[0].results[0].result;
          const defense = target.actor.getDefenseScore();
          const isNaturalCritical = naturalResult === 1 || naturalResult >= Number(arme.system.valuecritical || 20);
          const alreadySuccessful = naturalResult > 1 && myRoll.total >= defense;
          const paBonus = (isNaturalCritical || alreadySuccessful) ? 0 : await this.requestPABonus(`l'attaque avec ${arme.name}`, myRoll.total);
          combatData.attackRoll = {
            total: myRoll.total + paBonus,
            natural: myRoll.dice[0].results[0].result,
            formulaFull,
            paBonus
          };
          game.socket.emit(
            "system.foundryvtt-vadentis",
            {
              name: "msg_attack",
              data: combatData
            }
          );
        }
      }

    } else {

      ui.notifications.warn(
        "Vous devez désigner une cible pour attaquer avec une arme."
      );
    }
  }

}