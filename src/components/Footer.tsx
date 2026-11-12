import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "hello@actorslines.app";

export default function Footer() {
  return (
    <footer className="al-footer">
      <div className="al-footer__inner">
        <div className="al-footer__cols">
          <div className="al-footer__brand">
            <img src="/assets/logo-mark.png" alt="" width={32} height={32} />
            <p className="al-footer__brand-name">Actors Lines</p>
            {/* [PLACEHOLDER: Clarity] one-line description goes here */}
          </div>

          <div>
            <p id="footer-help-heading" className="al-footer__heading">
              Help
            </p>
            <ul className="al-footer__list" aria-labelledby="footer-help-heading">
              <li>
                <Link className="al-footer__link" to="/kb">
                  Knowledge base
                </Link>
              </li>
              <li>
                <a className="al-footer__link" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p id="footer-legal-heading" className="al-footer__heading">
              Legal
            </p>
            <ul className="al-footer__list" aria-labelledby="footer-legal-heading">
              <li>
                <Link className="al-footer__link" to="/privacy">
                  Privacy
                </Link>
              </li>
              <li>
                <Link className="al-footer__link" to="/terms">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="al-footer__legal">© {new Date().getFullYear()} Actors Lines</p>
      </div>
    </footer>
  );
}
