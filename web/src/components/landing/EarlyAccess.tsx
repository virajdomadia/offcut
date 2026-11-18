import { site } from "@/lib/site";

export function EarlyAccess() {
  return (
    <section className="early" id="early-access" aria-labelledby="early-h">
      <div className="wrap early-in">
        <div>
          <p className="soon">In development</p>
          <h2 id="early-h">Nothing&apos;s for sale yet.</h2>
        </div>
        <div>
          <p>
            Offcut is a portfolio project by {site.author}, and the store is being built right now. There&apos;s no
            list, account, bag or checkout yet &mdash; and no real drops. Follow the build on GitHub, or get in touch
            if you&apos;d like to hear when it&apos;s live.
          </p>
          <div className="early-cta">
            <a className="btn btn-acid" href={site.repo}>Follow the build on GitHub</a>
            <a className="btn btn-ghost" href={site.contactUrl}>Get in touch</a>
          </div>
        </div>
      </div>
    </section>
  );
}
