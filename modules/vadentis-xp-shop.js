export class VadentisXPShop extends Application {

  constructor(actor, options = {}) {
    super(options);

    this.actor = actor;

    // Items déposés dans le magasin, en attente de validation.
    this.pendingPurchases = [];

    // Sélections conservées même lorsque la fenêtre est re-rendue
    // après l'ajout ou la suppression d'un Item.
    this.statSelections = {};

    this.competenceSelections = {};

    // Chante-vie : sélection d'une Affinité élémentaire (achetée une seule fois).
    this.echoAffinitySelections = [];
    // Quantités choisies dans le panier d'évolution de l'Écho.
    this.echoUpgradeSelections = {};

    // Talents majeurs achetés directement depuis le Magasin d'XP.
    this.talentSelections = {};

    // Protection contre un double clic sur "Valider".
    this.isConfirming = false;
  }

  /* ============================================ */
  /* OPTIONS                                      */
  /* ============================================ */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["foundryvtt-vadentis", "xp-shop"],
      template: "systems/foundryvtt-vadentis/templates/xp-shop.html",
      width: 500,
      height: 700,
      title: "Magasin d'XP",

      dragDrop: [
        {
          dragSelector: null,
          dropSelector: ".xp-shop-purchases"
        }
      ]
    });
  }

  /* ============================================ */
  /* DONNÉES                                      */
  /* ============================================ */

  _norm(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g,"'").trim();
  }

  _ownsTalent(key) {
    const aliases = {
      alchimie:["alchimie"],
      ingenierie:["ingenierie elementaire"],
      chantevie:["chante-vie","chante vie"],
      sculpture:["sculpture elementaire"]
    }[key] || [];
    return this.actor.items.some(i => i.type === "talent" && aliases.some(a => this._norm(i.name).includes(a)));
  }

  _competenceBase(name) {
    const wanted=this._norm(name);
    const c=this.actor.items.find(i=>i.type==="competence" && this._norm(i.name)===wanted);
    return Number(c?.system?.base || 0);
  }

  _hasTier2Spell() {
    return this.actor.items.some(i => i.type === "sort" && ["II","2"].includes(String(i.system?.palier || "").toUpperCase()));
  }

  _talentShopData() {
    const defs = [
      {key:"alchimie",name:"Alchimie",cost:700,theme:"alchimie",icon:"fa-flask",summary:"Transformer matières et Sorts en préparations alchimiques.",mechanical:`Connaissances ≥ 5`,ok:this._competenceBase("Connaissances")>=5},
      {key:"ingenierie",name:"Ingénierie élémentaire",cost:700,theme:"ingenierie",icon:"fa-gears",summary:"Créer Orbes et Assemblages alimentés par les Données.",mechanical:`Habileté ≥ 5`,ok:this._competenceBase("Habileté")>=5},
      {key:"chantevie",name:"Chante-Vie",cost:800,theme:"chantevie",icon:"fa-music",summary:"Créer un Écho et approfondir un lien vital avec lui.",mechanical:`Mental ≥ 5`,ok:this._competenceBase("Mental")>=5,narrative:"Trouver un artefact Adam|Sacrifier au moins 10 PV max"},
      {key:"sculpture",name:"Sculpture élémentaire",cost:800,theme:"sculpture",icon:"fa-draw-polygon",summary:"Façonner directement les Données élémentaires maîtrisées.",mechanical:"Posséder au moins un Sort de Palier II",ok:this._hasTier2Spell()}
    ];
    return defs.map(d=>({...d,
      narrativeLines:d.narrative ? String(d.narrative).split("|") : [],
      owned:this._ownsTalent(d.key),selected:!!this.talentSelections[d.key]
    }));
  }

  getData() {
    const xp = Number(
      this.actor.system?.experience?.experience?.total ?? 0
    );

    const chanteVie = this.actor.items.find(i =>
      i.type === "talent" &&
      String(i.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("chante-vie")
    );
    const echoBound = !!chanteVie?.system?.echoBound;
    const rawAffinities = chanteVie?.system?.echoAffinities;
    const legacyAffinity = String(chanteVie?.system?.echoAffinity || "");
    const affinities = Array.isArray(rawAffinities)
      ? rawAffinities
      : (legacyAffinity ? [legacyAffinity] : []);

    const normalize = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const dataDefs = [
      {name:"Feu", icon:"fa-fire", aliases:["feu"]},
      {name:"Eau", icon:"fa-water", aliases:["eau"]},
      {name:"Vent", icon:"fa-wind", aliases:["vent"]},
      {name:"Terre", icon:"fa-mountain", aliases:["terre"]},
      {name:"Foudre", icon:"fa-bolt", aliases:["foudre"]},
      {name:"Lumière", icon:"fa-sun", aliases:["lumiere"]}
    ];
    // Une Affinité ne peut venir QUE d'un Item de type "donnee" réellement possédé.
    // On évite ainsi les faux positifs provenant des noms de Sorts, Talents, etc.
    const actorDataItems = this.actor.items.filter(i => i.type === "donnee");
    const availableEchoAffinities = dataDefs
      .filter(d => d.aliases.some(a => actorDataItems.some(i => {
        const n = normalize(i.name);
        return n === a
          || n === `donnee ${a}`
          || n === `donnee de ${a}`
          || n === `donnee du ${a}`
          || n === `donnee d ${a}`
          || n === `donnee de la ${a}`;
      })))
      .map(d => ({
        ...d,
        owned: affinities.includes(d.name),
        img: this.findDataImage(d.name)
      }));

    return {
      name: this.actor.name,
      xp: xp,
      purchases: this.pendingPurchases,
      talentShop: this._talentShopData(),
      hasChanteVie: !!chanteVie,
      echoBound,
      echoTier: chanteVie?.system?.echoTier || "Écho-murmuré",
      echoAffinities: affinities,
      echoHasAffinities: affinities.length > 0,
      availableEchoAffinities,
      echoAffinityCost: 600,
      echoStats: {
        attack: Number(chanteVie?.system?.echoAttack ?? 2),
        defense: Number(chanteVie?.system?.echoDefense ?? 9),
        force: Number(chanteVie?.system?.echoForce ?? 1),
        speed: Number(chanteVie?.system?.echoSpeed ?? 6),
        skills: {
          athletisme: Number(chanteVie?.system?.echoSkills?.athletisme ?? 1),
          habilete: Number(chanteVie?.system?.echoSkills?.habilete ?? 1),
          perception: Number(chanteVie?.system?.echoSkills?.perception ?? 1),
          mental: Number(chanteVie?.system?.echoSkills?.mental ?? 1),
          social: Number(chanteVie?.system?.echoSkills?.social ?? 0),
          connaissances: Number(chanteVie?.system?.echoSkills?.connaissances ?? 0)
        },
        damageLevel: Math.max(
          Number(chanteVie?.system?.echoDamageUpgrade ?? 0),
          Math.max(0, Number(chanteVie?.system?.echoDamageDice ?? 1) - 1)
        ),
        damage1Owned: Math.max(Number(chanteVie?.system?.echoDamageUpgrade ?? 0), Math.max(0, Number(chanteVie?.system?.echoDamageDice ?? 1)-1)) >= 1,
        damage2Owned: Math.max(Number(chanteVie?.system?.echoDamageUpgrade ?? 0), Math.max(0, Number(chanteVie?.system?.echoDamageDice ?? 1)-1)) >= 2,
        damage2Available: Math.max(Number(chanteVie?.system?.echoDamageUpgrade ?? 0), Math.max(0, Number(chanteVie?.system?.echoDamageDice ?? 1)-1)) >= 1
      },
      echoUpgradeSelections: {
        attack: Number(this.echoUpgradeSelections.attack || 0),
        defense: Number(this.echoUpgradeSelections.defense || 0),
        force: Number(this.echoUpgradeSelections.force || 0),
        speed: Number(this.echoUpgradeSelections.speed || 0),
        skillAthletisme: Number(this.echoUpgradeSelections["skill:athletisme"] || 0),
        skillHabilete: Number(this.echoUpgradeSelections["skill:habilete"] || 0),
        skillPerception: Number(this.echoUpgradeSelections["skill:perception"] || 0),
        skillMental: Number(this.echoUpgradeSelections["skill:mental"] || 0),
        skillSocial: Number(this.echoUpgradeSelections["skill:social"] || 0),
        skillConnaissances: Number(this.echoUpgradeSelections["skill:connaissances"] || 0)
      }
    };
  }

  /* ============================================ */
  /* COÛTS DES CARACTÉRISTIQUES                   */
  /* ============================================ */

  getStatCosts() {
    return {
      pointsvie: 50,
      pointsenergie: 50,
      pointsadrenaline: 500,
      initiative: 100,
      force: 500,
      attaque: 500,
      defense: 500,
      vitesse: 300,
      matriseelementaire: 500,
      devotion: 500
    };
  }

  /* ============================================ */
  /* LISTENERS                                    */
  /* ============================================ */

  activateListeners(html) {
    super.activateListeners(html);

    /*
     * Lorsqu'un drag & drop provoque un render(),
     * les quantités sélectionnées sont réaffichées.
     */
    this.restoreSelections(html);

    /* -------------------------------------------- */
    /* Suppression d'un Item du panier              */
    /* -------------------------------------------- */

    html.find(".xp-shop-purchase-remove").click((event) => {

      const index =
        Number(event.currentTarget.dataset.index);

      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index < this.pendingPurchases.length
      ) {
        this.pendingPurchases.splice(index, 1);

        this.render(true);
      }
    });

    /* -------------------------------------------- */
    /* Caractéristiques : +                         */
    /* -------------------------------------------- */

    html.find(".xp-shop-stat-plus").click((event) => {

      const button = event.currentTarget;

      const stat = button.dataset.stat;

      if (!stat) {
        return;
      }

      const costs = this.getStatCosts();

      const cost =
        Number(costs[stat] ?? 0);

      const currentTotal =
        this.calculateXPTotal();

      const availableXP =
        this.getAvailableXP();

      if (currentTotal + cost > availableXP) {

        ui.notifications.warn(
          "Vous n'avez pas assez d'XP pour cette augmentation."
        );

        return;
      }

      const currentValue =
        Number(this.statSelections[stat] ?? 0);

      this.statSelections[stat] =
        currentValue + 1;

      this.refreshSelections(html);

      this.updateXPTotal(html);
    });

    /* -------------------------------------------- */
    /* Caractéristiques : -                         */
    /* -------------------------------------------- */

    html.find(".xp-shop-stat-minus").click((event) => {

      const button = event.currentTarget;

      const stat = button.dataset.stat;

      if (!stat) {
        return;
      }

      const currentValue =
        Number(this.statSelections[stat] ?? 0);

      if (currentValue > 0) {
        this.statSelections[stat] =
          currentValue - 1;
      }

      this.refreshSelections(html);

      this.updateXPTotal(html);
    });

    /* -------------------------------------------- */
    /* Compétences : +                              */
    /* -------------------------------------------- */

    html.find(".xp-shop-competence-plus").click((event) => {

      const button = event.currentTarget;

      const competenceName =
        button.dataset.competence;

      if (!competenceName) {
        return;
      }

      const competence =
        this.actor.items.find(
          item =>
            item.type === "competence" &&
            item.name === competenceName
        );

      if (!competence) {

        ui.notifications.warn(
          `La compétence "${competenceName}" est introuvable sur ce personnage.`
        );

        return;
      }

      const currentSelected =
        Number(
          this.competenceSelections[
            competenceName
          ] ?? 0
        );

      const currentBase =
        Number(
          competence.system?.base ?? 0
        );

      const cost =
        this.getCompetenceNextCost(
          currentBase + currentSelected
        );

      const currentTotal =
        this.calculateXPTotal();

      const availableXP =
        this.getAvailableXP();

      if (currentTotal + cost > availableXP) {

        ui.notifications.warn(
          "Vous n'avez pas assez d'XP pour augmenter cette compétence."
        );

        return;
      }

      this.competenceSelections[
        competenceName
      ] = currentSelected + 1;

      this.refreshSelections(html);

      this.updateXPTotal(html);
    });

    /* -------------------------------------------- */
    /* Compétences : -                              */
    /* -------------------------------------------- */

    html.find(".xp-shop-competence-minus").click((event) => {

      const button = event.currentTarget;

      const competenceName =
        button.dataset.competence;

      if (!competenceName) {
        return;
      }

      const currentValue =
        Number(
          this.competenceSelections[
            competenceName
          ] ?? 0
        );

      if (currentValue > 0) {

        this.competenceSelections[
          competenceName
        ] = currentValue - 1;
      }

      this.refreshSelections(html);

      this.updateXPTotal(html);
    });

    /* -------------------------------------------- */
    /* Chante-vie                                   */
    /* -------------------------------------------- */

    html.find(".xp-shop-talent-buy").click((event) => {
      event.preventDefault();
      const key=String(event.currentTarget.dataset.talent || "");
      const def=this._talentShopData().find(t=>t.key===key);
      if(!def || def.owned) return;
      if(!def.ok) {
        ui.notifications.warn(`Prérequis non rempli : ${def.mechanical}.`);
        return;
      }
      this.talentSelections[key]=!this.talentSelections[key];
      this.render(false);
    });

    html.find(".xp-shop-echo-affinity").click((event) => {
      const button = event.currentTarget;
      if (button.disabled || button.classList.contains("is-owned")) return;
      const affinity = String(button.dataset.affinity || "");
      if (!affinity) return;

      const talent = this.getChanteVieTalent();
      if (!talent?.system?.echoBound) {
        ui.notifications.warn("L’Écho doit d’abord être créé.");
        return;
      }

      const raw = talent.system?.echoAffinities;
      const owned = Array.isArray(raw) ? raw : (talent.system?.echoAffinity ? [String(talent.system.echoAffinity)] : []);
      if (owned.includes(affinity)) return;

      const index = this.echoAffinitySelections.indexOf(affinity);
      if (index >= 0) this.echoAffinitySelections.splice(index, 1);
      else this.echoAffinitySelections.push(affinity);

      html.find(`.xp-shop-echo-affinity[data-affinity="${affinity}"]`)
        .toggleClass("is-selected", this.echoAffinitySelections.includes(affinity));
      this.updateXPTotal(html);
    });

    html.find(".xp-shop-echo-adjust").click((event) => {
      const btn = event.currentTarget;
      const key = String(btn.dataset.upgrade || "");
      const delta = Number(btn.dataset.delta || 0);
      if (!key || !delta) return;

      const talent = this.getChanteVieTalent();
      if (!talent?.system?.echoBound) return;

      const getCurrent = () => {
        if (key.startsWith("skill:")) {
          const sk = key.split(":")[1];
          const defaults = {athletisme:1,habilete:1,perception:1,mental:1,social:0,connaissances:0};
          return Number(talent.system?.echoSkills?.[sk] ?? defaults[sk] ?? 0);
        }
        const map = {attack:["echoAttack",2],defense:["echoDefense",9],force:["echoForce",1],speed:["echoSpeed",6]};
        const [field, fallback] = map[key] || [];
        return field ? Number(talent.system?.[field] ?? fallback) : 0;
      };
      const max = key === "attack" ? 10 : key === "defense" ? 15 : key === "force" ? 10 : key === "speed" ? 20 : 10;
      const step = key === "speed" ? 3 : 1;
      const current = getCurrent();
      const selected = Number(this.echoUpgradeSelections[key] || 0);
      const next = Math.max(0, selected + delta);
      if (current + next * step > max) return;

      this.echoUpgradeSelections[key] = next;
      this.render(false);
    });

    html.find(".xp-shop-echo-damage").click((event) => {
      const btn = event.currentTarget;
      if (btn.disabled) return;
      const level = Number(btn.dataset.level || 0);
      const talent = this.getChanteVieTalent();
      const owned = Math.max(
        Number(talent?.system?.echoDamageUpgrade ?? 0),
        Math.max(0, Number(talent?.system?.echoDamageDice ?? 1) - 1)
      );
      const firstInCart = Number(this.echoUpgradeSelections.damage1 || 0) > 0;
      if(level===1 && owned<1){
        this.echoUpgradeSelections.damage1 = firstInCart ? 0 : 1;
      } else if(level===2 && owned<2 && (owned>=1 || firstInCart)){
        this.echoUpgradeSelections.damage2 = this.echoUpgradeSelections.damage2 ? 0 : 1;
      } else return;

      const htmlRoot=this.element;
      htmlRoot.find('.xp-shop-echo-damage[data-level="1"]').toggleClass('is-selected',!!this.echoUpgradeSelections.damage1);
      htmlRoot.find('.xp-shop-echo-damage[data-level="2"]')
        .prop('disabled', owned<1 && !this.echoUpgradeSelections.damage1)
        .toggleClass('is-selected',!!this.echoUpgradeSelections.damage2);
      this.updateXPTotal(htmlRoot);
    });

    html.find(".xp-shop-echo-strengthen").click(() => {
      const talent = this.getChanteVieTalent();
      if (!talent?.system?.echoBound) {
        ui.notifications.warn("L’Écho doit d’abord être créé.");
        return;
      }
      this.openEchoStrengthenDialog(talent);
    });

    /* -------------------------------------------- */
    /* Validation                                   */
    /* -------------------------------------------- */

    html.find(".xp-shop-confirm").click(async (event) => {

      if (this.isConfirming) {
        return;
      }

      await this.confirmPurchases(
        html,
        event.currentTarget
      );
    });

    /* -------------------------------------------- */

    this.updateXPTotal(html);
  }

  /* ============================================ */
  /* MÉMORISATION DE L'AFFICHAGE                  */
  /* ============================================ */

  restoreSelections(html) {
    this.refreshSelections(html);
  }

  /* -------------------------------------------- */

  refreshSelections(html) {

    /*
     * Caractéristiques
     */

    html.find(".xp-shop-stat").each(
      (_, element) => {

        const stat =
          element
            .querySelector(
              ".xp-shop-stat-plus"
            )
            ?.dataset.stat;

        const valueElement =
          element.querySelector(
            ".xp-shop-stat-value"
          );

        if (!stat || !valueElement) {
          return;
        }

        const quantity =
          Number(
            this.statSelections[stat] ?? 0
          );

        valueElement.textContent =
          `+${quantity}`;
      }
    );

    /*
     * Compétences
     */

    html.find(".xp-shop-competence").each(
      (_, element) => {

        const competenceName =
          element
            .querySelector(
              ".xp-shop-competence-plus"
            )
            ?.dataset.competence;

        const valueElement =
          element.querySelector(
            ".xp-shop-competence-value"
          );

        if (
          !competenceName ||
          !valueElement
        ) {
          return;
        }

        const quantity =
          Number(
            this.competenceSelections[
              competenceName
            ] ?? 0
          );

        valueElement.textContent =
          `+${quantity}`;
      }
    );
  }
  /* ============================================ */
  /* AUTORISATION DU DRAG & DROP                 */
  /* ============================================ */

  _canDragDrop(selector) {

    // Le Magasin d'XP est utilisable par le propriétaire
    // du personnage, ainsi que par le MJ.
    return game.user.isGM || this.actor.isOwner;
  }

  /* ============================================ */
  /* DRAG & DROP                                  */
  /* ============================================ */

  async _onDrop(event) {

    const data =
      TextEditor.getDragEventData(event);

    if (
      !data ||
      data.type !== "Item"
    ) {
      return;
    }

    const item =
      await Item.implementation.fromDropData(
        data
      );

    if (!item) {
      return;
    }

    /* -------------------------------------------- */
    /* Types autorisés                              */
    /* -------------------------------------------- */

    if (
      ![
        "sort",
        "technique",
        "attribut"
      ].includes(item.type)
    ) {

      ui.notifications.warn(
        "Seuls les Sorts, Techniques et Attributs peuvent être achetés avec le Magasin d'XP."
      );

      return;
    }

    /* -------------------------------------------- */
    /* Coût                                         */
    /* -------------------------------------------- */

    const cost =
      Number(item.system?.xp ?? 0);

    if (
      !Number.isFinite(cost) ||
      cost < 0
    ) {

      ui.notifications.warn(
        `L'élément "${item.name}" n'a pas de coût d'XP valide.`
      );

      return;
    }

    /* -------------------------------------------- */
    /* Doublon déjà dans le panier                  */
    /* -------------------------------------------- */

    const alreadyPending =
      this.pendingPurchases.some(
        purchase =>
          purchase.type === item.type &&
          purchase.name === item.name
      );

    if (alreadyPending) {

      ui.notifications.warn(
        `"${item.name}" est déjà présent dans le panier.`
      );

      return;
    }

    /* -------------------------------------------- */
    /* Doublon déjà possédé                         */
    /* -------------------------------------------- */

    const alreadyOwned =
      this.actor.items.some(
        ownedItem =>
          ownedItem.type === item.type &&
          ownedItem.name === item.name
      );

    if (alreadyOwned) {

      ui.notifications.warn(
        `${this.actor.name} possède déjà "${item.name}".`
      );

      return;
    }

    /* -------------------------------------------- */
    /* Vérification globale de l'XP                 */
    /* -------------------------------------------- */

    const currentTotal =
      this.calculateXPTotal();

    const availableXP =
      this.getAvailableXP();

    if (
      currentTotal + cost >
      availableXP
    ) {

      ui.notifications.warn(
        `Pas assez d'XP pour ajouter "${item.name}".`
      );

      return;
    }

    /* -------------------------------------------- */
    /* Copie de l'Item                              */
    /* -------------------------------------------- */

    const itemData =
      item.toObject();

    delete itemData._id;

    this.pendingPurchases.push({
      name: item.name,
      type: item.type,
      img: item.img,
      cost: cost,
      sourceUuid: item.uuid,
      data: itemData
    });

    /*
     * Le render est maintenant sans danger :
     * statSelections et competenceSelections
     * conservent les + sélectionnés.
     */

    this.render(true);
  }

  /* ============================================ */
  /* CHANTE-VIE                                   */
  /* ============================================ */

  findDataImage(dataName) {
    const norm = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const wanted = norm(dataName);
    const item = this.actor.items.find(i => {
      if (i.type !== "donnee") return false;
      const n = norm(i.name);
      return n === wanted
        || n === `donnee ${wanted}`
        || n === `donnee de ${wanted}`
        || n === `donnee du ${wanted}`
        || n === `donnee d ${wanted}`
        || n === `donnee de la ${wanted}`;
    });
    return item?.img || "";
  }

  getChanteVieTalent() {
    return this.actor.items.find(i =>
      i.type === "talent" &&
      String(i.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("chante-vie")
    );
  }

  async openEchoStrengthenDialog(talent) {
    const levels = [
      {sacrifice:10,tier:"Écho-murmuré",hp:20},
      {sacrifice:20,tier:"Écho-chanté",hp:30},
      {sacrifice:30,tier:"Écho-mélodieux",hp:40},
      {sacrifice:40,tier:"Écho-symphonique",hp:50}
    ];
    const current = Number(talent.system?.echoSacrifice || 10);
    const currentLevel = levels.find(l => l.sacrifice === current) || levels[0];
    const choices = levels.filter(l => l.sacrifice > current).map(l => {
      const delta = l.sacrifice - current;
      return `<button type="button" class="vadentis-echo-link-choice" data-sacrifice="${l.sacrifice}">
        <span class="echo-link-arrow"><b>${currentLevel.tier}</b><i class="fas fa-arrow-right"></i><b>${l.tier}</b></span>
        <span class="echo-link-effects"><span><i class="fas fa-heart-crack"></i> Sacrifiez <b>${delta} PV max</b></span><span><i class="fas fa-heart"></i> L’Écho aura <b>${l.hp} PV</b></span></span>
      </button>`;
    }).join("");

    const content = `<div class="vadentis-echo-link-dialog">
      <div class="echo-link-current"><small>LIEN ACTUEL</small><b>${currentLevel.tier}</b><span>${currentLevel.hp} PV pour l’Écho</span></div>
      <p>Choisissez jusqu’où approfondir le lien. Le sacrifice de PV maximum du Chante-vie est <b>définitif</b>.</p>
      <div class="vadentis-echo-link-choices">${choices || '<p class="echo-link-max">Le lien a atteint sa profondeur maximale.</p>'}</div>
    </div>`;

    new Dialog({
      title:"Renforcer le lien",
      content,
      buttons:{close:{label:"Fermer"}},
      render: htmlDialog => htmlDialog.find(".vadentis-echo-link-choice").on("click", async e => {
        const target=Number(e.currentTarget.dataset.sacrifice);
        const next=levels.find(l=>l.sacrifice===target);
        if(!next) return;
        const delta=target-current;
        const currentMax=Number(this.actor.system?.stats?.pointsvie?.max ?? 0);
        const currentPv=Number(this.actor.system?.stats?.pointsvie?.value ?? 0);
        if(currentMax<=delta){ui.notifications.warn("Impossible : il faut conserver au moins 1 PV maximum.");return;}
        const ok=await Dialog.confirm({
          title:`${currentLevel.tier} → ${next.tier}`,
          content:`<div class="vadentis-echo-link-confirm"><p>Transformer <b>${talent.system?.echoName || "l’Écho"}</b> de <b>${currentLevel.tier}</b> en <b>${next.tier}</b>.</p><p><i class="fas fa-heart-crack"></i> Sacrifice : <b>${delta} PV maximum</b></p><p><i class="fas fa-heart"></i> Nouveaux PV de l’Écho : <b>${next.hp}</b></p></div>`,
          yes:()=>true,no:()=>false
        });
        if(!ok)return;
        const newMax=currentMax-delta;
        await this.actor.update({"system.stats.pointsvie.max":newMax,"system.stats.pointsvie.value":Math.min(currentPv,newMax)});
        await talent.update({"system.echoSacrifice":target,"system.echoTier":next.tier,"system.echoHpMax":next.hp,"system.echoHp":next.hp});
        ui.notifications.info(`${talent.system?.echoName || "L’Écho"} devient ${next.tier}.`);
        Object.values(ui.windows).find(w=>w instanceof Dialog && w.title==="Renforcer le lien")?.close();
        this.render(true);
      })
    },{classes:["foundryvtt-vadentis","vadentis-echo-link-window"],width:600}).render(true);
  }


  /* ============================================ */
  /* XP DISPONIBLE                                */
  /* ============================================ */

  getAvailableXP() {
    return Number(
      this.actor.system
        ?.experience
        ?.experience
        ?.total ?? 0
    );
  }

  /* ============================================ */
  /* COÛTS DES COMPÉTENCES                        */
  /* ============================================ */

  getCompetenceNextCost(baseValue) {

    const base =
      Number(baseValue) || 0;

    if (base < 5) return 100;

    if (base < 10) return 150;

    if (base < 15) return 200;

    return 250;
  }

  /* ============================================ */
  /* CALCUL DU TOTAL                              */
  /* ============================================ */

  calculateXPTotal() {

    const costs =
      this.getStatCosts();

    let totalCost = 0;

    /* -------------------------------------------- */
    /* Items                                        */
    /* -------------------------------------------- */

    for (
      const purchase
      of this.pendingPurchases
    ) {

      totalCost +=
        Number(purchase.cost) || 0;
    }

    /* -------------------------------------------- */
    /* Caractéristiques                             */
    /* -------------------------------------------- */

    for (
      const [stat, quantityValue]
      of Object.entries(
        this.statSelections
      )
    ) {

      const quantity =
        Number(quantityValue) || 0;

      totalCost +=
        quantity *
        Number(costs[stat] ?? 0);
    }

    /* -------------------------------------------- */
    /* Compétences                                  */
    /* -------------------------------------------- */

    for (
      const [
        competenceName,
        quantityValue
      ]
      of Object.entries(
        this.competenceSelections
      )
    ) {

      const quantity =
        Number(quantityValue) || 0;

      if (quantity <= 0) {
        continue;
      }

      const competence =
        this.actor.items.find(
          item =>
            item.type === "competence" &&
            item.name === competenceName
        );

      if (!competence) {
        continue;
      }

      const currentBase =
        Number(
          competence.system?.base ?? 0
        );

      for (
        let i = 0;
        i < quantity;
        i++
      ) {

        totalCost +=
          this.getCompetenceNextCost(
            currentBase + i
          );
      }
    }

    for (const talent of this._talentShopData()) {
      if (this.talentSelections[talent.key] && !talent.owned) totalCost += Number(talent.cost || 0);
    }

    if (this.echoAffinitySelections.length) {
      totalCost += 600 * this.echoAffinitySelections.length;
    }
    const echoUpgradeCosts = {attack:400, defense:400, force:400, speed:200};
    for (const [key,cost] of Object.entries(echoUpgradeCosts)) {
      totalCost += Number(this.echoUpgradeSelections[key] || 0) * cost;
    }
    for (const [key,qty] of Object.entries(this.echoUpgradeSelections)) {
      if (key.startsWith("skill:")) totalCost += Number(qty || 0) * 200;
    }
    if (this.echoUpgradeSelections.damage1) totalCost += 400;
    if (this.echoUpgradeSelections.damage2) totalCost += 500;

    return totalCost;
  }

  /* ============================================ */
  /* AFFICHAGE DU TOTAL                           */
  /* ============================================ */

  updateXPTotal(html) {

    const totalCost =
      this.calculateXPTotal();

    const availableXP =
      this.getAvailableXP();

    const remainingXP =
      availableXP - totalCost;

    html.find(
      ".xp-shop-total-cost"
    ).text(
      `XP dépensée : ${totalCost} XP`
    );

    html.find(
      ".xp-shop-remaining-xp"
    ).text(
      `XP restante : ${remainingXP} XP`
    );

    /*
     * Sécurité supplémentaire.
     * Normalement le magasin empêche déjà
     * de passer sous zéro.
     */

    if (remainingXP < 0) {

      html.find(
        ".xp-shop-remaining-xp"
      ).addClass(
        "xp-shop-insufficient"
      );

    } else {

      html.find(
        ".xp-shop-remaining-xp"
      ).removeClass(
        "xp-shop-insufficient"
      );
    }
  }

  /* ============================================ */
  /* Y A-T-IL QUELQUE CHOSE À ACHETER ?           */
  /* ============================================ */

  hasPurchases() {

    if (
      this.pendingPurchases.length > 0
    ) {
      return true;
    }

    const hasStats =
      Object.values(
        this.statSelections
      ).some(
        quantity =>
          Number(quantity) > 0
      );

    if (hasStats) {
      return true;
    }

    const hasCompetences =
      Object.values(
        this.competenceSelections
      ).some(
        quantity =>
          Number(quantity) > 0
      );

    if (hasCompetences) return true;
    if (Object.values(this.talentSelections).some(Boolean)) return true;
    if (this.echoAffinitySelections.length > 0) return true;
    return Object.values(this.echoUpgradeSelections).some(v => Number(v) > 0);
  }

  /* ============================================ */
  /* VALIDATION                                   */
  /* ============================================ */

  async confirmPurchases(
    html,
    confirmButton
  ) {

    /* -------------------------------------------- */
    /* Panier vide                                  */
    /* -------------------------------------------- */

    if (!this.hasPurchases()) {

      ui.notifications.warn(
        "Aucun achat n'a été sélectionné."
      );

      return;
    }

    /* -------------------------------------------- */
    /* Protection contre double validation          */
    /* -------------------------------------------- */

    if (this.isConfirming) {
      return;
    }

    this.isConfirming = true;

    if (confirmButton) {
      confirmButton.disabled = true;
    }

    try {

      const totalCost =
        this.calculateXPTotal();

      const availableXP =
        this.getAvailableXP();

      /* ------------------------------------------ */
      /* Vérification finale                        */
      /* ------------------------------------------ */

      if (
        totalCost >
        availableXP
      ) {

        ui.notifications.warn(
          "Vous n'avez pas assez d'XP pour effectuer ces achats."
        );

        return;
      }

      /* ------------------------------------------ */
      /* Vérifie une dernière fois les doublons     */
      /* ------------------------------------------ */

      for (
        const purchase
        of this.pendingPurchases
      ) {

        const alreadyOwned =
          this.actor.items.some(
            item =>
              item.type ===
                purchase.type &&
              item.name ===
                purchase.name
          );

        if (alreadyOwned) {

          ui.notifications.warn(
            `${this.actor.name} possède déjà "${purchase.name}".`
          );

          return;
        }
      }

      /* ------------------------------------------ */

      const updates = {};

      const competenceUpdates = [];

      /* ========================================== */
      /* CARACTÉRISTIQUES                           */
      /* ========================================== */

      for (
        const [
          stat,
          quantityValue
        ]
        of Object.entries(
          this.statSelections
        )
      ) {

        const quantity =
          Number(quantityValue) || 0;

        if (quantity <= 0) {
          continue;
        }

        if (
          stat === "pointsvie"
        ) {

          const currentMax =
            Number(
              this.actor.system
                ?.stats
                ?.pointsvie
                ?.max ?? 0
            );

          updates[
            "system.stats.pointsvie.max"
          ] =
            currentMax + quantity;

        } else if (
          stat === "pointsenergie"
        ) {

          const currentMax =
            Number(
              this.actor.system
                ?.stats
                ?.pointsenergie
                ?.max ?? 0
            );

          updates[
            "system.stats.pointsenergie.max"
          ] =
            currentMax + quantity;

        } else if (
          stat === "pointsadrenaline"
        ) {

          const currentMax =
            Number(
              this.actor.system
                ?.stats
                ?.pointsadrenaline
                ?.max ?? 0
            );

          updates[
            "system.stats.pointsadrenaline.max"
          ] =
            currentMax + quantity;

        } else if (
          stat === "initiative"
        ) {

          const currentBase =
            Number(
              this.actor.system
                ?.combat
                ?.initiative
                ?.base ?? 0
            );

          updates[
            "system.combat.initiative.base"
          ] =
            currentBase + quantity;

        } else if (
          stat === "force"
        ) {

          const currentBase =
            Number(
              this.actor.system
                ?.combat
                ?.force
                ?.base ?? 0
            );

          updates[
            "system.combat.force.base"
          ] =
            currentBase + quantity;

        } else if (
          stat === "attaque"
        ) {

          const currentBase =
            Number(
              this.actor.system
                ?.combat
                ?.attaque
                ?.base ?? 0
            );

          updates[
            "system.combat.attaque.base"
          ] =
            currentBase + quantity;

        } else if (
          stat === "defense"
        ) {

          const currentBase =
            Number(
              this.actor.system
                ?.combat
                ?.defense
                ?.base ?? 0
            );

          updates[
            "system.combat.defense.base"
          ] =
            currentBase + quantity;

        } else if (
          stat === "vitesse"
        ) {

          const currentBase =
            Number(
              this.actor.system
                ?.combat
                ?.vitesse
                ?.base ?? 0
            );

          updates[
            "system.combat.vitesse.base"
          ] =
            currentBase + quantity;

        } else if (
          stat === "matriseelementaire"
        ) {

          const currentBase =
            Number(
              this.actor.system
                ?.magie
                ?.matriseelementaire
                ?.base ?? 0
            );

          updates[
            "system.magie.matriseelementaire.base"
          ] =
            currentBase + quantity;

        } else if (
          stat === "devotion"
        ) {

          const currentBase =
            Number(
              this.actor.system
                ?.magie
                ?.devotion
                ?.base ?? 0
            );

          updates[
            "system.magie.devotion.base"
          ] =
            currentBase + quantity;
        }
      }

      /* ========================================== */
      /* COMPÉTENCES                                */
      /* ========================================== */

      for (
        const [
          competenceName,
          quantityValue
        ]
        of Object.entries(
          this.competenceSelections
        )
      ) {

        const quantity =
          Number(quantityValue) || 0;

        if (quantity <= 0) {
          continue;
        }

        const competence =
          this.actor.items.find(
            item =>
              item.type ===
                "competence" &&
              item.name ===
                competenceName
          );

        if (!competence) {

          ui.notifications.warn(
            `La compétence "${competenceName}" est introuvable.`
          );

          return;
        }

        const currentBase =
          Number(
            competence.system?.base ?? 0
          );

        competenceUpdates.push({
          _id: competence.id,
          "system.base":
            currentBase + quantity
        });
      }

      /* ========================================== */
      /* TALENTS MAJEURS                            */
      /* ========================================== */
      const selectedTalentDefs=this._talentShopData().filter(t=>this.talentSelections[t.key] && !t.owned);
      for(const def of selectedTalentDefs){
        if(!def.ok){
          ui.notifications.warn(`Achat de ${def.name} refusé : ${def.mechanical}.`);
          return;
        }
      }

      const itemsToCreate = this.pendingPurchases.map(purchase => purchase.data);
      const talentItems=[];
      const talentIcons={
        alchimie:"systems/foundryvtt-vadentis/images/icons/talents/alchimie.png",
        ingenierie:"systems/foundryvtt-vadentis/images/icons/talents/ingenierie-elementaire.png",
        "chante-vie":"systems/foundryvtt-vadentis/images/icons/talents/chante-vie.png",
        sculpture:"systems/foundryvtt-vadentis/images/icons/talents/sculpture-elementaire.png"
      };
      const commonTalent=(name,talentType,description)=>({
        name,type:"talent",img:talentIcons[talentType] || "icons/svg/book.svg",
        system:{xp:0,condition:"",description,notes:"",talentType,sculptureDonnee:"",sculptureSuperieure:false}
      });

      if(selectedTalentDefs.some(t=>t.key==="alchimie")){
        talentItems.push(commonTalent("Alchimie","alchimie","Transforme matières et Sorts en préparations alchimiques."));
        if(!this.actor.items.some(i=>i.type==="competence" && this._norm(i.name)==="alchimie")) itemsToCreate.push({name:"Alchimie",type:"competence",img:"systems/foundryvtt-vadentis/images/competences/alchimie.png",system:{xp:0,base:0,bonus:0,malus:0,competencerole:false,description:"Compétence débloquée par le Talent Alchimie."}});
        if(!this.actor.items.some(i=>i.type==="monnaie" && ["materiel d'alchimie","materiel alchimie"].includes(this._norm(i.name)))){
          itemsToCreate.push({name:"Matériel d’Alchimie",type:"monnaie",img:"systems/foundryvtt-vadentis/images/monnaies/materiel-alchimie.png",system:{nombre:0,enc:0,description:"Ressource utilisée par le Talent Alchimie."}});
        }
      }
      if(selectedTalentDefs.some(t=>t.key==="ingenierie")){
        talentItems.push(commonTalent("Ingénierie élémentaire","ingenierie","Conçoit des Orbes et des Assemblages élémentaires."));
        if(!this.actor.items.some(i=>i.type==="competence" && this._norm(i.name)==="ingenierie elementaire")) itemsToCreate.push({name:"Ingénierie élémentaire",type:"competence",img:"systems/foundryvtt-vadentis/images/competences/ingenierie-elementaire.png",system:{xp:0,base:0,bonus:0,malus:0,competencerole:false,description:"Compétence débloquée par le Talent Ingénierie élémentaire."}});
        if(!this.actor.items.some(i=>i.type==="monnaie" && ["materiel d'ingenierie","materiel ingenierie"].includes(this._norm(i.name)))){
          itemsToCreate.push({name:"Matériel d’Ingénierie",type:"monnaie",img:"systems/foundryvtt-vadentis/images/monnaies/materiel-ingenierie.png",system:{nombre:0,enc:0,description:"Ressource utilisée par le Talent Ingénierie élémentaire."}});
        }
      }
      if(selectedTalentDefs.some(t=>t.key==="chantevie")){
        talentItems.push(commonTalent("Chante-Vie","chante-vie","Créer un Écho et approfondir le lien vital qui l’unit au Chante-Vie."));
      }
      if(selectedTalentDefs.some(t=>t.key==="sculpture")){
        const allowed=["feu","eau","vent","terre","foudre"];
        const ownedData=this.actor.items.filter(i=>i.type==="donnee").map(i=>{
          const n=this._norm(i.name);
          const key=allowed.find(k=>n===k || n===`donnee ${k}` || n===`donnee de ${k}` || n===`donnee du ${k}` || n.includes(` ${k}`));
          return key ? {key,name:key.charAt(0).toUpperCase()+key.slice(1)} : null;
        }).filter(Boolean);
        const unique=[...new Map(ownedData.map(d=>[d.key,d])).values()];
        if(!unique.length){
          talentItems.push(commonTalent("Sculpture élémentaire","sculpture","Façonner directement les Données élémentaires maîtrisées."));
        } else {
          for(const d of unique){
            const it=commonTalent(`Sculpture élémentaire · ${d.name}`,"sculpture","Façonner directement cette Donnée élémentaire.");
            it.system.sculptureDonnee=d.name;
            talentItems.push(it);
          }
        }
      }
      itemsToCreate.push(...talentItems);

      /* ========================================== */
      /* CHANTE-VIE : AFFINITÉ                      */
      /* ========================================== */

      const chanteVieTalent = this.getChanteVieTalent();
      if (this.echoAffinitySelections.length) {
        if (!chanteVieTalent?.system?.echoBound) {
          ui.notifications.warn("Impossible d'acheter une Affinité : l’Écho n’est pas créé.");
          return;
        }
        const raw = chanteVieTalent.system?.echoAffinities;
        const owned = Array.isArray(raw) ? raw : (chanteVieTalent.system?.echoAffinity ? [String(chanteVieTalent.system.echoAffinity)] : []);
        this.echoAffinitySelections = this.echoAffinitySelections.filter(a => !owned.includes(a));
      }

      /* ========================================== */
      /* CHANTE-VIE : ÉVOLUTIONS                    */
      /* ========================================== */
      if (chanteVieTalent?.system?.echoBound) {
        const eu = {};
        const num = (path, fallback=0) => Number(foundry.utils.getProperty(chanteVieTalent, path) ?? fallback);

        const attackQty = Number(this.echoUpgradeSelections.attack || 0);
        const defenseQty = Number(this.echoUpgradeSelections.defense || 0);
        const forceQty = Number(this.echoUpgradeSelections.force || 0);
        const speedQty = Number(this.echoUpgradeSelections.speed || 0);

        if (attackQty) eu["system.echoAttack"] = Math.min(10, num("system.echoAttack",2) + attackQty);
        if (defenseQty) eu["system.echoDefense"] = Math.min(15, num("system.echoDefense",9) + defenseQty);
        if (forceQty) eu["system.echoForce"] = Math.min(10, num("system.echoForce",1) + forceQty);
        if (speedQty) eu["system.echoSpeed"] = Math.min(20, num("system.echoSpeed",6) + speedQty * 3);

        const currentDice = Math.max(1, num("system.echoDamageDice",1));
        const ownedDamage = Math.max(num("system.echoDamageUpgrade",0), Math.max(0,currentDice-1));
        let nextDamage = ownedDamage;
        if (this.echoUpgradeSelections.damage1 && nextDamage < 1) nextDamage = 1;
        if (this.echoUpgradeSelections.damage2 && nextDamage >= 1 && nextDamage < 2) nextDamage = 2;
        if (nextDamage !== ownedDamage) {
          eu["system.echoDamageUpgrade"] = nextDamage;
          eu["system.echoDamageDice"] = 1 + nextDamage;
        }

        const defaults = {athletisme:1,habilete:1,perception:1,mental:1,social:0,connaissances:0};
        const skills = foundry.utils.deepClone(chanteVieTalent.system?.echoSkills || defaults);
        let skillsChanged = false;
        for (const sk of Object.keys(defaults)) {
          const qty = Number(this.echoUpgradeSelections[`skill:${sk}`] || 0);
          if (!qty) continue;
          skills[sk] = Math.min(10, Number(skills[sk] ?? defaults[sk]) + qty);
          skillsChanged = true;
        }
        if (skillsChanged) eu["system.echoSkills"] = skills;
        if (Object.keys(eu).length) await chanteVieTalent.update(eu);
      }

      /* ========================================== */
      /* XP                                         */
      /* ========================================== */

      const currentXP =
        this.getAvailableXP();

      updates[
        "system.experience.experience.total"
      ] =
        currentXP - totalCost;

      /* ========================================== */
      /* APPLICATION                                */
      /* ========================================== */

      if (
        Object.keys(updates).length > 0
      ) {

        await this.actor.update(
          updates
        );
      }

      if (this.echoAffinitySelections.length && chanteVieTalent) {
        const raw = chanteVieTalent.system?.echoAffinities;
        const owned = Array.isArray(raw) ? raw : (chanteVieTalent.system?.echoAffinity ? [String(chanteVieTalent.system.echoAffinity)] : []);
        const next = [...new Set([...owned, ...this.echoAffinitySelections])];
        await chanteVieTalent.update({
          "system.echoAffinities": next,
          "system.echoAffinity": next[0] || ""
        });
      }

      if (
        competenceUpdates.length > 0
      ) {

        await this.actor
          .updateEmbeddedDocuments(
            "Item",
            competenceUpdates
          );
      }

      if (
        itemsToCreate.length > 0
      ) {

        await this.actor
          .createEmbeddedDocuments(
            "Item",
            itemsToCreate
          );
      }

      /* ------------------------------------------ */

      ui.notifications.info(
        `Achats validés : ${totalCost} XP dépensée.`
      );

      await this.close();

    } catch (error) {

      console.error(
        "Vadentis | Erreur pendant la validation du Magasin d'XP :",
        error
      );

      ui.notifications.error(
        "Une erreur est survenue pendant la validation des achats."
      );

    } finally {

      this.isConfirming = false;

      if (confirmButton) {
        confirmButton.disabled = false;
      }
    }
  }
}