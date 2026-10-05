/* -------------------------------------------- */
import { VadentisCombat } from "./vadentis-combat.js";

/* -------------------------------------------- */
export class VadentisUtility {

  /* -------------------------------------------- */
  static async preloadHandlebarsTemplates() {
    // Handle v12 removal of this helper
    Handlebars.registerHelper('select', function (selected, options) {
      const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
      const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']');
      const html = options.fn(this);
      return html.replace(rgx, "$& selected");
    });

    const templatePaths = [
      'systems/foundryvtt-vadentis/templates/actor-sheet.html',
      'systems/foundryvtt-vadentis/templates/item-sheet.html',
      'systems/foundryvtt-vadentis/templates/editor-notes-gm.html',
      'systems/foundryvtt-vadentis/templates/hud-actor-attaque.html',
      'systems/foundryvtt-vadentis/templates/hud-actor-sort.html'
    ]
    return loadTemplates(templatePaths);
  }

  /* -------------------------------------------- */
  static updateCombat(combat, round, diff, id) {
    if (game.user.isGM && combat.round != 0 && combat.turns && combat.active) {
      let turn = combat.turns.find(t => t.tokenId == combat.current.tokenId);
      ChatMessage.create({ content: `Round ${combat.round} : C'est au tour de ${turn.actor.name}<br>` });

      canvas.tokens.get(turn.token._id).control();
      canvas.tokens.cycleTokens(1, true);
    }
  }

  /* -------------------------------------------- */
  static async processAlchimiePoison(combat) {
    if (!game.user.isGM || !combat?.active || !combat.current?.combatantId) return;
    const combatant = combat.combatants.get(combat.current.combatantId);
    const actor = combatant?.actor; if (!actor) return;
    const poisons = actor.items.filter(i => i.type === "statut" && i.system.actif === true && foundry.utils.getProperty(i,"flags.foundryvtt-vadentis.alchimie.kind") === "poison");
    for (const poison of poisons) {
      const formula=String(foundry.utils.getProperty(poison,"flags.foundryvtt-vadentis.alchimie.damageFormula")||"1d4");
      const roll=await (new Roll(formula)).evaluate();
      await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`${poison.name} · Poison`});
      await actor.applyDamage(Number(roll.total||0),{img:combatant.token?.texture?.src||actor.img,formula});
      const left=Number(foundry.utils.getProperty(poison,"flags.foundryvtt-vadentis.alchimie.remainingTurns")||1)-1;
      if(left<=0) await actor.deleteEmbeddedDocuments("Item",[poison.id]);
      else await poison.setFlag("foundryvtt-vadentis","alchimie.remainingTurns",left);
    }
  }

  /* -------------------------------------------- */
  static createOptionList(min, max) {
    let options = ""
    for (let i = min; i <= max; i++) {
      options += `<option value="${i}">${i}</option>\n`;
    }
    return options;
  }

  /* -------------------------------------------- */
  static createDirectOptionList(min, max) {
    let options = {};
    for (let i = min; i <= max; i++) {
      options[`${i}`] = `${i}`;
    }
    return options;
  }
  /* -------------------------------------------- */
  static createDirectIntegerOptionList(min, max) {
    let options = {};
    for (let i = min; i <= max; i++) {
      options[i] = `${i}`;
    }
    return options;
  }
  /* -------------------------------------------- */
  static createDirectReverseOptionList(min, max) {
    let options = {};
    for (let i = max; i >= min; i--) {
      options[`${i}`] = `${i}`;
    }
    return options;
  }

  /* -------------------------------------------- */
  static getTarget() {
    if (game.user.targets && game.user.targets.size == 1) {
      for (let target of game.user.targets) {
        return target;
      }
    }
    return undefined;
  }

  /* -------------------------------------------- */
  static processDamageString(formula, actor) {
    let workFormula = formula.toLowerCase();
    if (workFormula.includes('bonus de force')) {
      workFormula = workFormula.replace('bonus de force', actor.getForceScore());
    }
    return workFormula;
  }

  /* -------------------------------------------- */
 static async processRoll(formula, rollMode, diceUser = game.user) {
  let myRoll = new Roll(formula);

  await myRoll.roll();

  if (game.modules.get("dice-so-nice")?.active) {
    await game.dice3d.showForRoll(
      myRoll,
      diceUser,
      true
    );
  }

  return myRoll;
}

  /* -------------------------------------------- */
  static async performAttack(combatData) {
    let attacker = game.actors.get(combatData.attackerActorId);
let defender = game.actors.get(combatData.targetActorId);

let attackerUser =
  game.users.get(combatData.attackerUserId) ??
  game.user;

console.log(
  "ATTACK !!",
  attacker,
  defender,
  "Dice user:",
  attackerUser?.name
);
    if (attacker && defender) {
      let defense = defender.getDefenseScore();
      let attaque = attacker.getAttaqueScore();

      let msgData = {
        alias: attacker.name,
        title: `${attacker.name} attaque ${defender.name}`,
        actorImg: combatData.attackerTokenImg || attacker.getActiveTokens?.()[0]?.document?.texture?.src || attacker.img,
        state: "attack",
        img: combatData.arme.img || attacker.img
      }

      let tirMsg = "";
      if (combatData.arme.type == 'tir') {
        attacker.decrementeMunition(combatData.arme);
        tirMsg += `<br>C'est un tir, les munitions de l'attaquant ont été décrémentées`;
      }

      let formulaTouche = "1d20+" + attaque;
      let formulaFull = attacker.buildTexteFormula(attacker.system.combat.attaque);
      let attackTotal;
      let naturalResult;
      let paBonus = 0;

      if (combatData.attackRoll) {
        attackTotal = Number(combatData.attackRoll.total || 0);
        naturalResult = Number(combatData.attackRoll.natural || 0);
        formulaFull = combatData.attackRoll.formulaFull || formulaFull;
        paBonus = Number(combatData.attackRoll.paBonus || 0);
      } else {
        const myRoll = await this.processRoll(formulaTouche, undefined, attackerUser);
        naturalResult = myRoll.dice[0].results[0].result;
        const isNaturalCritical = naturalResult === 1 || naturalResult >= Number(combatData.arme.system.valuecritical || 20);
        const alreadySuccessful = naturalResult > 1 && myRoll.total >= defense;
        // Les PA ne sont proposés que si l'attaque a besoin d'être rattrapée.
        paBonus = (isNaturalCritical || alreadySuccessful) ? 0 : await attacker.requestPABonus(`l'attaque avec ${combatData.arme.name}`, myRoll.total);
        attackTotal = myRoll.total + paBonus;
      }
      const paChat = attacker.paBonusChat(paBonus, attackTotal - paBonus);
      msgData.result = attackTotal;
      msgData.target = defense;

      if (naturalResult > 1 && attackTotal >= defense) { // Success !
        msgData.state = "success";
        msgData.outcome = "ATTAQUE RÉUSSIE";
        let degats = `normaux : ${combatData.arme.system.damage}`;
        let formula = combatData.arme.system.damage.toLowerCase();
        msgData.msg = `${attacker.name} a réussi son attaque sur ${defender.name} (${formulaFull} => <strong>${attackTotal} / ${defense}</strong>) !${paChat}<br> Les dégâts sont ${degats}.`;

        msgData.msg += tirMsg;
        if (naturalResult >= combatData.arme.system.valuecritical) {
          degats = `critiques : ${combatData.arme.system.criticaldamage}`;
          formula = combatData.arme.system.criticaldamage.toLowerCase();
          msgData.critique = true;
          msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_réussite_critique.webp';
          msgData.msgCritique = "RÉUSSITE CRITIQUE";
          msgData.state = "critical-success";
          msgData.outcome = "RÉUSSITE CRITIQUE";
          msgData.msg += `<br>C'est une <strong>réussite critique</strong> !`;
        }
        msgData.img = combatData.arme.img || attacker.img;

        formula = this.processDamageString(formula, attacker);
        const echoDamage = attacker.getFlag("foundryvtt-vadentis","echoNextDamageBonus");
        if(echoDamage?.value){
          formula = `(${formula}) + ${Number(echoDamage.value||0)}`;
          await attacker.unsetFlag("foundryvtt-vadentis","echoNextDamageBonus");
          msgData.msg += `<br><strong>Chant de Colère :</strong> +${Number(echoDamage.value||0)} dégâts.`;
        }
        let degatsRoll = await this.processRoll(
  formula,
  undefined,
  attackerUser
);
        msgData.damage = degatsRoll.total;
        msgData.damageFormula = formula;
        msgData.targetImg = combatData.targetTokenImg || defender.img;
        msgData.targetName = combatData.targetTokenName || defender.name;
        msgData.msg += `<br>Les dégâts sont calculés avec <strong>${formula}</strong>.`;
        msgData.healthSummary = await defender.applyDamage(degatsRoll.total, { img: combatData.targetTokenImg || defender.img, silent: true });
        this.broadcastVFX({ sourceTokenId: combatData.attackerTokenId, targetTokenId: combatData.targetTokenId, animation: combatData.arme.system.animation || "auto", sound: combatData.arme.system.sound || "", kind: "damage", donnee: combatData.arme.name || "", critical: msgData.state === "critical-success" });
      } else { //Echec
        msgData.img = combatData.arme.img || attacker.img;
        msgData.state = "failure";
        msgData.outcome = "ATTAQUE RATÉE";
        if (naturalResult == 1) {
          msgData.critique = true;
          msgData.imgcritique = 'systems/foundryvtt-vadentis/images/icons/tchat_échec_critique.webp';
          msgData.msgCritique = "ÉCHEC CRITIQUE";
          msgData.state = "critical-failure";
          msgData.outcome = "ÉCHEC CRITIQUE";
          msgData.msg = `${attacker.name} a fait un <strong>échec critique</strong> et a raté son attaque sur ${defender.name} (${attackTotal} / ${defense}) !${paChat}`;
        } else {
          msgData.msg = `${attacker.name} a raté son attaque sur ${defender.name} (${attackTotal} / ${defense}) !${paChat}`;
        }
        msgData.msg += tirMsg;
      }
      await ChatMessage.create({
        content: await renderTemplate(`systems/foundryvtt-vadentis/templates/chat-generic-result.html`, msgData)
      });
      if (msgData.healthSummary && game.user.isGM) {
        const hs = msgData.healthSummary;
        await ChatMessage.create({
          whisper: ChatMessage.getWhisperRecipients('GM'),
          content: await renderTemplate(`systems/foundryvtt-vadentis/templates/chat-generic-result.html`, {
            alias: defender.name, img: combatData.targetTokenImg || defender.img,
            title: `PV restants · ${defender.name}`, state: "health", isGMHealth: true,
            healthBefore: hs.before, healthAfter: hs.after, healthMax: hs.max, msg: ""
          })
        });
      }
    } else {
      ui.notifications.warn("Impossible de trouver l'attaquant et le défenseur.")
    }
  }

  /* -------------------------------------------- */
  static buildJetText(stat) {
    let name = stat.label;
    let title = `Jet de ${name}`;
    if (name.toLowerCase().substr(0, 1).match(/[aeoiou]/g)) {
      title = `Jet d'${name}`;
    }
    return title;
  }

  /* -------------------------------------------- */
  static registerChatCallbacks() {

  }

  /* -------------------------------------------- */
  static fillRange(start, end) {
    return Array(end - start + 1).fill().map((item, index) => start + index);
  }

  /* -------------------------------------------- */
  static async applySpellEffect(data) {
    const target = game.actors.get(data.targetActorId);
    if (!target) return;
    let summary;
    if (data.effectType === "heal") {
      summary = await target.applyHealing(Number(data.amount || 0), { img: data.targetTokenImg || target.img, silent: true });
    } else if (data.effectType === "damage") {
      summary = await target.applyDamage(Number(data.amount || 0), { img: data.targetTokenImg || target.img, silent: true });
    }
    // Le VFX est déclenché par le lanceur du sort, indépendamment de l'effet chiffré.
    // Ici le GM ne fait que l'application autoritaire des PV afin d'éviter un double VFX.
    if (summary && game.user.isGM) {
      setTimeout(async () => {
        await ChatMessage.create({
          whisper: ChatMessage.getWhisperRecipients('GM'),
          content: await renderTemplate(`systems/foundryvtt-vadentis/templates/chat-generic-result.html`, {
            alias: target.name, img: data.targetTokenImg || target.img,
            title: `PV restants · ${target.name}`, state: "health", isGMHealth: true,
            healthBefore: summary.before, healthAfter: summary.after, healthMax: summary.max, msg: ""
          })
        });
      }, 350);
    }
  }

  /* -------------------------------------------- */
  static async postSculptureDamageCard(actor, amount, formula = "", options = {}) {
    if (!actor || !Number(amount || 0)) return;
    const tokenImg = options.targetImg || actor.getActiveTokens?.()[0]?.document?.texture?.src || actor.img;
    // Réutilise volontairement le bloc effectAmount/effectType du template : c'est
    // exactement la structure des cartes de dégâts de Sort déjà validées visuellement.
    // Surtout, on n'emploie plus state="damage", qui partageait le nom de classe
    // du bloc interne et provoquait les grilles imbriquées/compressions.
    const content = await renderTemplate(`systems/foundryvtt-vadentis/templates/chat-generic-result.html`, {
      alias: actor.name,
      img: options.icon || "systems/foundryvtt-vadentis/images/icons/tchat_dégâts_infligés.webp",
      actorImg: options.sourceActorImg || null,
      title: options.title || "Dégâts de Sculpture",
      state: "sculpture-effect",
      effectAmount: Number(amount || 0),
      effectType: "damage",
      effectLabel: "DÉGÂTS INFLIGÉS",
      effectFormula: formula || "",
      targetImg: tokenImg,
      targetName: actor.name,
      msg: options.msg || ""
    });
    return ChatMessage.create({ content });
  }

  /* -------------------------------------------- */
  static async applySculptureEffect(data = {}) {
    if (!game.user.isGM) return;
    const key = String(data.donnee || "").toLowerCase();
    const mode = data.mode === "favorable" ? "favorable" : "hostile";
    const targets = Array.isArray(data.targets) ? data.targets : [];
    const statusSpec = {
      "eau:hostile": { name: "Sculpture d’Eau · Déstabilisation", defense: -2 },
      "foudre:hostile": { name: "Sculpture de Foudre · Secousse", attaque: -2 },
      "feu:favorable": { name: "Sculpture de Feu · Élan", attaque: 2 },
      "eau:favorable": { name: "Sculpture d’Eau · Protection", defense: 2 },
      "vent:favorable": { name: "Sculpture de Vent · Célérité", vitesse: 3 },
      "terre:favorable": { name: "Sculpture de Terre · Protection", damageReduction: "1d4" },
      "foudre:favorable": { name: "Sculpture de Foudre · Vivacité", initiative: 2, attaque: 2 }
    }[`${key}:${mode}`];

    for (const targetData of targets) {
      const actor = game.actors.get(targetData.actorId);
      if (!actor) continue;

      // Entretien : les anciens Statuts de Sculpture déjà désactivés ne doivent
      // jamais s'accumuler dans la fiche. Les versions récentes les suppriment
      // normalement à l'expiration ; ceci nettoie aussi d'éventuels reliquats.
      const staleSculptureStatuses = actor.items.filter(i => i.type === "statut"
        && i.system.actif !== true
        && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.id"))
        .map(i => i.id);
      if (staleSculptureStatuses.length) await actor.deleteEmbeddedDocuments("Item", staleSculptureStatuses);

      // Les bonus/malus qui durent « 1 tour » sont désormais liés à la cible,
      // et non à la durée de vie du Trait. S'ils sont appliqués avant le tour de
      // la cible, ils restent pendant ce tour complet puis expirent au début du suivant.
      // S'ils sont appliqués pendant son propre tour, ils expirent au début de son prochain tour.
      const combat = game.combat;
      const currentActorId = combat?.combatant?.actorId ?? combat?.combatant?.actor?.id ?? null;
      const durationFlags = {
        expireOnTargetTurn: true,
        seenTargetTurn: currentActorId === actor.id,
        combatId: combat?.id || "",
        appliedRound: Number(combat?.round ?? -1),
        appliedTurn: Number(combat?.turn ?? -1),
        tokenId: targetData.tokenId || ""
      };

      if (mode === "hostile" && Number(data.damage || 0) > 0) {
        const applied = await actor.applyDamage(Number(data.damage || 0), { img: actor.img, silent: true, formula: data.damageFormula || "" });
        await this.postSculptureDamageCard(actor, Number(applied?.damage ?? data.damage), data.damageFormula || "", {
          targetImg: actor.getActiveTokens?.()[0]?.document?.texture?.src || actor.img,
          icon: data.donneeImg || undefined,
          title: `Sculpture de ${key.charAt(0).toUpperCase()+key.slice(1)} · Dégâts`
        });
      }

      if (statusSpec) {
        // Un même Trait ne cumule jamais deux fois son bonus/malus sur une cible.
        // C'est particulièrement important pour les Sculptures favorables lorsqu'un
        // allié commence ensuite son tour sur le Trait.
        const alreadyHasStatus = actor.items.some(i => i.type === "statut"
          && i.system.actif === true
          && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.id") === data.sculptureId
          && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.effectKey") === `${key}:${mode}`);
        if (!alreadyHasStatus) {
          const system = {
            actif: true,
            description: `Effet temporaire de Sculpture élémentaire (${key}).`,
            initiative: Number(statusSpec.initiative || 0), force: 0,
            attaque: Number(statusSpec.attaque || 0), defense: Number(statusSpec.defense || 0),
            vitesse: Number(statusSpec.vitesse || 0), matriseelementaire: 0, devotion: 0
          };
          await actor.createEmbeddedDocuments("Item", [{
            name: statusSpec.name,
            type: "statut",
            img: data.donneeImg || "icons/svg/aura.svg",
            system,
            flags: { "foundryvtt-vadentis": { sculpture: { id: data.sculptureId, effectKey: `${key}:${mode}`, damageReduction: statusSpec.damageReduction || "", duration: durationFlags } } }
          }]);
        }
      }

      // Brûlure : en combat elle attend le début du prochain tour de la cible.
      // Hors combat il n'existe pas de tour : le 1D4 est donc résolu immédiatement
      // et reste visible dans le Chat, comme les dégâts initiaux.
      if (mode === "hostile" && key === "feu") {
        if (!game.combat) {
          const burnRoll = await this.processRoll("1d4");
          const appliedBurn = await actor.applyDamage(Number(burnRoll.total || 0), { img: actor.img, silent: true, formula: "1d4" });
          await this.postSculptureDamageCard(actor, Number(appliedBurn?.damage ?? burnRoll.total), "1d4", {
            targetImg: actor.getActiveTokens?.()[0]?.document?.texture?.src || actor.img,
            icon: data.donneeImg || undefined, title: "Sculpture de Feu · Brûlure"
          });
        } else {
          const alreadyBurning = actor.items.some(i => i.type === "statut" && i.system.actif === true
            && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.id") === data.sculptureId
            && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.burn") === "1d4");
          if (!alreadyBurning) await actor.createEmbeddedDocuments("Item", [{
            name: "Sculpture de Feu · Brûlure",
            type: "statut",
            img: data.donneeImg || "icons/svg/fire.svg",
            system: { actif: true, description: "Subit 1D4 dégâts au début de son prochain tour.", initiative:0, force:0, attaque:0, defense:0, vitesse:0, matriseelementaire:0, devotion:0 },
            flags: { "foundryvtt-vadentis": { sculpture: { id: data.sculptureId, effectKey: `${key}:${mode}:burn`, burn: "1d4", duration: { ...durationFlags, expireOnTargetTurn: false } } } }
          }]);
        }
      }

      // Marqueur visuel persistant : symbole de la Donnée sous le token jusqu'à
      // disparition du Trait. Tous les clients le voient via le socket système.
      const markerData = { sculptureId: data.sculptureId, sceneId: data.sceneId, tokenId: targetData.tokenId, donnee: key, mode, img: data.donneeImg || "" };
      this.playSculptureMarker(markerData);
      game.socket.emit("system.foundryvtt-vadentis", { name: "msg_sculpture_marker", data: markerData });

      // Vent hostile : projection individuelle de 2m dans la direction choisie.
      if (mode === "hostile" && key === "vent" && targetData.ventDirection && data.sceneId && targetData.tokenId) {
        const scene = game.scenes.get(data.sceneId);
        const tokenDoc = scene?.tokens?.get(targetData.tokenId);
        if (tokenDoc) {
          const gridSize = Number(scene.grid?.size || canvas?.dimensions?.size || 100);
          const gridDistance = Number(scene.grid?.distance || canvas?.dimensions?.distance || 1);
          const px = (2 / Math.max(0.0001, gridDistance)) * gridSize;
          let dx = Number(targetData.ventDirection.dx || 0), dy = Number(targetData.ventDirection.dy || 0);
          const norm = Math.hypot(dx, dy) || 1;
          dx /= norm; dy /= norm;
          await tokenDoc.update({ x: tokenDoc.x + dx * px, y: tokenDoc.y + dy * px });
        }
      }
    }
  }

  /* -------------------------------------------- */
  static async cleanupSculptureEffects(data = {}) {
    if (!game.user.isGM || !data.sculptureId) return;

    // Suppression manuelle HORS COMBAT : le Trait est la source de tous ses effets.
    // On retire donc immédiatement statuts + brûlures + marqueurs, sans laisser
    // d'animation orpheline sur les tokens.
    if (data.forceAll) {
      for (const actor of game.actors.contents) {
        const ids = actor.items.filter(i => i.type === "statut"
          && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.id") === data.sculptureId)
          .map(i => i.id);
        if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
      }
      this.removeSculptureMarkers(data.sculptureId, []);
      game.socket.emit("system.foundryvtt-vadentis", { name: "msg_sculpture_marker_cleanup", data: { sculptureId:data.sculptureId, exceptTokenIds:[] } });
      return;
    }

    // En combat, les effets « pendant 1 tour » appartiennent à leur cible et
    // peuvent survivre à la disparition normale du Trait.
    const persistentTokenIds = new Set();
    const combatActorIds = new Set((game.combat?.combatants || []).map(c => c.actorId || c.actor?.id).filter(Boolean));
    for (const actor of game.actors.contents) {
      const orphanIds = [];
      for (const item of actor.items) {
        if (item.type !== "statut" || item.system.actif !== true) continue;
        if (foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.sculpture.id") !== data.sculptureId) continue;
        const tokenId = foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.sculpture.duration.tokenId");
        // Un acteur absent du Combat Tracker n'aura jamais de tour pour expirer son effet :
        // son statut et son marqueur suivent donc la durée du Trait.
        if (!combatActorIds.has(actor.id)) { orphanIds.push(item.id); continue; }
        if (tokenId) persistentTokenIds.add(tokenId);
      }
      if (orphanIds.length) await actor.deleteEmbeddedDocuments("Item", orphanIds);
    }
    const cleanup = { sculptureId: data.sculptureId, exceptTokenIds: [...persistentTokenIds] };
    this.removeSculptureMarkers(data.sculptureId, cleanup.exceptTokenIds);
    game.socket.emit("system.foundryvtt-vadentis", { name: "msg_sculpture_marker_cleanup", data: cleanup });
  }

  /* -------------------------------------------- */
  static _sculptureMarkers = new Map();

  static playSculptureMarker(data = {}) {
    try {
      if (!canvas?.ready || !data.sculptureId || !data.tokenId || !data.img) return;
      const markerKey = `${data.sculptureId}:${data.tokenId}`;
      if (this._sculptureMarkers.has(markerKey)) return;
      const token = canvas.tokens?.get(data.tokenId);
      if (!token) return;
      const container = new PIXI.Container();
      container.zIndex = 90000;
      const favorable = data.mode === "favorable";
      container.alpha = favorable ? 0.50 : 0.58;
      container.eventMode = "none";
      const aura = new PIXI.Graphics();
      const auraColor = favorable ? 0x78F0D0 : 0xFF6A55;
      aura.lineStyle(favorable ? 3 : 4, auraColor, favorable ? 0.52 : 0.62);
      aura.drawCircle(0, 0, Math.max(28, Math.min(token.w || 100, token.h || 100) * 0.48));
      container.addChild(aura);
      const sprite = PIXI.Sprite.from(data.img);
      sprite.anchor.set(0.5);
      const size = Math.max(54, Math.min(token.w || 100, token.h || 100) * 0.92);
      sprite.width = size; sprite.height = size;
      container.addChild(sprite);
      canvas.stage.sortableChildren = true;
      canvas.stage.addChild(container);
      const update = () => {
        const tok = canvas.tokens?.get(data.tokenId);
        if (!tok || container.destroyed) {
          if (!container.destroyed) this.removeSculptureMarkerForToken(data.sculptureId, data.tokenId);
          return;
        }
        container.position.set(tok.center?.x ?? (tok.x + tok.w/2), tok.center?.y ?? (tok.y + tok.h/2));
        sprite.rotation += favorable ? 0.005 : -0.009;
        const pulse = 1 + Math.sin(Date.now() / (favorable ? 420 : 220)) * (favorable ? 0.035 : 0.065);
        aura.scale.set(pulse);
        aura.alpha = favorable ? 0.70 : (0.68 + 0.22 * Math.abs(Math.sin(Date.now()/180)));
      };
      const ticker = canvas.app?.ticker;
      ticker?.add(update); update();
      this._sculptureMarkers.set(markerKey, { container, ticker, update, sculptureId:data.sculptureId, tokenId:data.tokenId });
    } catch (err) { console.warn("Vadentis | marqueur Sculpture", err); }
  }

  static removeSculptureMarkers(sculptureId, exceptTokenIds = []) {
    const keep = new Set(exceptTokenIds || []);
    for (const [key, marker] of [...this._sculptureMarkers.entries()]) {
      if (marker.sculptureId !== sculptureId || keep.has(marker.tokenId)) continue;
      try { marker.ticker?.remove(marker.update); } catch (_) {}
      try { marker.container?.destroy({ children:true }); } catch (_) {}
      this._sculptureMarkers.delete(key);
    }
  }

  static removeSculptureMarkerForToken(sculptureId, tokenId) {
    const markerKey = `${sculptureId}:${tokenId}`;
    const marker = this._sculptureMarkers.get(markerKey);
    if (!marker) return;
    try { marker.ticker?.remove(marker.update); } catch (_) {}
    try { marker.container?.destroy({ children:true }); } catch (_) {}
    this._sculptureMarkers.delete(markerKey);
  }

  /* -------------------------------------------- */
  static async processSculptureBurn(combat) {
    if (!game.user.isGM || !combat?.combatant?.actor) return;
    const turnKey = `${combat.id}:${combat.round}:${combat.turn}:${combat.combatant.id}`;
    if (this._lastSculptureBurnTurnKey === turnKey) return;
    this._lastSculptureBurnTurnKey = turnKey;
    const actor = combat.combatant.actor;

    // 1) Brûlure : dégâts uniquement au début du prochain tour de la cible.
    const burns = actor.items.filter(i => i.type === "statut" && i.system.actif === true
      && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.burn") === "1d4");
    for (const burn of burns) {
      const sculptureId = foundry.utils.getProperty(burn, "flags.foundryvtt-vadentis.sculpture.id");
      const tokenId = foundry.utils.getProperty(burn, "flags.foundryvtt-vadentis.sculpture.duration.tokenId");
      const roll = await this.processRoll("1d4");
      const appliedBurn = await actor.applyDamage(Number(roll.total || 0), { img: actor.img, silent: true, formula: "1d4" });
      await actor.deleteEmbeddedDocuments("Item", [burn.id]);
      await this.postSculptureDamageCard(actor, Number(appliedBurn?.damage ?? roll.total), "1d4", {
        targetImg: actor.getActiveTokens?.()[0]?.document?.texture?.src || actor.img,
        icon: burn.img || undefined, title: "Sculpture de Feu · Brûlure"
      });
      // Le marqueur reste s'il existe encore un autre statut de cette Sculpture.
      const stillActive = actor.items.some(i => i.type === "statut" && i.system.actif === true
        && i.id !== burn.id
        && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.id") === sculptureId);
      if (!stillActive && sculptureId && tokenId) {
        this.removeSculptureMarkerForToken(sculptureId, tokenId);
        game.socket.emit("system.foundryvtt-vadentis", { name: "msg_sculpture_marker_token_cleanup", data: { sculptureId, tokenId } });
      }
    }

    // 2) Bonus/malus « pendant 1 tour ». Le premier tour complet de la cible
    // est conservé ; l'effet expire au début du tour suivant.
    const timed = actor.items.filter(i => i.type === "statut" && i.system.actif === true
      && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.duration.expireOnTargetTurn") === true);
    for (const item of timed) {
      const path = "flags.foundryvtt-vadentis.sculpture.duration";
      const duration = foundry.utils.getProperty(item, path) || {};
      if (!duration.seenTargetTurn) {
        await item.update({ [`${path}.seenTargetTurn`]: true });
        continue;
      }
      const sculptureId = foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.sculpture.id");
      const tokenId = duration.tokenId || "";
      await actor.deleteEmbeddedDocuments("Item", [item.id]);
      const stillActive = actor.items.some(i => i.type === "statut" && i.system.actif === true
        && i.id !== item.id
        && foundry.utils.getProperty(i, "flags.foundryvtt-vadentis.sculpture.id") === sculptureId);
      if (!stillActive && sculptureId && tokenId) {
        this.removeSculptureMarkerForToken(sculptureId, tokenId);
        game.socket.emit("system.foundryvtt-vadentis", { name: "msg_sculpture_marker_token_cleanup", data: { sculptureId, tokenId } });
      }
    }
  }

  /* -------------------------------------------- */
  static broadcastVFX(data) {
    this.playVFX(data);
    game.socket.emit("system.foundryvtt-vadentis", { name: "msg_vfx", data });
  }

  static playVFX(data = {}) {
    try {
      if (!canvas?.ready) return;
      const source = data.sourceTokenId ? canvas.tokens.get(data.sourceTokenId) : null;
      const target = data.targetTokenId ? canvas.tokens.get(data.targetTokenId) : null;
      if (!source && !target) return;

      let type = data.animation || "auto";
      if (type === "none") return;
      if (type === "auto") {
        const selfTarget = source && target && source.id === target.id;
        type = data.kind === "heal" ? "heal" : (source && target && !selfTarget ? "projectile" : "impact");
      }
      const layer = canvas.interface;
      if (!layer) return;

      const sx = source?.center?.x ?? target?.center?.x ?? 0;
      const sy = source?.center?.y ?? target?.center?.y ?? 0;
      const tx = target?.center?.x ?? sx;
      const ty = target?.center?.y ?? sy;
      const dx = tx - sx, dy = ty - sy, distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance, ny = dy / distance, px = -ny, py = nx;
      const critical = !!data.critical;
      // Le palier renforce uniquement la mise en scène : I = base actuelle,
      // II = surcharge visible, III = effet franchement spectaculaire.
      const tier = String(data.palier || "I").toUpperCase();
      const tierLevel = tier === "III" ? 3 : (tier === "II" ? 2 : 1);
      const tierBoost = tierLevel === 3 ? 1.48 : (tierLevel === 2 ? 1.24 : 1);
      const magicName = String(data.sourceName || data.donnee || "").toLowerCase();
      const signature = magicName.match(/vent|air|souffle|tempête|tempete/) ? "wind"
        : magicName.match(/feu|flamme|brasier|incend|soleil/) ? "fire"
        : magicName.match(/foudre|éclair|eclair|orage|tonnerre/) ? "storm"
        : magicName.match(/eau|glace|givre|froid|océan|ocean/) ? "water"
        : magicName.match(/terre|roche|pierre|montagne/) ? "earth"
        : magicName.match(/ombre|nuit|ténèbre|tenebre|mort/) ? "shadow"
        : magicName.match(/lumière|lumiere|sacré|sacre|divin/) ? "light"
        : magicName.match(/nature|forêt|foret|plante|vie/) ? "nature" : "arcane";

      // Palette officielle Vadentis : priorité à la Donnée / Croyance réellement utilisée.
      // Les noms sont normalisés pour tolérer accents, apostrophes et petites variations de casse.
      const normalizeMagicName = (text) => String(text || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
      const officialColors = new Map([
        ["feu",0xd71920], ["vent",0x20b84b], ["foudre",0x8a2be2], ["terre",0x8b5a2b],
        ["eau",0x1677ff], ["lumiere",0xffdf24], ["explosion",0xff5a5f], ["chaleur",0xff8f8f],
        ["glace",0x72d7ff], ["vapeur",0x9b30a6], ["bioelementisme",0x123f9c], ["magma",0xff1f0f],
        ["magnetisme",0x8b929a], ["sable",0xd9c28f], ["tonnerre",0x7b2cbf], ["vegetal",0x2fa84f],
        ["emotion",0x101014], ["sang",0xb3131b], ["son",0x21d4c2], ["non-vie",0x101014],
        ["vie aquatique",0xffdf24], ["vie flamboyante",0xffdf24], ["vie foudroyante",0xffdf24],
        ["vie rocailleuse",0xffdf24], ["vie tempetueuse",0xffdf24],
        ["adorateurs de yeshua",0x101014], ["benedition de l'ocean",0x21d4c2],
        ["culte de l'ombre",0x35105f], ["culte des 26",0xffffff], ["eglise du temps",0xa8ff00],
        ["eglise estuanienne",0xff8a1f], ["foi du soleil",0xffdf24]
      ]);
      const hashColor = (text) => {
        const key = normalizeMagicName(text);
        if (officialColors.has(key)) return officialColors.get(key);
        const palette = [0x00bfff,0x6f4cff,0xd62cff,0xff244d,0xff6a00,0xffcf00,0x00d96f,0x00d9d0];
        if (!key) return null;
        let h=0; for (const c of key) h=((h<<5)-h)+c.charCodeAt(0);
        return palette[Math.abs(h)%palette.length];
      };
      const sourceColor = hashColor(data.sourceName || data.donnee);
      const main = sourceColor ?? (data.kind === "heal" ? 0x22e887 : (type === "lightning" ? 0x22cfff : (type === "explosion" ? 0xff4b12 : 0xff9d18)));
      // Toutes les couches dérivent désormais de la couleur de la Donnée / Dévotion :
      // la teinte reste donc visible jusque dans le coeur, les halos et les particules.
      const mixColor = (a,b,q) => {
        const ar=(a>>16)&255, ag=(a>>8)&255, ab=a&255, br=(b>>16)&255, bg=(b>>8)&255, bb=b&255;
        return ((Math.round(ar+(br-ar)*q)<<16) | (Math.round(ag+(bg-ag)*q)<<8) | Math.round(ab+(bb-ab)*q));
      };
      const light = mixColor(main, 0xffffff, .42);
      const hot = mixColor(main, 0xffffff, .72);
      const dark = mixColor(main, 0x000000, .48);
      const dur = Math.round((critical ? 1750 : 1320) * (tierLevel === 3 ? 1.18 : tierLevel === 2 ? 1.09 : 1));
      const travelEnd = (type === "ray" || type === "lightning") ? .32 : .48;
      const impactAt = (source && target && ["projectile","ray","lightning","melee"].includes(type)) ? travelEnd * .78 : .08;

      // Les VFX doivent toujours passer AU-DESSUS des tokens. L'interface est déjà
      // la couche adaptée, mais on force aussi l'ordre interne pour éviter qu'un
      // token / HUD / autre Graphics masque le sceau magique.
      if ("sortableChildren" in layer) layer.sortableChildren = true;
      const g = new PIXI.Graphics();
      g.zIndex = 9000;
      g.eventMode = "none";
      layer.addChild(g);

      // Sceau de Donnée / Dévotion : l'image réelle de la source magique apparaît au-dessus du lanceur.
      // Sprite séparé du Graphics pour conserver les détails du symbole d'origine.
      let sigil = null;
      if (source && data.sourceImg) {
        try {
          sigil = PIXI.Sprite.from(data.sourceImg);
          sigil.anchor.set(.5);
          // Le sceau flotte visiblement au-dessus du token, et non derrière lui.
          // Un léger chevauchement garde l'impression qu'il appartient au lanceur.
          sigil.position.set(sx, sy - Math.max(48, (source.h || 100) * .58));
          sigil.alpha = 0;
          sigil.zIndex = 10000;
          sigil.eventMode = "none";
          const baseSize = (critical ? 168 : 136) * (tierLevel === 3 ? 1.28 : tierLevel === 2 ? 1.13 : 1);
          const texW = sigil.texture?.width || 1, texH = sigil.texture?.height || 1;
          const scale = baseSize / Math.max(texW, texH);
          sigil.scale.set(scale);
          layer.addChild(sigil);
        } catch(e) { sigil = null; }
      }

      // Everything random is generated once so particles travel instead of flickering.
      const rand = (i, salt=0) => {
        const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };
      const sparks = Array.from({length: Math.round((critical ? 48 : 28) * (tierLevel === 3 ? 1.55 : tierLevel === 2 ? 1.25 : 1))}, (_,i) => ({
        a: Math.PI*2*rand(i,1), s: 55+150*rand(i,2), r: 1.5+4*rand(i,3), lag: .18*rand(i,4)
      }));
      const embers = Array.from({length: Math.round((critical ? 34 : 20) * (tierLevel === 3 ? 1.5 : tierLevel === 2 ? 1.22 : 1))}, (_,i) => ({
        a: Math.PI*2*rand(i,5), s: 30+115*rand(i,6), r: 2+5*rand(i,7), curl: (rand(i,8)-.5)*55
      }));
      const motes = Array.from({length: Math.round((critical ? 30 : 18) * (tierLevel === 3 ? 1.5 : tierLevel === 2 ? 1.22 : 1))}, (_,i) => ({
        a: Math.PI*2*rand(i,9), s: 28+95*rand(i,10), r: 2+4*rand(i,11)
      }));
      const boltOffsets = Array.from({length: 15}, (_,i) => (i===0||i===14) ? 0 : (rand(i,12)-.5)*(critical?42:25));
      const branchSeeds = Array.from({length: critical ? 8 : 5}, (_,i) => ({q:.18+.68*rand(i,13), side:rand(i,14)>.5?1:-1, len:22+55*rand(i,15)}));
      const started = performance.now();

      const circle = (x,y,r,color,alpha) => { if(r<=0||alpha<=0) return; g.beginFill(color,alpha); g.drawCircle(x,y,r); g.endFill(); };
      const ring = (x,y,r,w,color,alpha) => { if(r<=0||alpha<=0) return; g.lineStyle(w,color,alpha); g.drawCircle(x,y,r); };
      const easeOut = q => 1-Math.pow(1-q,3);
      const clamp = q => Math.max(0,Math.min(1,q));

      const draw = now => {
        const t = clamp((now-started)/dur);
        g.clear();
        if (sigil) {
          const appear=clamp(t/.10), vanish=t<.78?1:clamp((.98-t)/.20);
          sigil.alpha=.88*appear*vanish;
          sigil.rotation=(critical?.42:.24)*Math.sin(t*Math.PI*2.2);
          const pulse=1+.10*Math.sin(t*22);
          const base=(critical?168:136)/Math.max(sigil.texture?.width||1,sigil.texture?.height||1);
          sigil.scale.set(base*pulse);
        }
        const travel = clamp(t/travelEnd), te = easeOut(travel);
        const ix = sx + dx*te, iy = sy + dy*te;
        const impact = clamp((t-impactAt)/(1-impactAt));
        const impactFade = 1-impact;

        // CAST: rotating runic-ish rings + sparks around the caster.
        if (source && t < .42) {
          const q=t/.42, fade=1-q, pulse=24+(critical?58:42)*Math.sin(q*Math.PI);
          ring(sx,sy,pulse,critical?6:4,main,.75*fade);
          ring(sx,sy,pulse*.62,2,light,.85*fade);
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4 + t*8*(i%2?1:-1), r=pulse*(.72+.12*(i%2));
            circle(sx+Math.cos(a)*r,sy+Math.sin(a)*r,critical?4:3,i%2?light:main,.85*fade);
          }
        }

        // SIGNATURE MAGIQUE : la Donnée/Dévotion change la nature des particules, pas seulement leur couleur.
        if (source && t < .58) {
          const q=clamp(t/.58), fade=1-q;
          const count=critical?18:12;
          for(let i=0;i<count;i++){
            const a=i*Math.PI*2/count + t*(signature==="wind"?15:6)*(i%2?1:-1);
            const rr=(30+52*rand(i,21))*(.55+q*.65);
            if(signature==="wind") {
              g.lineStyle(2.5,light,.55*fade); g.arc(sx,sy,rr,a,a+.65);
            } else if(signature==="fire") {
              const rise=(25+80*rand(i,22))*q; circle(sx+Math.cos(a)*rr*.55,sy+Math.sin(a)*rr*.25-rise,2+4*rand(i,23),i%3?main:hot,.9*fade);
            } else if(signature==="storm") {
              const x1=sx+Math.cos(a)*rr*.55,y1=sy+Math.sin(a)*rr*.55; g.lineStyle(2,hot,.75*fade);g.moveTo(x1,y1);g.lineTo(x1+px*(rand(i,24)-.5)*28+nx*12,y1+py*(rand(i,24)-.5)*28+ny*12);
            } else if(signature==="water") {
              circle(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr-(18+35*rand(i,25))*q,2.5+3*rand(i,26),i%2?light:main,.72*fade);
            } else if(signature==="earth") {
              const rise=22*Math.sin(q*Math.PI); const sz=3+5*rand(i,27); g.beginFill(i%2?main:dark,.75*fade);g.drawRect(sx+Math.cos(a)*rr-sz/2,sy+Math.sin(a)*rr-rise-sz/2,sz,sz);g.endFill();
            } else if(signature==="shadow") {
              circle(sx+Math.cos(a)*rr*.8,sy+Math.sin(a)*rr*.8,5+7*rand(i,28),dark,.32*fade);
            } else if(signature==="light") {
              const xx=sx+Math.cos(a)*rr,yy=sy+Math.sin(a)*rr; g.lineStyle(2,hot,.72*fade);g.moveTo(xx-5,yy);g.lineTo(xx+5,yy);g.moveTo(xx,yy-5);g.lineTo(xx,yy+5);
            } else if(signature==="nature") {
              const xx=sx+Math.cos(a)*rr,yy=sy+Math.sin(a)*rr-20*q; g.beginFill(i%2?main:light,.7*fade);g.drawEllipse(xx,yy,5,2.2);g.endFill();
            } else circle(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr,2.5+2*rand(i,29),i%2?light:main,.75*fade);
          }
        }

        // PROJECTILE: hot core, layered fireball and long comet tail.
        if (type === "projectile" && source && target && travel < 1) {
          const tail = critical?115:78;
          for(let i=8;i>=1;i--){ const q=i/8, xx=ix-nx*tail*q, yy=iy-ny*tail*q; circle(xx,yy,(critical?18:13)*(1-q*.65),i%2?main:dark,.10+.34*(1-q)); }
          circle(ix,iy,critical?36:27,main,.20);
          circle(ix,iy,critical?24:18,main,.65);
          circle(ix,iy,critical?11:8,hot,.98);
          for(let i=0;i<8;i++){ const a=Math.PI*2*i/8+t*18, rr=(critical?32:24)*(1+.15*Math.sin(t*30+i)); circle(ix+Math.cos(a)*rr,iy+Math.sin(a)*rr,2.5,light,.8); }
        }

        // RAY: persistent beam with pulsing outer glow and energy nodes.
        if (type === "ray" && source && target) {
          const beamQ=clamp(t/.16), beamFade=t>.72?clamp((1-t)/.28):1;
          const ex=sx+dx*beamQ, ey=sy+dy*beamQ;
          g.lineStyle(critical?22:14,main,.14*beamFade); g.moveTo(sx,sy); g.lineTo(ex,ey);
          g.lineStyle(critical?10:6,main,.60*beamFade); g.moveTo(sx,sy); g.lineTo(ex,ey);
          g.lineStyle(critical?4:2.5,hot,.98*beamFade); g.moveTo(sx,sy); g.lineTo(ex,ey);
          for(let i=1;i<6;i++){const q=i/6, wob=Math.sin(t*45+i*2)*8; circle(sx+dx*q+px*wob,sy+dy*q+py*wob,critical?5:3,light,.65*beamFade);}
        }

        // LIGHTNING: main jagged bolt + branching arcs; re-strikes on a critical.
        if (type === "lightning" && source && target) {
          const strikes = critical ? [0,.23,.46] : [0,.28];
          for(const st of strikes){
            const local=t-st; if(local<0||local>.24) continue;
            const alpha=(1-local/.24)*(st===0?1:.65);
            g.lineStyle(critical?12:8,main,.18*alpha); g.moveTo(sx,sy);
            for(let i=1;i<15;i++){const q=i/14, off=boltOffsets[i]*Math.sin((t+st)*70+i); g.lineTo(sx+dx*q+px*off,sy+dy*q+py*off);}
            g.lineStyle(critical?5:3,hot,.98*alpha); g.moveTo(sx,sy);
            for(let i=1;i<15;i++){const q=i/14, off=boltOffsets[i]*Math.sin((t+st)*70+i); g.lineTo(sx+dx*q+px*off,sy+dy*q+py*off);}
            for(const br of branchSeeds){const bx=sx+dx*br.q,by=sy+dy*br.q;g.lineStyle(2,light,.75*alpha);g.moveTo(bx,by);g.lineTo(bx+px*br.side*br.len+nx*br.len*.35,by+py*br.side*br.len+ny*br.len*.35);}
          }
        }

        // MELEE: directional slash, second crossing slash on critical.
        if (type === "melee" && source && target && t<.62) {
          const q=clamp(t/.34), fade=1-clamp((t-.24)/.38), len=critical?125:88;
          const cx=tx-nx*35*(1-q), cy=ty-ny*35*(1-q);
          g.lineStyle(critical?18:11,main,.18*fade); g.moveTo(cx-px*len,cy-py*len); g.lineTo(cx+px*len,cy+py*len);
          g.lineStyle(critical?7:4,hot,.95*fade); g.moveTo(cx-px*len,cy-py*len); g.lineTo(cx+px*len,cy+py*len);
          if(critical && t>.12){g.lineStyle(5,light,.8*fade);g.moveTo(cx-(px+nx)*len*.65,cy-(py+ny)*len*.65);g.lineTo(cx+(px+nx)*len*.65,cy+(py+ny)*len*.65);}
        }

        // IMPACT / EXPLOSION / WAVE: layered blast instead of a single circle.
        if (impact>0 || ["impact","explosion","wave","zone","heal","aura"].includes(type)) {
          const p=["impact","explosion","wave","zone","heal","aura"].includes(type) ? clamp(t/.78) : impact;
          const f=1-p;
          if(type === "explosion"){
            const blast=critical?155:112;
            circle(tx,ty,blast*p,main,.20*f);
            circle(tx,ty,blast*.62*Math.min(1,p*1.8),0xff8a2a,.34*f);
            circle(tx,ty,blast*.30*Math.min(1,p*2.5),hot,.62*f);
            ring(tx,ty,blast*1.18*p,critical?11:7,light,.70*f);
            ring(tx,ty,blast*1.48*p,critical?6:4,main,.35*f);
            for(const e of embers){const ep=clamp(p*1.35);const rr=e.s*ep*(critical?1.45:1);circle(tx+Math.cos(e.a)*rr+Math.cos(e.a+1.57)*e.curl*ep*.25,ty+Math.sin(e.a)*rr+Math.sin(e.a+1.57)*e.curl*ep*.25,e.r*(1-.45*ep),e.r>4?light:main,.9*(1-ep));}
          } else if(type === "zone"){
            // Onde de zone calibrée sur ~9 mètres de rayon selon l'échelle de la scène.
            const gridSize = Number(canvas.scene?.grid?.size || canvas.grid?.size || 100);
            const gridDistance = Number(canvas.scene?.grid?.distance || 1);
            const zoneRadius = Math.max(gridSize, (9 / Math.max(gridDistance, 0.01)) * gridSize);
            const zq = easeOut(p);
            circle(tx,ty,zoneRadius*zq,main,.055*f);
            ring(tx,ty,zoneRadius*zq,critical?12:8,main,.82*f);
            ring(tx,ty,zoneRadius*Math.max(0,zq-.08),critical?7:4,light,.64*f);
            if (tierLevel >= 2) ring(tx,ty,zoneRadius*Math.max(0,zq-.16),tierLevel===3?6:4,hot,.48*f);
            const zoneMotes = critical ? 26 : (tierLevel===3 ? 22 : tierLevel===2 ? 18 : 14);
            for(let i=0;i<zoneMotes;i++){
              const a=(Math.PI*2*i/zoneMotes)+t*(i%2?1.8:-1.3);
              const rr=zoneRadius*zq*(.35+.6*rand(i,61));
              circle(tx+Math.cos(a)*rr,ty+Math.sin(a)*rr,2.5+3*rand(i,62),i%2?main:light,.62*f);
            }
          } else if(type === "wave"){
            for(let k=0;k<(critical?4:3);k++){const qp=clamp(p-k*.12); if(qp>0) ring(tx,ty,(critical?185:130)*qp,critical?8-k:5-k, k%2?light:main,.72*(1-qp));}
          } else if(type === "heal" || type === "aura"){
            const rr=(critical?125:92)*p;
            circle(tx,ty,rr*.55,main,.10*f); ring(tx,ty,rr,critical?7:4,main,.72*f); ring(tx,ty,rr*.62,2,light,.88*f);
            for(const m of motes){const mr=m.s*p; const xx=tx+Math.cos(m.a)*mr, yy=ty+Math.sin(m.a)*mr-(critical?65:42)*p; circle(xx,yy,m.r, m.r>4?light:main,.8*f);}
            // plus-shaped healing glyph
            const gs=(critical?30:22)*(1+.18*Math.sin(t*18)); g.lineStyle(critical?9:6,hot,.75*f);g.moveTo(tx-gs,ty);g.lineTo(tx+gs,ty);g.moveTo(tx,ty-gs);g.lineTo(tx,ty+gs);
          } else {
            const rr=(critical?118:82)*p; circle(tx,ty,rr*.35,main,.24*f); ring(tx,ty,rr,critical?9:5,main,.78*f); ring(tx,ty,rr*.62,3,light,.82*f);
          }

          if(type === "impact" || type === "explosion" || type === "lightning" || type === "melee" || critical){
            for(const sp of sparks){const spq=clamp((p-sp.lag)/(1-sp.lag)); if(spq<=0) continue; const rr=sp.s*spq*(critical?1.3:1); circle(tx+Math.cos(sp.a)*rr,ty+Math.sin(sp.a)*rr,sp.r*(1-spq*.55),sp.r>3.5?light:main,.88*(1-spq));}
          }
        }

        // Surcharge de palier : le Palier I reste exactement notre base visuelle.
        // II ajoute une couronne et des satellites ; III ajoute une seconde vague plus large.
        if(tierLevel >= 2 && t > .34){
          const tq=clamp((t-.34)/.50), tf=1-tq;
          ring(tx,ty,(48+128*tq)*tierBoost, tierLevel===3?7:5, light,.42*tf);
          const satellites=tierLevel===3?10:6;
          for(let i=0;i<satellites;i++){
            const a=(Math.PI*2*i/satellites)+(t*4*(i%2?1:-1));
            const rr=(42+70*tq)*tierBoost;
            circle(tx+Math.cos(a)*rr,ty+Math.sin(a)*rr,tierLevel===3?4.2:3.2,i%2?main:light,.55*tf);
          }
        }
        if(tierLevel === 3 && t > .48){
          const tq=clamp((t-.48)/.42), tf=1-tq;
          ring(tx,ty,70+235*tq,9*(1-tq)+2,main,.46*tf);
          ring(tx,ty,45+175*tq,4,hot,.58*tf);
        }

        // Critical final shock ring: deliberately excessive.
        if(critical && t>.48){const q=clamp((t-.48)/.40); ring(tx,ty,35+205*q*tierBoost,10*(1-q)+2,hot,.55*(1-q));}

        if(t<1) requestAnimationFrame(draw); else { g.destroy(); if(sigil) sigil.destroy(); }
      };
      requestAnimationFrame(draw);

      // Token punch without keeping any permanent transform.
      const punch = (tok, amount=1.08, delay=0) => {
        if(!tok?.mesh) return;
        setTimeout(()=>{try{const m=tok.mesh, ox=m.scale.x,oy=m.scale.y;m.scale.set(ox*amount,oy*amount);setTimeout(()=>{try{m.scale.set(ox,oy)}catch(e){}},critical?190:125);}catch(e){}},delay);
      };
      if(source) punch(source,critical?1.12:1.06,0);
      if(target) punch(target,data.kind === "heal"?(critical?1.14:1.09):(critical?1.18:1.10),Math.round(dur*impactAt));

      // Aucun son automatique : seul un fichier explicitement choisi sur l'objet est joué.
      if (data.sound) {
        AudioHelper.play({src:data.sound, volume:critical?.55:.4, autoplay:true, loop:false}, true);
      }
    } catch (err) { console.warn("Vadentis VFX", err); }
  }

  /* -------------------------------------------- */
  static async _handleAlchemySpellRequest(data) {
    if (!data || data.targetUserId !== game.user.id) return;
    const actor=game.actors.get(data.actorId);
    if(!actor || !actor.testUserPermission(game.user,"OWNER")) return;
    const sorts=actor.items.filter(i=>i.type==="sort");
    const respond=spell=>game.socket.emit("system.foundryvtt-vadentis",{name:"msg_alchemy_spell_response",data:{requestId:data.requestId,requesterId:data.requesterId,spell:spell?{id:spell.id,name:spell.name,img:spell.img,system:foundry.utils.deepClone(spell.system||{})}:null}});
    if(!sorts.length){ respond(null); return; }
    const cards=sorts.map(sp=>`<button type="button" class="vadentis-alchemy-spell-card" data-spell-id="${sp.id}"><img src="${sp.img}" alt=""><span><strong>${sp.name}</strong><small>${sp.system?.donnee||"Donnée"} · Palier ${sp.system?.palier||"?"} · ${Number(sp.system?.pe||0)} PE</small></span></button>`).join("");
    let answered=false;
    const send=spell=>{ if(answered)return; answered=true; respond(spell); };
    const dlg=new Dialog({title:`${actor.name} · Sort en bouteille`,content:`<div class="vadentis-alchemy-spell-picker"><p><strong>${data.alchemistName}</strong> souhaite cuisiner un Sort avec ${actor.name}. C’est à vous de choisir lequel enfermer en bouteille.</p>${cards}</div>`,buttons:{cancel:{label:"Refuser / Annuler",callback:()=>send(null)}},close:()=>send(null)},{width:500});
    dlg.render(true);
    Hooks.once("renderDialog",(app,html)=>{if(app!==dlg)return;html.find('.vadentis-alchemy-spell-card').on('click',ev=>{const spell=actor.items.get(ev.currentTarget.dataset.spellId);send(spell);dlg.close();});});
  }

  static async _handleAlchemyMasteryRequest(data) {
    if (!data || data.targetUserId !== game.user.id) return;
    const actor=game.actors.get(data.actorId);
    if(!actor || !actor.testUserPermission(game.user,"OWNER")) return;
    const spell=actor.items.get(data.spellId);
    if(!spell) return game.socket.emit("system.foundryvtt-vadentis",{name:"msg_alchemy_mastery_response",data:{requestId:data.requestId,requesterId:data.requesterId,ok:false}});
    const peCost=Number(spell.system?.pe||0), peNow=Number(actor.system?.stats?.pointsenergie?.value||0);
    if(peNow<peCost){ ui.notifications.warn(`${actor.name} n’a pas assez de PE (${peNow}/${peCost}).`); game.socket.emit("system.foundryvtt-vadentis",{name:"msg_alchemy_mastery_response",data:{requestId:data.requestId,requesterId:data.requesterId,ok:false}}); return; }
    const masteryData=actor.system?.magie?.matriseelementaire || {};
    const mastery=actor._getCombatValue ? actor._getCombatValue(masteryData) : Number(masteryData.total ?? masteryData.base ?? 0);
    const roll=await (new Roll(`1d20 + ${mastery}`)).evaluate();
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`Maîtrise Données · ${actor.name} enferme ${spell.name}`});
    await actor.update({"system.stats.pointsenergie.value":peNow-peCost});
    game.socket.emit("system.foundryvtt-vadentis",{name:"msg_alchemy_mastery_response",data:{requestId:data.requestId,requesterId:data.requesterId,ok:true,total:Number(roll.total||0),peCost,spell:{id:spell.id,name:spell.name,img:spell.img,system:foundry.utils.deepClone(spell.system||{})}}});
  }

  static async _handleEngineeringChooseData(data){
    if(!data||data.targetUserId!==game.user.id)return;const actor=game.actors.get(data.actorId);if(!actor||!actor.testUserPermission(game.user,"OWNER"))return;
    const allowed=["Feu","Eau","Vent","Terre","Foudre","Lumière"], norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();const choices=allowed.map(name=>{const i=actor.items.find(x=>x.type==="donnee"&&norm(x.name).includes(norm(name)));return i?{name,img:i.img}:null}).filter(Boolean);
    const respond=(ok,d=null)=>game.socket.emit("system.foundryvtt-vadentis",{name:"msg_engineering_choose_data_response",data:{requestId:data.requestId,requesterId:data.requesterId,ok,data:d}});if(!choices.length)return respond(false);
    const cards=choices.map(d=>`<button class="vadentis-engineering-data-card" data-name="${d.name}"><img src="${d.img}"><strong>${d.name}</strong></button>`).join("");let answered=false;const send=(ok,d)=>{if(answered)return;answered=true;respond(ok,d)};const dlg=new Dialog({title:`${actor.name} · Ingénierie élémentaire`,content:`<div class="vadentis-engineering-picker"><p><strong>${data.engineerName}</strong> vous propose de participer au remplissage d’un Orbe élémentaire.</p><p>Participer et choisir une Donnée :</p><div class="vadentis-engineering-data-grid">${cards}</div></div>`,buttons:{cancel:{label:"Non, refuser",callback:()=>send(false)}},close:()=>send(false)},{width:520});dlg.render(true);Hooks.once("renderDialog",(app,html)=>{if(app!==dlg)return;html.find('.vadentis-engineering-data-card').on('click',ev=>{send(true,choices.find(d=>d.name===ev.currentTarget.dataset.name));dlg.close();});});
  }
  static async _handleEngineeringMastery(data){if(!data||data.targetUserId!==game.user.id)return;const actor=game.actors.get(data.actorId);if(!actor||!actor.testUserPermission(game.user,"OWNER"))return;const md=actor.system?.magie?.matriseelementaire||{},m=actor._getCombatValue?actor._getCombatValue(md):Number(md.total??md.base??0);const r=await(new Roll(`1d20 + ${m}`)).evaluate();game.socket.emit("system.foundryvtt-vadentis",{name:"msg_engineering_mastery_response",data:{requestId:data.requestId,requesterId:data.requesterId,ok:true,total:Number(r.total||0),critical:Number(r.dice?.[0]?.results?.[0]?.result||0)===20}});}
  static async _handleEngineeringPayPE(data){if(!data||data.targetUserId!==game.user.id)return;const actor=game.actors.get(data.actorId);if(!actor||!actor.testUserPermission(game.user,"OWNER"))return;const pe=Number(actor.system?.stats?.pointsenergie?.value||0),cost=Number(data.peCost||0);let ok=pe>=cost;await actor.update({"system.stats.pointsenergie.value":ok?pe-cost:0});if(!ok)ui.notifications.warn(`${actor.name} n’a pas assez de PE (${pe}/${cost}) : les PE disponibles sont consommés et la création échoue.`);game.socket.emit("system.foundryvtt-vadentis",{name:"msg_engineering_pay_pe_response",data:{requestId:data.requestId,requesterId:data.requesterId,ok}});}

  static async _handleEngineeringTransferToOwner(data) {
    if (!data || data.targetUserId !== game.user.id) return;
    let ok=false,error=null;
    try {
      const target=game.actors.get(data.targetActorId);
      if(!target || !target.testUserPermission(game.user,"OWNER")) throw new Error("Vous ne contrôlez pas le personnage destinataire.");
      const itemData=foundry.utils.deepClone(data.itemData||{}); delete itemData._id;
      if(foundry.utils.getProperty(itemData,"flags.foundryvtt-vadentis.inventorySection")!=="assemblages") throw new Error("Cet objet n’est pas un Assemblage.");
      await target.createEmbeddedDocuments("Item",[itemData]); ok=true; target.sheet?.render(false);
      ui.notifications.info(`${itemData.name||"Assemblage"} reçu de la part d’un autre personnage.`);
    } catch(e){ error=e?.message||"Réception impossible."; console.error("Vadentis | réception Assemblage",e); }
    game.socket.emit("system.foundryvtt-vadentis",{name:"msg_engineering_transfer_response",data:{requestId:data.requestId,requesterId:data.requesterId,ok,error}});
  }

  static async _handleEngineeringTransfer(data) {
    if (!game.user.isGM || !data) return;
    const source = game.actors.get(data.sourceActorId);
    const target = game.actors.get(data.targetActorId);
    const item = source?.items?.get(data.itemId);
    let ok = false, error = null;
    try {
      if (!source || !target || !item) throw new Error("Source, cible ou Assemblage introuvable.");
      if (foundry.utils.getProperty(item, "flags.foundryvtt-vadentis.inventorySection") !== "assemblages") throw new Error("Cet objet n’est pas un Assemblage.");
      const clone = item.toObject(); delete clone._id;
      await target.createEmbeddedDocuments("Item", [clone]);
      await item.delete();
      ok = true;
      source.sheet?.render(false); target.sheet?.render(false);
    } catch (e) { error = e?.message || "Transfert impossible."; console.error("Vadentis | transfert Assemblage", e); }
    game.socket.emit("system.foundryvtt-vadentis", { name: "msg_engineering_transfer_response", data: { requestId: data.requestId, requesterId: data.requesterId, ok, error } });
  }

  static onSocketMesssage(msg) {
    if (msg.name == 'msg_engineering_choose_data_request') { this._handleEngineeringChooseData(msg.data); return; }
    if (msg.name == 'msg_engineering_choose_data_response') { return; }
    if (msg.name == 'msg_engineering_mastery_request') { this._handleEngineeringMastery(msg.data); return; }
    if (msg.name == 'msg_engineering_mastery_response') { return; }
    if (msg.name == 'msg_engineering_pay_pe_request') { this._handleEngineeringPayPE(msg.data); return; }
    if (msg.name == 'msg_engineering_pay_pe_response') { return; }
    if (msg.name == 'msg_engineering_transfer_to_owner') { this._handleEngineeringTransferToOwner(msg.data); return; }
    if (msg.name == 'msg_engineering_transfer_request') { this._handleEngineeringTransfer(msg.data); return; }
    if (msg.name == 'msg_engineering_transfer_response') { return; }
    if (msg.name == 'msg_alchemy_spell_request') { this._handleAlchemySpellRequest(msg.data); return; }
    if (msg.name == 'msg_alchemy_spell_response') { return; }
    if (msg.name == 'msg_alchemy_mastery_request') { this._handleAlchemyMasteryRequest(msg.data); return; }
    if (msg.name == 'msg_alchemy_mastery_response') { return; }
    if (msg.name == 'msg_vfx') { this.playVFX(msg.data); return; }
    if (msg.name == 'msg_sculpture_marker') { this.playSculptureMarker(msg.data); return; }
    if (msg.name == 'msg_sculpture_marker_cleanup') { this.removeSculptureMarkers(msg.data?.sculptureId, msg.data?.exceptTokenIds || []); return; }
    if (msg.name == 'msg_sculpture_marker_token_cleanup') { this.removeSculptureMarkerForToken(msg.data?.sculptureId, msg.data?.tokenId); return; }
    if (!game.user.isGM) return; // Only GM for authoritative actions
    if (msg.name == 'msg_attack') {
      this.performAttack(msg.data);
    } else if (msg.name == 'msg_spell_effect') {
      this.applySpellEffect(msg.data);
    } else if (msg.name == 'msg_sculpture_effect') {
      this.applySculptureEffect(msg.data);
    } else if (msg.name == 'msg_sculpture_cleanup') {
      this.cleanupSculptureEffects(msg.data);
    }
  }

  /* -------------------------------------------- */
  static async loadCompendiumNames(compendium) {
    const pack = game.packs.get(compendium);
    let competences;
    await pack.getIndex().then(index => competences = index);
    return competences;
  }

  /* -------------------------------------------- */
  static async loadCompendium(compendium, filter = item => true) {
    let compendiumItems = await SoSUtility.loadCompendiumNames(compendium);

    const pack = game.packs.get(compendium);
    let list = [];
    for (let compendiumItem of compendiumItems) {
      await pack.getEntity(compendiumItem._id).then(it => {
        const item = it.data;
        if (filter(item)) {
          list.push(item);
        }
      });
    };
    return list;
  }

  /* -------------------------------------------- */
  static getDonnees() {
    return this.loadCompendiumNames('foundryvtt-vadentis.donnees');
  }
  /* -------------------------------------------- */
  static getEglises() {
    return this.loadCompendiumNames('foundryvtt-vadentis.croyances');
  }

  /* -------------------------------------------- */
  static async confirmDelete(actorSheet, li) {
    let itemId = li.data("item-id");
    let msgTxt = "<p>Etes vous certain de souhaiter supprimer cet item ?";
    let buttons = {
      delete: {
        icon: '<i class="fas fa-check"></i>',
        label: "Oui, à supprimer",
        callback: () => {
          actorSheet.actor.deleteEmbeddedDocuments('Item', [itemId]);
          li.slideUp(200, () => actorSheet.render(false));
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Annuler"
      }
    }
    msgTxt += "</p>";
    let d = new Dialog({
      title: "Confirmer la suppression",
      content: msgTxt,
      buttons: buttons,
      default: "cancel"
    });
    d.render(true);
  }

}