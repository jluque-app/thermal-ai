// Pages/Legal.jsx — Terms, Privacy (GDPR), Imprint and Method & limitations.
// DRAFT TEXT: review by legal counsel before publication. Placeholders in [brackets].
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-28 bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-4">
    <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">{children}</div>
  </section>
);

export default function Legal() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10 px-4 md:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="pb-6 border-b border-slate-200">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Legal &amp; Method</h1>
          <p className="text-slate-500 mt-2">Last updated: 28 August 2026. Draft for legal review.</p>
          <nav className="flex flex-wrap gap-4 mt-4 text-sm">
            <a href="#method" className="text-emerald-700 hover:underline">Method &amp; limitations</a>
            <a href="#terms" className="text-emerald-700 hover:underline">Terms of service</a>
            <a href="#privacy" className="text-emerald-700 hover:underline">Privacy policy</a>
            <a href="#imprint" className="text-emerald-700 hover:underline">Imprint</a>
          </nav>
        </header>

        <Section id="method" title="Method &amp; limitations">
          <p>
            ThermalAI is a <strong>screening and triage instrument</strong>. It aligns a drone thermal image to the
            matching RGB photo, isolates the facade (walls, windows, doors) with a neural network, flags the warmest
            areas inside that facade region relative to the rest of the facade, and converts the flagged area into a
            screening-level heat-loss proxy using the indoor–outdoor temperature difference at capture time and local
            heating degree-hours. Every result shows the alignment method used, an independent alignment score and any
            warnings produced during the analysis.
          </p>
          <p><strong>What the numbers are not.</strong> ThermalAI does not measure heat flux, does not produce certified
            U-values (ISO 9869-1), is not an Energy Performance Certificate and does not replace an on-site energy
            audit or a blower-door test. The annual kWh and euro figures are proportional proxies intended to rank
            buildings and facades for follow-up; their absolute accuracy has not been validated against metered
            consumption. Thermal images are interpreted as 8-bit false-colour pictures, not as radiometric temperature
            maps, unless stated otherwise.</p>
          <p><strong>Conditions that reduce reliability</strong> (the app will warn you): indoor–outdoor difference below
            about 5 K, direct sunshine on the facade in the hours before capture, rain or wet surfaces, reflective
            cladding or glass, images that could not be aligned by feature matching, and facades that are largely
            outside the thermal image frame.</p>
        </Section>

        <Section id="terms" title="Terms of service">
          <p>These terms govern the use of thermalai.eu and app.thermalai.eu ("the Service"), operated by
            [Allretech legal entity name, registered address, company number] ("we").</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Service.</strong> The Service provides automated screening of building envelopes from user-uploaded
              images and related reports. Outputs are estimates for decision support only (see Method &amp; limitations).</li>
            <li><strong>Accounts and plans.</strong> The Community plan includes a limited number of free analyses. Paid
              plans are billed through Stripe at the prices shown at checkout. Analysis credits are consumed when an
              analysis is run and are non-refundable once consumed, except where required by law.</li>
            <li><strong>Your content.</strong> You keep all rights to the images and data you upload. You grant us a
              licence to process them to provide the Service. You confirm you have the right to upload them and that
              any drone flights complied with applicable aviation and privacy rules.</li>
            <li><strong>Acceptable use.</strong> No unlawful use, no attempts to reverse-engineer the models, no automated
              bulk access without a written agreement.</li>
            <li><strong>No warranty; liability.</strong> The Service is provided "as is". To the extent permitted by law we
              exclude liability for decisions taken on the basis of screening outputs. Nothing limits liability that
              cannot be limited by law (including under EU consumer rules).</li>
            <li><strong>Changes and termination.</strong> We may update the Service and these terms; material changes will
              be announced on the site. Either party may terminate at any time; paid, unused credits are handled as
              described in the plan terms.</li>
            <li><strong>Law and venue.</strong> [Governing law and courts — to be set by counsel].</li>
          </ol>
        </Section>

        <Section id="privacy" title="Privacy policy (GDPR)">
          <p><strong>Controller:</strong> [Allretech legal entity, address, contact e-mail]. Data protection contact:
            info@allretech.org.</p>
          <p><strong>Data we process and why.</strong> (a) Account data (e-mail, name, plan) to provide the Service —
            contract performance, Art. 6(1)(b) GDPR. (b) Uploaded images and analysis inputs (address, coordinates,
            building data) to run the analysis and produce reports — Art. 6(1)(b). (c) Payment data processed by Stripe
            (we never store card numbers) — Art. 6(1)(b) and legal obligations. (d) Technical logs and security data —
            legitimate interest, Art. 6(1)(f). (e) Expert chat messages, processed by our AI provider to generate
            answers — Art. 6(1)(b).</p>
          <p><strong>Images of buildings and people.</strong> Facade images may incidentally show people or number plates.
            Please avoid uploading images that identify individuals. We do not use uploaded images to train models
            without your explicit consent.</p>
          <p><strong>Processors and transfers.</strong> Hosting and processing: Render (USA/EU regions) and Vercel;
            payments: Stripe; AI assistant: [OpenAI / provider]. Transfers outside the EEA rely on Standard Contractual
            Clauses or adequacy decisions.</p>
          <p><strong>Retention.</strong> Account data for the life of the account plus statutory periods; uploaded images
            and results for [X] days after the analysis unless you save them to your dashboard; logs up to 12 months.</p>
          <p><strong>Your rights.</strong> Access, rectification, erasure, restriction, portability and objection, and the
            right to lodge a complaint with a supervisory authority. Write to info@allretech.org.</p>
          <p><strong>Cookies.</strong> Only strictly necessary cookies and local storage (session, language, last result).
            No advertising trackers.</p>
        </Section>

        <Section id="imprint" title="Imprint">
          <p>[Allretech legal entity name]<br />[Registered address]<br />[Company registration number, VAT ID]<br />
            Managing director: [name]<br />E-mail: info@allretech.org</p>
          <p>Scientific method: Jaime Luque (ESCP Business School; Corvinus Institute of Advanced Studies).</p>
        </Section>
      </div>
    </div>
  );
}
