"use strict";
/* global window */

const $ = parent.$;
const p4gData = parent.p4gData;
const guiUtils = parent.guiUtils;

const ROWS_PER_PAGE = 10;
let currentRecipes = [];
let autoCompleteNames = false;

const infoWrapper = document.getElementById( "personaInfo" );
guiUtils.populatePersonaList( infoWrapper, trySplitting, true );
document.getElementById( "filterText" ).addEventListener( "input", processFilterEdit );
document.getElementById( "clearFilters" ).addEventListener( "click", clearFilters );
document.getElementById( "filtersWrapper" ).addEventListener( "click", () =>
    document.getElementById( "filterText" ).focus() );
$( document.getElementById( "autoCompSwitch" ) ).click( function() {
    $( this ).toggleClass( "on" );
    autoCompleteNames = $( this ).hasClass( "on" ); // If I chain this after toggleClass, the value is always wrong??
    $( this ).find( ".switchText" ).text( autoCompleteNames ? "on" : "off" );
    if ( autoCompleteNames ) {
        processFilterEdit();
    }
} );
$( () => {
    document.getElementById( "autoCompSwitch" ).dispatchEvent( new Event( "click" ) ); // init the switch to "off" ;)
    displayRecipes();
} );

function trySplitting( persona ) {
    currentRecipes = [];
    displayRecipes();

    if ( !persona ) {
        return;
    }

    window.setTimeout( () => {
        // First, see if it's a special fusion recipe:
        const specialRecipe = p4gData.getSpecialFusionRecipe( persona );
        if ( specialRecipe ) {
            displaySpecialRecipe( specialRecipe );   // No point in continuing to look, since there won't be any other recipes. ;)
            return;
        }

        // If it's not, then check all the double/triple fusion recipes:
        const doubleFusionRecipes = p4gData.getDoubleFusionRecipes( persona );
        const tripleFusionRecipes = p4gData.getTripleFusionRecipes( persona );
        currentRecipes = doubleFusionRecipes.concat( tripleFusionRecipes );
        displayRecipes();
    }, 50 );
}

function filterRecipes( recipes ) {
    for ( const filter of getFilters() ) {
        recipes = recipes.filter( recipe => {
            const matches = recipe.some(
                persona => ( filter.type === "persona" )
                    ? persona.name === filter.value : persona.arcana === filter.value );
            return filter.keep ? matches : !matches;
        } );
    }
    return recipes;
}

function displayRecipes() {
    enableFilters( currentRecipes.length > 0 );

    const table = document.getElementById( "recipes" );
    const pageNavSel = $( document.getElementById( "pageNav" ) );
    table.innerHTML = "";
    pageNavSel.hide();

    const rowsPerPage = ROWS_PER_PAGE;
    let recipes = filterRecipes( currentRecipes );

    document.getElementById( "recipesLegend" ).textContent = `Recipes (${recipes.length})`;

    const prevPageSel = pageNavSel.find( "#prevPage" );
    const nextPageSel = pageNavSel.find( "#nextPage" );
    const header = "<thead><tr><th colspan='3'>Ingredients</th></tr></thead>";
    table.insertAdjacentHTML( "beforeend", header );

    if ( rowsPerPage < recipes.length ) {
        // Need to paginate!
        pageNavSel.show();
        prevPageSel.click( () => updateView( -rowsPerPage ) );
        nextPageSel.click( () => updateView( rowsPerPage ) );
    }

    let totalPages = Math.ceil( recipes.length / rowsPerPage );
    let startIndex = 0;
    updateView( 0 );

    function updateView( indexAdjustment ) {
        startIndex += indexAdjustment;
        if ( startIndex <= 0 ) {
            startIndex = 0;
        }
        let endIndex = startIndex + rowsPerPage;
        if ( endIndex >= recipes.length ) {
            endIndex = recipes.length;
        }

        const pageNum = Math.ceil( ( 1 + startIndex ) / rowsPerPage );

        document.getElementById( "pageInfo" ).textContent = `Page ${pageNum} of ${totalPages}`;

        prevPageSel.prop( "disabled", startIndex === 0 );
        nextPageSel.prop( "disabled", endIndex === recipes.length );

        $( table ).find( "tbody" ).remove(); // Why didn't .remove( "tbody" ) work?
        let body = "<tbody>";
        for ( let i = startIndex; i < endIndex; i++ ) {
            const recipe = recipes[i];
            if ( recipe.length === 2 ) {
                body += `<tr>${getCellText( recipe[0] )}${getCellText( recipe[1] )}</tr>`;
            }
            else {
                body += `<tr>${getCellText( recipe[0] )}${getCellText( recipe[1] )}${getCellText( recipe[2] )}</tr>`;
            }
        }
        body += "</tbody>";
        table.insertAdjacentHTML( "beforeend", body );
    }
}

function getCellText( persona ) {
    return `<td>${persona.name}<br/><span class="personaBasicDetails">( L${persona.level} ${persona.arcana} )</span></td>`;
}

function displaySpecialRecipe( recipe ) {
    enableFilters( false );

    const table = document.getElementById( "recipes" );
    table.innerHTML = "";

    const header = "<thead><tr><th>Special Fusion - Ingredients</th></tr></thead>";
    table.insertAdjacentHTML( "beforeend", header );

    let body = "<tbody>";

    recipe.forEach( persona => body += `<tr>${getCellText( persona )}</tr>` );

    body += "</tbody>";
    table.insertAdjacentHTML( "beforeend", body );

    document.getElementById( "recipesLegend" ).textContent = `Recipes (1)`;
}

class Match {
    /**
     * @param name The name of the persona or arcana
     * @param type The type, i.e. "persona" or "arcana"
     */
    constructor( name, type ) {
        this.name = name;
        this.type = type;
    }
}

function enableFilters( enable ) {
    // $( document.querySelectorAll( "#filtersSection *" ) ).toggleClass( "hidden", !enable );
    const filterElems = $( document.querySelectorAll( "#filtersSection *" ) );
    filterElems.prop( "disabled", !enable );
    filterElems.toggleClass( "disabled", !enable );
}

const arcanas = p4gData.getAllArcanas();
const personaNames = p4gData.getAllPersonas( false ).map( p => p.name ); // No point in filtering on Izanag-no-Okami, right? :P

function processFilterEdit() {
    const filtersBox = document.getElementById( "filters" );

    let typedText = document.getElementById( "filterText" ).value;
    let keep = true;
    if ( typedText.charAt( 0 ) === "-" || typedText.charAt( 0 ) === "." ) {
        typedText = typedText.substr( 1 );
        keep = false;
    }

    let tryForceMatchNow = false;
    if ( ( typedText.charAt( typedText.length - 1 ) === " " ) ) {
        // Might be a space in the name, or might be trying to indicate that they've finished,
        // so let's remove the space and see if it matches a complete name. We can do this since
        // there aren't any names with spaces in them where the first part is a name in its own right.
        // (I've checked! E.g. We have "Ara Mitama", but nothing called "Ara". ;))
        // Obviously pressing space is more convenient than, say, comma or something, even on phones. :)
        typedText = typedText.slice( 0, -1 );
        tryForceMatchNow = true;
    }

    const arcanaMatches = findPotentialMatches( arcanas, typedText );
    const personaMatches = findPotentialMatches( personaNames, typedText );

    if ( !arcanaMatches && !personaMatches ) {
        return; // Not even any potential matches!
    }

    const totalPotentialMatches =
        ( arcanaMatches ? arcanaMatches.length : 0 ) + ( personaMatches ? personaMatches.length : 0 );

    if ( !autoCompleteNames ) {
        // If autocomplete is OFF, we want to wait until we have a complete match (of a whole name)
        // AND (a) it's the only possible match, or (b) we're trying to force a match right now.
        // (For example, "Anubis" will trigger after the "s", since it's a complete match and there
        // are no other outcomes from typing more characters, whereas to get "Titan", a match must
        // be forced, since (after the "n") "Titania" is also possible.)
        const match = findCompleteMatch();
        if ( !match ) {
            return;
        }
        if ( tryForceMatchNow || totalPotentialMatches === 1 ) {
            createFilter( match.name, match.type );
        }
    }
    else {
        // If autocomplete is ON, we will finish when we only one possible match (even if it's partial),
        // UNLESS we're trying for a match right now, in which case we'll try to match a name right away.
        // (For example, "Anubis" will trigger after typing "Anu", since nothing else starts with "Anu",
        // but "Titan" will not trigger at all unless forced, since "Titania" obviously starts with "Titan". ;))
        if ( totalPotentialMatches === 1 ) {
            if ( arcanaMatches ) {
                createFilter( arcanaMatches[0], "arcana" );
            }
            else {
                createFilter( personaMatches[0], "persona" );
            }
        }
        else if ( tryForceMatchNow ) {
            const match = findCompleteMatch();
            if ( match ) {
                createFilter( match.name, match.type );
            }
        }
    }

    function findCompleteMatch() {
        const arcanaMatch = arcanaMatches && arcanaMatches.find( v => v.toUpperCase() === typedText.toUpperCase() );
        const personaMatch = personaMatches && personaMatches.find( v => v.toUpperCase() === typedText.toUpperCase() );
        if ( arcanaMatch && !personaMatch ) {
            return new Match( arcanaMatch, "arcana" );
        }
        if ( personaMatch && !arcanaMatch ) {
            return new Match( personaMatch, "persona" );
        }
        return null; // If there isn't exactly one match
    }

    function findPotentialMatches( array, text ) {
        const potentialMatches = array.filter( v => v.toUpperCase().startsWith( text.toUpperCase() ) );
        return ( potentialMatches.length > 0 ) ? potentialMatches : null;
    }

    function createFilter( name, type ) {
        const filterNode = document.createElement( "button" );
        filterNode.textContent = name;
        filterNode.className = keep ? "filter-include" : "filter-exclude";
        filterNode.setAttribute( "data-filterType", type );
        filterNode.setAttribute( "data-keep", keep ? "true" : "false" );
        filterNode.setAttribute( "contenteditable", "false" );
        filterNode.addEventListener( "click", () => {
            filtersBox.removeChild( filterNode );
            displayRecipes();
        } );
        filtersBox.appendChild( filterNode );
        document.getElementById( "filterText" ).value = "";

        // // Move caret to end of editable div (snippet from SO):
        // let range = document.createRange();//Create a range (a range is a like the selection but invisible)
        // range.selectNodeContents( filtersBox );//Select the entire contents of the element with the range
        // range.collapse( false );//collapse the range to the end point. false means collapse to end rather than the start
        // let selection = window.getSelection();//get the selection object (allows you to change selection)
        // selection.removeAllRanges();//remove any selections already made
        // selection.addRange( range );//make the range you have just created the visible selection

        displayRecipes();
    }
}

class RecipeFilter {
    constructor( value, type, keep ) {
        this.value = value;
        this.type = type;
        this.keep = keep;
    }
}

function *getFilters() {
    const filters = Array.from( document.getElementById( "filters" ).children )
                         .filter( e => e instanceof HTMLButtonElement );
    for ( const filter of filters ) {
        yield new RecipeFilter(
            filter.textContent,
            filter.getAttribute( "data-filterType" ),
            filter.getAttribute( "data-keep" ) === "true" );
    }
}

function clearFilters() {
    document.getElementById( "filters" ).innerHTML = "";
    document.getElementById( "filterText" ).value = "";
    displayRecipes();
}
