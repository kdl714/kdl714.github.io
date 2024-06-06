//filter functions
function searchSeason(input, searchval){
    let result = input.filter(a => a.season == searchval);
    return result;
}

function searchWeek(input, searchval){
    let result = input.filter(a => a.week == searchval);
    return result;
}

function searchLocation(input, searchval){
    let result = input.filter(a => a.location == searchval);
    return result;
}

function searchOpponent(input, searchval){
    let result = input.filter(a => a.opponent == searchval);
    return result;
}

function searchOTFT(input, searchval){
    let result = input.filter(a => a.time == searchval);
    return result;
}

function searchDay(input, searchval){
    let result = input.filter(a => a.day == searchval);
    return result;
}

function searchMinPF(input, searchval){
    let result = input.filter(a => a.pf >= searchval);
    return result;
}

function searchMinPA(input, searchval){
    let result = input.filter(a => a.pf >= searchval);
    return result;
}

function searchMinPointDif(input, searchval){
    let result = input.filter(a => (a.pf-a.pa) >= searchval);
    return result;
}

function searchOutcome(input, searchval){
    if ( searchval === "W" ){
        let result = input.filter(a => a.pf > a.pa );
        return result;
    } else if ( searchval === "L" ){
        let result = input.filter(a => a.pf < a.pa );
        return result;
    } else if ( searchval === "T" ){
        let result = input.filter(a => a.pf == a.pa );
        result = result.filter(a => a.opponent != "Bye");
        result = result.filter(a => a.pf != "" );
        return result;
    }
    
}

function byeWeekCount(input){
    let searchval = "Bye";
    let result = input.filter(a => a.opponent == searchval);
    return result.length;
}

function winLossPercent(input){
    let wins = 0;
    let ties = 0;
    let losses = 0;
    let byes = byeWeekCount(input);

    if ( searchOutcome(input, "W") ){
        wins = searchOutcome(input, "W").length;
    } 
    
    if ( searchOutcome(input, "L") ){
        losses = searchOutcome(input, "L").length;
    } 
    
    if ( searchOutcome(input, "T") ){
        ties = searchOutcome(input, "T").length;
    } 

    let winLoss = ( wins + ( ties / 2 ) ) / ( input.length - byes );
    winLoss = (winLoss * 100).toFixed(2) + '%';

    return winLoss;
}

function searchCoach(input, searchval){
    let result = input.filter(a => a.hc == searchval);
    return result;
}

function searchConference(input, searchval){
    let result = input.filter(a => a.conference == searchval);
    return result;
}

function searchRegularSeason(input){
    let result = input.filter(a => a.week != "Wildcard" && a.week != "Divisional" && a.week != "Conference" && a.week != "Super Bowl");
    return result;
}

function searchPlayoffs(input){
    let result = input.filter(a => a.week == "Wildcard" || a.week == "Divisional" || a.week == "Conference" || a.week == "Super Bowl");
    return result;
}


//function to create the sorted results 
function createSortedResults(sourceData){

    let htmlDestination = document.getElementById("resultsBySeason");
    let htmlTableHeader = `<table><tr><th>Season</th><th>Week</th><th>Opponent</th><th>Location</th><th>Score</th><th>Result</th><th>FT/OT</th><th>Date</th><th>Day</th><th>Time</th></tr>`;
    let htmlPlaceholder = ``;
    let gameLocation = "";
    let score = "";
    let gameResult = "";
    let time = "";
    let gameDate = "";
    let gameDay = "";
    let gameTime = "";
    let resultCSS = "";
    let weekCount = 0;
    let currentSeason = 0;

    for ( i=0; i<sourceData.length; i++ ){
        currentSeason = sourceData[i].season;

        //check if the week is a Bye and reset the values
        if ( sourceData[i].opponent == "Bye" ){
            gameLocation = "";
            score = "";
            gameResult = "";
            time = "";
            gameDate = "";
            gameDay = "";
            gameTime = "";
            resultCSS = "Bye";
        }
        else {
            //give a home/away location
            if ( sourceData[i].location == "H" ){
                gameLocation = "Home";
            } else { 
                gameLocation = "Away";
            } 
            //set the score and win/loss/tie
            score = sourceData[i].pf + " - " + sourceData[i].pa;
            if ( sourceData[i].pf == "" && sourceData[i].pa == "" ){
                gameResult = "TBD";
                resultCSS = "Bye";
            } else if ( sourceData[i].pf == sourceData[i].pa ){
                gameResult = "Tie";
                resultCSS = "Tie";
            } else if ( sourceData[i].pf > sourceData[i].pa ){
                gameResult = "Win";
                resultCSS = "Win";
            } else {
                gameResult = "Loss";
                resultCSS = "Loss";
            }
            //set the date & time
            time = sourceData[i].time;
            gameDate = sourceData[i].date;
            gameDay = convertDate(sourceData[i].date);
            gameTime = sourceData[i].gametime;
        }

        if ( currentSeason == sourceData[i].season ){
            weekCount++;
        } else {
            weekCount = 0;
        }
        
        htmlPlaceholder += 
            `<tr class="` + resultCSS + `" data-season="` + sourceData[i].season + `"><td>` + sourceData[i].season + `</td><td>` + sourceData[i].week + `</td><td>` 
            + sourceData[i].opponent + `</td><td>` + gameLocation + `</td><td>`
            + score + `</td><td>` + gameResult + `</td><td>` + time + `</td><td>` 
            + gameDate + `</td><td>` + gameDay + `</td><td>` + gameTime + `</td></tr>`;
    }

    htmlDestination.innerHTML = htmlTableHeader + createHeaderRow() + htmlPlaceholder + `</table>`;

    getStats(sourceData);

}

//convert the date to a day
function convertDate(d){
    const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    let day = "";
    
    if (d){
        let split = d.split('/');
        let newdt = new Date(split[2], split[0] - 1, split[1]);
        day = weekday[newdt.getDay()];
    }
    
    return day;
}

//creates the header Search filters
function createHeaderRow(){

    let htmlPlaceholder = ``;

    htmlPlaceholder = `<tr>` + createSeasonsFilter() + createWeeksFilter() + createOpponentsFilter() + createLocationsFilter() 
        + `<td></td>` + createResultFilter() + createOTFTFilter() + `<td></td>` + createDaysFilter() + `</tr>`;

    return htmlPlaceholder;


    
    

}



//functions to create the filters
function createSeasonsFilter(){

    let htmlPlaceholder = ``;
    let seasons = [];
    let options = ``;
   
    for ( i=0; i<results.length; i++ ){
        if ( seasons.includes(results[i].season)  ){
            
        } else { 
            seasons.push(results[i].season)
            options += `<option value="` + results[i].season + `">` + results[i].season + `</option>`;
        }
    }

    htmlPlaceholder = `<th><select id="seasonFilter" onchange="searchFilters()"><option value="">All</option>` + options + `</select></th>`;

    return htmlPlaceholder;

}

function createWeeksFilter(){

    let htmlPlaceholder = ``;
    let weeks = [];
    let options = ``;

    for ( i=0; i<results.length; i++ ){
        if ( weeks.includes(results[i].week)  ){
            
        } else { 
            weeks.push(results[i].week)
            options += `<option value="` + results[i].week + `">` + results[i].week + `</option>`;
        }
    }

    htmlPlaceholder = `<th><select id="weekFilter" onchange="searchFilters()"><option value="">All</option>` + options + `</select></th>`;

    return htmlPlaceholder;

}

function createOpponentsFilter(){

    let htmlPlaceholder = ``;
    let opponents = [];
    let options = ``;

    for ( i=0; i<divisions.length; i++ ){
        options += `<optgroup label="` + divisions[i].conference + " - " + divisions[i].division + `">`;
            for ( j=0; j<divisions[i].teams.length; j++ ){
                options += `<option value="` + divisions[i].teams[j] + `">` + divisions[i].teams[j] + `</option>`;
            }
        options += `</optgroup>`;
    }

    htmlPlaceholder = `<th><select id="opponentFilter" onchange="searchFilters()"><option value="">All</option><option value="Bye">Bye Weeks</option>` + options + `</select></th>`;

    return htmlPlaceholder;

}

function createLocationsFilter(){

    let htmlPlaceholder = ``;

    htmlPlaceholder = `<th><select id="locationsFilter" onchange="searchFilters()"><option value="">All</option><option value="H">Home</option><option value="A">Away</option></select></th>`;

    return htmlPlaceholder;

}

function createResultFilter(){

    let htmlPlaceholder = ``;

    htmlPlaceholder = `<th><select id="resultFilter" onchange="searchFilters()"><option value="">All</option><option value="W">Win</option><option value="L">Loss</option><option value="T">Tie</option></select></th>`;

    return htmlPlaceholder;

}

function createOTFTFilter(){

    let htmlPlaceholder = ``;

    htmlPlaceholder = `<th><select id="otftFilter" onchange="searchFilters()"><option value="">All</option><option value="FT">FT</option><option value="OT">OT</option></select></th>`;

    return htmlPlaceholder;

}

function createDaysFilter(){

    let htmlPlaceholder = ``;
    let days = [];
    let options = ``;

    for ( i=0; i<results.length; i++ ){
        let day = convertDate(results[i].date);
        if ( days.includes(day) || results[i].opponent == "Bye"  ){
            
        } else { 
            days.push(day)
            options += `<option value="` + day + `">` + day + `</option>`;
        }
    }

    htmlPlaceholder = `<th><label><select id="dayFilter" onchange="searchFilters()"><option value="">All</option>` + options + `</select></label></th>`;

    return htmlPlaceholder;

}

function createHCFilter(){
    let htmlPlaceholder = `<button id="coach_Marv" value="Marvin Lewis" onclick="setSelectedButtonFilters('coach',this.id)">Marvin</button><button id="coach_ZT" value="Zac Taylor" onclick="setSelectedButtonFilters('coach',this.id)">ZT</button><button id="coach_Both" value="" class="selected" onclick="setSelectedButtonFilters('coach',this.id)">Both</button>`;
    return htmlPlaceholder;
}

function createRegPlayoffFilter(){
    let htmlPlaceholder = `<button id="season_Reg" value="season_Reg" onclick="setSelectedButtonFilters('reg_playoff',this.id)">Reg. Season</button><button id="season_Playoffs" value="season_Playoffs" onclick="setSelectedButtonFilters('reg_playoff',this.id)">Playoffs</button><button id="season_Both" value="" class="selected" onclick="setSelectedButtonFilters('reg_playoff',this.id)">Both</button>`;
    return htmlPlaceholder;
}

function createConferenceFilter(){

    let htmlPlaceholder = `<button id="conf_AFC" value="AFC" class="" onclick="setSelectedButtonFilters('conf',this.id)">AFC</button><button id="conf_NFC" value="NFC" class="" onclick="setSelectedButtonFilters('conf',this.id)">NFC</button><button id="conf_Both" value="" class="selected" onclick="setSelectedButtonFilters('conf',this.id)">Both</button>`;
    return htmlPlaceholder;
}





//filter by selected options
function searchFilters(){
    let newResults = [];

    let seasonFilter = document.getElementById("seasonFilter");
    let selectedSeason = seasonFilter.value;
    let weekFilter = document.getElementById("weekFilter");
    let selectedWeek = weekFilter.value;
    let opponentFilter = document.getElementById("opponentFilter");
    let selectedOpponent = opponentFilter.value;
    let locationFilter = document.getElementById("locationsFilter");
    let selectedLocation = locationFilter.value;
    let resultFilter = document.getElementById("resultFilter");
    let selectedResult = resultFilter.value;
    let otftFilter = document.getElementById("otftFilter");
    let selectedOTFT = otftFilter.value;
    let dayFilter = document.getElementById("dayFilter");
    let selectedDay = dayFilter.value;

    let coachArr = [document.getElementById("coach_Marv"),document.getElementById("coach_ZT"),document.getElementById("coach_Both")];
    let selectedCoach = "coach_Both";
    let confArr = [document.getElementById("conf_AFC"), document.getElementById("conf_NFC"),document.getElementById("conf_Both")];
    let selectedConf = "conf_Both";
    let regSeasonArr = [document.getElementById("season_Reg"), document.getElementById("season_Playoffs"),document.getElementById("season_Both")];
    let selectedRegSeason = "season_Both";

    //filter season
    if ( seasonFilter.value == "" ){
        newResults = results;
    } else {
        newResults = searchSeason(results, selectedSeason);
    }

    //filter week
    if ( weekFilter.value != "" ){
        newResults = searchWeek(newResults, selectedWeek);
    }

    //filter opponent
    if ( opponentFilter.value != "" ){
        newResults = searchOpponent(newResults, selectedOpponent);
    }

    //filter opponent
    if ( locationFilter.value != "" ){
        newResults = searchLocation(newResults, selectedLocation);
    }

    //filter results
    if ( resultFilter.value != "" ){
        newResults = searchOutcome(newResults, selectedResult);
    }

    //filter time
    if ( otftFilter.value != "" ){
        newResults = searchOTFT(newResults, selectedOTFT);
    }

    //filter day
    if ( dayFilter.value != "" ){
        newResults = searchDay(newResults, selectedDay);
    }

    //filter coaches
    for ( i=0; i<coachArr.length; i++ ){
        if ( coachArr[i].classList == "selected" && coachArr[i].value != "" ){
            newResults = searchCoach(newResults, coachArr[i].value);
            selectedCoach = coachArr[i].id;
        }
    }

    //filter regular season vs playoffs
    for ( i=0; i<regSeasonArr.length; i++ ){
        if ( regSeasonArr[i].classList == "selected" && regSeasonArr[i].value == "season_Reg" ){
            newResults = searchRegularSeason(newResults);
            selectedRegSeason = regSeasonArr[i].id;
        } else if ( regSeasonArr[i].classList == "selected" && regSeasonArr[i].value == "season_Playoffs" ){
            newResults = searchPlayoffs(newResults);
            selectedRegSeason = regSeasonArr[i].id;
        }
    }

    //filter conferences
    for ( i=0; i<confArr.length; i++ ){
        if ( confArr[i].classList == "selected" && confArr[i].value != "" ){
            newResults = searchConference(newResults, confArr[i].value);
            selectedConf = confArr[i].id;
        }
    }

    createSortedResults(newResults);

    setSelectedFilters(selectedSeason, selectedWeek, selectedOpponent, selectedLocation, selectedResult, selectedOTFT, selectedDay, selectedCoach, selectedRegSeason, selectedConf);

}

//reset the filters to the selected value
function setSelectedButtonFilters(type, id){
    let coachArr = ["coach_Marv","coach_ZT","coach_Both"];
    let confArr = ["conf_AFC","conf_NFC","conf_Both"];
    let regSeasonArr = ["season_Reg", "season_Playoffs", "season_Both"];

    if ( type == "coach" ){
        //reset the coach filter to the selected value
        for ( i=0; i<coachArr.length; i++ ){
            document.getElementById(coachArr[i]).removeAttribute('class');
        }
        document.getElementById(id).classList.add("selected");
    } else if ( type == "conf" ){
        //reset the conf filter to the selected value
        for ( i=0; i<confArr.length; i++ ){
            document.getElementById(confArr[i]).removeAttribute('class');
        }
        document.getElementById(id).classList.add("selected");
    } else if ( type == "reg_playoff" ){
        //reset the conf filter to the selected value
        for ( i=0; i<regSeasonArr.length; i++ ){
            document.getElementById(regSeasonArr[i]).removeAttribute('class');
        }
        document.getElementById(id).classList.add("selected");
    }

    searchFilters();

}

//reset the filters to the selected value
function setSelectedFilters(selectedSeason, selectedWeek, selectedOpponent, selectedLocation, selectedResult, selectedOTFT, selectedDay, selectedCoach, selectedRegSeason, selectedConf){

    let seasonFilter = document.getElementById("seasonFilter");
    let weekFilter = document.getElementById("weekFilter");
    let opponentFilter = document.getElementById("opponentFilter");
    let locationFilter = document.getElementById("locationsFilter");
    let resultFilter = document.getElementById("resultFilter");
    let otftFilter = document.getElementById("otftFilter");
    let dayFilter = document.getElementById("dayFilter");
    
    
    //reset the season filter to the selected value
    for ( i=0; i<seasonFilter.length; i++ ){
        if ( seasonFilter[i].value == selectedSeason ){
            seasonFilter[i].setAttribute('selected', '');
        }
    }

    //reset the week filter to the selected value
    for ( i=0; i<weekFilter.length; i++ ){
        if ( weekFilter[i].value == selectedWeek ){
            weekFilter[i].setAttribute('selected', true);
        }
    }

    //reset the opponent filter to the selected value
    for ( i=0; i<opponentFilter.length; i++ ){
        if ( opponentFilter[i].value == selectedOpponent ){
            opponentFilter[i].setAttribute('selected', true);
        }
    }

    //reset the location filter to the selected value
    for ( i=0; i<locationFilter.length; i++ ){
        if ( locationFilter[i].value == selectedLocation ){
            locationFilter[i].setAttribute('selected', true);
        }
    }

    //reset the result filter to the selected value
    for ( i=0; i<resultFilter.length; i++ ){
        if ( resultFilter[i].value == selectedResult ){
            resultFilter[i].setAttribute('selected', true);
        }
    }

    //reset the ot/ft filter to the selected value
    for ( i=0; i<otftFilter.length; i++ ){
        if ( otftFilter[i].value == selectedOTFT ){
            otftFilter[i].setAttribute('selected', true);
        }
    }

    //reset the day filter to the selected value
    for ( i=0; i<dayFilter.length; i++ ){
        if ( dayFilter[i].value == selectedDay ){
            dayFilter[i].setAttribute('selected', true);
        }
    }

    //arrays for button filters
    let coachArr = ["coach_Marv","coach_ZT","coach_Both"];
    let confArr = ["conf_AFC","conf_NFC","conf_Both"];
    let regSeasonArr = ["season_Reg", "season_Playoffs", "season_Both"];

    //reset the coach filter to the selected value
    for ( i=0; i<coachArr.length; i++ ){
        document.getElementById(coachArr[i]).removeAttribute('class');
    }
    document.getElementById(selectedCoach).classList.add("selected");
    //reset the reg vs playoff filter to the selected value
    for ( i=0; i<regSeasonArr.length; i++ ){
        document.getElementById(regSeasonArr[i]).removeAttribute('class');
    }
    document.getElementById(selectedRegSeason).classList.add("selected");
    //reset the conf filter to the selected value
    for ( i=0; i<confArr.length; i++ ){
        document.getElementById(confArr[i]).removeAttribute('class');
    }
    document.getElementById(selectedConf).classList.add("selected");
    
}




//get stats on the current data
function getStats(sourceData){
    
    let htmlStatsDestination = document.getElementById("stats");
    let htmlFilterDestination = document.getElementById("filterBtns");

    let wins = searchOutcome(sourceData, "W").length;
    let losses = searchOutcome(sourceData, "L").length;
    let ties = searchOutcome(sourceData, "T").length;
    let gamesPlayed = ( wins + losses + ties );
    let winPct = ( wins + ( ties / 2 ))/( wins + losses + ties );
    winPct = (winPct * 100).toFixed(2) + '%';


    if ( wins == 0 && losses == 0 && ties == 0 ){
        htmlStatsDestination.innerHTML = "";
    } else {
        htmlStatsDestination.innerHTML = `Results for selected range: </br>Wins: <span style="font-weight: bold; color: #3c9067;">` + wins + `</span> Losses: <span style="font-weight: bold; color: #c63224;">` + losses + `</span> Ties: <span style="font-weight: bold; color: #f0bf3a;">` + ties + `</span> Games Played: ` + gamesPlayed + " </br>Win Pct: " + winPct;
    }

    htmlFilterDestination.innerHTML = `<table style="width: 50%; margin-left: auto; margin-right: auto;"><tr><td align="right">Coach Filter: </td><td align="left">` + createHCFilter() + 
        `</td></tr><tr><td align="right">Season Filter: </td><td align="left"> ` + createRegPlayoffFilter() + 
        `</td></tr><tr><td align="right">Conference Filter: </td><td align="left"> ` + createConferenceFilter() + `</td></tr></table>`;


}



//divisions and conference data
/*let divisions = [
    {
        "conference":"AFC",
        "division":"North",
        "teams":["Bengals","Browns","Steelers","Ravens"]
    },
    {
        "conference":"AFC",
        "division":"East",
        "teams":["Bills","Dolphins","Jets","Patriots"]
    },
    {
        "conference":"AFC",
        "division":"South",
        "teams":["Colts","Jaguars","Texans","Titans"]
    },
    {
        "conference":"AFC",
        "division":"West",
        "teams":["Broncos","Chargers","Chiefs","Raiders"]
    },
    {
        "conference":"NFC",
        "division":"North",
        "teams":["Bears","Lions","Packers","Vikings"]
    },
    {
        "conference":"NFC",
        "division":"East",
        "teams":["Cowboys","Eagles","Giants","Washington"]
    },
    {
        "conference":"NFC",
        "division":"South",
        "teams":["Buccaneers","Falcons","Panthers","Saints"]
    },
    {
        "conference":"NFC",
        "division":"West",
        "teams":["49ers","Cardinals","Rams","Seahawks"]
    }
]
*/

createSortedResults(results);
