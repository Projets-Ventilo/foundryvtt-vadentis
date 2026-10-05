import { VadentisUtility } from "./vadentis-utility.js";

/* -------------------------------------------- */
export class VadentisCombat extends Combat {

  /* -------------------------------------------- */
  async rollInitiative(ids, options = {}) {


    /* -------------------------------------------- */
    // Normalisation des IDs
    /* -------------------------------------------- */

    ids = typeof ids === "string" ? [ids] : ids;

    const {
      updateTurn = true,
      messageOptions = {}
    } = options;


    /* -------------------------------------------- */
    // Mémorise le combattant actuellement actif
    /* -------------------------------------------- */

    const currentId =
      this.combatant?.id ?? null;


    /* -------------------------------------------- */
    // Préparation des mises à jour
    /* -------------------------------------------- */

    const updates = [];
    const messages = [];


    /* -------------------------------------------- */
    // Jet pour chaque combattant demandé
    /* -------------------------------------------- */

    for (const id of ids) {

      const combatant =
        this.combatants.get(id);

      if (!combatant) {
        continue;
      }


      /* -------------------------------------------- */
      // Bonus d'initiative Vadentis
      /* -------------------------------------------- */

      const initiativeBonus =
        combatant.actor
          ? combatant.actor.getInitiativeScore()
          : 0;


      const formula =
        `1d20 + ${initiativeBonus}`;


      console.log(
        `Vadentis | Initiative de ${combatant.name} : ${formula}`
      );


      /* -------------------------------------------- */
      // Création et évaluation du jet
      /* -------------------------------------------- */

      const roll =
        combatant.getInitiativeRoll(formula);

      await roll.evaluate();


      const initiative =
        Math.max(0, roll.total);


      /* -------------------------------------------- */
      // Prépare la mise à jour du Combat Tracker
      /* -------------------------------------------- */

      updates.push({
        _id: combatant.id,
        initiative: initiative
      });


      /* -------------------------------------------- */
      // Prépare le message de chat
      /* -------------------------------------------- */

      const rollMode =
        messageOptions.rollMode
        ?? game.settings.get("core", "rollMode");


      const messageData =
        foundry.utils.mergeObject(
          {
            speaker: {
              scene: canvas.scene?.id,
              actor: combatant.actor?.id,
              token: combatant.tokenId,
              alias: combatant.name
            },

            flavor:
              `${combatant.name} fait son jet d'Initiative ` +
              `(${formula})`,

            sound: CONFIG.sounds.dice
          },
          messageOptions
        );


      messages.push({
        roll,
        messageData,
        rollMode
      });
    }


    /* -------------------------------------------- */
    // Mise à jour du Combat Tracker
    /* -------------------------------------------- */

    if (updates.length > 0) {

      await this.updateEmbeddedDocuments(
        "Combatant",
        updates
      );
    }


    /* -------------------------------------------- */
    // Conserve le tour actuel si le combat a commencé
    /* -------------------------------------------- */

    if (
      updateTurn &&
      currentId &&
      this.started
    ) {

      const turn =
        this.turns.findIndex(
          combatant => combatant.id === currentId
        );

      if (turn >= 0) {

        await this.update({
          turn: turn
        });
      }
    }


    /* -------------------------------------------- */
    // Messages de chat
    /* -------------------------------------------- */

    for (const message of messages) {

      await message.roll.toMessage(
        message.messageData,
        {
          rollMode: message.rollMode,
          create: true
        }
      );
    }


    /* -------------------------------------------- */

    return this;
  }

}