import ParticleLab from "./lab/ParticleLab.jsx";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import PageLoader from "./effects/PageLoader.js";
import IdeaToProduct from "./effects/IdeaToProduct.js";
import ParticleImage from "./effects/ParticleImage.js";
import TeamPortrait from "./effects/TeamPortrait.js";
import ContactMap from "./effects/ContactMap.js";
import "./styles.css";

import ahmet from "./assets/ahmet.png";
import umit from "./assets/umit.png";
import loyex from "./assets/loyex.webp";
import pragmatic from "./assets/pragmatic.webp";
import viva from "./assets/viva.webp";
import btx from "./assets/btx.webp";
import loyexLogo from "./assets/loyex.svg";
import pragmaticLogo from "./assets/pragmatic.svg";
import vivaLogo from "./assets/viva.svg";
import sahara from "./assets/sahara.svg";
import keesy from "./assets/keesy.svg";
import okgrow from "./assets/okgrow.svg";
import teamclok from "./assets/teamclok.svg";
import adhouse from "./assets/adhouse.svg";
import credit from "./assets/credit.svg";

const clients = [
  ["Loyex", loyexLogo],
  ["Pragmatic Growth", pragmaticLogo],
  ["Viva Magenta", vivaLogo],
  ["Sahara AI", sahara],
  ["Keesy", keesy],
  ["OkGrow", okgrow],
  ["Teamclok", teamclok],
  ["AD House", adhouse],
  ["Credit Captain", credit],
];
const projects = [
  ["Loyex", "Product Design & Website", "2025", loyex, loyexLogo, "loyex"],
  [
    "Pragmatic Growth",
    "Brand Identity & Website",
    "2024",
    pragmatic,
    pragmaticLogo,
    "pragmatic-growth",
  ],
  [
    "Viva Magenta",
    "Brand Identity & Website",
    "2024",
    viva,
    vivaLogo,
    "viva-magenta",
  ],
  ["BTX Capital", "Website", "2024", btx, null, "btx-capital"],
];
const fill = { width: "100%", height: "100%" };
const ink = "var(--ink)";
const mail = "mailto:hello@ucas.studio?subject=New%20project%20enquiry";

function ThemeButton() {
  const [dark, setDark] = useState(true);
  function toggle() {
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    window.dispatchEvent(new Event("ucas-theme"));
    setDark(!dark);
  }
  return (
    <button
      className="theme"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      <span aria-hidden="true">◐</span>
    </button>
  );
}

function Clients() {
  return (
    <div className="clients column" aria-label="Clients">
      <div className="track">
        {[false, true].map((copy) => (
          <div className="logos" key={String(copy)} aria-hidden={copy}>
            {clients.map(([name, logo]) => (
              <img
                key={name}
                width="192"
                height="48"
                alt={copy ? "" : name}
                src={logo}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Work() {
  return (
    <section className="section column" id="work">
      <h2>Selected Work</h2>
      <div className="cases">
        {projects.map(([title, type, year, image, logo, slug]) => (
          <a
            className="case"
            key={slug}
            href={`https://www.ucas.studio/work/${slug}`}
            target="_blank"
            rel="noreferrer"
          >
            <div className="cover">
              <ParticleImage
                title={title}
                image={{ src: image, alt: title }}
                logo={logo ? { src: logo } : undefined}
                ink={ink}
                density={2}
                radius={14}
                style={fill}
              />
            </div>
            <div className="caption">
              <span>{title}</span>
              <span>{type}</span>
              <span>{year}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Team() {
  return (
    <section className="section column" id="team">
      <h2>Team</h2>
      <div className="people">
        {[
          [ahmet, "Ahmet Simsek", "Engineer", 50, 1],
          [umit, "Ümit Celik", "Designer", 54, 1.07],
        ].map(([src, name, role, focusY, zoom]) => (
          <figure key={name}>
            <div
              className="portrait"
              role="img"
              aria-label={`Interactive particle portrait of ${name}`}
            >
              <TeamPortrait
                image={{ src }}
                color={ink}
                opacity={0.95}
                size={2}
                grid={2.5}
                rotate={0}
                zoom={zoom}
                focusX={50}
                focusY={focusY}
                maskW={80}
                maskH={92}
                detail={1.5}
                contrast={1.5}
                fill={100}
                invert={false}
                cutout
                tilt={18}
                radius={0}
                background="transparent"
                style={fill}
              />
            </div>
            <figcaption>
              {name}
              <span>Co-Founder &amp; {role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Clocks() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="clocks">
      {[
        ["ANK", "Europe/Istanbul"],
        ["NYC", "America/New_York"],
      ].map(([label, timeZone]) => (
        <span key={label}>
          {label}{" "}
          <time>
            {date.toLocaleTimeString("en-GB", {
              timeZone,
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </span>
      ))}
    </div>
  );
}

function Page() {
  return (
    <>
      <PageLoader
        particles={14000}
        color={ink}
        background="var(--paper)"
        style={fill}
      />
      <header className="column" id="top">
        <a href="#top">Ucas · Motion Study</a>
        <nav>
          <a href="#work">Work</a>
          <a href="#particle-lab">Particle Lab</a>
          <a href="#contact">Contact</a>
          <ThemeButton />
        </nav>
      </header>
      <main>
        <section className="intro column">
          <h1>
            Ucas Studio is an independent, AI-native design and development
            studio. We craft brands, digital products and websites for teams
            that care about the details.
          </h1>
          <p className="lead">
            AI is part of how we work, from first concept to production code. It
            lets us ship in two weeks what used to take a month, with leaner
            budgets and no compromise on craft.
          </p>
          <p className="reach">
            Get in touch: <a href={mail}>hello@ucas.studio</a>
          </p>
        </section>
        <div
          className="stage"
          role="img"
          aria-label="Particles form a website, a phone, a dashboard, a brand identity and the Ucas wordmark"
        >
          <IdeaToProduct
            color={ink}
            particles={22000}
            opacity={0.6}
            size={2}
            grid={2.5}
            centerX={50}
            centerY={50}
            scale={1}
            speed={1}
            wordmarkText="Ucas"
            bleed={480}
            bangDown={170}
            tilt={18}
            style={fill}
          />
        </div>
        <Clients />
        <Work />
        <Team />
        <section className="section column contact" id="contact">
          <h2>Contact</h2>
          <p>
            Have a project in mind? We’d love to hear about it.{" "}
            <a href={mail}>hello@ucas.studio</a>
          </p>
          <nav>
            <a href="https://dribbble.com/ucasstudio">Dribbble</a>
            <a href="https://x.com/ucastudio">Twitter</a>
            <a href="https://www.linkedin.com/company/ucastudio/">LinkedIn</a>
          </nav>
          <div
            className="map"
            role="img"
            aria-label="Particle world map connecting Ankara and New York"
          >
            <ContactMap
              color={ink}
              density={70}
              flow={1}
              grid={2}
              opacity={0.6}
              size={1.5}
              style={fill}
            />
          </div>
        </section>
        <ParticleLab />
      </main>
      <footer className="column">
        <div className="release-credit">
          <span>Motion study of <a href="https://www.ucas.studio/">Ucas Studio</a></span>
          <span><a href="https://github.com/holynova/ucas-particles">GitHub</a> · {__APP_VERSION_LABEL__}</span>
        </div>
        <Clocks />
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<Page />);
