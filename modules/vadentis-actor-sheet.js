/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { VadentisUtility } from "./vadentis-utility.js";
import { VadentisXPShop } from "./vadentis-xp-shop.js";
import { VadentisAssemblagesWindow } from "./vadentis-assemblages-window.js";

/* -------------------------------------------- */
export class VadentisActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["vadentis", "sheet", "actor"],
      template: "systems/foundryvtt-vadentis/templates/actor-sheet.html",
      width: 1050,
      height: 820,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
      editScore: true
    });
  }

  /* -------------------------------------------- */
  async getData() {
    this.actor.calculerSommeStats();

    let actorData = foundry.utils.duplicate(this.object.system);

    // Les totaux sont calculés explicitement sur la copie destinée au template.
    // Cela évite les valeurs vides dans Principal / Résumé Combat si Foundry
    // ne conserve pas une propriété calculée ajoutée directement à actor.system.
    const statusMods = this.actor.getModificateursStatuts();
    const equipmentMods = this.actor.getModificateursEquipement();
    for (const [key, stat] of Object.entries(actorData.combat || {})) {
      stat.statut = Number(statusMods[key] || 0);
      stat.equipementBonus = Number(equipmentMods.stats?.[key]?.bonus || 0);
      stat.equipementMalus = Number(equipmentMods.stats?.[key]?.malus || 0);
      stat.equipement = stat.equipementBonus + stat.equipementMalus;
      stat.total = this.actor._getCombatValue(stat);
    }
    for (const [key, stat] of Object.entries(actorData.magie || {})) {
      stat.statut = Number(statusMods[key] || 0);
      stat.equipementBonus = Number(equipmentMods.stats?.[key]?.bonus || 0);
      stat.equipementMalus = Number(equipmentMods.stats?.[key]?.malus || 0);
      stat.equipement = stat.equipementBonus + stat.equipementMalus;
      stat.total = this.actor._getCombatValue(stat);
    }

    let formData = {
      title: this.title,
      id: this.object.id,
      type: this.object.type,
      img: this.object.img,
      name: this.object.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      data: actorData,
      effects: this.object.effects.map(e => foundry.utils.deepClone(e.data)),
      limited: this.object.limited,
      options: this.options,
      owner: this.document.isOwner,
      editScore: this.options.editScore,
      isGM: game.user.isGM,
      history: await TextEditor.enrichHTML(this.object.system.history, { async: true }),
      notes: await TextEditor.enrichHTML(this.object.system.notes, { async: true }),
      gmnotes: await TextEditor.enrichHTML(this.object.system.gmnotes, { async: true }),
    }

    formData.editScore = this.options.editScore;
    formData.donnees = this.actor.getDonnees();
    formData.eglises = this.actor.getEglises();
    formData.competences = this.actor.getCompetences().map(competence => {
      const mod = equipmentMods.competences?.[competence.name] || { bonus: 0, malus: 0 };
      competence.equipementBonus = Number(mod.bonus || 0);
      competence.equipementMalus = Number(mod.malus || 0);
      competence.equipement = competence.equipementBonus + competence.equipementMalus;
      competence.statut = Number(statusMods.competences?.[competence.name] || 0);
      competence.total = Number(competence.system.base || 0) + Number(competence.system.malus || 0) + Number(competence.system.bonus || 0) + competence.equipement + competence.statut;
      return competence;
    });
    formData.sorts = this.actor.getSorts();

    const sortsPaliers = this.actor.getFlag("foundryvtt-vadentis", "sortsPaliers") || {};
    formData.sortsParDonnee = this.actor.getSortsParDonnee(sortsPaliers);
    // Chaque sort affiche l’icône de sa Donnée source dans sa propre ligne.
    for (const donnee of formData.sortsParDonnee) {
      for (const palier of donnee.paliers) {
        for (const sort of palier.sorts) sort.sourceImg = donnee.img;
      }
    }

    formData.devotions = this.actor.getDevotions();
formData.devotionsParEglise = formData.eglises.map(eglise => {
  return {
    id: eglise.id,
    name: eglise.name,
    img: eglise.img,
    devotions: formData.devotions.filter(devotion => {
      return devotion.system.eglise === eglise.name;
    }).sort((a, b) => Number(foundry.utils.getProperty(a, "flags.foundryvtt-vadentis.spellOrder") ?? a.sort ?? 0) - Number(foundry.utils.getProperty(b, "flags.foundryvtt-vadentis.spellOrder") ?? b.sort ?? 0))
      .map(devotion => ({ ...devotion, sourceImg: eglise.img }))
  };
});
    formData.attributs = this.actor.getAttributs();
    formData.techniques = this.actor.getTechniques();

    // Talents : les Sculptures élémentaires sont regroupées dans UNE seule page
    // « Sculpture élémentaire ». Les autres Talents conservent chacun leur page.
    const rawTalents = this.actor.getTalents();
    const preparedTalents = [];
    const sculptures = [];

    // Résolution légère des icônes de Données pour les Talents.
    // IMPORTANT : ce helper doit être déclaré AVANT la préparation des Sculptures.
    // L'étape 12 appelait par erreur findSourceImg avant son initialisation, ce qui
    // empêchait l'ouverture de toute feuille possédant une Sculpture.
    const normalizeTalentSourceName = value => String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[’']/g, "'").trim();
    const findTalentDonneeImg = name => {
      const wanted = normalizeTalentSourceName(name);
      if (!wanted) return "";
      const pool = [...this.actor.items, ...game.items].filter(i => i.type === "donnee" && i.img);
      const exact = pool.find(i => normalizeTalentSourceName(i.name) === wanted);
      if (exact) return exact.img;
      const fuzzy = pool.find(i => {
        const candidate = normalizeTalentSourceName(i.name);
        return candidate.includes(wanted) || wanted.includes(candidate);
      });
      return fuzzy?.img || "";
    };
    const talentTypeInfo = (talent) => {
      const talentType = String(talent.system.talentType || "").trim().toLowerCase();
      const talentName = String(talent.name || "").trim().toLowerCase();
      const isSculpture = talentType === "sculpture"
        || Boolean(String(talent.system.sculptureDonnee || "").trim())
        || talentName.includes("sculpture élémentaire")
        || talentName.includes("sculpture elementaire");
      let theme = "default";
      let iconClass = "fas fa-gem";
      if (isSculpture) { theme = "sculpture"; iconClass = "fas fa-draw-polygon"; }
      else if (talentType === "alchimie" || talentName.includes("alchim")) { theme = "alchimie"; iconClass = "fas fa-flask"; }
      else if (talentType === "ingenierie" || talentType === "ingénierie" || talentName.includes("ingénierie") || talentName.includes("ingenierie")) { theme = "ingenierie"; iconClass = "fas fa-cogs"; }
      else if (talentType === "chante-vie" || talentType === "chantevie" || talentName.includes("chante-vie") || talentName.includes("chante vie")) { theme = "chantevie"; iconClass = "fas fa-paw"; }
      const systemIcons = {
        sculpture: "systems/foundryvtt-vadentis/images/icons/talents/sculpture-elementaire.png",
        alchimie: "systems/foundryvtt-vadentis/images/icons/talents/alchimie.png",
        ingenierie: "systems/foundryvtt-vadentis/images/icons/talents/ingenierie-elementaire.png",
        chantevie: "systems/foundryvtt-vadentis/images/icons/talents/chante-vie.png"
      };
      return { isSculpture, theme, iconClass, systemIcon: systemIcons[theme] || talent.img };
    };

    for (const talent of rawTalents) {
      talent.descriptionHtml = await TextEditor.enrichHTML(talent.system.description || "", { async: true });
      talent.notesHtml = await TextEditor.enrichHTML(talent.system.notes || "", { async: true });
      const info = talentTypeInfo(talent);
      talent.isSculpture = info.isSculpture;
      talent.talentTheme = info.theme;
      talent.talentIconClass = info.iconClass;
      talent.talentSystemIcon = info.systemIcon;
      talent.isAlchimie = info.theme === "alchimie";
      talent.isIngenierie = info.theme === "ingenierie";
      talent.isChanteVie = info.theme === "chantevie";
      if (talent.isChanteVie) {
        // Valeurs de présentation sûres pour les anciens Items Chante-vie :
        // les champs ajoutés par les étapes récentes n'existent pas forcément encore dans leurs données persistées.
        const es = talent.system || {};
        const skillDefaults = {athletisme:1, habilete:1, perception:1, mental:1, social:0, connaissances:0};
        talent.echoView = {
          hp: Number(es.echoHp ?? es.echoHpMax ?? 0),
          hpMax: Number(es.echoHpMax ?? 0),
          skills: Object.fromEntries(Object.entries(skillDefaults).map(([k,v]) => [k, Number(es.echoSkills?.[k] ?? v)])),
          attack: Number(es.echoAttack ?? 2), defense: Number(es.echoDefense ?? 9), force: Number(es.echoForce ?? 1),
          speed: Number(es.echoSpeed ?? 6),
          damageDice: Math.max(Number(es.echoDamageDice ?? 1), 1 + Number(es.echoDamageUpgrade ?? 0)),
          attackName: String(es.echoAttackName || 'Attaque naturelle')
        };

        // Affinités acquises : affichage du pouvoir narratif + icône de la Donnée possédée.
        const affinityPowers = {
          "Feu": ["Flamme complice", "L’Écho peut produire une petite flamme non brûlante et une lumière que seules les cibles désignées peuvent voir."],
          "Eau": ["Souffle des profondeurs", "L’Écho et son Chante-vie peuvent respirer sous l’eau à proximité ; l’Écho s’y déplace naturellement."],
          "Vent": ["Vents compagnons", "L’Écho peut ralentir une chute, déplacer de petits objets très légers et produire une brise."],
          "Terre": ["Oreille de pierre", "L’Écho perçoit les vibrations et déplacements proches transmis par le sol ou une paroi."],
          "Foudre": ["Courants partagés", "L’Écho permet une communication silencieuse rudimentaire entre plusieurs créatures consentantes."],
          "Lumière": ["Reflets révélateurs", "L’Écho peut modifier ou supprimer un reflet, provoquer un scintillement et révéler certaines traces discrètes."]
        };
        const normEcho = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
        const rawAff = Array.isArray(es.echoAffinities) ? es.echoAffinities : (es.echoAffinity ? [es.echoAffinity] : []);
        talent.echoAffinitiesView = rawAff.map(name => {
          const dataItem = this.actor.items.find(i => i.type === "donnee" && (
            normEcho(i.name) === normEcho(name) ||
            normEcho(i.name) === `donnee ${normEcho(name)}` ||
            normEcho(i.name) === `donnee de ${normEcho(name)}` ||
            normEcho(i.name) === `donnee du ${normEcho(name)}`
          ));
          const power = affinityPowers[name] || ["Affinité de Donnée", "L’Écho manifeste son affinité avec cette Donnée."];
          return { name, title: power[0], effect: power[1], img: dataItem?.img || "" };
        });
        const powerBook = {
          joie: [
            ['murmure-vivifiant','Murmure vivifiant','Écho-murmuré','Rend 5 PV à une cible.','fa-heart'],
            ['refrain-vivifiant','Refrain vivifiant','Écho-chanté','Rend 5 PV à une cible et retire un malus de −5.','fa-heart-circle-plus'],
            ['melodie-vivifiante','Mélodie vivifiante','Écho-mélodieux','Rend 10 PV à une cible.','fa-notes-medical'],
            ['symphonie-vivifiante','Symphonie vivifiante','Écho-symphonique','Rend 10 PV à une cible et retire un malus de −10.','fa-heart-pulse']
          ],
          colere: [
            ['note-courroucee','Note courroucée','Écho-murmuré','La prochaine Attaque ou le prochain Sort à cible unique de l’allié désigné inflige +3 dégâts.','fa-bolt'],
            ['accord-vengeur','Accord vengeur','Écho-chanté','La prochaine Attaque ou le prochain Sort à cible unique de l’allié désigné inflige +5 dégâts.','fa-bolt'],
            ['crescendo-vengeur','Crescendo vengeur','Écho-mélodieux','La prochaine Attaque ou le prochain Sort à cible unique de l’allié désigné inflige +7 dégâts.','fa-fire'],
            ['courroux-orchestral','Courroux orchestral','Écho-symphonique','La prochaine Attaque ou le prochain Sort à cible unique de l’allié désigné inflige +10 dégâts.','fa-fire-flame-curved']
          ],
          peur: [
            ['souffle-alerte','Souffle d’alerte','Écho-murmuré','Pendant 1 h, le personnage lié à l’Écho obtient +5 en Perception et +5 en Initiative.','fa-eye'],
            ['sifflement-prescience','Sifflement de préscience','Écho-chanté','Pendant 1 h, le personnage lié à l’Écho obtient +10 en Perception et +10 en Initiative.','fa-eye'],
            ['paroles-silencieuses','Paroles silencieuses','Écho-mélodieux','Pendant 1 h, tous les personnages obtiennent +5 en Perception et +5 en Initiative.','fa-users-viewfinder'],
            ['chorale-sens','Chorale des sens','Écho-symphonique','Un personnage désigné possède automatiquement l’Initiative la plus haute pendant tout l’Affrontement.','fa-music']
          ],
          chagrin: [
            ['note-plaintive','Note plaintive','Écho-murmuré','L’Écho absorbe et subit 5 dégâts à la place d’une cible dans un rayon de 9 m.','fa-shield-heart'],
            ['accord-endolori','Accord endolori','Écho-chanté','L’Écho absorbe et subit 10 dégâts à la place d’une cible dans un rayon de 18 m.','fa-shield-heart'],
            ['melopee-resonante','Mélopée résonante','Écho-mélodieux','L’Écho absorbe et subit 15 dégâts à la place d’une cible dans un rayon de 18 m.','fa-shield'],
            ['elegie-ensemble','Élégie d’ensemble','Écho-symphonique','Pendant 1 tour, l’Écho absorbe et subit jusqu’à 15 dégâts, au total, à la place des cibles dans un rayon de 18 m.','fa-people-group']
          ],
          espoir: [
            ['murmure-encourageant','Murmure encourageant','Écho-murmuré','Octroie +5 à un test de Compétence d’une cible dans un rayon de 18 m.','fa-star'],
            ['refrain-relaxant','Refrain relaxant','Écho-chanté','Pendant 10 min, octroie +3 aux tests de Compétence des cibles dans un rayon de 18 m.','fa-music'],
            ['chant-volonte','Chant de volonté','Écho-mélodieux','Octroie +10 à un test de Compétence d’une cible dans un rayon de 18 m.','fa-star-of-life'],
            ['hymne-triomphant','Hymne triomphant','Écho-symphonique','Octroie +10 à un test de Compétence, d’Attaque, de Maîtrise Données ou de Dévotion d’une cible dans un rayon de 18 m.','fa-crown']
          ]
        };
        const tierCount = {'Écho-murmuré':1,'Écho-chanté':2,'Écho-mélodieux':3,'Écho-symphonique':4};
        const used = es.echoPowersUsed || {};
        talent.echoPowers = (powerBook[String(es.echoEmotion || '').toLowerCase()] || []).slice(0, tierCount[es.echoTier] || 0).map(p => ({key:p[0], name:p[1], tier:p[2], effect:p[3], icon:p[4], used:!!used[p[0]]}));
      }
      if (talent.isAlchimie) {
        const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const alchimieComp = formData.competences.find(c => normalize(c.name) === "alchimie");
        talent.alchimieCompetence = alchimieComp ? Number(alchimieComp.total || 0) : null;
        talent.alchimieConceptions = this.actor.getAlchimieConceptions();
        const va = this.actor.getAlchimieVAItem();
        talent.alchimieVA = va ? Number(va.system?.nombre ?? 0) : null;
        talent.alchimieVAFound = !!va;
        talent.alchimieVAName = va?.name || "Matériel d’Alchimie";
      }
      if (talent.isIngenierie) {
        const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const comp = formData.competences.find(c => normalize(c.name) === "ingenierie elementaire");
        talent.ingenierieCompetence = comp ? Number(comp.total || 0) : null;
        talent.ingenierieAssemblages = this.actor.getIngenierieAssemblages();
        talent.ingenierieOrbSummary = this.actor.getIngenierieOrbSummary();
        const mat = this.actor.getIngenierieMaterialItem();
        talent.ingenierieMaterial = mat ? Number(mat.system?.nombre ?? 0) : null;
        talent.ingenierieMaterialFound = !!mat;
      }
      if (talent.isSculpture) {
        talent.sculptureSegment = talent.system.sculptureSuperieure ? 6 : 3;
        const donneeName = String(talent.system.sculptureDonnee || "").trim();
        const normalized = donneeName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        talent.sculptureDonneeKey = normalized;
        // Réutilise la même recherche robuste que les autres zones de la feuille :
        // acteur -> Items du monde -> compendiums. Cela retrouve aussi « Donnée du Feu », etc.
        talent.sculptureDonneeImg = findTalentDonneeImg(donneeName) || "icons/svg/aura.svg";
        const effects = {
          feu: { hostile: "1D6 dégâts + 1D4 dégâts au début du prochain tour.", favorable: "+2 Attaque pendant 1 tour." },
          eau: { hostile: "1D4 dégâts et Défense -2 pendant 1 tour.", favorable: "+2 Défense pendant 1 tour." },
          vent: { hostile: "1D4 dégâts et projection de 2m dans la direction choisie.", favorable: "+3m de Déplacement pendant 1 tour." },
          terre: { hostile: "1D8 dégâts ; le Trait forme un terrain difficile.", favorable: "Réduction de 1D4 dégâts subis pendant 1 tour." },
          foudre: { hostile: "1D6 dégâts et Attaque -2 pendant 1 tour.", favorable: "+2 Initiative et +2 Attaque pendant 1 tour." }
        }[normalized] || { hostile: "Configurez la Donnée du Talent pour afficher ses effets.", favorable: "Configurez la Donnée du Talent pour afficher ses effets." };
        talent.sculptureHostileEffect = effects.hostile;
        talent.sculptureFavorableEffect = effects.favorable;
        sculptures.push(talent);
      } else preparedTalents.push(talent);
    }

    // Une seule entrée/page Sculpture, quel que soit le nombre de Données sculptées.
    if (sculptures.length) {
      preparedTalents.unshift({
        _id: "vadentis-sculpture-group", id: "vadentis-sculpture-group",
        name: "Sculpture élémentaire", isSculptureGroup: true, talentTheme: "sculpture",
        talentIconClass: "fas fa-draw-polygon", sculptures,
        talentSystemIcon: "systems/foundryvtt-vadentis/images/icons/talents/sculpture-elementaire.png",
        groupIcon: "systems/foundryvtt-vadentis/images/icons/talents/sculpture-elementaire.png"
      });
    }

    const requestedTalentId = this._vadentisActiveTalentId;
    const activeTalentId = preparedTalents.some(t => t.id === requestedTalentId || t._id === requestedTalentId)
      ? requestedTalentId
      : preparedTalents[0]?._id;
    for (const talent of preparedTalents) talent.isActive = (talent._id === activeTalentId || talent.id === activeTalentId);
    formData.talents = preparedTalents;
    formData.hasTalents = preparedTalents.length > 0;
    formData.hasMultipleTalents = preparedTalents.length > 1;
    formData.armes = this.actor.getArmes();
    formData.armures = this.actor.getArmures();
    formData.equipements = this.actor.getEquipements();
    // Inventaire libre : un équipement peut être rangé dans le Sac de potions
    // ou dans le Matériel par simple glisser-déposer, sans imposer de nouveau type d'Item.
    const inventoryOrder = item => Number(foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.inventoryOrder") ?? item.sort ?? 0);
    formData.potions = formData.equipements.filter(item =>
      foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.inventorySection") === "potions"
    ).sort((a, b) => inventoryOrder(a) - inventoryOrder(b));
    // Le bouton Utiliser n'est pas réservé aux objets fabriqués par l'atelier :
    // les potions existantes dont l'effet décrit clairement une restitution PV/PE/PA
    // profitent de la même automatisation.
    for (const item of formData.potions) {
      const crafted = !!foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.alchimie.crafted");
      const effect = String(item.system?.effect || item.system?.description || "");
      item.vadentisAlchemyUsable = crafted || /Rend\s+(?:\d+D\d+|\d+)\s+(PV|PE|PA)/i.test(effect);
    }
    formData.orbes = formData.equipements.filter(item => foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.inventorySection") === "orbes").sort((a,b)=>inventoryOrder(a)-inventoryOrder(b));
    formData.ingenierieOrbSummary = this.actor.getIngenierieOrbSummary();
    formData.assemblages = formData.equipements.filter(item => foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.inventorySection") === "assemblages").sort((a,b)=>inventoryOrder(a)-inventoryOrder(b));
    formData.materiel = formData.equipements.filter(item => { const sec=foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.inventorySection"); return sec !== "potions" && sec !== "orbes" && sec !== "assemblages"; }).sort((a, b) => inventoryOrder(a) - inventoryOrder(b));
    formData.monnaies = this.actor.getMonnaies();
formData.statuts = this.actor.getStatuts();
    formData.statusPanelOpen = this._vadentisStatusOpen === true;

    formData.optionsBase = VadentisUtility.createDirectOptionList(0, 50);
    formData.optionsMalus = VadentisUtility.createDirectReverseOptionList(-50, 0);
    formData.optionsBonus = VadentisUtility.createDirectOptionList(0, 50);
    formData.optionsPV = VadentisUtility.createOptionList(-50, 999);
    formData.optionsPE = VadentisUtility.createOptionList(-50, 999);
    formData.optionsPA = VadentisUtility.createOptionList(0, 20);

    // Résumé Combat : lecture seule, valeurs finales et ressources essentielles.
    const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    const combat = actorData.combat || {};
    const magie = actorData.magie || {};
    const stats = actorData.stats || {};
    const total = value => this.actor._getCombatValue(value || {});
    formData.combatSummary = [
      { label: "PV", fullLabel: "Points de Vie", value: n(stats.pointsvie?.value), img: "systems/foundryvtt-vadentis/images/icons/feuille_perso_PV.webp" },
      { label: "PE", fullLabel: "Points d’Énergie", value: n(stats.pointsenergie?.value), img: "systems/foundryvtt-vadentis/images/icons/feuille_perso_PE.webp" },
      { label: "PA", fullLabel: "Points d’Adrénaline", value: n(stats.pointsadrenaline?.value), img: "systems/foundryvtt-vadentis/images/icons/feuille_perso_PA.webp" },
      { label: "Défense", fullLabel: "Défense", value: total(combat.defense), img: "systems/foundryvtt-vadentis/images/icons/feuille_perso_defense.webp" },
      { label: "Maîtrise Données", fullLabel: "Maîtrise Données", value: total(magie.matriseelementaire), img: "systems/foundryvtt-vadentis/images/icons/feuille_perso_matriseelementaire.webp" },
      { label: "Dévotion", fullLabel: "Dévotion", value: total(magie.devotion), img: "systems/foundryvtt-vadentis/images/icons/feuille_perso_devotion.webp" }
    ];

    // Décor discret des bandeaux de sorts : on réutilise les véritables symboles
    // présents sur l'acteur ou dans les Items du monde, sans dupliquer les assets.
    const normalizeName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "'").trim();
    const allSources = [...this.actor.items, ...game.items];
    // Les Données/Églises de référence vivent souvent en compendium plutôt que
    // dans les Items du monde. On indexe aussi les compendiums afin que les
    // filigranes des grands bandeaux soient toujours disponibles.
    const packSources = [];
    for (const pack of game.packs) {
      try {
        const index = await pack.getIndex({ fields: ["name", "type", "img"] });
        for (const entry of index) packSources.push(entry);
      } catch (err) {
        // Un pack non lisible ne doit jamais empêcher l'ouverture de la feuille.
      }
    }
    const findSourceImg = (name, type) => {
      const wanted = normalizeName(name);
      const pool = [...allSources, ...packSources].filter(i => i.type === type && i.img);
      // Les sources Vadentis peuvent s'appeler simplement « Foudre » ou
      // « Donnée de la Foudre ». On privilégie l'égalité, puis une
      // correspondance contenue afin de retrouver aussi les entrées de compendium.
      const exact = pool.find(i => normalizeName(i.name) === wanted);
      if (exact) return exact.img;
      const fuzzy = pool.find(i => {
        const candidate = normalizeName(i.name);
        return candidate.includes(wanted) || wanted.includes(candidate);
      });
      return fuzzy?.img || "";
    };
    const mainDataNames = ["Feu", "Eau", "Foudre", "Terre", "Vent", "Lumière"];
    const churchNames = ["Adorateurs de Yeshüa", "Bénédiction de l'Océan", "Culte de l'Ombre", "Culte des 26", "Église du Temps", "Église Estuanienne", "Foi du Soleil"];
    formData.mainDataSymbols = mainDataNames.map(name => ({ name, img: findSourceImg(name, "donnee") })).filter(s => s.img);
    formData.churchSymbols = churchNames.map(name => ({ name, img: findSourceImg(name, "eglise") })).filter(s => s.img);

    return formData;
  }

  /* -------------------------------------------- */
  async checkSort(sortId) {
    await Dialog.confirm({
      title: "Lancer un Sort",
      content: "Etes vous certain de vouloir incanter ce Sort ?",
      yes: async () => {
        this.actor.rollSort(sortId);
      },
      no: () => { },
    });
  }

  /* -------------------------------------------- */
  async checkDevotion(devotionId) {
    await Dialog.confirm({
      title: "Lancer une Dévotion",
      content: "Etes vous certain de vouloir incanter cette Dévotion ?",
      yes: async () => {
        this.actor.rollDevotion(devotionId);
      },
      no: () => { },
    });
  }

  /* -------------------------------------------- */
  async checkTechnique(techniqueId) {
    await Dialog.confirm({
      title: "Utiliser une technique",
      content: "Etes vous certain de vouloir utiliser cette Technique ?",
      yes: async () => {
        this.actor.rollTechnique(techniqueId);
      },
      no: () => { },
    });
  }

  /* -------------------------------------------- */
  /** @override */
  async _onDrop(event) {
    // Onglet Talents : on n'accepte ici que les Items de type "talent".
    // Un Talent déposé depuis le monde ou un compendium est intégré à l'Actor.
    const talentTarget = event.target.closest(".vadentis-talent-dropzone");
    if (talentTarget) {
      event.preventDefault();
      const data = TextEditor.getDragEventData(event);
      if (!data || data.type !== "Item") return;

      const dropped = await Item.implementation.fromDropData(data);
      if (!dropped || dropped.type !== "talent") {
        ui.notifications.warn("Vadentis : seuls les Talents peuvent être déposés dans cet onglet.");
        return;
      }

      const existing = dropped.parent?.id === this.actor.id ? this.actor.items.get(dropped.id) : null;
      if (existing) {
        this._vadentisActiveTalentId = existing.id;
        this.render(false);
        return;
      }

      const itemData = dropped.toObject();
      delete itemData._id;
      const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      if (created?.[0]) this._vadentisActiveTalentId = created[0].id;
      this.render(false);
      return;
    }

    // Inventaire libre : déplacement entre sections ET réorganisation à l'intérieur
    // d'une même section. L'ordre est stocké par Item dans un flag léger.
    const inventoryTarget = event.target.closest(".vadentis-inventory-dropzone");
    if (inventoryTarget) {
      event.preventDefault();
      const data = TextEditor.getDragEventData(event);
      if (!data || data.type !== "Item") return super._onDrop(event);

      const droppedItem = await Item.implementation.fromDropData(data);
      if (!droppedItem || droppedItem.type !== "equipement") return super._onDrop(event);

      const section = ["potions","orbes","materiel"].includes(inventoryTarget.dataset.inventorySection) ? inventoryTarget.dataset.inventorySection : "materiel";
      let item = droppedItem.parent?.id === this.actor.id ? this.actor.items.get(droppedItem.id) : null;

      if (!item) {
        const itemData = droppedItem.toObject();
        delete itemData._id;
        foundry.utils.setProperty(itemData, "flags.foundryvtt-vadentis.inventorySection", section);
        const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        item = created?.[0];
      } else {
        await item.setFlag("foundryvtt-vadentis", "inventorySection", section);
      }
      if (!item) return;

      // Détermine la position visée. Déposer sur la moitié haute/basse d'une ligne
      // place l'objet respectivement avant/après celle-ci.
      const targetRow = event.target.closest(".vadentis-sortable-item");
      let siblings = this.actor.items.filter(i => {
        if (i.type !== "equipement" || i.id === item.id) return false;
        const rawSec = foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.inventorySection");
        const sec = ["potions","orbes"].includes(rawSec) ? rawSec : "materiel";
        return sec === section;
      }).sort((a, b) => Number(a.getFlag("foundryvtt-vadentis", "inventoryOrder") ?? a.sort ?? 0) - Number(b.getFlag("foundryvtt-vadentis", "inventoryOrder") ?? b.sort ?? 0));

      let index = siblings.length;
      if (targetRow && targetRow.dataset.itemId !== item.id) {
        const targetIndex = siblings.findIndex(i => i.id === targetRow.dataset.itemId);
        if (targetIndex >= 0) {
          const rect = targetRow.getBoundingClientRect();
          index = targetIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
        }
      }
      siblings.splice(index, 0, item);
      await this.actor.updateEmbeddedDocuments("Item", siblings.map((i, idx) => ({
        _id: i.id,
        "flags.foundryvtt-vadentis.inventorySection": section,
        "flags.foundryvtt-vadentis.inventoryOrder": (idx + 1) * 1000
      })));
      return;
    }

    // Réorganisation libre des Sorts de Dévotion dans leur Église.
    const devotionTarget = event.target.closest(".devotion-list");
    if (devotionTarget) {
      event.preventDefault();
      const data = TextEditor.getDragEventData(event);
      if (!data || data.type !== "Item") return super._onDrop(event);
      const dropped = await Item.implementation.fromDropData(data);
      if (!dropped || dropped.type !== "devotion") return super._onDrop(event);
      const item = this.actor.items.get(dropped.id);
      if (!item) return super._onDrop(event);
      const eglise = item.system.eglise || "";
      const siblings = this.actor.items.filter(i => i.type === "devotion" && i.id !== item.id && (i.system.eglise || "") === eglise)
        .sort((a,b) => Number(a.getFlag("foundryvtt-vadentis", "spellOrder") ?? a.sort ?? 0) - Number(b.getFlag("foundryvtt-vadentis", "spellOrder") ?? b.sort ?? 0));
      const targetRow = event.target.closest(".vadentis-spell-row");
      let index = siblings.length;
      if (targetRow && targetRow.dataset.itemId !== item.id) {
        const targetIndex = siblings.findIndex(i => i.id === targetRow.dataset.itemId);
        if (targetIndex >= 0) {
          const rect = targetRow.getBoundingClientRect();
          index = targetIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
        }
      }
      siblings.splice(index, 0, item);
      await this.actor.updateEmbeddedDocuments("Item", siblings.map((i, idx) => ({_id:i.id, "flags.foundryvtt-vadentis.spellOrder":(idx+1)*1000})));
      return;
    }

    const target = event.target.closest(".sort-palier-list");

    // Si on ne dépose pas dans un Palier, on laisse Foundry gérer normalement.
    if (!target) {
      return super._onDrop(event);
    }

    const data = TextEditor.getDragEventData(event);

    // Si ce n'est pas un Item, on laisse Foundry gérer normalement.
    if (!data || data.type !== "Item") {
      return super._onDrop(event);
    }

    const nouveauPalier = target.dataset.sortPalier;

    if (!["I", "II", "III"].includes(nouveauPalier)) {
      return super._onDrop(event);
    }

    // Récupère l'Item depuis les données du drag & drop.
    const sort = await Item.implementation.fromDropData(data);

    if (!sort || sort.type !== "sort") {
      return super._onDrop(event);
    }

    // Si le Sort appartient déjà au personnage,
    // on change simplement son Palier.
    const sortExistant = this.actor.items.get(sort.id);

    if (sortExistant) {
      await sortExistant.update({ "system.palier": nouveauPalier });

      // Réorganisation dans la Donnée + le Palier visés, comme pour le Matériel.
      const donneeName = sortExistant.system.donnee || "";
      const siblings = this.actor.items.filter(i => i.type === "sort" && i.id !== sortExistant.id && (i.system.donnee || "") === donneeName && (i.system.palier || "I") === nouveauPalier)
        .sort((a,b) => Number(a.getFlag("foundryvtt-vadentis", "spellOrder") ?? a.sort ?? 0) - Number(b.getFlag("foundryvtt-vadentis", "spellOrder") ?? b.sort ?? 0));
      const targetRow = event.target.closest(".vadentis-spell-row");
      let index = siblings.length;
      if (targetRow && targetRow.dataset.itemId !== sortExistant.id) {
        const targetIndex = siblings.findIndex(i => i.id === targetRow.dataset.itemId);
        if (targetIndex >= 0) {
          const rect = targetRow.getBoundingClientRect();
          index = targetIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
        }
      }
      siblings.splice(index, 0, sortExistant);
      await this.actor.updateEmbeddedDocuments("Item", siblings.map((i, idx) => ({_id:i.id, "flags.foundryvtt-vadentis.spellOrder":(idx+1)*1000})));
      return;
    }

    // Sinon, c'est un nouveau Sort :
    // on le crée sur le personnage directement avec le bon Palier.
    const sortData = sort.toObject();

    delete sortData._id;

    sortData.system.palier = nouveauPalier;

    await this.actor.createEmbeddedDocuments("Item", [sortData]);
  }

  _applyAdaptiveSourceFrames(html) {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      const d = max - min;
      if (d) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
          case r: h = 60 * (((g - b) / d) % 6); break;
          case g: h = 60 * (((b - r) / d) + 2); break;
          default: h = 60 * (((r - g) / d) + 4);
        }
      }
      if (h < 0) h += 360;
      return [h, s * 100, l * 100];
    };

    html.find('.spell-source-frame, .principal-donnee-frame, .principal-eglise-frame, .vadentis-sculpture-emblem').each((_, frameEl) => {
      const img = frameEl.querySelector('img.spell-source-icon, img.principal-donnee-icon, img.principal-eglise-icon, img.vadentis-sculpture-donnee-icon');
      if (!img) return;

      const analyse = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 24; canvas.height = 24;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, 24, 24);
          const pixels = ctx.getImageData(0, 0, 24, 24).data;
          let r = 0, g = 0, b = 0, weight = 0, lum = 0;
          let minX = 24, minY = 24, maxX = -1, maxY = -1;
          for (let i = 0; i < pixels.length; i += 4) {
            const a = pixels[i + 3] / 255;
            if (a < .12) continue;
            const px = (i / 4) % 24;
            const py = Math.floor((i / 4) / 24);
            if (a > .20) { minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); }
            // Les pixels visibles comptent davantage que les bords transparents.
            const w = a * a;
            r += pixels[i] * w; g += pixels[i + 1] * w; b += pixels[i + 2] * w;
            lum += (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) * w;
            weight += w;
          }
          if (!weight) return;
          r /= weight; g /= weight; b /= weight; lum /= weight;
          let [h, sat] = rgbToHsl(r, g, b);
          sat = clamp(sat, 24, 68);

          // Fond opposé en luminosité, mais apparenté à la couleur de l'illustration.
          const bgLight = lum > 150 ? 19 : 82;
          const bgSat = lum > 150 ? clamp(sat * .72, 18, 48) : clamp(sat * .42, 12, 32);
          const borderLight = lum > 150 ? 58 : 38;
          const borderSat = clamp(sat * 1.08, 32, 76);
          const glowLight = lum > 150 ? 55 : 48;

          frameEl.style.setProperty('--source-bg', `hsl(${h.toFixed(0)} ${bgSat.toFixed(0)}% ${bgLight}%)`);
          frameEl.style.setProperty('--source-border', `hsl(${h.toFixed(0)} ${borderSat.toFixed(0)}% ${borderLight}%)`);
          frameEl.style.setProperty('--source-glow', `hsla(${h.toFixed(0)} ${borderSat.toFixed(0)}% ${glowLight}% / .46)`);

          // Recadrage haute définition : on repart du fichier original, détecte sa zone utile
          // à une résolution bien supérieure, puis on fabrique une vignette carrée 320px.
          // Contrairement à un simple transform:scale CSS, on ne grossit donc pas une miniature déjà rasterisée.
          if (!img.dataset.vadentisCropped && img.naturalWidth && img.naturalHeight) {
            const scanSize = 192;
            const scan = document.createElement('canvas');
            scan.width = scanSize; scan.height = scanSize;
            const sctx = scan.getContext('2d', { willReadFrequently: true });
            sctx.drawImage(img, 0, 0, scanSize, scanSize);
            const data = sctx.getImageData(0, 0, scanSize, scanSize).data;
            const corner = (x, y) => {
              const i = (y * scanSize + x) * 4;
              return [data[i], data[i+1], data[i+2], data[i+3]];
            };
            const corners = [corner(0,0), corner(scanSize-1,0), corner(0,scanSize-1), corner(scanSize-1,scanSize-1)];
            const bg = [0,1,2].map(c => corners.reduce((a,v)=>a+v[c],0)/4);
            const bgAlpha = corners.reduce((a,v)=>a+v[3],0)/4;
            let bx0=scanSize, by0=scanSize, bx1=-1, by1=-1;
            for (let y=0; y<scanSize; y++) for (let x=0; x<scanSize; x++) {
              const i=(y*scanSize+x)*4, a=data[i+3];
              if (a < 24) continue;
              const dist=Math.hypot(data[i]-bg[0], data[i+1]-bg[1], data[i+2]-bg[2]);
              const foreground = bgAlpha < 80 ? a > 32 : (dist > 24 || Math.abs(a-bgAlpha) > 35);
              if (!foreground) continue;
              bx0=Math.min(bx0,x); by0=Math.min(by0,y); bx1=Math.max(bx1,x); by1=Math.max(by1,y);
            }
            if (bx1 >= bx0 && by1 >= by0) {
              const pad = 3;
              bx0=Math.max(0,bx0-pad); by0=Math.max(0,by0-pad); bx1=Math.min(scanSize-1,bx1+pad); by1=Math.min(scanSize-1,by1+pad);
              const sx = bx0 / scanSize * img.naturalWidth;
              const sy = by0 / scanSize * img.naturalHeight;
              const sw = (bx1-bx0+1) / scanSize * img.naturalWidth;
              const sh = (by1-by0+1) / scanSize * img.naturalHeight;
              const out=document.createElement('canvas'); out.width=320; out.height=320;
              const octx=out.getContext('2d'); octx.imageSmoothingEnabled=true; octx.imageSmoothingQuality='high';
              const margin=8, avail=320-margin*2, ratio=Math.min(avail/sw, avail/sh);
              const dw=sw*ratio, dh=sh*ratio, dx=(320-dw)/2, dy=(320-dh)/2;
              octx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
              img.dataset.vadentisCropped='1';
              img.style.setProperty('--source-scale','1'); img.style.setProperty('--source-tx','0px'); img.style.setProperty('--source-ty','0px');
              img.src=out.toDataURL('image/png');
            }
          }
        } catch (err) {
          // Une image externe non lisible par canvas garde simplement le thème de secours CSS.
        }
      };

      if (img.complete && img.naturalWidth) analyse();
      else img.addEventListener('load', analyse, { once: true });
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Accessibilité : Ctrl + molette agrandit/réduit uniquement les textes de cette fiche.
    // Les tailles de base sont mémorisées élément par élément afin de respecter le design actuel.
    const zoomKey=`vadentis-font-scale-${game.user.id}`;
    const readScale=()=>Math.max(.8,Math.min(1.5,Number(localStorage.getItem(zoomKey)||1)));
    const applyTextScale=(scale,show=false)=>{
      scale=Math.max(.8,Math.min(1.5,Math.round(scale*10)/10));
      localStorage.setItem(zoomKey,String(scale));
      const root=html[0];
      if(!root) return;
      root.dataset.vadentisFontScale=String(scale);
      root.querySelectorAll("*").forEach(el=>{
        if(el.matches("i,svg,path,img,video,canvas")) return;
        const cs=getComputedStyle(el);
        if(!el.dataset.vadentisBaseFont && parseFloat(cs.fontSize)>0) el.dataset.vadentisBaseFont=String(parseFloat(cs.fontSize));
        const base=Number(el.dataset.vadentisBaseFont||0);
        if(base) el.style.setProperty("font-size",`${Math.max(7,base*scale)}px`,"important");
      });
      let badge=root.querySelector(".vadentis-font-zoom-badge");
      if(!badge){
        badge=document.createElement("div"); badge.className="vadentis-font-zoom-badge"; root.appendChild(badge);
      }
      badge.textContent=`Texte ${Math.round(scale*100)} %`;
      badge.classList.toggle("show",!!show);
      clearTimeout(this._vadentisZoomTimer);
      if(show) this._vadentisZoomTimer=setTimeout(()=>badge.classList.remove("show"),900);
      const value=root.querySelector(".vadentis-font-zoom-value");
      if(value) value.textContent=`${Math.round(scale*100)} %`;
    };
    applyTextScale(readScale());

    html.on("wheel.vadentisTextZoom",ev=>{
      const e=ev.originalEvent;
      if(!e.ctrlKey) return;
      e.preventDefault();
      applyTextScale(readScale()+(e.deltaY<0?.1:-.1),true);
    });
    html.on("click",".vadentis-font-zoom-minus",()=>applyTextScale(readScale()-.1,true));
    html.on("click",".vadentis-font-zoom-plus",()=>applyTextScale(readScale()+.1,true));
    html.on("click",".vadentis-font-zoom-reset",()=>applyTextScale(1,true));

    // Contraste et recadrage adaptatifs des sceaux de Données / Églises, y compris l'onglet Principal.
    // On échantillonne les couleurs réelles de chaque illustration :
    // une image claire reçoit une cellule sombre de la même famille chromatique,
    // une image sombre une cellule claire. L'image elle-même n'est jamais recolorée.
    this._applyAdaptiveSourceFrames(html);

    // Ouverture / fermeture des Paliers de Sorts
    html.find(".sort-palier-toggle").click(async (event) => {
      const header = $(event.currentTarget);
      const list = header.next(".sort-palier-list");
      const arrow = header.find(".sort-palier-arrow");

      const donneeId = header.data("donnee");
      const palierId = header.data("palier");

      const currentState =
        this.actor.getFlag("foundryvtt-vadentis", "sortsPaliers") || {};

      if (!currentState[donneeId]) {
        currentState[donneeId] = {};
      }

      const isOpen = currentState[donneeId][palierId] !== false;
      currentState[donneeId][palierId] = !isOpen;

      await this.actor.setFlag(
  "foundryvtt-vadentis",
  "sortsPaliers",
  currentState
);

      list.toggle(!isOpen);
      arrow.text(isOpen ? "▶" : "▼");
    });
// Bouton Repos

html.find('.xp-shop-button').click(() => {
  if (!this.actor.isOwner && !game.user.isGM) {
    ui.notifications.warn(
      "Vous n'avez pas les droits pour utiliser le Magasin d'XP de ce personnage."
    );
    return;
  }

  new VadentisXPShop(this.actor).render(true);
});
    // Tout ce qui suit nécessite que la feuille soit éditable.
    if (!this.options.editable) return;
// Mémorise l’état du menu Statuts à travers les re-rendus de la feuille.
const statusPanel = html.find('.vadentis-status-panel');
statusPanel.on('toggle', (event) => {
  this._vadentisStatusOpen = event.currentTarget.open;
});

// Activation / désactivation d'un statut
html.find('.statut-toggle').change(async (event) => {
  this._vadentisStatusOpen = true;

  const li = $(event.currentTarget).closest(".item");
  const statutId = li.data("item-id");

  const statut = this.actor.items.get(statutId);

  if (!statut || statut.type !== "statut") {
    return;
  }

  const actif = event.currentTarget.checked;

await statut.update({
  "system.actif": actif
});

this.render(false);

});

    // Normalise l'affichage au rendu : une seule page de Talent peut être visible.
    // Cela évite que plusieurs Talents (ex. Alchimie + Chante-vie) restent ouverts après reconnexion.
    const talentPages = html.find('.vadentis-talent-page');
    if (talentPages.length) {
      let activeId = this._vadentisActiveTalentId;
      if (!activeId || !talentPages.filter(`[data-talent-id="${activeId}"]`).length) {
        activeId = html.find('.vadentis-talent-subtab.active').first().data('talent-id') || talentPages.first().data('talent-id');
        this._vadentisActiveTalentId = activeId;
      }
      talentPages.removeClass('active').hide();
      talentPages.filter(`[data-talent-id="${activeId}"]`).first().addClass('active').show();
      html.find('.vadentis-talent-subtab').removeClass('active');
      html.find(`.vadentis-talent-subtab[data-talent-id="${activeId}"]`).first().addClass('active');
    }

    // Navigation interne de l'onglet Talents. Elle est volontairement légère :
    // un seul Talent = une seule page ; plusieurs Talents = sous-onglets.
    html.find('.vadentis-talent-subtab').click(event => {
      event.preventDefault();
      const talentId = event.currentTarget.dataset.talentId;
      if (!talentId) return;
      this._vadentisActiveTalentId = talentId;

      html.find('.vadentis-talent-subtab').removeClass('active');
      $(event.currentTarget).addClass('active');
      html.find('.vadentis-talent-page').removeClass('active').hide();
      html.find(`.vadentis-talent-page[data-talent-id="${talentId}"]`).addClass('active').show();
    });

    // Chante-vie — Étape 2 : identité légère de l’Écho, stockée sur l’Item Talent.
    // Aucun Actor secondaire ni mécanique de PV n’est créé à cette étape.
    html.find('.vadentis-chantevie-field').on('change', async event => {
      event.preventDefault();
      event.stopPropagation();
      const control = event.currentTarget;
      const block = control.closest('.vadentis-chantevie-identity');
      const talentId = block?.dataset?.talentId;
      const field = control.dataset.field;
      if (!talentId || !field) return;
      const talent = this.actor.items.get(talentId);
      if (!talent || talent.type !== 'talent') return;
      await talent.update({ [`system.${field}`]: control.value ?? '' });
    });

    // Portrait de l’Écho : clic sur le médaillon = navigateur de fichiers Foundry.
    html.find('.vadentis-chantevie-portrait-picker').on('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const talentId = event.currentTarget.dataset.talentId;
      const talent = this.actor.items.get(talentId);
      if (!talent) return;
      try {
        new FilePicker({
          type: 'image',
          current: talent.system.echoPortrait || '',
          callback: async path => {
            await talent.update({ 'system.echoPortrait': path });
          }
        }).render(true);
      } catch (err) {
        console.error('Vadentis | Impossible d’ouvrir le sélecteur de portrait de l’Écho', err);
        ui.notifications.error('Vadentis : impossible d’ouvrir le sélecteur d’image.');
      }
    });

    // Rituel de liaison : une seule validation, avec sacrifice permanent des PV max.
    html.find('.vadentis-chantevie-sacrifice').on('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const button = event.currentTarget;
      const block = button.closest('.vadentis-chantevie-bond');
      const talentId = block?.dataset?.talentId;
      const sacrifice = Number(button.dataset.value || 0);
      const talent = this.actor.items.get(talentId);
      if (!talent || talent.system.echoBound || ![10,20,30,40].includes(sacrifice)) return;

      const name = String(talent.system.echoName || '').trim();
      const form = String(talent.system.echoForm || '').trim();
      const emotion = String(talent.system.echoEmotion || '').trim();
      if (!name || !form || !emotion) {
        ui.notifications.warn('Renseignez d’abord le nom, la forme animale et l’Émotion fondatrice de l’Écho.');
        return;
      }

      const currentMax = Number(this.actor.system?.stats?.pointsvie?.max ?? 0);
      const currentPv = Number(this.actor.system?.stats?.pointsvie?.value ?? 0);
      if (currentMax <= sacrifice) {
        ui.notifications.warn(`Impossible de sacrifier ${sacrifice} PV : le personnage doit conserver au moins 1 PV maximum.`);
        return;
      }

      const tiers = {10:['Écho-murmuré',20],20:['Écho-chanté',30],30:['Écho-mélodieux',40],40:['Écho-symphonique',50]};
      const [tier, echoHp] = tiers[sacrifice];
      const ok = await Dialog.confirm({
        title: 'Rituel de liaison',
        content: `<p><strong>${name}</strong> deviendra un <strong>${tier}</strong>.</p><p>Le Chante-vie sacrifiera définitivement <strong>${sacrifice} PV maximum</strong> et l’Écho possédera <strong>${echoHp} PV</strong>.</p><p><strong>Ce choix ne pourra pas être modifié depuis la fiche.</strong></p>`,
        yes: () => true,
        no: () => false
      });
      if (!ok) return;

      const newMax = currentMax - sacrifice;
      const newPv = Math.min(currentPv, newMax);
      await this.actor.update({
        'system.stats.pointsvie.max': newMax,
        'system.stats.pointsvie.value': newPv
      });
      await talent.update({
        'system.echoBound': true,
        'system.echoSacrifice': sacrifice,
        'system.echoTier': tier,
        'system.echoHp': echoHp,
        'system.echoHpMax': echoHp,
        'system.echoSkills': {athletisme:1, habilete:1, perception:1, mental:1, social:0, connaissances:0},
        'system.echoSkillsLocked': false,
        'system.echoAttack': 2,
        'system.echoDefense': 9,
        'system.echoForce': 1,
        'system.echoSpeed': 6,
        'system.echoDamageDice': 1,
        'system.echoPowersUsed': {}
      });
      ui.notifications.info(`${name} est désormais lié au Chante-vie : ${tier}.`);
    });

    // Chante-vie — Étape 4 : fiche intégrée de l'Écho (PV + compétences de naissance).
    const echoSkillBases = {athletisme:1, habilete:1, perception:1, mental:1, social:0, connaissances:0};
    const refreshEchoSkillBudget = (sheet, talent) => {
      const skills = talent.system.echoSkills || echoSkillBases;
      const spent = Object.keys(echoSkillBases).reduce((n,k) => n + Math.max(0, Number(skills[k] ?? echoSkillBases[k]) - echoSkillBases[k]), 0);
      sheet.find('.vadentis-echo-skill-spent').text(`${spent} / 4`);
      const locked = !!talent.system.echoSkillsLocked;
      sheet.find('.vadentis-echo-skill-step').prop('disabled', locked);
      sheet.find('.vadentis-echo-skills-lock').prop('disabled', locked || spent !== 4).toggleClass('is-locked', locked).html(locked ? '<i class="fas fa-lock"></i> VALIDÉ' : '<i class="fas fa-check"></i> VALIDER');
    };
    html.find('.vadentis-echo-sheet').each((_,el) => { const talent=this.actor.items.get(el.dataset.talentId); if(talent) refreshEchoSkillBudget($(el), talent); });

    // Chante-vie — Token VISUEL uniquement, via le mécanisme DragDrop natif de Foundry.
    // Aucun Actor n'est créé et aucune statistique n'est attachée au Token.
    if (!this._vadentisEchoDragDrop) {
      this._vadentisEchoDragDrop = new DragDrop({
        dragSelector: '.vadentis-echo-token-drag',
        permissions: {dragstart: () => true},
        callbacks: {
          dragstart: (event) => {
            const el = event.currentTarget;
            const talent = this.actor.items.get(el?.dataset?.talentId);
            if (!talent?.system?.echoBound) return false;
            const payload = {
              type: 'VadentisEchoToken',
              ownerActorId: this.actor.id,
              talentId: talent.id,
              name: String(talent.system.echoName || 'L’Écho'),
              img: String(talent.system.echoPortrait || talent.img || 'icons/svg/mystery-man.svg')
            };
            event.dataTransfer?.setData('text/plain', JSON.stringify(payload));
            return true;
          }
        }
      });
    }
    this._vadentisEchoDragDrop.bind(html[0]);


    html.find('.vadentis-echo-hp-step').on('click', async event => {
      event.preventDefault(); event.stopPropagation();
      const sheet=$(event.currentTarget).closest('.vadentis-echo-sheet'); const talent=this.actor.items.get(sheet[0]?.dataset?.talentId); if(!talent) return;
      const max=Number(talent.system.echoHpMax||0), delta=Number(event.currentTarget.dataset.delta||0);
      const value=Math.clamp(Number(talent.system.echoHp ?? talent.system.echoHpMax ?? 0)+delta,0,max); await talent.update({'system.echoHp':value},{render:false}); sheet.find('.vadentis-echo-hp-input').val(value);
    });
    html.find('.vadentis-echo-hp-input').on('change', async event => {
      event.preventDefault(); event.stopPropagation();
      const sheet=$(event.currentTarget).closest('.vadentis-echo-sheet'); const talent=this.actor.items.get(sheet[0]?.dataset?.talentId); if(!talent) return;
      const max=Number(talent.system.echoHpMax||0); const value=Math.clamp(Number(event.currentTarget.value||0),0,max); await talent.update({'system.echoHp':value},{render:false}); event.currentTarget.value=value;
    });
    html.find('.vadentis-echo-skill-step').on('click', async event => {
      event.preventDefault(); event.stopPropagation();
      const sheet=$(event.currentTarget).closest('.vadentis-echo-sheet'); const talent=this.actor.items.get(sheet[0]?.dataset?.talentId); if(!talent || talent.system.echoSkillsLocked) return;
      const key=event.currentTarget.dataset.skill, delta=Number(event.currentTarget.dataset.delta||0); if(!(key in echoSkillBases)) return;
      const skills=foundry.utils.deepClone(talent.system.echoSkills || echoSkillBases);
      const cur=Number(skills[key] ?? echoSkillBases[key]); const spent=Object.keys(echoSkillBases).reduce((n,k)=>n+Math.max(0,Number(skills[k]??echoSkillBases[k])-echoSkillBases[k]),0);
      if(delta>0 && (spent>=4 || cur>=3)) return; if(delta<0 && cur<=echoSkillBases[key]) return;
      skills[key]=cur+delta; await talent.update({'system.echoSkills':skills},{render:false}); sheet.find(`[data-echo-skill-value="${key}"]`).text(skills[key]); refreshEchoSkillBudget(sheet,talent);
    });
    html.find('.vadentis-echo-skills-lock').on('click', async event => {
      event.preventDefault(); event.stopPropagation();
      const sheet=$(event.currentTarget).closest('.vadentis-echo-sheet'); const talent=this.actor.items.get(sheet[0]?.dataset?.talentId); if(!talent || talent.system.echoSkillsLocked) return;
      const skills=talent.system.echoSkills || echoSkillBases; const spent=Object.keys(echoSkillBases).reduce((n,k)=>n+Math.max(0,Number(skills[k]??echoSkillBases[k])-echoSkillBases[k]),0);
      if(spent!==4){ ui.notifications.warn('Répartissez exactement les 4 points de naissance avant de valider.'); return; }
      const ok=await Dialog.confirm({title:'Compétences de l’Écho',content:'<p>Valider définitivement la répartition des <strong>4 points de naissance</strong> ?</p>',yes:()=>true,no:()=>false});
      if(ok) await talent.update({'system.echoSkillsLocked':true});
    });


    // Chante-vie — Repos interne de l'Écho.
    // Indépendant du repos général : récupère la moitié des PV max (sans dépasser le max)
    // et rend disponibles tous les Pouvoirs innés.
    html.find('.vadentis-echo-rest').on('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const button = $(event.currentTarget);
      const sheet = button.closest('.vadentis-echo-sheet');
      const talent = this.actor.items.get(sheet[0]?.dataset?.talentId);
      if (!talent) return;

      const max = Math.max(0, Number(talent.system.echoHpMax || 0));
      const current = Math.clamp(Number(talent.system.echoHp ?? max), 0, max);
      const recovered = Math.ceil(max / 2);
      const nextHp = Math.min(max, current + recovered);

      button.prop('disabled', true);
      try {
        // Foundry fusionne les objets imbriqués lors d'un update :
        // envoyer {} ne supprime donc PAS les anciennes clés true.
        // On les efface explicitement avec la syntaxe de suppression Foundry.
        const restUpdate = {'system.echoHp': nextHp};
        for (const key of Object.keys(talent.system.echoPowersUsed || {})) {
          restUpdate[`system.echoPowersUsed.-=${key}`] = null;
        }
        await talent.update(restUpdate, {render:false});

        // Mise à jour immédiate sans remonter la fiche.
        sheet.find('.vadentis-echo-hp-input').val(nextHp);
        sheet.find('.vadentis-echo-power-card').removeClass('is-used');
        sheet.find('.vadentis-echo-power-icon i').each((_, el) => {
          const icon = el.dataset.originalIcon || 'fa-music';
          el.className = `fas ${icon}`;
        });
        sheet.find('.vadentis-echo-power-use')
          .prop('disabled', false)
          .removeClass('is-used')
          .html('<i class="fas fa-play"></i> UTILISER');

        ui.notifications.info(`Repos de l’Écho : ${nextHp - current} PV récupérés et Pouvoirs innés réinitialisés.`);
      } finally {
        button.prop('disabled', false);
      }
    });

    // Répertoire inné : une utilisation quotidienne par pouvoir + automatisations simples.
    html.find('.vadentis-echo-power-use').on('click', async event => {
      event.preventDefault(); event.stopPropagation();
      const button=$(event.currentTarget), sheet=button.closest('.vadentis-echo-sheet');
      const talent=this.actor.items.get(sheet[0]?.dataset?.talentId), key=String(button.data('power')||'');
      if(!talent || !key || talent.system.echoPowersUsed?.[key] === true) return;

      const card=button.closest('.vadentis-echo-power-card');
      const name=card.find('.vadentis-echo-power-name').text().trim();
      const effect=card.find('.vadentis-echo-power-effect').text().trim();
      const targets=[...game.user.targets].map(t=>t.actor).filter(Boolean);
      const oneTarget=()=>targets.length===1 ? targets[0] : null;
      const requireOne=()=>{
        const a=oneTarget();
        if(!a) ui.notifications.warn("Désignez exactement une cible avant d’utiliser ce Chant.");
        return a;
      };
      const setTimedFlag=async (a, data, seconds=3600)=>{
        await a.setFlag("foundryvtt-vadentis","echoBuff",{...data,expires:Date.now()+seconds*1000});
      };
      let automated = false;

      // JOIE — soins directs. Les retraits de malus restent volontairement manuels.
      const heals={"murmure-vivifiant":5,"refrain-vivifiant":5,"melodie-vivifiante":10,"symphonie-vivifiante":10};
      if(key in heals){
        const a=requireOne(); if(!a) return;
        if(typeof a.applyHealing==="function") await a.applyHealing(heals[key],{silent:false,img:a.img});
        automated=true;
      }

      // COLÈRE — bonus consommé au prochain jet de dégâts d'arme ou de Sort.
      const fury={"note-courroucee":3,"accord-vengeur":5,"crescendo-vengeur":7,"courroux-orchestral":10};
      if(key in fury){
        const a=requireOne(); if(!a) return;
        await a.setFlag("foundryvtt-vadentis","echoNextDamageBonus",{value:fury[key],source:talent.system.echoName||"L’Écho"});
        automated=true;
      }

      // PEUR — le lié, ou les cibles désignées pour Paroles silencieuses.
      if(key==="souffle-alerte" || key==="sifflement-prescience"){
        const bonus=key==="souffle-alerte"?5:10;
        await setTimedFlag(this.actor,{perception:bonus,initiative:bonus,label:name});
        automated=true;
      }
      if(key==="paroles-silencieuses"){
        if(!targets.length){ui.notifications.warn("Désignez au moins une cible.");return;}
        for(const a of targets) await setTimedFlag(a,{perception:5,initiative:5,label:name});
        automated=true;
      }
      if(key==="chorale-sens"){
        const a=requireOne(); if(!a)return;
        await a.setFlag("foundryvtt-vadentis","echoInitiativePriority",{label:name,active:true});
        automated=true;
      }

      // CHAGRIN — faute d'Actor propre à l'Écho, on retire directement les PV de sa fiche intégrée.
      const absorbs={"note-plaintive":5,"accord-endolori":10,"melopee-resonante":15};
      if(key in absorbs){
        const max=Number(talent.system.echoHpMax||0);
        const cur=Number(talent.system.echoHp??max);
        const amount=Math.min(absorbs[key],cur);
        await talent.update({"system.echoHp":Math.max(0,cur-amount)},{render:false});
        sheet.find('.vadentis-echo-hp-input').val(Math.max(0,cur-amount));
        ui.notifications.info(`${talent.system.echoName||"L’Écho"} absorbe ${amount} dégâts. Réduisez d’autant les dégâts de la cible protégée.`);
        automated=true;
      }

      // ESPOIR — bonus de Compétence : ponctuel ou temporaire.
      if(key==="murmure-encourageant" || key==="chant-volonte"){
        const a=requireOne(); if(!a)return;
        const bonus=key==="murmure-encourageant"?5:10;
        await a.setFlag("foundryvtt-vadentis","echoNextSkillBonus",{value:bonus,label:name});
        automated=true;
      }
      if(key==="refrain-relaxant"){
        if(!targets.length){ui.notifications.warn("Désignez au moins une cible.");return;}
        for(const a of targets) await setTimedFlag(a,{skill:3,label:name},600);
        automated=true;
      }
      if(key==="hymne-triomphant"){
        const a=requireOne(); if(!a)return;
        await a.setFlag("foundryvtt-vadentis","echoNextUniversalBonus",{value:10,label:name});
        automated=true;
      }

      const used=foundry.utils.deepClone(talent.system.echoPowersUsed || {}); used[key]=true;
      await talent.update({'system.echoPowersUsed':used},{render:false});
      button.prop('disabled',true).addClass('is-used').html('<i class="fas fa-circle-check"></i> UTILISÉ');
      card.addClass('is-used');
      card.find('.vadentis-echo-power-icon i').attr('class','fas fa-circle-check');

      const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
      const echoName=esc(talent.system.echoName||'L’Écho'), emotion=esc(talent.system.echoEmotion||'');
      const portrait=esc(talent.system.echoPortrait||talent.img||'icons/svg/mystery-man.svg');
      await ChatMessage.create({
        speaker:ChatMessage.getSpeaker({actor:this.actor}),
        content:`<div class="vadentis-echo-chat"><div class="vadentis-echo-chat-head"><img src="${portrait}" alt=""><div><small>CHANTE-VIE · ${emotion.toUpperCase()}</small><strong>${esc(name)}</strong><span>${echoName} exprime son Chant inné</span></div></div><div class="vadentis-echo-chat-effect"><i class="fas fa-music"></i><span>${esc(effect)}</span></div>${automated?'<div class="vadentis-echo-auto"><i class="fas fa-gears"></i> Effet automatique appliqué</div>':''}</div>`
      });
    });

    // Chante-vie — approfondissement du lien vital.


    // Chante-vie — le Token visuel se place désormais par glisser-déposer du portrait.

    // Chante-vie — jets propres à l'Écho.
    // Nature stable : ces jets utilisent uniquement les valeurs de l'Écho,
    // sans bonus/malus extérieurs du personnage.
    html.find('.vadentis-echo-roll-skill').on('click', async event => {
      event.preventDefault(); event.stopPropagation();
      const button = $(event.currentTarget);
      const sheet = button.closest('.vadentis-echo-sheet');
      const talent = this.actor.items.get(sheet[0]?.dataset?.talentId);
      const key = String(button.data('skill') || '');
      if (!talent || !key) return;

      const defaults = {athletisme:1, habilete:1, perception:1, mental:1, social:0, connaissances:0};
      const value = Number(talent.system.echoSkills?.[key] ?? defaults[key] ?? 0);
      const label = button.text().trim();
      const roll = await (new Roll(`1d20 + ${value}`)).evaluate();
      const portrait = talent.system.echoPortrait || talent.img || 'icons/svg/mystery-man.svg';
      const echoName = talent.system.echoName || 'L’Écho';

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor:this.actor}),
        rolls:[roll],
        content:`<div class="vadentis-echo-chat vadentis-echo-roll-chat">
          <div class="vadentis-echo-chat-head"><img src="${portrait}" alt=""><div>
            <small>ÉCHO · TEST DE COMPÉTENCE</small><strong>${label}</strong><span>${echoName}</span>
          </div></div>
          <div class="vadentis-echo-roll-result"><span>1D20 + ${value}</span><b>${roll.total}</b></div>
        </div>`
      });
    });

    html.find('.vadentis-echo-natural-attack').on('click', async event => {
      event.preventDefault(); event.stopPropagation();
      const button=$(event.currentTarget), sheet=button.closest('.vadentis-echo-sheet');
      const talent=this.actor.items.get(sheet[0]?.dataset?.talentId); if(!talent) return;
      const targets=Array.from(game.user.targets||[]);
      if(targets.length!==1){ ui.notifications.warn(targets.length ? "L’Écho doit avoir une seule cible." : "Cible d’abord un Token sur la scène."); return; }
      const targetToken=targets[0], defender=targetToken.actor;
      if(!defender?.getDefenseScore || !defender?.applyDamage){ ui.notifications.warn("Cette cible ne peut pas être résolue automatiquement."); return; }
      const attack=Number(talent.system.echoAttack ?? 2), force=Number(talent.system.echoForce ?? 1);
      const dice=Math.max(1, Number(talent.system.echoDamageDice ?? 1), 1 + Number(talent.system.echoDamageUpgrade ?? 0));
      const attackName='Attaque';
      const attackRoll=await(new Roll(`1d20 + ${attack}`)).evaluate();
      const natural=Number(attackRoll.dice?.[0]?.results?.[0]?.result||0), defense=Number(defender.getDefenseScore()||0);
      const hit=natural!==1 && attackRoll.total>=defense;
      const portrait=talent.system.echoPortrait||talent.img||'icons/svg/mystery-man.svg', echoName=talent.system.echoName||'L’Écho';
      let damageRoll=null;
      if(hit){ damageRoll=await(new Roll(`${dice}d8 + ${force}`)).evaluate(); await defender.applyDamage(damageRoll.total,{img:targetToken.document?.texture?.src||defender.img,silent:true}); }
      await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),rolls:damageRoll?[attackRoll,damageRoll]:[attackRoll],
        content:`<div class="vadentis-echo-chat vadentis-echo-roll-chat ${hit?'is-hit':'is-miss'}"><div class="vadentis-echo-chat-head"><img src="${portrait}" alt=""><div><small>ÉCHO · ${hit?'ATTAQUE RÉUSSIE':'ATTAQUE RATÉE'}</small><strong>${attackName}</strong><span>${echoName} → ${targetToken.name}</span></div></div><div class="vadentis-echo-attack-results"><div><span>ATTAQUE</span><small>1D20 + ${attack} · Défense ${defense}</small><b>${attackRoll.total}</b></div><div><span>DÉGÂTS</span><small>${hit?`${dice}D8 + ${force}`:'Aucun dégât'}</small><b>${hit?damageRoll.total:'—'}</b></div></div><p class="vadentis-echo-combat-verdict">${hit?`<i class="fas fa-burst"></i> ${targetToken.name} perd <b>${damageRoll.total} PV</b>.`:`<i class="fas fa-shield"></i> Défense de ${targetToken.name} : <b>${defense}</b>.`}</p></div>`});
    });

    // Sculpture élémentaire : les quatre choix sont directement accessibles
    // depuis la fiche (Hostile/Favorable × Personnage/Source extérieure).
    html.find('.vadentis-sculpture-action').click(async event => {
      event.preventDefault();
      const button = event.currentTarget;
      const talentId = button.dataset.talentId;
      const mode = button.dataset.mode || "hostile";
      const origin = button.dataset.origin || "self";
      if (!talentId) return;
      await this.actor.useSculpture(talentId, { mode, origin });
    });

    // Alchimie : déplie/replie les paliers sans quitter l'Atelier.
    html.find('.vadentis-alchemy-toggle').click(event => {
      event.preventDefault();
      const card = $(event.currentTarget).closest('.vadentis-alchemy-card');
      card.toggleClass('expanded');
      card.find('.vadentis-alchemy-tiers').stop(true, true).slideToggle(120);
    });

    // Étape Alchimie 1 : jet + détermination du palier. La création d'Item et
    // la dépense de VA seront branchées à l'étape suivante.
    html.find('.vadentis-alchemy-craft').click(async event => {
      event.preventDefault();
      event.stopPropagation();
      const id = event.currentTarget.dataset.conceptionId;
      if (!id) return;
      await this.actor.rollAlchimieConception(id);
    });

    // Alchimie : utilisation directe depuis Potions et conceptions alchimiques.
    html.find('.vadentis-alchemy-use').click(async event => {
      event.preventDefault(); event.stopPropagation();
      const id = event.currentTarget.dataset.itemId;
      if (id) await this.actor.useAlchimieItem(id);
    });

    // Fenêtre autonome des Assemblages
    html.find('.vadentis-open-assemblages').click(ev=>{ev.preventDefault();ev.stopPropagation();new VadentisAssemblagesWindow(this.actor).render(true);});

    // Ingénierie élémentaire
    html.find('.vadentis-engineering-fill-self').click(async ev=>{ev.preventDefault();await this.actor.fillElementalOrb();});
    html.find('.vadentis-engineering-fill-joint').click(async ev=>{ev.preventDefault();await this.actor.fillElementalOrbWithElementalist();});
    html.find('.vadentis-engineering-toggle').click(ev=>{ev.preventDefault();const card=$(ev.currentTarget).closest('.vadentis-engineering-card');card.toggleClass('expanded');card.find('.vadentis-engineering-details').stop(true,true).slideToggle(120);});
    html.find('.vadentis-engineering-craft').click(async ev=>{ev.preventDefault();ev.stopPropagation();const id=ev.currentTarget.dataset.assemblyId;if(id)await this.actor.craftEngineeringAssembly(id);});
    html.find('.vadentis-engineering-use').click(async ev=>{ev.preventDefault();ev.stopPropagation();const id=ev.currentTarget.dataset.itemId;if(id)await this.actor.useEngineeringAssembly(id);});
    html.find('.vadentis-engineering-recharge').click(async ev=>{ev.preventDefault();ev.stopPropagation();const id=ev.currentTarget.dataset.itemId;if(id)await this.actor.rechargeEngineeringAssembly(id);});
    const syncOrbInputs=(name,value)=>{html.find(`.vadentis-orb-qty-input[data-orb-name="${CSS.escape(name)}"]`).val(value);};
    html.find('.vadentis-orb-qty-input').on('change',async ev=>{ev.preventDefault();ev.stopPropagation();const name=ev.currentTarget.dataset.orbName;const value=Math.max(0,Math.floor(Number(ev.currentTarget.value)||0));if(name){syncOrbInputs(name,value);await this.actor.setIngenierieOrbQuantity(name,value);}});
    html.find('.vadentis-orb-qty-step').click(async ev=>{ev.preventDefault();ev.stopPropagation();const name=ev.currentTarget.dataset.orbName;const delta=Number(ev.currentTarget.dataset.delta||0);const current=Number($(ev.currentTarget).siblings('.vadentis-orb-qty-input').val()||0);const value=Math.max(0,current+delta);if(name){syncOrbInputs(name,value);await this.actor.setIngenierieOrbQuantity(name,value);}});
    html.find('.vadentis-potion-toggle').click(ev=>{if($(ev.target).closest('button,a,input').length)return;const main=$(ev.currentTarget);main.toggleClass('expanded');main.find('.vadentis-potion-collapsible').stop(true,true).slideToggle(130);});
    html.find('.vadentis-assembly-inventory-title').click(ev=>{ev.preventDefault();ev.stopPropagation();const row=$(ev.currentTarget).closest('.vadentis-assembly-inventory-card');row.toggleClass('expanded');row.find('.vadentis-assembly-inventory-details').stop(true,true).slideToggle(140);});

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("item-id"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      VadentisUtility.confirmDelete(this, li);
    });

    html.find('.munition-moins').click(event => {
      const li = $(event.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("item-id"));
      this.actor.decrementeMunition(item);
    });

    html.find('.munition-plus').click(event => {
      const li = $(event.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("item-id"));
      this.actor.incrementeMunition(item);
    });

    html.find('.equipement-moins').click(event => {
      const li = $(event.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("item-id"));
      this.actor.decrementeQuantite(item);
    });

    html.find('.equipement-plus').click(event => {
      const li = $(event.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("item-id"));
      this.actor.incrementeQuantite(item);
    });

    // Quantité de monnaie éditable directement dans l'inventaire. Ce champ n'est
    // volontairement PAS lié au formulaire de l'Actor : on met à jour uniquement
    // l'Item Monnaie ciblé au changement, ce qui évite les soucis de sauvegarde
    // rencontrés avec les anciens champs numériques libres de la feuille.
    html.find('.vadentis-money-input').on('change', async event => {
      const input = event.currentTarget;
      const item = this.actor.items.get(input.dataset.itemId);
      if (!item || item.type !== 'monnaie') return;
      const current = Number(item.system.nombre || 0);
      let value = Number(input.value);
      if (!Number.isFinite(value)) value = current;
      value = Math.max(0, Math.floor(value));
      input.value = value;
      if (value !== current) await item.update({'system.nombre': value});
    });

    html.find('.argent-moins').click(event => {
      const li = $(event.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("item-id"));
      this.actor.decrementeArgent(item);
    });

    html.find('.argent-plus').click(event => {
      const li = $(event.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("item-id"));
      this.actor.incrementeArgent(item);
    });

    html.find('.combat-label a').click((event) => {
      let combatName = event.currentTarget.attributes.name.value;
      this.actor.rollCombat(combatName);
    });

    html.find('.magie-label a').click((event) => {
      let magieName = event.currentTarget.attributes.name.value;
      this.actor.rollMagie(magieName);
    });

    html.find('.competence-label a').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const competenceId = li.data("item-id");
      this.actor.rollCompetence(competenceId);
    });

    html.find('.technique-use').click((event) => {
      event.preventDefault(); event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      this.checkTechnique(li.data("item-id"));
    });

    html.find('.technique-details-toggle, .attribut-details-toggle').click((event) => {
      event.preventDefault(); event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      li.children('.vadentis-capability-details').stop(true, true).slideToggle(160);
      li.toggleClass('vadentis-details-open');
    });

    html.find('.sort-details-toggle').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      const details = li.children(".sort-inline-details");
      details.stop(true, true).slideToggle(160);
      li.toggleClass("sort-details-open");
    });

    html.find('.sort-cast:not(.devotion-cast)').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      const sortId = li.data("item-id");
      this.checkSort(sortId);
    });

    html.find('.arme-label a').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const armeId = li.data("item-id");
      this.actor.rollArme(armeId);
    });

    html.find('.devotion-details-toggle').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      const details = li.children(".sort-inline-details");
      details.stop(true, true).slideToggle(160);
      li.toggleClass("sort-details-open");
    });

    html.find('.devotion-cast').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      this.checkDevotion(li.data("item-id"));
    });

    html.find('.weapon-details-toggle').click((event) => {
      event.preventDefault(); event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      li.children('.vadentis-weapon-details').stop(true, true).slideToggle(160);
      li.toggleClass('vadentis-details-open');
    });

    html.find('.weapon-attack').click((event) => {
      event.preventDefault(); event.stopPropagation();
      const li = $(event.currentTarget).closest(".item");
      this.actor.rollArme(li.data("item-id"));
    });

    html.find('.weapon-label a').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weapon = this.actor.items.get(li.data("item-id"));
      this.actor.rollWeapon(weapon);
    });

    html.find('.weapon-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weapon = this.actor.items.get(li.data("item-id"));
      this.actor.rollDamage(weapon, 'damage');
    });

    html.find('.weapon-damage-critical').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weapon = this.actor.items.get(li.data("item-id"));
      this.actor.rollDamage(weapon, 'criticaldamage');
    });

    html.find('.sort-damage').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weapon = this.actor.items.get(li.data("item-id"));
      this.actor.rollSortDevotionDamage(weapon, 'damage');
    });

    html.find('.sort-damage-critical').click((event) => {
      const li = $(event.currentTarget).parents(".item");
      const weapon = this.actor.items.get(li.data("item-id"));
      this.actor.rollSortDevotionDamage(weapon, 'damagecritical');
    });

    html.find('.competence-base').change((event) => {
      let skillName = event.currentTarget.attributes.skillname.value;
      this.actor.updateCompetence(skillName, "base", parseInt(event.target.value));
    });

    html.find('.competence-bonus').change((event) => {
      let skillName = event.currentTarget.attributes.skillname.value;
      this.actor.updateCompetence(skillName, "bonus", parseInt(event.target.value));
    });

    html.find('.competence-malus').change((event) => {
      let skillName = event.currentTarget.attributes.skillname.value;
      this.actor.updateCompetence(skillName, "malus", parseInt(event.target.value));
    });

    html.find('.lock-unlock-sheet').click((event) => {
      this.options.editScore = !this.options.editScore;
      this.render(true);
    });

    html.find('.item-link a').click((event) => {
      const itemId = $(event.currentTarget).data("item-id");
      const item = this.actor.items.get(itemId);
      item.sheet.render(true);
    });

    html.find('.item-equip').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.equiperObject(li.data("item-id"));
      this.render(true);
    });

  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    // Update the Actor
    return this.object.update(formData);
  }
}

/* Chante-vie — dépôt d'un Token d'Écho purement visuel.
 * Important : aucun Actor n'est créé et aucune donnée de combat n'est attachée au Token. */
Hooks.on('dropCanvasData', async (canvas, data) => {
  let drop = data;
  if (typeof drop === 'string') {
    try { drop = JSON.parse(drop); } catch (_) { return; }
  }
  if (drop?.type !== 'VadentisEchoToken') return;
  if (!canvas?.scene) return false;

  const owner = game.actors.get(drop.ownerActorId);
  const talent = owner?.items.get(drop.talentId);
  if (!talent?.system?.echoBound) return false;

  const grid = canvas.grid?.size || 100;
  const x = Math.round((Number(drop.x ?? 0) - grid / 2) / grid) * grid;
  const y = Math.round((Number(drop.y ?? 0) - grid / 2) / grid) * grid;
  const name = String(talent.system.echoName || drop.name || 'L’Écho');
  const img = String(talent.system.echoPortrait || drop.img || 'icons/svg/mystery-man.svg');

  await canvas.scene.createEmbeddedDocuments('Token', [{
    name, x, y, width: 1, height: 1,
    actorId: null, actorLink: false,
    texture: {src: img},
    disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
    displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
  }]);
  return false;
});

