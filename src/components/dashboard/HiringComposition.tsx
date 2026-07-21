"use client";

import { useEffect, useState } from "react";

/**
 * The moment Dobly composes a coworker. This is the product's promise made
 * visible, so it gets a real sequence instead of a spinner: each stage of the
 * composition writes itself onto the page like an entry in the work record.
 *
 * The stages are honest about what the request is actually doing (reading the
 * brief, shaping the role, fitting tools, setting guardrails, defining done);
 * they advance on a timer because the API returns one composed result rather
 * than streaming progress. The last stage holds until the response lands.
 */
const STAGES = [
  { tag: "Reading", body: "Taking in the brief and the workspace memory around it." },
  { tag: "Shaping", body: "Drafting the role: what it owns, and what it never touches." },
  { tag: "Fitting", body: "Matching the tools and connections the work will need." },
  { tag: "Guarding", body: "Setting the approval points for anything consequential." },
  { tag: "Defining", body: "Writing the definition of done this coworker is held to." },
];

export default function HiringComposition() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    if (reduce) {
      setActive(STAGES.length - 1);
      return;
    }
    // Hold on the final stage; the response replaces this view when it lands.
    const timer = window.setInterval(() => {
      setActive((current) => (current >= STAGES.length - 1 ? current : current + 1));
    }, 1400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hire-compose" role="status" aria-live="polite">
      <div className="hire-compose-head">
        <span className="hire-compose-eyebrow">Composing</span>
        <h2>Building the coworker.</h2>
        <p>
          Dobly is turning your brief into a role with its own tools, memory, guardrails, and a
          standard it can be held to.
        </p>
      </div>

      <ol className="hire-compose-spine">
        {STAGES.map((stage, index) => {
          const state = index < active ? "done" : index === active ? "active" : "waiting";
          return (
            <li key={stage.tag} data-state={state}>
              <span className="hire-compose-node" aria-hidden="true" />
              <div>
                <strong>{stage.tag}</strong>
                <p>{stage.body}</p>
              </div>
              {state === "active" && !reduced ? (
                <span className="hire-compose-working" aria-hidden="true">
                  <i /><i /><i />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="hire-compose-foot">
        You will see the whole proposal before anything goes live.
      </p>
    </div>
  );
}
