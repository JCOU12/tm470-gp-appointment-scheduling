import type { ReactNode } from 'react'

interface ServiceLayoutProps {
  activeArea: 'patient' | 'staff'
  children: ReactNode
}

export function ServiceLayout({ activeArea, children }: ServiceLayoutProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="service-header">
        <div className="page-width header-content">
          <span className="service-mark" aria-hidden="true">
            GP
          </span>
          <div>
            <span className="service-name">Oakfield Medical Centre</span>
            <span className="service-description">Appointment service</span>
          </div>
        </div>
        <nav className="service-navigation" aria-label="Primary navigation">
          <div className="page-width navigation-links">
            <a href="/" aria-current={activeArea === 'patient' ? 'page' : undefined}>
              Patient appointments
            </a>
            <a
              href="/staff"
              aria-current={activeArea === 'staff' ? 'page' : undefined}
            >
              Staff scheduling
            </a>
          </div>
        </nav>
      </header>

      <main className="page-width main-content" id="main-content">
        {children}
      </main>

      <footer className="service-footer">
        <div className="page-width">
          <p>Oakfield Medical Centre appointment service</p>
        </div>
      </footer>
    </>
  )
}
