import App from './App'
import StaffApp from './StaffApp'
import { Route, Routes } from 'react-router'

export default function RootApp() {
  return (
    <Routes>
      <Route path="/staff/*" element={<StaffApp />} />
      <Route path="*" element={<App />} />
    </Routes>
  )
}
