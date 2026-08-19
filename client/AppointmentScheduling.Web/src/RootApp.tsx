import App from './App'
import StaffApp from './StaffApp'

export default function RootApp() {
  const currentPath = window.location.pathname.replace(/\/+$/, '')

  return currentPath === '/staff' ? <StaffApp /> : <App />
}
