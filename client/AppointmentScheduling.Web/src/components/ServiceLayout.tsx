import type { ReactNode } from 'react'
import { focusMainContent } from '../focusMainContent'

interface ServiceLayoutProps {
  activeArea: 'patient' | 'staff'
  children: ReactNode
}

export function ServiceLayout({ activeArea, children }: ServiceLayoutProps) {
  return (
    <>
      <a
        className="nhsuk-skip-link"
        data-module="nhsuk-skip-link"
        href="#main-content"
        onClick={focusMainContent}
      >
        Skip to main content
      </a>

      <header className="nhsuk-header" role="banner">
        <div className="nhsuk-header__container nhsuk-width-container">
          <div className="nhsuk-header__service">
            <a className="nhsuk-header__service-name" href="/">
              Oakfield Medical Centre
            </a>
            <span className="service-description">Appointment service</span>
          </div>
        </div>
        <nav
          className="nhsuk-header__navigation"
          aria-label="Primary navigation"
        >
          <div className="nhsuk-header__navigation-container nhsuk-width-container">
            <ul className="nhsuk-header__navigation-list">
              <li
                className={`nhsuk-header__navigation-item${
                  activeArea === 'patient'
                    ? ' nhsuk-header__navigation-item--current'
                    : ''
                }`}
              >
                <a
                  className="nhsuk-header__navigation-link"
                  href="/"
                  aria-current={activeArea === 'patient' ? 'page' : undefined}
                >
                  {activeArea === 'patient' ? (
                    <strong className="nhsuk-header__navigation-item-current-fallback">
                      Patient appointments
                    </strong>
                  ) : (
                    'Patient appointments'
                  )}
                </a>
              </li>
              <li
                className={`nhsuk-header__navigation-item${
                  activeArea === 'staff'
                    ? ' nhsuk-header__navigation-item--current'
                    : ''
                }`}
              >
                <a
                  className="nhsuk-header__navigation-link"
                  href="/staff"
                  aria-current={activeArea === 'staff' ? 'page' : undefined}
                >
                  {activeArea === 'staff' ? (
                    <strong className="nhsuk-header__navigation-item-current-fallback">
                      Staff scheduling
                    </strong>
                  ) : (
                    'Staff scheduling'
                  )}
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      <main
        className="nhsuk-width-container nhsuk-main-wrapper"
        id="main-content"
        tabIndex={-1}
      >
        {children}
      </main>

      <footer className="nhsuk-footer" role="contentinfo">
        <div className="nhsuk-width-container">
          <div className="nhsuk-footer__meta">
            <p className="nhsuk-body-s">
              Oakfield Medical Centre appointment service
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
