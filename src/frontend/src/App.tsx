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
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminArtistsPage from './pages/admin/AdminArtistsPage'
import AdminFanficsPage from './pages/admin/AdminFanficsPage'
import ArtistsPage from './pages/ArtistsPage'
import BolaTroncodriloPage from './pages/BolaTroncodriloPage'
import MiFanficPage from './pages/MiFanficPage'
import ArtistProfilePage from './pages/ArtistProfilePage'
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
            <Route path="/artistas"          element={<ArtistsPage />} />
            <Route path="/artistas/:id"      element={<ArtistProfilePage />} />
            <Route path="/bola-troncodrilo"  element={<BolaTroncodriloPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/perfil"              element={<Placeholder label="Mi perfil" />} />
              <Route path="/mi-fanfic"           element={<MiFanficPage />} />
              <Route path="/mis-pedidos"         element={<OrdersPage />} />
              <Route path="/checkout/exito"      element={<CheckoutSuccessPage />} />
              <Route path="/checkout/cancelado"  element={<CheckoutCancelPage />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin"           element={<AdminDashboardPage />} />
              <Route path="/admin/productos" element={<AdminProductsPage />} />
              <Route path="/admin/artistas" element={<AdminArtistsPage />} />
              <Route path="/admin/fanfics"  element={<AdminFanficsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
