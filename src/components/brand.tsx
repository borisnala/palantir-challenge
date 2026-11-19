// The Risk Tool mark (owner 2026-11-18: "pro, the way Bloomberg would do it"). Drawn as shapes on a 100 grid, never
// typed in a font, so it renders the same at 16 px and 1000 px: a geometric r with a raised plus whose bars match the
// r's weight. One mark for the favicon (src/app/icon.svg), the Home Screen icon, the menu and the launch.

export function Mark({ size = 28, title = "Risk Tool" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title} fill="currentColor">
      <rect x="20" y="40" width="15" height="47" />
      <path d="M27.5 63 C27.5 49 36 40 50 40 H60 V55 H50 C43 55 35 57 35 66 Z" />
      <rect x="72" y="10" width="11" height="34" />
      <rect x="60.5" y="21.5" width="34" height="11" />
    </svg>
  );
}

/** The plus alone, for the wordmark and the launch. Bars at a third of the arm, as in the mark. */
export const PLUS_PATH = "M34 0h32v34h34v32H66v34H34V66H0V34h34z";
export function Plus({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden fill="currentColor"><path d={PLUS_PATH} /></svg>;
}

/** Wordmark: heavy, tight, black, with the drawn plus raised at the top right. */
export function Wordmark() {
  return <span className="wordmark" role="img" aria-label="Risk Tool">risk tool<Plus size={11} /></span>;
}

/** The launch screen, in the page's first HTML so it shows from the first frame. motion.tsx opens it once. */
export function Launch() {
  return (
    <>
    {/* Once per visit: a later load skips the launch before the first frame */}
    <script dangerouslySetInnerHTML={{ __html: "try{var pf=JSON.parse(localStorage.getItem('risktool-prefs')||'{}');if(pf.theme==='light'||pf.theme==='dark')document.documentElement.setAttribute('data-theme',pf.theme)}catch(e){}try{history.pushState=function(s,t,u){return history.replaceState(s,t,u)}}catch(e){}try{var c=document.documentElement.classList;if(window.self!==window.top)c.add('inframe');else if(matchMedia('(min-width: 700px) and (min-height: 521px)').matches)c.add('framed','nolaunch');if(sessionStorage.getItem('launched'))c.add('nolaunch')}catch(e){}" }} />
    <div id="launch" aria-hidden>
      <svg className="launchplus" viewBox="0 0 100 100" fill="currentColor"><path d={PLUS_PATH} /></svg>
    </div>
    </>
  );
}
