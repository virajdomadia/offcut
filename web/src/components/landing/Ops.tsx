export function Ops() {
  return (
    <section className="wrap ops">
      <h2>The store runs on the same screen we run the store from</h2>
      <div className="ops-grid">
        <div className="op"><h3>Stock that can't go negative</h3><p>Every size and colour is its own count. Two people buying the last cargo at once — one gets it, the other gets told straight away.</p></div>
        <div className="op"><h3>Orders you can follow</h3><p>Placed, packed, shipped, delivered — and a return you can request from the same page.</p>
          <div className="st"><span>Placed<em>Fri 6:12 pm</em></span><span>Packed<em>Sat 10:40 am</em></span><span className="on">Shipped<em>In transit</em></span><span>Delivered<em>—</em></span></div></div>
        <div className="op"><h3>One admin for everything</h3><p>Add a piece, upload photos, adjust stock, move orders along, approve returns. Built for one person running a brand from a studio.</p></div>
      </div>
    </section>
  );
}
