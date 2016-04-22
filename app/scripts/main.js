"use strict";
/* global loki, $, _ */
/* eslint new-cap: 1 */

const P4DEFS = {
    STORAGE_NAME_PREFIX: "nabudis.p4g_fusion.",
    STORAGE_DOUBLE_RECIPES: "double_recipes",
    STORAGE_TRIPLE_RECIPES: "triple_recipes",
    PERSONAS: "personas",
    SKILLS_BY_CATEGORY: "skillsByCategory",
    ARCANAS: new Map()
};

$( () => {
    const $menuButtons = $( "#mainMenu .menubutton" );
    $menuButtons.click( function() {
        $( this ).addClass( "selected" );
        $menuButtons.not( this ).removeClass( "selected" );
    } );
} );

const p4gData = function() {
    const P4G_DB_JSON_FILENAME = "p4g.json";
    const P4G_FUSION_TABLE_CSV_FILENAME = "main_fusion_table.csv";
    const P4G_SPECIAL_FUSION_RECIPES_FILENAME = "special_fusion_recipes.csv";
    let db = new loki( "p4db" );
    let fusionTable, specialRecipes;
    const doubleArcanaRecipes = new Map(), tripleArcanaRecipes = new Map();

    // Populate the database:
    const dbAjax = $.getJSON( P4G_DB_JSON_FILENAME, p4JsonData => {
        console.assert( p4JsonData.hasOwnProperty( P4DEFS.PERSONAS ) );
        console.assert( p4JsonData.hasOwnProperty( P4DEFS.SKILLS_BY_CATEGORY ) );
        Object.keys( p4JsonData ).forEach( collName => {
            db.addCollection( collName ).insert( p4JsonData[collName] );
        } );
        const personas = db.getCollection( P4DEFS.PERSONAS );
    } );

    // Set up the fusion table:
    const fusionTableAjax = $.get( P4G_FUSION_TABLE_CSV_FILENAME,
                                   ( csvData )=> {
                                       fusionTable = $.csv.toArrays( csvData );

                                       // Set up arcanas:
                                       let firstRow = fusionTable[0];
                                       for ( let index = 1; index < firstRow.length; index++ ) {
                                           P4DEFS.ARCANAS.set( firstRow[index], index );
                                       }
                                   } );

    // Set up the special fusion recipes:
    specialRecipes = new Map();
    $.get( P4G_SPECIAL_FUSION_RECIPES_FILENAME,
           ( csvData )=> {
               $.csv.toArrays( csvData ).forEach(
                   ( rowData )=> specialRecipes.set( rowData[0], rowData.slice( 1 ) ) );
           } );

    $.when( dbAjax, fusionTableAjax ).then( populateDoubleAndTripleArcanaRecipes );

    return {
        getAllArcanas,
        getPersonaByName,
        getAllPersonas,
        getAllSkills,
        getResValText,
        getDoubleFusionResult,
        getDoubleFusionRecipes,
        getTripleFusionResult,
        getTripleFusionRecipes,
        getSpecialFusionResult,
        getSpecialFusionRecipe
    };

    function getAllArcanas() {
        return Array.from( P4DEFS.ARCANAS.keys() );
    }

    function getPersonaByName( name ) {
        return name ? db.getCollection( P4DEFS.PERSONAS ).find( { "name": name } )[0] : null;
    }

    let allPersonas;

    function getAllPersonas( includeWorld ) {
        if ( !allPersonas ) {
            allPersonas = db.getCollection( P4DEFS.PERSONAS ).chain()
                            .find( { "arcana": { "$ne": "World" } } )
                            .sort( personaNameComparator )
                            .data();
        }

        if ( includeWorld ) { // For the only special fusion recipe that involved the World arcana ;)
            const result = allPersonas.slice();
            result.push( getPersonaByName( "Izanagi-no-Okami" ) );
            result.sort( personaNameComparator );
            return result;
        }
        else {
            return allPersonas;
        }

    }

    let allSkills;

    function getAllSkills() {
        if ( !allSkills ) {
            const skillsByCategory = db.getCollection( P4DEFS.SKILLS_BY_CATEGORY ).find();
            allSkills = _.flatten( skillsByCategory.map( skillCat => skillCat.skills ) );
        }
        return allSkills;
    }

    function getResValText( dbResVal ) {
        switch ( dbResVal ) {
            case "NORMAL":
                return "---";
            case "WEAK":
                return "Wk";
            case "RESIST":
                return "Str";
            case "BLOCK":
                return "Nul";
            case "ABSORB":
                return "Dr";
            case "REFLECT":
                return "Rpl";
        }
    }

    function personaNameComparator( p1, p2 ) {
        if ( p1.name > p2.name ) {
            return 1;
        }
        if ( p1.name < p2.name ) {
            return -1;
        }
        return 0;
    }

    /**
     * Used to sort personas in ascending order by their level.
     * Will attempt to sort first by current level (<code>currentLevel</code>),
     * but will use the base level (<code>level</code>) if the current level has not been set.
     */
    function personaLevelComparator( p1, p2 ) {
        return ( p1.currentLevel - p2.currentLevel ) || ( p1.level - p2.level );
    }

    function personaArcanaComparator( p1, p2 ) {
        return P4DEFS.ARCANAS.get( p1.arcana ) - P4DEFS.ARCANAS.get( p2.arcana );
    }

    function getFusionArcana( arcana1, arcana2, isTripleFusion ) {
        const index1 = P4DEFS.ARCANAS.get( arcana1 );
        const index2 = P4DEFS.ARCANAS.get( arcana2 );

        if ( !isTripleFusion ) {
            // If it's a double fusion, the row arcana must be <= the column arcana (top-right section of the table)
            return fusionTable[Math.min( index1, index2 )][Math.max( index1, index2 )];
        }
        else {
            // If it's a triple fusion, the row arcana must be >= the column arcana (bottom-left section of the table)
            return fusionTable[Math.max( index1, index2 )][Math.min( index1, index2 )];
        }
    }

    /**
     * Attempt a double (normal) fusion -- excludes special fusion results
     *
     * @param persona1
     * @param persona2
     * @returns persona
     */
    function getDoubleFusionResult( persona1, persona2 ) {
        if ( persona1.name === persona2.name ) {
            return null;
        }

        // First, let's figure out which arcana the new persona belongs to.
        const resultArcana = getFusionArcana( persona1.arcana, persona2.arcana, false );
        // Some entries in the double-fusion section of the table are blank (I don't know why, TBH):
        if ( !resultArcana ) {
            return null;
        }

        return getDoubleFusionResultInner( persona1, persona2, resultArcana );
    }

    function getDoubleFusionResultInner( persona1, persona2, resultArcana ) {

        // Second, figure out the base level of the new persona.
        const resultLevel = Math.floor( 1 + ( persona1.level + persona2.level ) / 2 );

        const partialResult = db.getCollection( P4DEFS.PERSONAS )
                                .chain()
                                .find( { "arcana": resultArcana } ); // Can perform further queries

        // For a fusion of different arcanas, the resulting persona will be the closest match whose level is >= to the calculated level.
        // Fusion of two from the SAME arcana is a special case, in which the resulting persona is <= than the calculated level.
        if ( persona1.arcana !== persona2.arcana ) {
            partialResult.find( { "level": { $gte: resultLevel } } )
                         .sort( personaLevelComparator );
        }
        else {
            partialResult.find( { "level": { $lte: resultLevel } } )
                         .where( ( persona ) => ( persona.name !== persona1.name )
                                                && ( persona.name !== persona2.name )
                                                && !persona.special ) // can't fuse!
                         .sort( _.negate( personaLevelComparator ) );
        }

        return partialResult.data()[0]; // The desired persona is the first element in the array
    }

    /**
     * Attempt a triple (triangle) fusion -- excludes special fusion results
     *
     * @param persona1
     * @param persona2
     * @param persona3
     */
    function getTripleFusionResult( persona1, persona2, persona3 ) {
        if ( ( persona1.name === persona2.name ) || ( persona1.name === persona3.name ) || ( persona2.name === persona3.name ) ) {
            return null;
        }

        // Note that the third persona is always the one with the highest *current* level, regardless of the argument order.
        // If there's a tie in levels, the persona with the lowest arcana (starting from The Fool) will be the third persona.
        [persona1, persona2, persona3] = [persona1, persona2, persona3].sort(
            ( p1, p2 )=> personaLevelComparator( p1, p2 ) || -personaArcanaComparator( p1, p2 ) ); // levels, then arcana if levels equal

        // To begin with, get the double fusion arcana using the arcanas of the first and second personas:
        const tempArcana = getFusionArcana( persona1.arcana, persona2.arcana, false );
        // Some entries in the double-fusion section of the table are blank (I don't know why, TBH):
        if ( !tempArcana ) {
            return null;
        }
        // Next, combine the resulting arcana with the arcana of the third persona:
        const resultArcana = getFusionArcana( tempArcana, persona3.arcana, true );

        return getTripleFusionResultInner( persona1, persona2, persona3, resultArcana );
    }

    function getTripleFusionResultInner( persona1, persona2, persona3, resultArcana ) {
        const resultLevel = Math.floor( 5 + ( persona1.level + persona2.level + persona3.level ) / 3 );

        return db.getCollection( P4DEFS.PERSONAS )
                 .chain()
                 .find( { "arcana": resultArcana } )
                 .find( { "level": { $gte: resultLevel } } )
                 .where( ( persona ) => ( persona.name !== persona1.name )
                                        && ( persona.name !== persona2.name )
                                        && ( persona.name !== persona3.name )  // Assume can't fuse these in triple fusion either?
                                        && !persona.special )
                 .sort( personaLevelComparator )
                 .data()[0];
    }

    function getSpecialFusionResult( ...personas ) {
        personas = _.compact( personas ); // 3rd might be null
        for ( const entry of specialRecipes.entries() ) {
            const recipe = entry[1];
            if ( ( personas.length === recipe.length )
                 && ( personas.length === _.intersectionWith( personas, recipe, personaNameComparator ) ) ) {
                return entry.key;
            }
        }
        return null;
    }

    function populateDoubleAndTripleArcanaRecipes() {
        const arcanas = Array.from( P4DEFS.ARCANAS.keys() ); // Just want a list of arcana names

        function populateArcanaRecipes( recipes, isTripleFusion ) {
            for ( const arcana of arcanas ) {
                recipes.set( arcana, [] );
            }
            for ( let x = 0; x < arcanas.length; x++ ) {
                for ( let y = x; y < arcanas.length; y++ ) {
                    const resultArcana = getFusionArcana( arcanas[x], arcanas[y], isTripleFusion );
                    if ( resultArcana ) {
                        recipes.get( resultArcana ).push( [arcanas[x], arcanas[y]] );
                        // Since the triangle fusion table relates to fusing the 3rd persona with an intermediate product
                        // of the 1st and 2nd personas, symmetrical recipes are actually useful (unlike in normal fusion)
                        if ( isTripleFusion ) {
                            recipes.get( resultArcana ).push( [arcanas[y], arcanas[x]] );
                        }
                    }
                }
            }
        }

        populateArcanaRecipes( doubleArcanaRecipes, false );    // double-fusion arcana recipes
        populateArcanaRecipes( tripleArcanaRecipes, true );     // triple-fusion arcana recipes
    }

    function partitionByArcana( personas ) {
        const personasByArcana = new Map();
        for ( const persona of personas ) {
            if ( !personasByArcana.has( persona.arcana ) ) {
                personasByArcana.set( persona.arcana, [] );
            }
            personasByArcana.get( persona.arcana ).push( persona );
        }
        return personasByArcana;
    }

    function getAvailablePersonas( availableNames ) {
        return ( availableNames && availableNames.length > 0 )
            ? availableNames.map( getPersonaByName )
            : getAllPersonas();
    }

    /**
     * Get double (normal) fusion recipes -- excludes special fusions
     *
     * @param target
     * @param availableNames
     * @returns {Array}
     */
    function getDoubleFusionRecipes( target, availableNames ) {
        const availablePersonas = getAvailablePersonas( availableNames );
        const personasByArcana = partitionByArcana( availablePersonas );

        let resultRecipes = [];
        for ( const recipe of doubleArcanaRecipes.get( target.arcana ) ) {
            // Check to see if we have ingredients (available personas) satisfying both arcanas needed by the current recipe:
            if ( personasByArcana.has( recipe[0] ) && personasByArcana.has( recipe[1] ) ) {
                // Since we do, try fusing all the different combinations of those to see what we get:
                for ( const persona1 of personasByArcana.get( recipe[0] ) ) {
                    for ( const persona2 of personasByArcana.get( recipe[1] ) ) {
                        if ( ( persona1.arcana !== persona2.arcana ) || ( persona2.level > persona1.level ) ) { // avoid self-fusion & mirrors
                            const fusedPersona = getDoubleFusionResultInner( persona1, persona2, target.arcana ); // already calculated arcana
                            if ( fusedPersona && ( target.name === fusedPersona.name ) ) {
                                resultRecipes.push( [persona1, persona2] );
                            }
                        }
                    }
                }
            }
        }

        return resultRecipes;
    }

    /**
     * Get triple (triangle) fusion recipes -- excludes special fusions
     *
     * @param target
     * @param availableNames
     * @returns {Array}
     */
    function getTripleFusionRecipes( target, availableNames = [] ) {
        const availablePersonas = getAvailablePersonas( availableNames );
        const personasByArcana = partitionByArcana( availablePersonas );

        function isThirdPersonaValid( persona1, persona2, persona3 ) {
            if ( ( persona3.level < persona1.level ) || ( persona3.level < persona2.level ) ) {
                return false;
            }
            if ( ( persona3.level === persona1.level ) && ( personaArcanaComparator( persona3, persona1 ) >= 0 ) ) {
                return false;
            }
            if ( ( persona3.level === persona2.level ) && ( personaArcanaComparator( persona3, persona2 ) >= 0 ) ) {
                return false;
            }
            // ^^ Conveniently, the above will also return false if the 3rd persona is the SAME as the 1st or 2nd. :P
            return true;
        }

        // let failed = 0;

        let resultRecipes = [];
        for ( const tripleArcanaRecipe of tripleArcanaRecipes.get( target.arcana ) ) {
            for ( const doubleArcanaRecipe of doubleArcanaRecipes.get( tripleArcanaRecipe[0] ) ) {
                const recipe = [...doubleArcanaRecipe, tripleArcanaRecipe[1]]; // try out a recipe that produces the correct arcana
                // Check to see if we have ingredients (available personas) satisfying both arcanas needed by the current recipe:
                if ( personasByArcana.has( recipe[0] ) && personasByArcana.has( recipe[1] ) && personasByArcana.has( recipe[2] ) ) {
                    // Since we do, try fusing all the different combinations of those to see what we get:
                    for ( const persona1 of personasByArcana.get( recipe[0] ) ) {
                        for ( const persona2 of personasByArcana.get( recipe[1] ) ) {
                            if ( ( persona1.arcana !== persona2.arcana ) || ( persona2.level > persona1.level ) ) { // avoid self-fusion & mirrors
                                for ( const persona3 of personasByArcana.get( recipe[2] ) ) {
                                    if ( isThirdPersonaValid( persona1, persona2, persona3 ) ) {
                                        const fusedPersona = getTripleFusionResultInner( persona1, persona2, persona3, target.arcana );
                                        if ( fusedPersona && ( target.name === fusedPersona.name ) ) {
                                            resultRecipes.push( [persona1, persona2, persona3] );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return resultRecipes;
    }


    function getSpecialFusionRecipe( persona ) {
        if ( specialRecipes.has( persona.name ) ) {
            return specialRecipes.get( persona.name ).map( getPersonaByName );
        }
        return null;
    }
}();


const guiUtils = function() {
    const ATTR_ALLOW_SELECTION = "data-allowselection";
    const ATTR_IS_VALID = "data-isvalid";

    function initPersonaInfoView( wrapper, allowSelection ) {
        const docFrag = document.importNode( document.querySelector( "#personaDetailsTemplate" ).content, true );
        wrapper.appendChild( docFrag );
        const personaDetails = wrapper.querySelector( ".personaDetails" );
        $( personaDetails ).find( ".personaBanner" ).click(
            () => {
                if ( personaDetails.getAttribute( ATTR_IS_VALID ) === "true" ) {
                    $( personaDetails ).find( ".personaBreakdown" ).toggleClass( "hidden" );
                }
            } );
        personaDetails.setAttribute( ATTR_ALLOW_SELECTION, allowSelection ? "true" : "false" );
        return personaDetails;
    }

    function displayPersona( element, persona ) {
        if ( !persona || !persona.level ) {
            const errorMsg = persona ? persona.name : "";
            element.querySelector( ".personaLegend" ).textContent = errorMsg;
            $( element.querySelector( ".personaBreakdown" ) ).addClass( "hidden" );
            element.setAttribute( ATTR_IS_VALID, "false" );
            return;
        }

        element.setAttribute( ATTR_IS_VALID, "true" );

        if ( element.getAttribute( ATTR_ALLOW_SELECTION ) === "true" ) {
            element.querySelector( ".personaLegend" ).textContent = `( L${persona.level} ${persona.arcana} )`;
        }
        else {
            element.querySelector( ".personaLegend" ).textContent = `${persona.name} ( L${persona.level} ${persona.arcana} )`;
        }

        // Set resistances:
        element.getElementsByClassName( "phys" )[0].textContent = p4gData.getResValText( persona.physical );
        element.getElementsByClassName( "fire" )[0].textContent = p4gData.getResValText( persona.fire );
        element.getElementsByClassName( "ice" )[0].textContent = p4gData.getResValText( persona.ice );
        element.getElementsByClassName( "elec" )[0].textContent = p4gData.getResValText( persona.electricity );
        element.getElementsByClassName( "wind" )[0].textContent = p4gData.getResValText( persona.wind );
        element.getElementsByClassName( "light" )[0].textContent = p4gData.getResValText( persona.light );
        element.getElementsByClassName( "dark" )[0].textContent = p4gData.getResValText( persona.dark );

        // Set skills:
        const SKILLS_PER_ROW = 2;
        const skillNameAttr = "data-skillName";
        let skillNum = 0;
        let skillBody = "";
        const learnedSkills = persona.learnedSkills.sort( ( s1, s2 ) => s1.levelLearned - s2.levelLearned );
        for ( const skill of persona.defaultSkills.concat( learnedSkills ) ) {
            if ( skillNum % SKILLS_PER_ROW === 0 ) {
                skillBody += "<tr>";    // It's the start of a new row
            }
            const levelLearned = ( skill.levelLearned > 0 ) ? ` (L${skill.levelLearned})` : "";
            skillBody += `<td><button ${skillNameAttr}="${skill.skillName}">${skill.skillName}${levelLearned}</button></td>`;
            if ( skillNum % SKILLS_PER_ROW === ( SKILLS_PER_ROW - 1 ) ) {
                skillBody += "</tr>";   // It's the end of the row
            }
            skillNum++;
        }

        element.getElementsByClassName( "skills" )[0].innerHTML = skillBody;
        $( element ).find( ".skills button" ).click( event => showSkillPopup( event.target.getAttribute( skillNameAttr ) ) );
    }

    function showSkillPopup( skillName ) {
        const popup = document.createElement( "div" );

        const skill = p4gData.getAllSkills().find( s => s.name === skillName );
        let popupContent = "<table>";
        popupContent += `<tr><td colspan="2">${skill.description}</td></tr>`;
        addSkillPropertyIfExists( "acquisition" );
        addSkillPropertyIfExists( "power" );
        addSkillPropertyIfExists( "critical" );
        addSkillPropertyIfExists( "accuracy" );
        addSkillPropertyIfExists( "cost" );
        popupContent += "</table>";
        popup.innerHTML = popupContent;

        $( popup ).dialog(
            {
                dialogClass: "popup",
                modal: true,
                resizable: false,
                title: skillName
            } );
        $( popup ).click( () => $( popup ).dialog( "destroy" ) ); // rather than close

        function addSkillPropertyIfExists( propName ) {
            if ( skill[propName] ) {
                const displayedName = _.capitalize( propName );
                popupContent += `<tr><td>${displayedName}:</td><td>${skill[propName]}</td></tr>`;
            }
        }
    }

    /**
     *
     * @param infoWrapper A wrapper that will have a persona info view added to it
     * @param onChange An optional callback to invoke on selection change (apart from updating the info view);
     *          the selected persona (post-lookup) is passed to it as a parameter
     * @param includeWorld A boolean indicating whether the list should include the World arcana(i.e. Izanagi-ni-Okami)
     */
    function populatePersonaList( infoWrapper, onChange, includeWorld ) {
        const personaDetails = parent.guiUtils.initPersonaInfoView( infoWrapper, true );
        const personaList = infoWrapper.querySelector( ".personaSelect" );

        personaList.appendChild( document.createElement( "option" ) );  // Blank selection option
        // Populate the drop-down with all the persona names:
        const personas = p4gData.getAllPersonas( includeWorld );
        for ( const persona of personas ) {
            const opt = document.createElement( "option" );
            opt.textContent = persona.name;
            personaList.appendChild( opt );
        }

        // Add the event listener:
        //noinspection Eslint
        personaList.addEventListener( "change", event => {
            const personaName = event.target.value;
            const selectedPersona = personaName ? p4gData.getPersonaByName( personaName ) : null;
            guiUtils.displayPersona( personaDetails, selectedPersona ); // Update the details for the latest selection
            if ( onChange ) {
                onChange( selectedPersona );
            }
        } );
        personaList.addEventListener( "click", event => event.stopPropagation() );

        $( personaList ).removeClass( "hidden" );
    }

    return {
        initPersonaInfoView,
        displayPersona,
        populatePersonaList
    };
}();

$( () => document.getElementById( "fusionMenuButton" ).click() );
