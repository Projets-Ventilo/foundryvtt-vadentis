/* -------------------------------------------- */
import { VadentisUtility } from "./vadentis-utility.js";

/* -------------------------------------------- */
export class VadentisTokenHud {

  static init(){
      // Integration du TokenHUD
    Hooks.on('renderTokenHUD', (app, html, data) => { VadentisTokenHud.addTokenHudExtensions(app, html, data._id) });
  }

  /* -------------------------------------------- */
  static async removeExtensionHud( app, html, tokenId) {
    let combat = html.find('.control-icon.vadentis-combat');
    combat.remove();
    let sort = html.find('.control-icon.vadentis-sort');
    sort.remove();
  }

  /* -------------------------------------------- */
  static async addExtensionHud( app, html, tokenId ) {

    let token = canvas.tokens.get(tokenId);
    let actor = token.actor;
    //let combatant = game.combat.combatants.find(c => c.tokenId == token._id);
    app.hasExtension = true;

    let armesList = actor.getArmes() ;
    let sortsList = actor.getSorts().concat( actor.getDevotions() );
    const hudData = { actor: actor, armes: armesList, sorts: sortsList } 

    // sort
    await VadentisTokenHud._configureSubMenu(html.find('.control-icon[data-action=combat]'), 'systems/foundryvtt-vadentis/templates/hud-actor-sort.html', hudData,
      (event) => {
        let actorId = event.currentTarget.attributes['data-actor-id'].value;
        const actor = game.actors.get(actorId);        
        let sortId = event.currentTarget.attributes['data-sort-id'].value;
        actor.rollSortOuDevotion( sortId );
      });

    // combat
    await VadentisTokenHud._configureSubMenu(html.find('.control-icon[data-action=target]'), 'systems/foundryvtt-vadentis/templates/hud-actor-attaque.html', hudData,
      (event) => {
        let armeId = event.currentTarget.attributes['data-arme-id'].value;
        actor.rollArme(armeId);
      });
  }

  /* -------------------------------------------- */
  static async addTokenHudExtensions(app, html, tokenId) {

    html.find('.control-icon[data-action=combat]').click(event => {
      if ( event.currentTarget.className.includes('active')) {
        VadentisTokenHud.removeExtensionHud( app, html, tokenId);
      } else {
        setTimeout( function() { RdDTokenHud.addExtensionHud( app, html, tokenId) } , 200 );
      }
    } );

    let combatIcon  = html.find('.control-icon[data-action=combat]');
    //console.log("COMBAT ICON", combatIcon)
    if ( combatIcon[0]?.className.includes('active') ) {
      VadentisTokenHud.addExtensionHud( app, html, tokenId);
    }
  }

  /* -------------------------------------------- */
  static _showControlWhen(control, condition) {
    if (condition) {
      control.show();
    }
    else {
      control.hide();
    }
  }

  /* -------------------------------------------- */
  static async _configureSubMenu(insertionPoint, template, hudData, onMenuItem) {
    const hud = $(await renderTemplate(template, hudData));
    const imgHud = hud.find('img.vadentis-hud-togglebutton');
    const list = hud.find('div.vadentis-hud-list');

    hud.toggleClass('active');
    VadentisTokenHud._showControlWhen(list, hud.hasClass('active'));

    imgHud.click(event => {
      hud.toggleClass('active');
      VadentisTokenHud._showControlWhen(list, hud.hasClass('active'));
    });

    list.find('.vadentis-hud-menu').click(onMenuItem);

    insertionPoint.after(hud);
  }

}