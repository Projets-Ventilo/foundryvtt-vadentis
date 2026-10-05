/**
 * RdD system
 * Author: Uberwald
 * Software License: Prop
 */

/* -------------------------------------------- */

/* -------------------------------------------- */
// Import Modules
import { VadentisActor } from "./vadentis-actor.js";
import { VadentisItemSheet } from "./vadentis-item-sheet.js";
import { VadentisActorSheet } from "./vadentis-actor-sheet.js";
import { VadentisUtility } from "./vadentis-utility.js";
import { VadentisCombat } from "./vadentis-combat.js";
import { VadentisTokenHud } from "./vadentis-hud.js";
import { initVadentisCommerce } from "./vadentis-commerce.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/************************************************************************************/
Hooks.once("init", async function () {

  game.settings.register("foundryvtt-vadentis", "gmFirstWelcomeDone", {scope:"client", config:false, type:Boolean, default:false});
  game.settings.register("foundryvtt-vadentis", "contentMigration201", {scope:"world", config:false, type:Boolean, default:false});
  game.settings.register("foundryvtt-vadentis", "contentMigration202", {scope:"world", config:false, type:Boolean, default:false});
  game.settings.register("foundryvtt-vadentis", "contentMigration204", {scope:"world", config:false, type:Boolean, default:false});

  /* -------------------------------------------- */
  // preload handlebars templates
  VadentisUtility.preloadHandlebarsTemplates();

  /* -------------------------------------------- */
  // Set an initiative formula for the system 
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 0
  };

  /* -------------------------------------------- */
  game.socket.on("system.foundryvtt-vadentis", data => {
    VadentisUtility.onSocketMesssage(data);
  });

  /* -------------------------------------------- */
  // Define custom Entity classes
  CONFIG.Actor.documentClass = VadentisActor;
  CONFIG.Combat.documentClass = VadentisCombat;
  CONFIG.Vadentis = {
  }

  /* -------------------------------------------- */
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("foundryvtt-vadentis", VadentisActorSheet, { types: ["personnage"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("foundryvtt-vadentis", VadentisItemSheet, { makeDefault: true });

  // Init/registers
  Hooks.on('renderChatLog', (log, html, data) => {
    VadentisUtility.registerChatCallbacks(html);
    html.off("click.vadentisTutorial", "[data-vadentis-tutorial]").on("click.vadentisTutorial", "[data-vadentis-tutorial]", event => { event.preventDefault(); openVadentisTutorial(); });
  });
  // Init/registers
  Hooks.on('updateCombat', (combat, round, diff, id) => {
    VadentisUtility.updateCombat(combat, round, diff, id);
    VadentisUtility.processSculptureBurn(combat);
    VadentisUtility.processAlchimiePoison(combat);
  });

  VadentisTokenHud.init();
  initVadentisCommerce();
  
});

/* -------------------------------------------- */
function welcomeMessage() {
  const manualUrl = "https://legacy.drivethrurpg.com/product/507832/VADENTIS--Pack-de-base-Pack-Eclosion?src=also_purchased&filters=0_0_330_0_40031";
  ChatMessage.create({
    user: game.user.id,
    whisper: [game.user.id],
    content: `<div class="vadentis-welcome-card">
      <img src="systems/foundryvtt-vadentis/images/ui/manuel-vadentis.jpg" alt="Couverture du Manuel de jeu Vadentis">
      <div class="vadentis-welcome-copy"><h3>Bienvenue dans Vadentis V2</h3><p>Le manuel et le Pack Éclosion sont disponibles à prix libre.</p>
      <div class="vadentis-welcome-actions"><a href="${manualUrl}" target="_blank" rel="noopener"><i class="fas fa-book-open"></i> Télécharger le manuel à prix libre</a><button type="button" data-vadentis-tutorial><i class="fas fa-graduation-cap"></i> Tutoriels Vadentis</button></div></div></div>`
  });
}

function openVadentisTutorial() {
  const manualUrl = "https://legacy.drivethrurpg.com/product/507832/VADENTIS--Pack-de-base-Pack-Eclosion?src=also_purchased&filters=0_0_330_0_40031";
  const pages = [
    {section:"Sommaire",icon:"fa-book-open",title:"Guide de jeu Vadentis",cover:true,body:`Retrouvez ici les principales fonctions automatisées de Vadentis V2. Choisissez un chapitre dans le sommaire ou parcourez le guide avec Suivant / Précédent.`},
    {section:"Onglet principal",icon:"fa-dna",title:"Données et Églises",body:`Glissez les Items <b>Donnée</b> et <b>Église</b> nécessaires sur la fiche du personnage. Ils alimentent ensuite les informations et fonctions associées à la Maîtrise Données et à la Dévotion.`},
    {section:"Onglet principal",icon:"fa-heart-pulse",title:"PV, PE et PA",body:`La fiche centralise les <b>PV</b>, <b>PE</b> et <b>PA</b>. Les coûts et effets automatisés mettent à jour ces ressources lorsque l'action correspondante est prise en charge par le système.`},
    {section:"Onglet principal",icon:"fa-crosshairs",title:"Combat, ciblage et Sorts",body:`Avant une attaque ou un Sort ciblé, désignez la cible avec Foundry. Vadentis utilise alors les valeurs d'Attaque, Défense et les paramètres du Sort pour résoudre les jets et afficher le résultat dans le chat.`},
    {section:"Onglet principal",icon:"fa-bolt",title:"Statuts",body:`Les Items <b>Statut</b> représentent les états qui affectent un personnage. Ajoutez le Statut prévu par la règle à la fiche ; ses modificateurs configurés sont ensuite pris en compte par les calculs compatibles.`},
    {section:"Onglet principal",icon:"fa-star",title:"Magasin d’XP",body:`Chaque personnage dispose de son magasin d’XP. Les achats vérifient le coût et les prérequis mécaniques. Les conditions narratives restent à valider par le MJ et la table.`},
    {section:"Onglet Capacités",icon:"fa-list-check",title:"Compétences",body:`Les Compétences possèdent une base et les modificateurs prévus par la fiche. Un nouveau personnage reçoit automatiquement les six Compétences de base ; certains Talents ajoutent leurs propres Compétences.`},
    {section:"Onglet Capacités",icon:"fa-hand",title:"Attributs, Techniques et PA",body:`Glissez les <b>Attributs</b> et <b>Techniques</b> depuis les compendiums vers la fiche. Les Techniques utilisant des PA s'appuient sur la réserve du personnage ; surveillez-la avant l'action.`},
    {section:"Onglet Combat",icon:"fa-swords",title:"L’onglet Combat",body:`Cet onglet rassemble les informations utiles aux affrontements : attaques, défense et actions de combat du personnage. Utilisez le ciblage Foundry avant les actions qui affectent une autre créature.`},
    {section:"Onglet Sorts",icon:"fa-wand-magic-sparkles",title:"Sorts élémentaires",body:`Les Sorts élémentaires sont liés aux <b>Données</b> et organisés par Paliers. Le Palier est enregistré dans le Sort lui-même. Les Sorts de Donnée utilisent l'animation Projectile et leurs jets passent par les automatisations de ciblage prévues par Vadentis.`},
    {section:"Onglet Sorts",icon:"fa-hands-praying",title:"Sorts de Dévotion",body:`Les Sorts de Dévotion sont liés à la voie religieuse du personnage. La fiche utilise la Dévotion et les paramètres inscrits dans le Sort pour les jets et effets que le système peut automatiser.`},
    {section:"Onglet Inventaire",icon:"fa-backpack",title:"Inventaire",body:`L'inventaire regroupe équipement, monnaies et ressources. Les quantités et états des Items sont conservés sur le personnage ; certaines ressources sont également partagées avec leur Talent associé.`},
    {section:"Onglet Inventaire",icon:"fa-gem",title:"Les Orbes",body:`Dans Vadentis, les Orbes sont des ressources élémentaires importantes. Pour l'Ingénierie, la réserve affichée dans le Talent et celle de l'inventaire utilisent la même source afin d'éviter deux comptages différents.`},
    {section:"Onglet Talents",icon:"fa-sparkles",title:"Que sont les Talents ?",body:`Les Talents ne sont <b>pas des classes</b>. Ils sont totalement optionnels et représentent des voies particulières qu'un personnage peut acquérir s'il remplit les conditions et dépense l'XP nécessaire.`},
    {section:"Onglet Talents",icon:"fa-layer-group",title:"Les quatre Talents",body:`Vadentis propose quatre voies : <b>Sculpture élémentaire</b>, <b>Alchimie</b>, <b>Ingénierie élémentaire</b> et <b>Chante-vie</b>. Chacune ajoute ses propres outils à la fiche.`},
    {section:"Onglet Talents",icon:"fa-shapes",title:"Sculpture élémentaire",body:`La Sculpture élémentaire s'appuie sur les Données réellement possédées par le personnage et crée les Talents de Sculpture correspondants lorsqu'ils sont acquis.`},
    {section:"Onglet Talents",icon:"fa-flask",title:"Alchimie",body:`L'achat d'Alchimie crée sa Compétence et le Matériel d'Alchimie. L'atelier du Talent présente les préparations, leurs coûts, conditions et utilisations.`},
    {section:"Onglet Talents",icon:"fa-gears",title:"Ingénierie élémentaire",body:`L'Ingénierie crée sa Compétence et son Matériel. Les Orbes servent aux conceptions ; les Assemblages créés sont ensuite suivis depuis leur fenêtre dédiée avec charges et propriétés.`},
    {section:"Onglet Talents",icon:"fa-music",title:"Chante-vie",body:`Chante-vie lie le personnage à son <b>Écho</b>. L'Écho possède ses PV, statistiques, affinités et Chants innés. Chaque pouvoir inné est utilisable une fois par repos et passe visuellement en état UTILISÉ.`},
    {section:"Outils",icon:"fa-store",title:"Les Magasins",body:`Les Items Commerce peuvent fonctionner en <b>Magasin</b>, <b>Loot</b> ou <b>Coffre</b>. Le MJ y dépose le stock, choisit les personnages concernés puis ouvre la session de commerce ou de distribution.`},
    {section:"Outils",icon:"fa-bed",title:"Les repos",body:`Les repos restaurent les ressources prises en charge par leur bouton. Le repos de l'Écho lui rend la moitié de ses PV maximum et réinitialise tous ses pouvoirs innés.`},
    {section:"Outils",icon:"fa-eye",title:"Mode immersif",body:`Le mode immersif sert à alléger l'interface pendant la partie afin de laisser davantage de place à la scène et à l'ambiance. Réactivez l'interface normale lorsque vous devez gérer la fiche ou les outils du MJ.`}
  ];
  let page = 0, dlg;
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const content=()=>{const p=pages[page]; const toc=pages.map((x,n)=>`<button type="button" data-vadentis-page="${n}" class="${n===page?'active':''}"><small>${esc(x.section)}</small>${esc(x.title)}</button>`).join(''); return `<div class="vadentis-tutorial-card vadentis-tutorial-guide">
    <aside class="vadentis-tutorial-toc"><h3>Sommaire</h3>${toc}</aside><section class="vadentis-tutorial-page">
    <div class="vadentis-tutorial-progress"><span>${page+1} / ${pages.length}</span><div>${pages.map((_,n)=>`<i class="${n===page?'active':''}"></i>`).join('')}</div></div>
    ${p.cover?`<a class="vadentis-manual-cover" href="${manualUrl}" target="_blank" rel="noopener"><img src="systems/foundryvtt-vadentis/images/ui/manuel-vadentis.jpg" alt="Manuel Vadentis"><span><i class="fas fa-book-open"></i> Télécharger le manuel à prix libre</span></a>`:`<div class="vadentis-tutorial-hero"><i class="fas ${p.icon}"></i></div>`}
    <small class="vadentis-tutorial-section">${esc(p.section)}</small><h3>${esc(p.title)}</h3><p>${p.body}</p>
    <div class="vadentis-tutorial-nav"><button type="button" data-vadentis-tuto="prev" ${page===0?'disabled':''}><i class="fas fa-chevron-left"></i> Précédent</button><button type="button" data-vadentis-tuto="next" ${page===pages.length-1?'disabled':''}>Suivant <i class="fas fa-chevron-right"></i></button></div>
    </section></div>`;};
  const bind=html=>{html.find('[data-vadentis-tuto]').off('click.vadentisTuto').on('click.vadentisTuto',ev=>{ev.preventDefault();page=Math.max(0,Math.min(pages.length-1,page+(ev.currentTarget.dataset.vadentisTuto==='next'?1:-1)));dlg.element.find('.dialog-content').html(content());bind(dlg.element);});html.find('[data-vadentis-page]').off('click.vadentisPage').on('click.vadentisPage',ev=>{ev.preventDefault();page=Number(ev.currentTarget.dataset.vadentisPage)||0;dlg.element.find('.dialog-content').html(content());bind(dlg.element);});};
  dlg=new Dialog({title:"Guide & Tutoriels Vadentis",content:content(),buttons:{close:{icon:'<i class="fas fa-xmark"></i>',label:"Fermer"}},render:html=>bind(html)},{width:900,height:720,resizable:true}); dlg.render(true);
}

async function vadentisFirstGMWelcome() {
  if (!game.user.isGM || game.settings.get("foundryvtt-vadentis","gmFirstWelcomeDone")) return;
  const pack=game.packs.get("foundryvtt-vadentis.maps");
  if (!pack) return;
  try {
    const index=await pack.getIndex();
    const entry=index.find(e=>/carte|monde|world/i.test(e.name)) || index[0];
    if (!entry) return;
    let scene=game.scenes.find(sc=>sc.getFlag("foundryvtt-vadentis","welcomeMapSource")===entry._id);
    if (!scene) {
      const doc=await pack.getDocument(entry._id);
      const data=game.scenes.fromCompendium(doc);
      data.flags={...(data.flags||{}),"foundryvtt-vadentis":{...(data.flags?.["foundryvtt-vadentis"]||{}),welcomeMapSource:entry._id}};
      scene=await Scene.create(data);
    }
    const observer = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
    await scene.update({"ownership.default":observer});
    if (typeof scene.activate === "function") await scene.activate();
    else await scene.update({active:true});
    await scene.view();
    await game.settings.set("foundryvtt-vadentis","gmFirstWelcomeDone",true);
  } catch(err) { console.warn("Vadentis | Impossible d’ouvrir automatiquement la carte du monde",err); }
}

function vadentisTierFromFolder(folder) {
  let current=folder;
  while(current) {
    const n=String(current.name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    if(/palier\s*(iii|3)\b/.test(n)) return "III";
    if(/palier\s*(ii|2)\b/.test(n)) return "II";
    current=current.folder;
  }
  return null;
}

async function migrateVadentis202Content() {
  if (!game.user.isGM || game.settings.get("foundryvtt-vadentis","contentMigration202")) return;
  let changed=0;

  // Sorts déjà importés dans le monde.
  const worldUpdates=[];
  for (const item of game.items) {
    if (item.type!=="sort") continue;
    const patch={_id:item.id};
    const palier=vadentisTierFromFolder(item.folder);
    if(palier && String(item.system?.palier||"")!==palier) patch["system.palier"]=palier;
    if(item.system?.donnee && item.system?.animation!=="projectile") patch["system.animation"]="projectile";
    if(Object.keys(patch).length>1) worldUpdates.push(patch);
  }
  if(worldUpdates.length) { await Item.updateDocuments(worldUpdates); changed+=worldUpdates.length; }

  // Sorts du compendium officiel : le dossier du document fait foi pour le Palier.
  const pack=game.packs.get("foundryvtt-vadentis.sorts");
  if(pack) {
    const wasLocked=!!pack.locked;
    try {
      if(wasLocked && typeof pack.configure === "function") await pack.configure({locked:false});
      const docs=await pack.getDocuments();
      const updates=[];
      for(const item of docs) {
        if(item.type!=="sort") continue;
        const patch={_id:item.id};
        const palier=vadentisTierFromFolder(item.folder);
        if(palier && String(item.system?.palier||"")!==palier) patch["system.palier"]=palier;
        if(item.system?.donnee && item.system?.animation!=="projectile") patch["system.animation"]="projectile";
        if(Object.keys(patch).length>1) updates.push(patch);
      }
      if(updates.length) {
        const cls=pack.documentClass;
        if(cls?.updateDocuments) await cls.updateDocuments(updates,{pack:pack.collection});
        else for(const patch of updates) { const doc=await pack.getDocument(patch._id); const {_id,...data}=patch; await doc.update(data); }
        changed+=updates.length;
      }
    } catch(err) {
      console.warn("Vadentis | Migration des Sorts du compendium impossible",err);
      ui.notifications.warn("Vadentis : la mise à jour automatique du compendium Sorts n’a pas pu être terminée. Consultez la console du MJ.");
      return;
    } finally {
      if(wasLocked && typeof pack.configure === "function") await pack.configure({locked:true});
    }
  }

  await game.settings.set("foundryvtt-vadentis","contentMigration202",true);
  ui.notifications.info(`Vadentis V2.0.2 : migration terminée (${changed} Sort(s) réactualisé(s)).`);
}


async function migrateVadentis204Content() {
  if (!game.user.isGM || game.settings.get("foundryvtt-vadentis","contentMigration204")) return;
  try {
    // Prépare le dossier Commerce et ses trois modèles dans le répertoire mondial des Items.
    let folder=game.folders.find(f=>f.type==="Item" && f.name==="Commerce" && !f.folder);
    if(!folder) folder=await Folder.create({name:"Commerce",type:"Item",sorting:"a"});
    const defs=[
      {name:"Magasin",mode:"magasin",img:"icons/svg/shop.svg"},
      {name:"Loot",mode:"loot",img:"icons/svg/chest.svg"},
      {name:"Coffre",mode:"coffre",img:"icons/svg/chest.svg"}
    ];
    for(const d of defs) if(!game.items.some(i=>i.type==="commerce"&&i.name===d.name)) await Item.create({name:d.name,type:"commerce",img:d.img,folder:folder.id,system:{mode:d.mode,stock:[],actorIds:[],carts:{}}});

    // Harmonise aussi les icônes des Talents déjà présents dans le monde.
    const talentIcon = item => {
      const key=String(item.system?.talentType||item.name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
      if(key.includes("alchim")) return "systems/foundryvtt-vadentis/images/icons/talents/alchimie.png";
      if(key.includes("ingenier")) return "systems/foundryvtt-vadentis/images/icons/talents/ingenierie-elementaire.png";
      if(key.includes("chante")) return "systems/foundryvtt-vadentis/images/icons/talents/chante-vie.png";
      if(key.includes("sculpt")) return "systems/foundryvtt-vadentis/images/icons/talents/sculpture-elementaire.png";
      return null;
    };
    for(const actor of game.actors){const ups=[];for(const item of actor.items){if(item.type!=="talent")continue;const img=talentIcon(item);if(img&&item.img!==img)ups.push({_id:item.id,img});}if(ups.length)await actor.updateEmbeddedDocuments("Item",ups);}
    const worldTalentUpdates=[];for(const item of game.items){if(item.type!=="talent")continue;const img=talentIcon(item);if(img&&item.img!==img)worldTalentUpdates.push({_id:item.id,img});}if(worldTalentUpdates.length)await Item.updateDocuments(worldTalentUpdates);

    // Les anciens archétypes peuvent encore contenir le libellé historique dans leurs données.
    const pack=game.packs.get("foundryvtt-vadentis.pj-archetypes");
    if(pack){const locked=!!pack.locked;try{if(locked&&pack.configure)await pack.configure({locked:false});const docs=await pack.getDocuments();const replace=v=>{if(typeof v==="string")return v.replaceAll("Maîtrise élémentaire","Maîtrise Données").replaceAll("Maitrise élémentaire","Maîtrise Données").replaceAll("Maitrise elementaire","Maîtrise Données");if(Array.isArray(v))return v.map(replace);if(v&&typeof v==="object"){for(const k of Object.keys(v))v[k]=replace(v[k]);}return v;};for(const actor of docs){const data=replace(foundry.utils.deepClone(actor.system));if(JSON.stringify(data)!==JSON.stringify(actor.system))await actor.update({system:data},{render:false});const ups=[];for(const item of actor.items){const patch={_id:item.id};let changed=false;const img=talentIcon(item);if(img&&item.img!==img){patch.img=img;changed=true;}const itemData=replace(foundry.utils.deepClone(item.system));if(JSON.stringify(itemData)!==JSON.stringify(item.system)){patch.system=itemData;changed=true;}if(changed)ups.push(patch);}if(ups.length)await actor.updateEmbeddedDocuments("Item",ups);}}finally{if(locked&&pack.configure)await pack.configure({locked:true});}}
    await game.settings.set("foundryvtt-vadentis","contentMigration204",true);
    ui.notifications.info("Vadentis : Commerce et archétypes V2 vérifiés.");
  } catch(err) { console.warn("Vadentis | Migration V2.0.4 incomplète",err); ui.notifications.warn("Vadentis : une migration V2.0.4 n’a pas pu être terminée. Consultez la console MJ."); }
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("ready", function () {

  // User warning
  if (!game.user.isGM && game.user.character == undefined) {
    ui.notifications.info("Attention ! Vous n'est connecté à aucun personnage");
    ChatMessage.create({
      content: "<b>WARNING</b> Le joueur  " + game.user.name + " n'est pas connecté à un personnage !",
      user: game.user._id
    });
  }
  welcomeMessage();
  migrateVadentis202Content();
  migrateVadentis204Content();
  vadentisFirstGMWelcome();
});

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.on("chatMessage", (html, content, msg) => {
  // Réservé aux futures commandes de chat Vadentis.
  return true;
});

/* -------------------------------------------- */
/*  Contrôles de repos globaux réservés au MJ   */
/* -------------------------------------------- */
Hooks.on("renderPlayerList", (app, html) => {
  if (!game.user.isGM) return;
  if (html.find?.(".vadentis-gm-rest-controls").length) return;

  const controls = $(`
    <div class="vadentis-gm-rest-controls" title="Avec une sélection : applique le repos aux personnages sélectionnés. Sans sélection : aux personnages des joueurs connectés.">
      <button type="button" class="vadentis-gm-rest" data-rest="repos"><i class="fas fa-bed"></i> Repos</button>
      <button type="button" class="vadentis-gm-rest bad" data-rest="mauvais"><i class="fas fa-tired"></i> Mauvais repos</button>
    </div>
  `);

  controls.on("click", ".vadentis-gm-rest", async event => {
    event.preventDefault();
    const type = event.currentTarget.dataset.rest;
    const actors = [];
    const seen = new Set();

    // Priorité aux tokens actuellement sélectionnés sur la scène.
    // Cela permet au MJ de faire reposer des personnages même si leurs joueurs
    // ne sont pas connectés. Un Actor n'est traité qu'une seule fois, même si
    // plusieurs de ses tokens sont sélectionnés.
    const controlled = canvas?.tokens?.controlled ?? [];
    for (const token of controlled) {
      const actor = token?.actor;
      if (!actor || actor.type !== "personnage" || seen.has(actor.id)) continue;
      seen.add(actor.id);
      actors.push(actor);
    }

    // Si aucun token n'est sélectionné, on conserve le comportement historique :
    // le repos s'applique aux personnages attribués aux joueurs connectés.
    const usedSelection = actors.length > 0;
    if (!usedSelection) {
      for (const user of game.users) {
        if (!user.active || user.isGM || !user.character) continue;
        const actor = user.character;
        if (actor.type !== "personnage" || seen.has(actor.id)) continue;
        seen.add(actor.id);
        actors.push(actor);
      }
    }

    if (!actors.length) {
      ui.notifications.warn("Vadentis : sélectionnez un ou plusieurs personnages sur la scène, ou connectez des joueurs à leurs personnages.");
      return;
    }

    for (const actor of actors) await actor.repos(type);
    const source = usedSelection ? "sélectionné" : "connecté";
    ui.notifications.info(`Vadentis : ${type === "repos" ? "repos" : "mauvais repos"} appliqué à ${actors.length} personnage${actors.length > 1 ? "s" : ""} ${source}${actors.length > 1 ? "s" : ""}.`);
  });

  html.addClass?.("vadentis-player-list-with-rest");
  html.append(controls);
});

/* -------------------------------------------- */
/*  Mode immersif Vadentis                      */
/* -------------------------------------------- */
function initVadentisImmersiveMode() {
  const STORAGE_KEY = "vadentis-immersive-mode";

  const ensureUI = () => {
    if (!document.getElementById("vadentis-immersive-frame")) {
      const frame = document.createElement("div");
      frame.id = "vadentis-immersive-frame";
      frame.setAttribute("aria-hidden", "true");
      frame.innerHTML = `
        <div class="vadentis-immersive-edge edge-top"></div>
        <div class="vadentis-immersive-edge edge-right"></div>
        <div class="vadentis-immersive-edge edge-bottom"></div>
        <div class="vadentis-immersive-edge edge-left"></div>
        <div class="vadentis-immersive-corner corner-tl">⚙</div>
        <div class="vadentis-immersive-corner corner-tr">❧</div>
        <div class="vadentis-immersive-corner corner-bl">❧</div>
        <div class="vadentis-immersive-corner corner-br">⚙</div>
        <div class="vadentis-immersive-brand"><img src="systems/foundryvtt-vadentis/images/ui/logo_transparent.webp" alt=""></div>
        <div class="vadentis-immersive-sigils sigils-left" aria-hidden="true"></div>
        <div class="vadentis-immersive-sigils sigils-right" aria-hidden="true"></div>`;

      const dataIcons = game.items?.filter(i => i.type === "donnee" && i.img)?.slice(0, 3) ?? [];
      const devotionIcons = game.items?.filter(i => ["eglise", "devotion"].includes(i.type) && i.img)?.slice(0, 3) ?? [];
      const fillSigils = (selector, items, fallback) => {
        const host = frame.querySelector(selector);
        if (!host) return;
        host.innerHTML = items.length
          ? items.map(i => `<img src="${i.img}" alt="">`).join("")
          : fallback.map(g => `<span>${g}</span>`).join("");
      };
      fillSigils(".sigils-left", dataIcons, ["✦", "⚡", "❖"]);
      fillSigils(".sigils-right", devotionIcons, ["☼", "✧", "❧"]);
      document.body.appendChild(frame);
    }

    if (!document.getElementById("vadentis-immersive-toggle")) {
      const button = document.createElement("button");
      button.id = "vadentis-immersive-toggle";
      button.type = "button";
      button.title = "Mode immersif Vadentis";
      button.innerHTML = `<i class="fas fa-expand"></i><span> Mode immersif</span>`;
      button.addEventListener("click", async () => {
        const active = document.body.classList.contains("vadentis-immersive-active");
        if (active) await setImmersive(false);
        else await setImmersive(true, true);
      });
      document.body.appendChild(button);
    }
  };

  const refreshButton = () => {
    const active = document.body.classList.contains("vadentis-immersive-active");
    const button = document.getElementById("vadentis-immersive-toggle");
    if (!button) return;
    button.classList.toggle("is-active", active);
    button.title = active ? "Quitter le mode immersif Vadentis" : "Mode immersif Vadentis";
    button.innerHTML = active
      ? `<i class="fas fa-compress"></i><span> Quitter l’immersion</span>`
      : `<i class="fas fa-expand"></i><span> Mode immersif</span>`;
  };

  const setImmersive = async (enabled, requestBrowserFullscreen = false) => {
    ensureUI();
    document.body.classList.toggle("vadentis-immersive-active", enabled);
    try { localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0"); } catch (_) {}

    if (enabled && requestBrowserFullscreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      } catch (err) {
        console.debug("Vadentis | Plein écran navigateur indisponible, mode immersif visuel conservé.", err);
        ui.notifications?.info("Vadentis : immersion activée. Le navigateur n’a pas autorisé le plein écran complet.");
      }
    } else if (!enabled && document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (_) {}
    }
    refreshButton();
  };

  ensureUI();
  // On restaure l'habillage, mais pas le plein écran navigateur : celui-ci exige
  // volontairement une action utilisateur dans les navigateurs modernes.
  let restore = false;
  try { restore = localStorage.getItem(STORAGE_KEY) === "1"; } catch (_) {}
  if (restore) document.body.classList.add("vadentis-immersive-active");
  refreshButton();

  document.addEventListener("fullscreenchange", () => {
    // Échap doit toujours être une vraie porte de sortie : si l'utilisateur
    // quitte le plein écran navigateur, on retire aussi le cadre immersif.
    if (!document.fullscreenElement && document.body.classList.contains("vadentis-immersive-active")) {
      document.body.classList.remove("vadentis-immersive-active");
      try { localStorage.setItem(STORAGE_KEY, "0"); } catch (_) {}
      refreshButton();
    }
  });
}

Hooks.once("ready", initVadentisImmersiveMode);

/* VADENTIS — les nouveaux Tokens placés depuis un Actor sont liés par défaut. */
Hooks.on("preCreateToken", (tokenDocument, data) => {
  if (data?.actorId && data.actorLink !== true) tokenDocument.updateSource({actorLink:true});
});
