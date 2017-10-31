let roomTime= {roomID: null}
/**
 * Performs word wrap on an input string.
 * @param {string} inputStr - the string to be split
 * @param {int} lineWidth - the max width of the line
 */
function splitStringBreaks(inputStr, lineWidth){
  if (inputStr.length > lineWidth) {
   let p = lineWidth;
   for (;p>0 && inputStr[p]!= ' '; p--){
    
   }
   if (p>0) {
    var left = inputStr.substring(0, p);
    var right = inputStr.substring(p+1);
    return left + "\n" + splitStringBreaks(right, lineWidth, "\n");
   }
  }
  return inputStr;
}

/**
 * Given an object with data, creates a-frame objects to represent the free or busy state of a conference room.
 * @param {object} displayInfo - an object witth keys free (bool), freeUntil (moment time object), busyUntil (moment time object), and displayStr (str) - a string with words for display.
 */
function createDisplay(displayInfo) {
  var scene = document.querySelector('a-scene');

  var stop = document.createElement('a-entity');
  stop.setAttribute('geometry', 'primitive: circle; radius:0.5; segments:8');
  stop.setAttribute('material', 'color: #FF0000;');
  stop.setAttribute('position', '0, -0.25, 0');
  stop.setAttribute('rotation', "-90 0 22.5");
  
  // TODO: text creation is duplicative, refactor
  var busyText = document.createElement('a-text');
  busyText.setAttribute('value', splitStringBreaks(displayInfo['displayStr'], 8));
  
  busyText.setAttribute('width', '3');
  busyText.setAttribute('color', "#FFFFFF");
  busyText.setAttribute('position', '-0.5 0, 0.1');
  busyText.setAttribute('rotation', "0 0 -22.5");
  stop.append(busyText);

  var go = document.createElement('a-plane');
  go.setAttribute('color', '#7CFC00');
  go.setAttribute('position', '0, 0.5, 0');
  go.setAttribute('rotation', "-90 0 0");

  var freeText = document.createElement('a-text');
  freeText.setAttribute('value', splitStringBreaks(displayInfo['displayStr'], 8));
  freeText.setAttribute('width', '3');
  freeText.setAttribute('color', "#000000");
  freeText.setAttribute('position', '-0.25, 0, 0.1');
  go.append(freeText);

  scene.appendChild(go);
//  if (displayInfo['free'] === true) {
//    scene.appendChild(go);
//  }
//  else {
//    scene.appendChild(stop);
//  }
} // end of drawing function

/**
 * Given a filtered subset of the data returned from the google spreadsheet, this function outputs a displayData object that provides information needed to generate the a-frame display.
 * @param {object} todaysData - a JSON. the keys that are important for this program: [gsx$day, gsx$end, gsx$start, gsx$status, gsx$roomid]. For each key, the data is in an object accessible by the key "$t".
 */
function defineDisplay(todaysData){
  
  let now = roomTime["now"];
  let dateString = now.format("Y-M-D")
  let endOfDay = now.clone().endOf("day");
  let offset = "-0" + String(Math_abs(now._offset/60));
  let freeUntil = endOfDay; 

  let displayInfo = {'free': true, 'freeUntil':freeUntil, 'busyUntil':endOfDay};

  // parse the relevant data to fill out the information needed for display
  todaysData.forEach(
      function checkFreeBusy(val){
        let startString = dateString + " " + val["gsx$start"]["$t"] + " " +offset;
        let endString = dateString + " " + val["gsx$end"]["$t"] + " " + offset;
        let startTime = moment(startString, "Y-M-D h:m:s a ZZ");
        let endTime = moment(endString, "Y-M-D h:m:s a ZZ");
        if (now >= startTime && now <= endTime) {
          roomFree = false;
          displayInfo['free'] = false;
          displayInfo['busyUntil'] = endTime;
        } //end freecheck

        if (now <= startTime && startTime < freeUntil){
          displayInfo['freeUntil'] = startTime; 
        }
      }// end of checkFreeBusy
      ); // end of forEach

  // generate the string from reservations data
  if (displayInfo['free'] === true){
    if (displayInfo["freeUntil"] == endOfDay) {
      displayInfo["displayStr"] = "Unbooked for the rest of the day"; 
    } else {
      nextMeetingStr = displayInfo["freeUntil"].format("hh:mm:ss A");
      displayInfo['displayStr'] =  "Free until " + nextMeetingStr;
    } // end check for freeUntil
  }// end freebusy True check
  else {
    endMeetingStr = displayInfo["busyUntil"].format("hh:mm:ss A");
    displayInfo['displayStr'] = "Busy until " + endMeetingStr;
  }// end check for free/busy
  return displayInfo;

}// end of defineRoomText

/**
 * Given the data from the google spreadsheet feed, filters by today, reservation status 'OK', and by the conference room of interest.
 * @param {object} data - the data is accessed by "data.feed.entry"
 */
function initData(data){
  
  var entries = data.feed.entry;
  roomTime["now"] = moment.tz(moment(), "America/Chicago");
  let dateString = roomTime["now"].format("M/D/Y")
  let confRoom = roomTime["roomID"];
  let confirmed = entries.filter(entry => entry["gsx$status"]["$t"]=="OK");
  let todaysReservations =  confirmed.filter(entry => entry["gsx$day"]["$t"] === dateString);
  let relevantData = todaysReservations.filter(entry => entry["gsx$roomid"]["$t"] === confRoom);
  return relevantData;
}// end of initData

function loadData(url) {
  return new Promise(function(resolve, reject) {
    $.get(url).done(resolve).fail(reject); 
  }) // end Promise
} // end load Data

$(document).ready(function(){

  // TODO: this is not the most robust, but it works
 roomTime["roomID"] = window.location.href.split("?")[1].split("=")[1];
 moment.tz.setDefault("America/Chicago");
  var url = "https://spreadsheets.google.com/feeds/list/17fRzMJDR8N3q18qM4mLfuKDulZFQJLVnmlPrVI4qBMc/od6/public/values?alt=json";
  loadData(url).then(initData).then(defineDisplay).then(createDisplay);

});// end of document.ready
