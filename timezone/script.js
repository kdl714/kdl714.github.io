/* 
Time zone normalization
convert by utc offset to utc 0 to normalize and find overlaps in users preferred working hours (vs MS Outlook or other tools showing simply time zone differences)
creates 2 tds for every hour to break the day into 48 1/2 hour chunks then adjusts as needed to utc 0 based on the users stated offset
--
Kevin Lafferty
--
created: 7JUN2023
*/

//create the html 
createHTMLTable();
function createHTMLTable(){
    let resultsDiv = document.getElementById("resultsDiv");
    let headerRow = createHeaderRow(); //create the header row incl. users and hrs 0-23 for utc0
    let userRows = getUsers(); //create the user rows 
    resultsDiv.innerHTML = headerRow + userRows + `</table>`; //update the html with the normalized times 
}

//create the header row
function createHeaderRow(){
    let headerRow = '';
    let openingHTML = `<table><tr><th>User</th><th>UTC offset</th>`;
    let closingHTML = `</tr>`;
    for (i=0;i<24;i++){
        let hour = i;
        if ( i < 10 ){ hour = '0' + i };
        let newRow = `<th colspan="2">` + hour + `</th>`;
        headerRow += newRow;
    }
    let headerRowHTML = openingHTML + headerRow + closingHTML;
    return headerRowHTML;
}

//get the users from users.js and create individual rows for them
function getUsers(){
    let userRows = '';
    for (i=0;i<users.length;i++){
        userRows += createUserRow(users[i]);
    }
    return userRows;
}

//creates the user row
function createUserRow(user){
    let utcOffset = user.utc_offset;
    let userHTML = `<tr><td>` + user.user_name + `</td><td>` + utcOffset + `</td>`; //first td with user name
    let tentativeTimes = user.tentative_times;
    let startTime = user.start_time * 2;
    let endTime = user.end_time * 2;
    let rowHTMLArray = [];

    //create the row array defaults to unavailable if no time is present
    for (j=0;j<48;j++){
        let hour = j / 2;
        let mins = '00'; /*defaults to 00 mins*/
        let rowHTMLtemplate = `<td class="{class} hide">{hour}:{mins}</td>`;
        let cssClass = 'unavailable';
        if ( j % 2 != 0 ){
            hour = Math.floor(j / 2); /*divides the current pos by 2 and rounds down, since we're working with 48 iterations of 30 min chunks*/
            mins = '30'; /* sets the mins to 30 since this is the back of the hour*/
            } 

        if (j>=startTime && j<endTime){
            cssClass = 'available'; /* currently looks for start and end times for the users "normal" working hours and sets to available*/
        }

        for (k=0;k<tentativeTimes.length;k++){
            let startTimeTentative = tentativeTimes[k].start_time *2;
            let endTimeTentative = tentativeTimes[k].end_time *2;
            if (j>=startTimeTentative && j<endTimeTentative){
                cssClass = 'tentative'; /* multiple tentative times are possible, and this is the last piece such that tentative times can overwrite availability, e.g. if the user goes to the gym in the middle of the day*/
            }
        }

        //replace the template with real values and push into the array
        let rowHTML = rowHTMLtemplate.replace(/{class}/,cssClass);
        rowHTML = rowHTML.replace(/{hour}/,hour);
        rowHTML = rowHTML.replace(/{mins}/,mins);

        rowHTMLArray.push(rowHTML);
    }

    //adjust the row array to utc0 - math is hard: -|startPos|n|endPos|+ (that's a timeline, I guess? negative offset takes from n to endPos and places to the front, postive takes from startPos to n and places at the end)
    let startPos = 0;
    let n = utcOffset * 2;
    let endPos = rowHTMLArray.length;
    if (utcOffset < 0){
        n = rowHTMLArray.length + ( utcOffset * 2);
    }

    //rearrange the array of values and then create a string to update the html with
    let startArray = rowHTMLArray.slice(n, endPos);
    let endArray = rowHTMLArray.slice(startPos, n);
    rowHTMLArray = [...startArray, ...endArray];
    let rowHTML = '';

    for (r=0;r<rowHTMLArray.length;r++){
        rowHTML += rowHTMLArray[r];
    }

    return userHTML + rowHTML + `</tr>`; //send it on back babbbbbbyyyy
}
