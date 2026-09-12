export function Look() {
  return (
    <section className="look" id="look">
      <div className="wrap look-in">
        <div>
          <h2>Seen it somewhere?<br /><span>Shop the look.</span></h2>
          <p>Drop in a screenshot — a reel, a street photo, your own mirror selfie. We match it against every piece we've cut and show you what's closest.</p>
          <div className="upload">Drop a photo here<small>or paste a link · JPG, PNG, up to 10 MB</small></div>
        </div>
        <div className="matches">
          <div className="q" aria-label="Uploaded photo"></div>
          <div className="mlist">
            <div className="m" style={{'--g': 'linear-gradient(150deg,#4a5240,#1e2418)'} as React.CSSProperties}><i></i><span><b>Ripstop cargo</b><small>Moss · closest cut and colour</small></span><span className="pct">94%</span></div>
            <div className="m" style={{'--g': 'linear-gradient(150deg,#d9d9d9,#8f8f8f)'} as React.CSSProperties}><i></i><span><b>Selvedge box tee</b><small>Washed grey</small></span><span className="pct">81%</span></div>
            <div className="m" style={{'--g': 'linear-gradient(150deg,#f3f3f3,#c9c9c9)'} as React.CSSProperties}><i></i><span><b>Panel cap</b><small>Bone</small></span><span className="pct">63%</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
