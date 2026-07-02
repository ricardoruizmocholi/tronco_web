import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StorePage from './pages/StorePage'
import ProductPage from './pages/ProductPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import CheckoutSuccessPage from './pages/checkout/CheckoutSuccessPage'
import CheckoutCancelPage from './pages/checkout/CheckoutCancelPage'
import OrdersPage from './pages/OrdersPage'

const Placeholder = ({ label }: { label: string }) => (
  <div className="py-20 text-center text-ink/50 text-sm">{label} — pendiente</div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Sin layout: auth a pantalla completa */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Con layout: Header sticky + Footer */}
          <Route element={<Layout />}>
            <Route path="/"                element={<HomePage />} />
            <Route path="/tienda"          element={<StorePage />} />
            <Route path="/producto/:slug"  element={<ProductPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/perfil"              element={<Placeholder label="Mi perfil" />} />
              <Route path="/mis-pedidos"         element={<OrdersPage />} />
              <Route path="/checkout/exito"      element={<CheckoutSuccessPage />} />
              <Route path="/checkout/cancelado"  element={<CheckoutCancelPage />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin"           element={<Placeholder label="Panel admin" />} />
              <Route path="/admin/productos" element={<AdminProductsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
