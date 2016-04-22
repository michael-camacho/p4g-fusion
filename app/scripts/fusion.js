"use strict";
/* global window */

const p4gData = parent.p4gData;
const guiUtils = parent.guiUtils;

let personaLists;

// Set up the selection drop-downs (and collapsible info windows)
for ( let i = 1; i <= 3; i++ ) {
    const infoWrapper = document.getElementById( "personaInfo" + i );

    guiUtils.populatePersonaList( infoWrapper, () => {
        const resultPersona = tryFusing();
        guiUtils.displayPersona( document.querySelector( "#resultPersonaInfo .personaDetails" ), resultPersona );
    } );
}
personaLists = Array.from( document.getElementsByClassName( "personaSelect" ) );
parent.guiUtils.initPersonaInfoView( document.getElementById( "resultPersonaInfo" ) );


function tryFusing() {
    const [ name1, name2, name3 ] = personaLists.map( personaList => personaList.value );

    if ( !name1 || !name2 ) {   // At least 1st and 2nd personas need to be set
        return null;
    }

    // First, check to see if it happens to be a double or triple special fusion:
    let resultPersona = p4gData.getSpecialFusionResult( p4gData.getPersonaByName( name1 ),
                                                        p4gData.getPersonaByName( name2 ),
                                                        p4gData.getPersonaByName( name3 ) );
    if ( resultPersona ) {
        return resultPersona;
    }


    if ( !name3 ) {             // Attempt either a double or triple fusion depending on how many personas were selected
        resultPersona = p4gData.getDoubleFusionResult( p4gData.getPersonaByName( name1 ),
                                                       p4gData.getPersonaByName( name2 ) );
    }
    else {
        resultPersona = p4gData.getTripleFusionResult( p4gData.getPersonaByName( name1 ),
                                                       p4gData.getPersonaByName( name2 ),
                                                       p4gData.getPersonaByName( name3 ) );
    }

    return resultPersona || {
            name: "Not a valid combination"
        };
}
