// The phone the app runs on (owner 2026-11-19, "identify top, bottom, left, right and px values of each device").
// Runs as an inline script before the first paint, so nothing jumps. It measures the safe areas iOS reports, falls back
// to Apple's published values for that iPhone when iOS reports none (Safari's own window reports zero at the top), and
// writes them as CSS variables on <html>:
//   --sat --sab --sal --sar   safe area top, bottom, left, right, in CSS px
//   --bar-top                 where the top bar starts: under the Dynamic Island, clear of the clock on a notch
//   --dpr --hair              device pixel ratio and one device pixel, for hairlines
//   --screen-r                the display's corner radius, so floating sheets sit concentric to it
//   data-device, data-cutout  the iPhone size class and island, notch or none
// It also stops pinch zoom here, and double-tap zoom through touch-action manipulation in globals.css. A touchend
// blocker once did the double-tap part and swallowed every second tap within 300 ms (owner 2026-11-20, "buttons
// weren't very responsive"), so taps are never cancelled here.

/** iPhones by viewport in points, portrait: [width, height, top inset, bottom inset, cutout, name, screen corner radius]. */
export const IPHONES: [number, number, number, number, "island" | "notch" | "none", string, number][] = [
  [375, 667, 20, 0, "none", "iPhone SE, 8", 0],
  [414, 736, 20, 0, "none", "iPhone 8 Plus", 0],
  [375, 812, 44, 34, "notch", "iPhone X, XS, 11 Pro, 12 mini, 13 mini", 39],
  [414, 896, 48, 34, "notch", "iPhone XR, 11, XS Max, 11 Pro Max", 41],
  [390, 844, 47, 34, "notch", "iPhone 12, 13, 14", 47],
  [428, 926, 47, 34, "notch", "iPhone 12 Pro Max, 13 Pro Max, 14 Plus", 53],
  [393, 852, 59, 34, "island", "iPhone 14 Pro, 15, 15 Pro, 16", 55],
  [430, 932, 59, 34, "island", "iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus", 55],
  [402, 874, 62, 34, "island", "iPhone 16 Pro, 17, 17 Pro", 62],
  [420, 912, 62, 34, "island", "iPhone Air", 62],
  [440, 956, 62, 34, "island", "iPhone 16 Pro Max, 17 Pro Max", 62],
];

export const DEVICE_SCRIPT = `(function(){try{
var P=${JSON.stringify(IPHONES)};var d=document.documentElement;
function probe(){var e=document.createElement('div');e.style.cssText='position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';(document.body||d).appendChild(e);var s=getComputedStyle(e);var r=[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].map(parseFloat);e.remove();return r;}
function fit(){
var w=Math.min(screen.width,screen.height),h=Math.max(screen.width,screen.height),dpr=window.devicePixelRatio||1;
var m=null;for(var i=0;i<P.length;i++){if(P[i][0]===w&&P[i][1]===h){m=P[i];break;}}
var inset=probe(),sa=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
var top=inset[0],bot=inset[2];
if(m&&sa){if(!top)top=m[2];if(!bot)bot=m[3];}
var cut=m?m[4]:(top>40?'island':'none');
var bar=cut==='island'?Math.max(8,top-10):cut==='notch'?Math.max(46,top):top?top+6:8;
var st=d.style;st.setProperty('--sat',top+'px');st.setProperty('--sab',bot+'px');st.setProperty('--sal',inset[3]+'px');st.setProperty('--sar',inset[1]+'px');
st.setProperty('--bar-top',bar+'px');st.setProperty('--screen-r',(window.self!==window.top?44:m?m[6]:(bot?47:0))+'px');st.setProperty('--dpr',dpr);st.setProperty('--hair',(1/dpr)+'px');
d.setAttribute('data-device',m?(m[0]+'x'+m[1]):'other');d.setAttribute('data-cutout',cut);
}
if(document.body)fit();else document.addEventListener('DOMContentLoaded',fit);
addEventListener('resize',fit);addEventListener('orientationchange',function(){setTimeout(fit,250);});
var no=function(e){e.preventDefault();};
document.addEventListener('gesturestart',no,{passive:false});document.addEventListener('gesturechange',no,{passive:false});
document.addEventListener('touchmove',function(e){if(e.touches&&e.touches.length>1)e.preventDefault();},{passive:false});

}catch(e){}})();`;
