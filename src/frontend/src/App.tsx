import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StorePage from './pages/StorePage'
import ProductPage from './pages/ProductPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'

const Placeholder = ({ label }: { label: string }) => (
  <div className="min-h-screen bg-canvas flex items-center justify-center">
    <p className="text-ink text-sm">{label} — pendiente</p>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/"         element={<HomePage />} />
          <Route path="/tienda"          element={<StorePage />} />
          <Route path="/producto/:slug"  element={<ProductPage />} />

          {/* Requieren sesión */}
          <Route element={<ProtectedRoute />}>
            <Route path="/perfil"  element={<Placeholder label="Mi perfil" />} />
            <Route path="/pedidos" element={<Placeholder label="Mis pedidos" />} />
          </Route>

          {/* Requieren rol admin */}
          <Route element={<AdminRoute />}>
            <Route path="/admin"            element={<Placeholder label="Panel admin" />} />
            <Route path="/admin/productos"  element={<AdminProductsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App