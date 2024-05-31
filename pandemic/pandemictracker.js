createStartingDeck();

    //handles card selection
    function select(id){
        //get the selected card and all other cards 
        let card = document.getElementById(id);
        let cardholder = card.getElementsByClassName("cardholder");
        let cards = document.getElementsByClassName("cardholder")
        
        //remove the selected class from all cards, then add to the selected card
        for ( i=0; i < cards.length; i++ ){
            cards[i].classList.remove("selected");
        }
        cardholder[0].classList.add("selected");
        
    }

    //card constructor functions:
        //card template
    function cardTemplate(){
        let template = `<a id="{id}" value="{value}" onclick="select(this.id)"><div class="cardholder {selected}"><div class="{cardstyles}"></div><div class="cardtext" tags="{cardtags}">{cardtext}</div></div></a>`
        return template;
    }
        //card constructor for creating the starting deck
    function cardConstructor(){
        let template = cardTemplate();
        let card = '';
        let cityID = '';
        let cardstyle = '';
        let deck = '';
        let hollowmen = '';
        let removed = '';

        //loop through cities array and create cards
        for ( i=0; i<cities.length; i++ ){
                for ( j=0; j<cities[i].count; j++ ){
                    //create and replace ids - first is the anchor id, second is the value
                    cityID = 'card-' + i + '-' + j;
                    card = buildCard(i, cityID, template)
                    //add card to deck
                    if ( !cities[i].hollowmen ){
                        deck += card;
                    } else {
                        hollowmen += card;
                    }
                }
                for ( k=0; k<cities[i].inoculated; k++ ){
                    cityID = "card-i-" + i + '-' + j;
                    card = buildCard(i, cityID, template);
                    removed += card;
                }
        }
        
        return [deck, hollowmen, removed];
    }

    //build individual card
    function buildCard(i, cityID, template){
        let card = template.replace('{id}', cityID);
        card = card.replace('{value}', i);

        //if first card in list, highlight as selected
        if ( i === 0 && j === 0 ){
            card = card.replace('{selected}', 'selected');
        } else {
            card = card.replace('{selected}', '');
        }
        //create card styles
        if ( cities[i].forsaken ){
            cardstyle = 'card ' + cities[i].color + ' inf forsaken';
        } else if ( cities[i].infected ){
            cardstyle = 'card ' + cities[i].color + ' inf';
        } else {
            cardstyle = 'card ' + cities[i].color;
        }
        card = card.replace('{cardstyles}', cardstyle);
        //add city name
        card = card.replace('{cardtext}', cities[i].city);
        //add card tags
        let tags = '';
        if ( cities[i].forsaken ){
            tags = cities[i].color + "|infected|forsaken";
        } else if ( cities[i].infected ){
            tags = cities[i].color + "|infected";
        } else {
            tags = cities[i].color;
        }


        card = card.replace('{cardtags}', tags);

        return card;
    }
        //card constructor for moving cards
    function cardConstructorFromArray(cardArray){
        let template = cardTemplate();
        let card = '';
        let deck = '';

        //create the new html cards from the card array
        for ( i=0; i<cardArray.length; i++ ){
            card = template.replace('{id}', cardArray[i].id);
            //if first card in list, highlight as selected
            if ( i === 0 && j === 0 ){
                    card = card.replace('{selected}', 'selected');
                } else {
                    card = card.replace('{selected}', '');
                }
            card = card.replace('{value}', cardArray[i].value);
            card = card.replace('{cardstyles}', cardArray[i].class);
            card = card.replace('{cardtext}', cardArray[i].city);
            card = card.replace('{cardtags}', cardArray[i].tags);

            deck += card;
        }

        return deck;
    }
        

    //div template for the cards moving back to the starting deck
    function divTemplate(){
        let template = `<div class="knownholder" id="knowncardholder{knownid}"><div class="knownheader">Known Cards - Epidemic {epidemicnum}<div class="cardcount" id="cardcount{epidemicnum}"></div></div><div id="knowncards{knownid}" class="knowncards">{cards}</div></div>`;
        return template;
    }

    //div template for stats
    function divStatsTemplate(textValue, statType){
        let template = `<div style="width: 200px; height: 65px;">
                        <div class="card ` + statType + `"></div>
                        <div style="margin-left: 40px; font-size: 10px; line-height: 12px;">` + textValue + `</div>
                    </div>`

        return template;
    }
    
    //add the cards to the starting deck
    function createStartingDeck(){
        let deck = cardConstructor();
        let startingDeck = document.getElementById("startingdeck");
        let discardDeck = document.getElementById("discarddeck");
        let removedDeck = document.getElementById("removeddeck");

        startingDeck.innerHTML = deck[0];
        discardDeck.innerHTML = deck[1];
        removedDeck.innerHTML = deck[2]

        countCityCards();
        getStats();
        //searchCardsListener();
    }

    //move card from it's current location to the destination specified
    function moveCardTo(location){

        try {

        let selectedCard = document.getElementsByClassName("selected");
        let parentElementDivID = selectedCard[0].parentElement.parentElement.id;
        selectedCard = selectedCard[0].parentElement;
        let destination = document.getElementById(location);
        let removedCardDeck = document.getElementById("removeddeck");


        //check if the card is coming from starting deck or epidemic reshuffle
        if ( parentElementDivID != ( 'startingdeck' && 'discarddeck' && 'removeddeck' ) ){
            //if the card is from epidemic reshuffle, get the parent info then move the card
            let knownCardsHolder = document.getElementById(selectedCard.id).parentElement.parentElement;
            let knownCardsParentDivID = document.getElementById(selectedCard.id).parentElement.id;

            //move the card 
            let forsakenCheck = selectedCard.childNodes[0].childNodes[0].attributes.class.value;
            if ( forsakenCheck.includes("forsaken") ){
                destination = removedCardDeck;
                location = "removeddeck";
            }
            destination.appendChild(selectedCard);

            //check if the epidemic holder is empty, if so, move to trash (not deleted so it can be used for tracking)
            let emptyCardHolderCheck = document.getElementById(knownCardsParentDivID)
            if ( emptyCardHolderCheck.innerHTML == "" ){
                        let trashcan = document.getElementById("trashcan");
                        trashcan.appendChild(knownCardsHolder);
                }
        } else {
            //move the card 
            destination.appendChild(selectedCard);
        }

        //call to sort the destination deck
        updateDeck(location);
        
        
        //call to count the cards in each deck
        countCityCards();

        //clear search
        clearSearch();

    } catch {}

    }


    //gets the cards in the discard pile and creates a sorted array
    function createSortedCardArray(location,deck){
        let sourceDeck = document.getElementById(location);
        let cardCount = deck.childNodes.length;
        let cardArray = [];
  
        for ( i=0; i<cardCount; i++ ){
            let card = deck.childNodes[i];
                cardArray[i] = {
                id: card.id,
                value: card.attributes.value.value,
                class: card.childNodes[0].childNodes[0].attributes.class.value,
                city: card.childNodes[0].childNodes[1].innerHTML,
                tags: card.childNodes[0].childNodes[1].attributes.tags.value
                }
        }

        //sort the results
        let sortedCards = cardArray.sort( function (a,b){
              return a.value - b.value
        })

        let newDeck = cardConstructorFromArray(sortedCards)

        return newDeck;
    }


    function updateDeck(deckName){
        let deck = document.getElementById(deckName);
        let newDeck = createSortedCardArray(deckName, deck);

        deck.innerHTML = newDeck;
    }

    //epidemic logic to move cards from discard back to the top of the starting deck
    function epidemic(){
        //create the html cards from the discard
        let discardDeck = document.getElementById("discarddeck")
        let deck = document.getElementById("discarddeck").innerHTML;
        //check if the discard deck is empty
            if ( deck === "" ){
                return;
            } else if (!confirm("Confirm Epidemic?")){
            return;
        } else {
        let startingDeck = document.getElementById("startingdeckholder");
        let currentStartingDeck = startingDeck.innerHTML;   
        let knownTemplate = divTemplate();
        let known = '';
        let knownID = document.getElementsByClassName("knownholder").length + 1;

        //create the known cards deck and add to the starting deck, then clear the discard deck
        known = knownTemplate.replace('{cards}', deck);
        known = known.replace(/{knownid}/g, knownID);
        known = known.replace(/{epidemicnum}/g, knownID);
        startingDeck.innerHTML = known + currentStartingDeck;

        discardDeck.innerHTML = "";
        }

        //update the card counts
        countCityCards();

        //clear search
        clearSearch();
    }

    //card count functions
    function countCityCards(){
        //get the current decks
        let startingDeck = document.getElementById("startingdeck");
        let discardDeck = document.getElementById("discarddeck");
        let removedDeck = document.getElementById("removeddeck");
        let epidemicDecks = document.getElementsByClassName("knowncards");

        //get the counts divs
        let startingDeckCountDiv = document.getElementById("startingdeckcount");
        let discardDeckCountDiv = document.getElementById("discarddeckcount");
        let removedDeckCountDiv = document.getElementById("removeddeckcount");
        let trashcanCardCount = document.getElementById("trashcan").childNodes.length;


        //clear the starting card counter
        startingDeckCountDiv.innerHTML = "";
        let totalCount = 0;

        //add the counts to the epidemic groups
        for ( i=1; i<=epidemicDecks.length; i++ ){
            let epidemicDeck = document.getElementById("knowncards" + i);
            let count = epidemicDeck.childNodes.length;
            document.getElementById("cardcount" + i).innerHTML = "card count: " + count;
            if ( count > 0 ){
                startingDeckCountDiv.innerHTML += "Epidemic Deck " + i + " count: " + count + "</br>";
            }
            totalCount += count;
        }



        //add the starting deck count
        if ( epidemicDecks.length > 0 ){
            let startingCount = startingDeck.childNodes.length;
            startingDeckCountDiv.innerHTML += "Unknown card count: " + startingCount;
            startingDeckCountDiv.innerHTML += "</br>Total cards in Starting Deck: " + ( startingCount + totalCount );
        } else {
            startingDeckCountDiv.innerHTML = "Unknown card count: " + startingDeck.childNodes.length;
        }

        //add the discard deck count
        discardDeckCountDiv.innerHTML = "card count: " + discardDeck.childNodes.length;

        //add the removed deck count
        removedDeckCountDiv.innerHTML = "card count: " + removedDeck.childNodes.length;


    }


    //save and load functions
    function saveDecks(){
        let startingDeck = document.getElementById("startingdeckholder").innerHTML;
        let discardDeck = document.getElementById("discarddeck").innerHTML;
        let removedDeck = document.getElementById("removeddeck").innerHTML;

        let saveAndLoadDeck = document.getElementById("saveandloaddeck");

        //placeholder just holds the array of saved values
        let placeholder = [JSON.stringify(startingDeck), JSON.stringify(discardDeck), JSON.stringify(removedDeck)]

        //add the saved values to the save deck
        saveAndLoadDeck.value = placeholder;

        //auto selects when you click the deck
        saveAndLoadDeck.focus();
        saveAndLoadDeck.select();
    }

    function loadDeck(){
        let startingDeck = document.getElementById("startingdeckholder");
        let discardDeck = document.getElementById("discarddeck");
        let removedDeck = document.getElementById("removeddeck");

        let saveAndLoadDeck = document.getElementById("saveandloaddeck").value;
        let loadValue = saveAndLoadDeck.split(",");

        //load the decks with the input
        startingDeck.innerHTML = JSON.parse(loadValue[0]);
        discardDeck.innerHTML = JSON.parse(loadValue[1]);
        removedDeck.innerHTML = JSON.parse(loadValue[2]);

        //update the counts and city card stats
        countCityCards();
        getStats();

    }


    //stats
    function getStats(){
        let totalcount = 0;
        let colorGraph = ["blue","yellow","black","red"];
        let resultSet = [];

        //loop through the colors and then create the stats for each color 
        for ( i=0; i<colorGraph.length; i++ ){
            let connectedCount = 0;
                let infectedCount = 0;
                let forsakenCount = 0;
            for ( j=0; j<cities.length; j++ ){
                
                if ( cities[j].color === colorGraph[i] ){
                    if ( cities[j].forsaken ){
                        forsakenCount += 1;
                    } else if ( cities[j].infected ){
                        infectedCount += 1;
                        totalcount += 1;
                    } else {
                        connectedCount += 1;
                        totalcount += 1;
                    }
                }
                let connectedCity = "Connected Cities Count: " + connectedCount + "</br>Infected City Count: " + infectedCount + "</br>Forsaken City Count: " + forsakenCount + "</br><div class=\"linebr\"></div>Total Connected Cities: " + ( connectedCount + infectedCount );
                resultSet[i] = divStatsTemplate(connectedCity,("card " + colorGraph[i]));
            }
        }

        //get the placment for the stats
        let statsDiv = document.getElementById("stats");
        let totalStatsDiv = document.getElementById("totalstats");

        //add the stats to the html
        statsDiv.innerHTML = resultSet[0] + resultSet[1] + resultSet[2] + resultSet[3];
        totalStatsDiv.innerHTML = "Total Cities Connected: " + totalcount;

    }


    //search function
    function searchCards(){
        let deck = document.getElementById("startingdeckholder");
        let input = document.getElementById("startingDeckSearch");
        let filter = input.value.toUpperCase();
        let cardArray = deck.getElementsByTagName('a')

        //loop through the card array and find cards matching the search - hide the ones which do not match
        for ( i=0; i<cardArray.length; i++ ){
            let card = cardArray[i].getElementsByClassName("cardtext")[0].innerHTML.toUpperCase();
            let cardtags = cardArray[i].getElementsByClassName("cardtext")[0].attributes.tags.value;
            if ( cardtags.toUpperCase().indexOf(filter) > -1 || card.toUpperCase().indexOf(filter) > -1 ){
                cardArray[i].style.display = "";
            } else {
                cardArray[i].style.display = "none";
            }
                
        }

    }

    function clearSearch(){
        document.getElementById("startingDeckSearch").value = "";
        searchCards();
    }
