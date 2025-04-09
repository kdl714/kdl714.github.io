
//fetch data from google sheet
const CLIENT_ID = '449242643565-1entvf6vs3fvma026l0nch4epc86q6o8.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDGn2XD2zckhsCA2qZylWO1PBS8b1ypPwk';
const SHEET_ID = '1o3rWA3I-tkSWE64yijZKZBPgjy23PcTKbfrN3ff0Nl4';
const RANGE = 'Dashboard!A1';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').onclick = handleAuthClick;
document.getElementById('signout_button').onclick = handleSignoutClick;

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // Will assign later
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById('authorize_button').style.display = 'inline';
    document.getElementById('output').textContent = 'Ready.';
  }
}

function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error) throw resp;
    document.getElementById('signout_button').style.display = 'inline';
    document.getElementById('authorize_button').style.display = 'none';
    await fetchSheetJSON();
  };
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

function handleSignoutClick() {
  google.accounts.oauth2.revoke(tokenClient.access_token, () => {
    document.getElementById('authorize_button').style.display = 'inline';
    document.getElementById('signout_button').style.display = 'none';
    document.getElementById('output').textContent = 'Signed out.';
  });
}

async function fetchSheetJSON() {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });
    const raw = response.result.values?.[0]?.[0];
    const parsed = JSON.parse(raw);
    document.getElementById('output').textContent = JSON.stringify(parsed, null, 2);
  } catch (error) {
    document.getElementById('output').textContent = 'Error: ' + error.message;
    console.error(error);
  }
}

// Load both APIs when window finishes loading
window.onload = () => {
  gapiLoaded();
  gisLoaded();
};
