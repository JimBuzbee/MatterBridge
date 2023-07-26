
var offColor ="#EADDCA";
var onColor="#fbe790";
var currentSocket;

//--------------------------------------------------------------------------------

window.onload = function() { refreshState(); }

//--------------------------------------------------------------------------------
refreshState = function() { 
 //  console.log('inside refreshState');
 //  refreshWemo();
   setTimeout(refreshState, 30000 ); 
} 
//--------------------------------------------------------------------------------
function toggleShelly( which ) {
console.log( "in toggle" );
   if ( shelly[which] == 'on' ) shelly[which]='off'; else shelly[which]='on';
   doShelly( which, shelly[which] );
}
//--------------------------------------------------------------------------------
function doColor( v ) {
   r=parseInt("0x"+v.substring(1, 3));
   g=parseInt("0x"+v.substring(3, 5));
   b=parseInt("0x"+v.substring(5, 7));
   console.log(r+ " " + g + " " +  b );
   fetch('http://192.168.1.42/cgi-bin/Govee.cgi?r='+r+'&g='+g+'&b='+b).then(function(data) {
   }).catch(function( err ) { alert('Error ' + err); });
}
//--------------------------------------------------------------------------------
function doGovee( v ) {
   fetch('http://192.168.1.42/cgi-bin/Govee.cgi?'+v+'=1').then(function(data) {
   }).catch(function( err ) { alert('Error ' + err); });
}
//--------------------------------------------------------------------------------
function doBrightness(ip, value) {
   var oReq = new XMLHttpRequest(); 
   oReq.open('GET', '/brightness?value=' + value + '&ip=' + ip ); 
   oReq.send();
}
//--------------------------------------------------------------------------------
function doGoveeBrightness(value) {
	console.log( value );
   fetch('http://192.168.1.42/cgi-bin/Govee.cgi?brightness='+value).then(function(data) {
   }).catch(function( err ) { alert('Error ' + err); });
}
//--------------------------------------------------------------------------------
function wemoResult () { 
   var params = new URLSearchParams(new URL(this.responseURL).search );
   ip=params.get('ip'); 
   if ( this.responseText.includes('ON')) { 
      label='Turn Off'; 
      color=onColor;
   }  else {   
      color=offColor;
      label='Turn On'; 
   } 
  document.getElementById(params.get('ip')).value=label; 
  document.getElementById("td" + ip ).style.backgroundColor=color; 
} 
//--------------------------------------------------------------------------------
function update( ip, state ) { 
   console.log(' update called with ' + ip );
   var oReq = new XMLHttpRequest(); 
   oReq.addEventListener('load', wemoResult); 
   oReq.open('GET', '/setState?ip=' + ip + '&state=' + state ); 
   oReq.send();
}
//--------------------------------------------------------------------------------
function reqUpdateListener () {
   document.getElementById("allDevices").innerHTML = this.responseText;
}
//--------------------------------------------------------------------------------
function refreshWemo( ) { 
 //  var oReq = new XMLHttpRequest(); 
 //  oReq.addEventListener('load', reqUpdateListener); 
 //  oReq.open('GET', '/update' ); 
 //  oReq.send();
  
}
//--------------------------------------------------------------------------------
